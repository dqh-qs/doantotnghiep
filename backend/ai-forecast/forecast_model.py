import os
import sys
import argparse
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")  
import matplotlib.pyplot as plt
from sqlalchemy import create_engine
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error
from dotenv import load_dotenv

# Tìm và nạp file .env từ backend hoặc thư mục hiện tại
env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
if os.path.exists(env_path):
    load_dotenv(env_path)
else:
    load_dotenv()

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    raise SystemExit("Lỗi: Chưa thiết lập DATABASE_URL trong file .env")

FORECAST_HOURS_DEFAULT = 24  # Mặc định dự báo 24 giờ tới
N_LAGS = 3
MIN_DATA_POINTS = 30

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "forecast_charts")
os.makedirs(OUTPUT_DIR, exist_ok=True)

engine = create_engine(DATABASE_URL)

    
def estimate_pm25(aqi):
    """
    Quy đổi ngược từ AQI (US) sang nồng độ bụi mịn PM2.5 (µg/m³) theo chuẩn EPA.
    """
    if aqi is None or np.isnan(aqi):
        return None
    aqi = float(aqi)
    if aqi <= 50:
        c = (aqi / 50.0) * 12.0
    elif aqi <= 100:
        c = 12.1 + ((aqi - 51) / 49.0) * (35.4 - 12.1)
    elif aqi <= 150:
        c = 35.5 + ((aqi - 101) / 49.0) * (55.4 - 35.5)
    elif aqi <= 200:
        c = 55.5 + ((aqi - 151) / 49.0) * (150.4 - 55.5)
    elif aqi <= 300:
        c = 150.5 + ((aqi - 201) / 99.0) * (250.4 - 150.5)
    else:
        c = 250.5 + ((aqi - 301) / 199.0) * (500.4 - 250.5)
    return round(max(0.0, c), 1)


def fetch_station_list():
    return pd.read_sql("SELECT id, name FROM stations ORDER BY id", engine)


def fetch_combined_history(station_id):
    query = """
        SELECT 
            p.ts_vn, 
            p.aqius, 
            COALESCE(w.tp, 27.0) AS tp, 
            COALESCE(w.hu, 80.0) AS hu, 
            COALESCE(w.ws, 1.5) AS ws, 
            COALESCE(w.pr, 1010.0) AS pr, 
            COALESCE(w.wd, 180.0) AS wd
        FROM pollution_readings p
        LEFT JOIN weather_readings w ON p.id = w.id
        WHERE p.station_id = %(sid)s AND p.aqius IS NOT NULL
        ORDER BY p.ts_vn ASC
    """
    df = pd.read_sql(query, engine, params={"sid": station_id})
    return df.reset_index(drop=True)


def build_lag_features_only(df):
    """
    Tạo các đặc trưng trễ (lag), góc gió (sin, cos) và thời gian.
    Dùng chung cho mọi khoảng dự báo (1h .. 24h).
    """
    df = df.copy()
    df["ts_vn"] = pd.to_datetime(df["ts_vn"])
    df["hour"] = df["ts_vn"].dt.hour
    df["dayofweek"] = df["ts_vn"].dt.dayofweek
    df["wd_sin"] = np.sin(np.deg2rad(df["wd"].fillna(0)))
    df["wd_cos"] = np.cos(np.deg2rad(df["wd"].fillna(0)))

    base_cols = ["aqius", "tp", "hu", "ws", "pr", "wd_sin", "wd_cos"]
    for col in base_cols:
        for lag in range(1, N_LAGS + 1):
            df[f"{col}_lag{lag}"] = df[col].shift(lag)

    feature_cols = (
        [f"{col}_lag{lag}" for col in base_cols for lag in range(1, N_LAGS + 1)]
        + ["hour", "dayofweek"]
    )
    return df, feature_cols


def forecast_next_n_hours(raw_df, n_hours=24, model_class=RandomForestRegressor, model_params=None):
    """
    Dự báo thực tế cho n_hours giờ tới (mặc định 24h).
    Với mỗi khoảng giờ h = 1..n_hours, huấn luyện mô hình dự báo tương ứng,
    đánh giá sai số (MAE, RMSE, Confidence) và dự đoán cho mốc h giờ kế tiếp.
    """
    if model_params is None:
        if model_class == RandomForestRegressor:
            model_params = dict(n_estimators=120, max_depth=7, random_state=42, min_samples_leaf=2, n_jobs=-1)
        else:
            model_params = dict(n_estimators=120, max_depth=7, random_state=42, min_samples_leaf=2)

    df_lagged, feature_cols = build_lag_features_only(raw_df)
    last_row_features = df_lagged[feature_cols].iloc[[-1]]
    last_ts = df_lagged["ts_vn"].iloc[-1]

    if last_row_features.isna().any(axis=1).iloc[0]:
        return None  # Chưa đủ dữ liệu để tạo đặc trưng cho dòng cuối

    mean_aqi = raw_df["aqius"].mean() if not raw_df.empty else 50.0

    results = []
    for h in range(1, n_hours + 1):
        target = df_lagged["aqius"].shift(-h)
        mask = target.notna() & df_lagged[feature_cols].notna().all(axis=1)

        X_full = df_lagged.loc[mask, feature_cols]
        y_full = target[mask]

        if len(X_full) < 15:
            continue

        # Tách tập kiểm định 80/20 để tính độ tin cậy và sai số
        split_idx = int(len(X_full) * 0.8)
        X_train, X_val = X_full.iloc[:split_idx], X_full.iloc[split_idx:]
        y_train, y_val = y_full.iloc[:split_idx], y_full.iloc[split_idx:]

        model = model_class(**model_params)
        model.fit(X_train, y_train)

        # Đánh giá sai số validation
        if len(X_val) > 0:
            val_pred = model.predict(X_val)
            mae = mean_absolute_error(y_val, val_pred)
            rmse = float(mean_squared_error(y_val, val_pred) ** 0.5)
        else:
            mae = 3.5
            rmse = 5.0

        # Huấn luyện lại trên toàn bộ dữ liệu để dự báo tương lai chuẩn xác nhất
        model.fit(X_full, y_full)
        predicted = float(model.predict(last_row_features)[0])
        predicted_aqi = max(0.0, round(predicted, 1))

        # Tính toán độ tin cậy % (confidence)
        conf = max(65.0, min(96.0, 100.0 - (mae / max(1.0, mean_aqi) * 100)))

        results.append({
            "forecast_for": last_ts + pd.Timedelta(hours=h),
            "hours_ahead": h,
            "predicted_aqius": predicted_aqi,
            "predicted_pm25": estimate_pm25(predicted_aqi),
            "confidence": round(conf, 1),
            "mae": round(mae, 2),
            "rmse": round(rmse, 2),
        })

    return pd.DataFrame(results) if results else None


def save_multi_hour_forecast(station_id, forecast_df, model_name="Random Forest"):
    """
    Lưu dự báo 24 giờ vào bảng forecasts trong PostgreSQL.
    Xóa dự báo cũ của trạm để giữ cơ sở dữ liệu luôn cập nhật mới nhất.
    """
    with engine.begin() as conn:
        conn.exec_driver_sql(
            "DELETE FROM forecasts WHERE station_id = %s AND model_name = %s",
            (station_id, model_name),
        )
        for _, row in forecast_df.iterrows():
            conn.exec_driver_sql(
                """
                INSERT INTO forecasts (
                    station_id, model_name, forecast_for, predicted_aqius,
                    predicted_pm25, confidence, horizon_hours, mae, rmse, created_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
                """,
                (
                    station_id,
                    model_name,
                    row["forecast_for"],
                    float(row["predicted_aqius"]),
                    row.get("predicted_pm25"),
                    float(row.get("confidence", 85.0)),
                    int(row["hours_ahead"]),
                    float(row.get("mae", 3.5)),
                    float(row.get("rmse", 5.0)),
                ),
            )


def plot_future_forecast(station_name, raw_df, forecast_df):
    plt.figure(figsize=(12, 5))
    hist_slice = raw_df.tail(48)
    plt.plot(pd.to_datetime(hist_slice["ts_vn"]), hist_slice["aqius"], "o-", label="AQI thực tế (lịch sử)", color="#0F172A", linewidth=1.8)
    plt.plot(forecast_df["forecast_for"], forecast_df["predicted_aqius"], "s--", label="AQI dự báo 24h tới", color="#2563EB", linewidth=2)
    plt.axvline(pd.to_datetime(raw_df["ts_vn"]).iloc[-1], color="#EF4444", linestyle=":", label="Hiện tại")
    plt.title(f"Dự báo AQI 24 giờ tới bằng AI - Trạm {station_name}")
    plt.xlabel("Thời gian")
    plt.ylabel("AQI (US)")
    plt.grid(True, linestyle="--", alpha=0.5)
    plt.legend()
    plt.xticks(rotation=45)
    plt.tight_layout()

    filename = os.path.join(OUTPUT_DIR, f"{station_name.replace(' ', '_')}_forecast_24h.png")
    plt.savefig(filename, dpi=120)
    plt.close()
    return filename


def run_forecast_pipeline(target_station_id=None, n_hours=24, model_name="Random Forest"):
    stations = fetch_station_list()
    if target_station_id is not None:
        stations = stations[stations["id"] == target_station_id]

    print(f"🚀 Bắt đầu pipeline dự báo AI {n_hours} giờ tới cho {len(stations)} trạm quan trắc...\n")

    summary_records = []

    for _, station in stations.iterrows():
        station_id, station_name = station["id"], station["name"]
        raw_df = fetch_combined_history(station_id)

        if len(raw_df) < MIN_DATA_POINTS:
            print(f"  [Trạm #{station_id} - {station_name}] Bỏ qua: chỉ có {len(raw_df)} dòng dữ liệu.")
            continue

        print(f"👉 [Trạm #{station_id} - {station_name}] Đang huấn luyện và dự báo {n_hours} giờ tới...")

        model_class = RandomForestRegressor if model_name == "Random Forest" else GradientBoostingRegressor
        forecast_df = forecast_next_n_hours(raw_df, n_hours=n_hours, model_class=model_class)

        if forecast_df is not None:
            save_multi_hour_forecast(station_id, forecast_df, model_name)
            chart_path = plot_future_forecast(station_name, raw_df, forecast_df)

            avg_predicted = forecast_df["predicted_aqius"].mean()
            avg_mae = forecast_df["mae"].mean()
            avg_rmse = forecast_df["rmse"].mean()
            avg_conf = forecast_df["confidence"].mean()

            summary_records.append({
                "station_id": station_id,
                "station_name": station_name,
                "avg_predicted_aqi": round(avg_predicted, 1),
                "avg_mae": round(avg_mae, 2),
                "avg_rmse": round(avg_rmse, 2),
                "avg_confidence": round(avg_conf, 1),
                "chart": chart_path,
            })
            print(f"    ✓ Đã lưu 24 mốc dự báo vào DB | AQI TB: {round(avg_predicted, 1)} | MAE: {round(avg_mae, 2)} | Độ tin cậy: {round(avg_conf, 1)}%")
        else:
            print(f"    ✗ Không đủ dữ liệu sinh đặc trưng cho trạm {station_name}.")

    print("\n" + "=" * 80)
    print("✅ Hoàn tất toàn bộ pipeline dự báo AI 24 giờ!")
    if summary_records:
        df_sum = pd.DataFrame(summary_records)
        print(df_sum[["station_id", "station_name", "avg_predicted_aqi", "avg_mae", "avg_confidence"]].to_string(index=False))
    print("=" * 80 + "\n")
    return summary_records


def main():
    parser = argparse.ArgumentParser(description="Chương trình dự báo AQI 24 giờ tới bằng AI.")
    parser.add_argument("--station", type=int, default=None, help="ID trạm cần dự báo (nếu không truyền sẽ dự báo tất cả)")
    parser.add_argument("--hours", type=int, default=24, help="Số giờ cần dự báo (mặc định 24h)")
    parser.add_argument("--model", type=str, default="Random Forest", choices=["Random Forest", "Gradient Boosting"], help="Mô hình AI")
    args = parser.parse_args()

    run_forecast_pipeline(target_station_id=args.station, n_hours=args.hours, model_name=args.model)


if __name__ == "__main__":
    main()
