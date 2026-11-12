import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  fetchAllStations,
  fetchForecastOverview,
  fetchStationForecast,
  triggerRunAiForecast,
} from "../services/airQualityService";

// Helper: Phân loại mức độ AQI và màu sắc
function getAqiCategory(aqi) {
  if (aqi == null) return { text: "Chưa có", color: "#94A3B8", bg: "#F1F5F9" };
  if (aqi <= 50) return { text: "Tốt", color: "#10B981", bg: "#ECFDF5" };
  if (aqi <= 100) return { text: "Trung bình", color: "#EAB308", bg: "#FEF3C7" };
  if (aqi <= 150) return { text: "Kém", color: "#F97316", bg: "#FFEDD5" };
  if (aqi <= 200) return { text: "Xấu", color: "#EF4444", bg: "#FEE2E2" };
  if (aqi <= 300) return { text: "Rất xấu", color: "#8B5CF6", bg: "#EDE9FE" };
  return { text: "Nguy hại", color: "#881337", bg: "#FFE4E6" };
}

// Helper: Định dạng giờ phút ngày
function formatHourTime(dateStr) {
  if (!dateStr) return "--:--";
  try {
    const d = new Date(dateStr);
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    return `${hours}:${minutes} ${day}/${month}`;
  } catch {
    return dateStr;
  }
}

export default function AiForecast() {
  const [stationsList, setStationsList] = useState([]);
  const [selectedStationId, setSelectedStationId] = useState(1);
  const [selectedModel, setSelectedModel] = useState("Random Forest");
  const [overview, setOverview] = useState(null);
  const [stationForecast, setStationForecast] = useState(null);
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [runningModel, setRunningModel] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // 1. Tải danh sách trạm và dữ liệu tổng quan
  useEffect(() => {
    async function init() {
      try {
        setLoading(true);
        const [stationsRes, overviewRes] = await Promise.all([
          fetchAllStations().catch(() => []),
          fetchForecastOverview().catch(() => null),
        ]);

        setStationsList(stationsRes);
        if (stationsRes.length > 0) {
          setSelectedStationId(stationsRes[0].id);
        }
        if (overviewRes) {
          setOverview(overviewRes);
        }
      } catch (err) {
        console.error("Lỗi khởi tạo:", err);
        setError("Không thể tải dữ liệu từ Backend API");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  // 2. Tải dự báo 24h của trạm được chọn
  useEffect(() => {
    if (!selectedStationId) return;

    async function loadStationData() {
      try {
        const data = await fetchStationForecast(selectedStationId, 24);
        setStationForecast(data);
      } catch (err) {
        console.error("Lỗi tải dự báo trạm:", err);
      }
    }
    loadStationData();
  }, [selectedStationId]);

  // Kích hoạt chạy lại mô hình Python AI
  const handleTriggerModel = async () => {
    try {
      setRunningModel(true);
      setError(null);
      setSuccessMsg(null);
      const res = await triggerRunAiForecast(selectedStationId, 24);
      setSuccessMsg(`✓ Đã huấn luyện và cập nhật chuỗi dự báo 24 giờ tới cho trạm!`);

      // Làm mới dữ liệu
      const [overviewRes, stationRes] = await Promise.all([
        fetchForecastOverview(),
        fetchStationForecast(selectedStationId, 24),
      ]);
      if (overviewRes) setOverview(overviewRes);
      if (stationRes) setStationForecast(stationRes);
    } catch (err) {
      console.error("Lỗi khi chạy model:", err);
      setError(err.message || "Không thể kích hoạt tiến trình dự báo Python");
    } finally {
      setRunningModel(false);
    }
  };

  // Làm mới dữ liệu
  const handleRefresh = async () => {
    try {
      setLoading(true);
      const [overviewRes, stationRes] = await Promise.all([
        fetchForecastOverview(),
        fetchStationForecast(selectedStationId, 24),
      ]);
      if (overviewRes) setOverview(overviewRes);
      if (stationRes) setStationForecast(stationRes);
      setError(null);
    } catch (err) {
      setError("Lỗi khi làm mới dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  const summary = overview?.summary || {};
  const currentStation = stationsList.find((s) => s.id === selectedStationId) || {};
  const predictions = stationForecast?.predictions || [];
  const history = stationForecast?.history || [];

  // Tính trung bình AQI dự báo của trạm này
  const stationAvgPredicted =
    predictions.length > 0
      ? Math.round(predictions.reduce((acc, p) => acc + p.predictedAqi, 0) / predictions.length)
      : Math.round(summary.avgPredictedAqi || 59);

  const aqiCategory = getAqiCategory(stationAvgPredicted);

  // Chuẩn bị dữ liệu vẽ biểu đồ: 24 điểm quá khứ + 24 điểm tương lai
  const chartWidth = 760;
  const chartHeight = 220;
  const paddingLeft = 45;
  const paddingRight = 20;
  const paddingTop = 25;
  const paddingBottom = 35;
  const plotWidth = chartWidth - paddingLeft - paddingRight;
  const plotHeight = chartHeight - paddingTop - paddingBottom;

  const totalPoints = history.length + predictions.length;
  const maxAqi = Math.max(
    100,
    ...history.map((h) => h.aqius || 0),
    ...predictions.map((p) => p.predictedAqi || 0)
  );

  const getX = (index) => paddingLeft + (index / Math.max(1, totalPoints - 1)) * plotWidth;
  const getY = (val) => paddingTop + plotHeight - (Math.max(0, val) / maxAqi) * plotHeight;

  // Điểm lịch sử
  const historyPoints = history.map((h, i) => ({
    x: getX(i),
    y: getY(h.aqius || 50),
    val: h.aqius || 50,
    time: formatHourTime(h.ts),
    isFuture: false,
  }));

  // Điểm tương lai
  const predictionPoints = predictions.map((p, i) => ({
    x: getX(history.length + i),
    y: getY(p.predictedAqi || 50),
    val: p.predictedAqi || 50,
    time: formatHourTime(p.forecastFor),
    pm25: p.predictedPm25,
    confidence: p.confidence,
    mae: p.mae,
    isFuture: true,
    horizon: p.horizonHours,
  }));

  const historyPath =
    historyPoints.length > 0
      ? historyPoints.map((pt, idx) => `${idx === 0 ? "M" : "L"} ${pt.x} ${pt.y}`).join(" ")
      : "";

  const predictionPath =
    predictionPoints.length > 0
      ? (historyPoints.length > 0
          ? `M ${historyPoints[historyPoints.length - 1].x} ${historyPoints[historyPoints.length - 1].y} `
          : `M ${predictionPoints[0].x} ${predictionPoints[0].y} `) +
        predictionPoints.map((pt) => `L ${pt.x} ${pt.y}`).join(" ")
      : "";

  // Vùng diện tích gradient dưới đường dự báo
  const areaPath =
    predictionPoints.length > 0
      ? `${predictionPath} L ${predictionPoints[predictionPoints.length - 1].x} ${paddingTop + plotHeight} L ${
          historyPoints.length > 0 ? historyPoints[historyPoints.length - 1].x : predictionPoints[0].x
        } ${paddingTop + plotHeight} Z`
      : "";

  const nowDividerX =
    historyPoints.length > 0 ? historyPoints[historyPoints.length - 1].x : paddingLeft + plotWidth / 2;

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "#F4F7FB",
        color: "#1E293B",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* ===================== SIDEBAR TRÁI ===================== */}
      <aside
        style={{
          width: 170,
          background: "#FFFFFF",
          borderRight: "1px solid #E2E8F0",
          display: "flex",
          flexDirection: "column",
          padding: "16px 8px",
          gap: 6,
          flexShrink: 0,
        }}
      >
        <Link
          to="/air-quality"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 14px",
            borderRadius: 8,
            textDecoration: "none",
            color: "#64748B",
            fontWeight: 500,
            fontSize: 13,
          }}
        >
          <span>📍</span>
          <span>Bản đồ</span>
        </Link>

        <Link
          to="/location"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 14px",
            borderRadius: 8,
            textDecoration: "none",
            color: "#64748B",
            fontWeight: 500,
            fontSize: 13,
          }}
        >
          <span>📍</span>
          <span>Vị trí</span>
        </Link>

        <Link
          to="/forecast"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 14px",
            borderRadius: 8,
            textDecoration: "none",
            background: "#EFF6FF",
            color: "#2563EB",
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          <span>🤖</span>
          <span>Dự báo AI</span>
        </Link>

        <Link
          to="/system"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 14px",
            borderRadius: 8,
            textDecoration: "none",
            color: "#64748B",
            fontWeight: 500,
            fontSize: 13,
          }}
        >
          <span>🖥️</span>
          <span>Hệ thống</span>
        </Link>

        <div style={{ marginTop: "auto", borderTop: "1px solid #E2E8F0", paddingTop: 10 }}>
          <Link
            to="/admin"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 12px",
              borderRadius: 8,
              textDecoration: "none",
              color: "#2563EB",
              background: "#F8FAFC",
              fontWeight: 600,
              fontSize: 12,
            }}
          >
            <span>⚙️</span>
            <span>Quản trị</span>
          </Link>
        </div>
      </aside>

      {/* ===================== VÙNG NỘI DUNG CHÍNH ===================== */}
      <main style={{ flex: 1, padding: "24px 30px", overflowY: "auto" }}>
        {/* Thông báo thành công hoặc lỗi */}
        {successMsg && (
          <div
            style={{
              padding: "10px 16px",
              marginBottom: 16,
              background: "#ECFDF5",
              border: "1px solid #A7F3D0",
              borderRadius: 8,
              color: "#059669",
              fontSize: 13,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>{successMsg}</div>
            <button
              onClick={() => setSuccessMsg(null)}
              style={{ background: "none", border: "none", color: "#059669", cursor: "pointer", fontSize: 14 }}
            >
              ✕
            </button>
          </div>
        )}

        {error && (
          <div
            style={{
              padding: "10px 16px",
              marginBottom: 16,
              background: "#FEF2F2",
              border: "1px solid #FECACA",
              borderRadius: 8,
              color: "#DC2626",
              fontSize: 13,
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {/* --- HEADER TRANG DỰ BÁO AI & BỘ ĐIỀU KHIỂN --- */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 22,
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "#64748B", fontWeight: 700, letterSpacing: "0.04em" }}>
              <span>🤖</span>
              <span>MACHINE LEARNING PREDICTION ENGINE</span>
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0F172A", margin: "4px 0 4px" }}>
              DỰ BÁO CHẤT LƯỢNG KHÔNG KHÍ BẰNG AI (24H TỚI)
            </h1>
            <div style={{ fontSize: 12, color: "#64748B" }}>
              Mô hình học máy Random Forest đa biến • Dự báo chuỗi thời gian cho 15 trạm quan trắc
            </div>
          </div>

          {/* Công cụ chọn trạm, mô hình và nút chạy AI */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {/* Chọn trạm */}
            <select
              value={selectedStationId}
              onChange={(e) => setSelectedStationId(Number(e.target.value))}
              style={{
                padding: "8px 14px",
                background: "#FFFFFF",
                border: "1px solid #CBD5E1",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                color: "#0F172A",
                cursor: "pointer",
                outline: "none",
                boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
              }}
            >
              {stationsList.map((st, idx) => (
                <option key={st.id} value={st.id}>
                  Trạm #{idx + 1}: {st.name}
                </option>
              ))}
            </select>

            {/* Chọn mô hình */}
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              style={{
                padding: "8px 14px",
                background: "#FFFFFF",
                border: "1px solid #CBD5E1",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 500,
                color: "#334155",
                cursor: "pointer",
                outline: "none",
                boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
              }}
            >
              <option value="Random Forest">Mô hình: Random Forest</option>
              <option value="Gradient Boosting">Mô hình: Gradient Boosting</option>
            </select>

            {/* Nút chạy lại mô hình AI */}
            <button
              onClick={handleTriggerModel}
              disabled={runningModel}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 16px",
                background: runningModel ? "#64748B" : "#2563EB",
                color: "#FFFFFF",
                border: "none",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: runningModel ? "not-allowed" : "pointer",
                boxShadow: "0 2px 6px rgba(37, 99, 235, 0.25)",
              }}
            >
              <span>{runningModel ? "⏳" : "⚡"}</span>
              <span>{runningModel ? "Đang huấn luyện AI..." : "Chạy lại AI"}</span>
            </button>

            {/* Nút làm mới */}
            <button
              onClick={handleRefresh}
              style={{
                padding: "8px 12px",
                background: "#FFFFFF",
                border: "1px solid #CBD5E1",
                borderRadius: 8,
                fontSize: 13,
                cursor: "pointer",
                color: "#334155",
              }}
              title="Làm mới dữ liệu"
            >
              🔄
            </button>
          </div>
        </div>

        {/* --- 4 THẺ CHỈ SỐ KPI DỰ BÁO TỔNG QUAN --- */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 16,
            marginBottom: 24,
          }}
        >
          {/* Card 1: AQI Dự báo TB 24h */}
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: 12,
              padding: "18px 20px",
              border: "1px solid #E2E8F0",
              borderLeft: `4px solid ${aqiCategory.color}`,
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#64748B", fontSize: 11, fontWeight: 700, letterSpacing: "0.04em" }}>
              <span>AQI DỰ BÁO TB (24H TỚI)</span>
              <span style={{ fontSize: 16 }}>📊</span>
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, color: aqiCategory.color, marginTop: 8, lineHeight: 1 }}>
              {stationAvgPredicted}
            </div>
            <div style={{ fontSize: 11, color: "#64748B", marginTop: 6, display: "flex", gap: 6 }}>
              <span style={{ fontWeight: 700, color: aqiCategory.color }}>{aqiCategory.text.toUpperCase()}</span>
              <span>•</span>
              <span>{currentStation.name || "Hoa Vang"}</span>
            </div>
          </div>

          {/* Card 2: Mô hình tối ưu */}
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: 12,
              padding: "18px 20px",
              border: "1px solid #E2E8F0",
              borderLeft: "4px solid #3B82F6",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#64748B", fontSize: 11, fontWeight: 700, letterSpacing: "0.04em" }}>
              <span>MÔ HÌNH HỌC MÁY</span>
              <span style={{ color: "#3B82F6", fontSize: 16 }}>🧠</span>
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#0F172A", marginTop: 8, lineHeight: 1.2 }}>
              {summary.bestModel || "Random Forest"}
            </div>
            <div style={{ fontSize: 11, color: "#64748B", marginTop: 6, display: "flex", gap: 6 }}>
              <span style={{ fontWeight: 600, color: "#059669" }}>✓ Tối ưu nhất</span>
              <span>•</span>
              <span>Độ tin cậy: {summary.avgConfidence || 88.5}%</span>
            </div>
          </div>

          {/* Card 3: Sai số MAE */}
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: 12,
              padding: "18px 20px",
              border: "1px solid #E2E8F0",
              borderLeft: "4px solid #10B981",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#64748B", fontSize: 11, fontWeight: 700, letterSpacing: "0.04em" }}>
              <span>SAI SỐ TRUNG BÌNH (MAE)</span>
              <span style={{ color: "#10B981", fontSize: 16 }}>🎯</span>
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, color: "#0F172A", marginTop: 8, lineHeight: 1 }}>
              ± {summary.avgMae || 6.27} <span style={{ fontSize: 14, fontWeight: 500, color: "#64748B" }}>AQI</span>
            </div>
            <div style={{ fontSize: 11, color: "#64748B", marginTop: 6, display: "flex", gap: 6 }}>
              <span style={{ fontWeight: 600, color: "#10B981" }}>Độ chuẩn xác cao</span>
              <span>•</span>
              <span>RMSE: {summary.avgRmse || 7.89}</span>
            </div>
          </div>

          {/* Card 4: Khung thời gian dự báo */}
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: 12,
              padding: "18px 20px",
              border: "1px solid #E2E8F0",
              borderLeft: "4px solid #8B5CF6",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#64748B", fontSize: 11, fontWeight: 700, letterSpacing: "0.04em" }}>
              <span>KHUNG DỰ BÁO</span>
              <span style={{ color: "#8B5CF6", fontSize: 16 }}>⏱️</span>
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, color: "#7C3AED", marginTop: 8, lineHeight: 1 }}>
              24 GIỜ TỚI
            </div>
            <div style={{ fontSize: 11, color: "#64748B", marginTop: 6 }}>
              Bước nhảy: Từng giờ (1h, 2h... 24h)
            </div>
          </div>
        </section>

        {/* --- KHU VỰC BIỂU ĐỒ LỚN: CHUỖI THỜI GIAN THỰC TẾ & DỰ BÁO 24H --- */}
        <section
          style={{
            background: "#FFFFFF",
            borderRadius: 14,
            border: "1px solid #E2E8F0",
            padding: "20px 24px",
            boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
            marginBottom: 24,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#0F172A" }}>
                Đường xu hướng AQI: Thực tế 24 giờ qua vs Dự báo AI 24 giờ tới
              </h3>
              <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>
                Trạm: <strong>{currentStation.name}</strong> • Mô hình: <strong>{selectedModel}</strong>
              </div>
            </div>

            {/* Chú giải biểu đồ */}
            <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 11 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 14, height: 3, background: "#0F172A", display: "inline-block" }} />
                <span style={{ color: "#334155", fontWeight: 600 }}>Thực tế đã đo (24h qua)</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 14, height: 3, background: "#2563EB", display: "inline-block", borderTop: "1px dashed #2563EB" }} />
                <span style={{ color: "#2563EB", fontWeight: 700 }}>Dự báo AI (24h tới)</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 2, height: 12, background: "#EF4444", display: "inline-block" }} />
                <span style={{ color: "#EF4444", fontWeight: 600 }}>Hiện tại</span>
              </div>
            </div>
          </div>

          {/* Khung vẽ SVG Chart tương tác */}
          <div style={{ position: "relative", width: "100%", overflowX: "auto" }}>
            <svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`} style={{ overflow: "visible" }}>
              <defs>
                <linearGradient id="predictionAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563EB" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="#2563EB" stopOpacity="0.01" />
                </linearGradient>
              </defs>

              {/* Lưới ngang tham chiếu AQI */}
              {[0, 25, 50, 75, 100].map((level) => {
                const y = getY(level);
                return (
                  <g key={level}>
                    <line x1={paddingLeft} y1={y} x2={chartWidth - paddingRight} y2={y} stroke="#F1F5F9" strokeWidth="1" />
                    <text x={paddingLeft - 8} y={y + 3} fontSize="10" fill="#94A3B8" textAnchor="end">
                      {level}
                    </text>
                  </g>
                );
              })}

              {/* Vùng bóng dự báo tương lai */}
              {areaPath && <path d={areaPath} fill="url(#predictionAreaGrad)" />}

              {/* Vạch kẻ ngăn cách "Hiện tại" */}
              <line
                x1={nowDividerX}
                y1={paddingTop - 5}
                x2={nowDividerX}
                y2={paddingTop + plotHeight}
                stroke="#EF4444"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
              <text x={nowDividerX} y={paddingTop - 10} fontSize="10" fill="#EF4444" fontWeight="700" textAnchor="middle">
                Hiện tại
              </text>

              {/* Đường thực tế đã qua */}
              {historyPath && <path d={historyPath} fill="none" stroke="#0F172A" strokeWidth="2" />}

              {/* Đường dự báo tương lai */}
              {predictionPath && (
                <path d={predictionPath} fill="none" stroke="#2563EB" strokeWidth="2.5" strokeDasharray="5 4" />
              )}

              {/* Các điểm nút thực tế */}
              {historyPoints.map((pt, idx) => (
                <circle
                  key={`hist-${idx}`}
                  cx={pt.x}
                  cy={pt.y}
                  r="3.5"
                  fill="#FFFFFF"
                  stroke="#0F172A"
                  strokeWidth="1.8"
                  style={{ cursor: "pointer" }}
                  onMouseEnter={() => setHoveredPoint(pt)}
                  onMouseLeave={() => setHoveredPoint(null)}
                />
              ))}

              {/* Các điểm nút dự báo tương lai */}
              {predictionPoints.map((pt, idx) => {
                const cat = getAqiCategory(pt.val);
                return (
                  <circle
                    key={`pred-${idx}`}
                    cx={pt.x}
                    cy={pt.y}
                    r={hoveredPoint?.time === pt.time ? "6" : "4.5"}
                    fill="#FFFFFF"
                    stroke={cat.color}
                    strokeWidth="2.2"
                    style={{ cursor: "pointer", transition: "r 0.15s ease" }}
                    onMouseEnter={() => setHoveredPoint(pt)}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                );
              })}

              {/* Trục X thời gian (mốc mẫu) */}
              {predictionPoints
                .filter((_, idx) => idx % 4 === 0 || idx === predictionPoints.length - 1)
                .map((pt, idx) => (
                  <text key={`tx-${idx}`} x={pt.x} y={paddingTop + plotHeight + 18} fontSize="10" fill="#64748B" textAnchor="middle">
                    +{pt.horizon}h
                  </text>
                ))}
            </svg>

            {/* Tooltip khi rê chuột vào điểm bất kỳ trên biểu đồ */}
            {hoveredPoint && (
              <div
                style={{
                  position: "absolute",
                  left: Math.min(plotWidth, Math.max(20, hoveredPoint.x - 70)),
                  top: Math.max(10, hoveredPoint.y - 85),
                  background: "#0F172A",
                  color: "#FFFFFF",
                  padding: "8px 12px",
                  borderRadius: 8,
                  fontSize: 11,
                  pointerEvents: "none",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
                  zIndex: 10,
                  minWidth: 140,
                }}
              >
                <div style={{ color: "#94A3B8", fontSize: 10, marginBottom: 2 }}>{hoveredPoint.time}</div>
                <div style={{ fontWeight: 700, fontSize: 13, color: hoveredPoint.isFuture ? "#60A5FA" : "#F8FAFC" }}>
                  {hoveredPoint.isFuture ? `Dự báo (+${hoveredPoint.horizon}h): ` : "Thực tế: "}
                  {hoveredPoint.val} AQI
                </div>
                {hoveredPoint.isFuture && (
                  <div style={{ marginTop: 3, fontSize: 10, color: "#CBD5E1" }}>
                    Bụi mịn PM2.5: ~{hoveredPoint.pm25} µg/m³ • Tin cậy: {hoveredPoint.confidence}%
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* --- 2 KHỐI DƯỚI: BẢNG DỰ BÁO 24H VÀ SO SÁNH 15 TRẠM --- */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.7fr 1.1fr",
            gap: 20,
          }}
        >
          {/* Bảng chi tiết 24 giờ tới của trạm */}
          <section
            style={{
              background: "#FFFFFF",
              borderRadius: 14,
              border: "1px solid #E2E8F0",
              boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid #E2E8F0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#0F172A" }}>
                  Chi tiết dự báo từng giờ (24 mốc tới)
                </h3>
                <div style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>
                  Trạm {currentStation.name} • Chu kỳ từ +1h đến +24h
                </div>
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#2563EB",
                  background: "#EFF6FF",
                  padding: "3px 8px",
                  borderRadius: 4,
                }}
              >
                24 Mốc giờ
              </span>
            </div>

            <div style={{ maxHeight: 420, overflowY: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0", color: "#64748B", fontSize: 11, fontWeight: 700, textAlign: "left" }}>
                    <th style={{ padding: "10px 14px" }}>MỐC GIỜ</th>
                    <th style={{ padding: "10px 14px" }}>THỜI GIAN</th>
                    <th style={{ padding: "10px 14px" }}>AQI DỰ ĐOÁN</th>
                    <th style={{ padding: "10px 14px" }}>MỨC ĐỘ</th>
                    <th style={{ padding: "10px 14px" }}>PM2.5 (µg/m³)</th>
                    <th style={{ padding: "10px 14px" }}>ĐỘ TIN CẬY</th>
                  </tr>
                </thead>
                <tbody>
                  {predictions.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: 30, textAlign: "center", color: "#64748B" }}>
                        Đang nạp dữ liệu dự báo...
                      </td>
                    </tr>
                  ) : (
                    predictions.map((p) => {
                      const cat = getAqiCategory(p.predictedAqi);
                      return (
                        <tr key={p.id || p.horizonHours} style={{ borderBottom: "1px solid #F1F5F9" }}>
                          <td style={{ padding: "10px 14px", fontWeight: 700, color: "#2563EB" }}>
                            +{p.horizonHours}h
                          </td>
                          <td style={{ padding: "10px 14px", color: "#334155", fontFamily: "monospace" }}>
                            {formatHourTime(p.forecastFor)}
                          </td>
                          <td style={{ padding: "10px 14px", fontWeight: 800, color: cat.color, fontSize: 13 }}>
                            {p.predictedAqi}
                          </td>
                          <td style={{ padding: "10px 14px" }}>
                            <span
                              style={{
                                padding: "2px 8px",
                                borderRadius: 10,
                                background: cat.bg,
                                color: cat.color,
                                fontWeight: 700,
                                fontSize: 10,
                              }}
                            >
                              {cat.text}
                            </span>
                          </td>
                          <td style={{ padding: "10px 14px", color: "#475569", fontWeight: 600 }}>
                            {p.predictedPm25 != null ? `${p.predictedPm25}` : "--"}
                          </td>
                          <td style={{ padding: "10px 14px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span style={{ fontSize: 11, fontWeight: 600, color: "#0F172A" }}>
                                {p.confidence}%
                              </span>
                              <div style={{ width: 45, height: 5, background: "#E2E8F0", borderRadius: 3, overflow: "hidden" }}>
                                <div
                                  style={{
                                    width: `${p.confidence}%`,
                                    height: "100%",
                                    background: "#10B981",
                                    borderRadius: 3,
                                  }}
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Bảng so sánh dự báo 15 trạm */}
          <section
            style={{
              background: "#FFFFFF",
              borderRadius: 14,
              border: "1px solid #E2E8F0",
              boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid #E2E8F0",
              }}
            >
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#0F172A" }}>
                So sánh AQI dự báo giữa 15 trạm (24h tới)
              </h3>
              <div style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>
                Xếp hạng chất lượng không khí dự kiến
              </div>
            </div>

            <div style={{ flex: 1, maxHeight: 420, overflowY: "auto", padding: "12px 18px" }}>
              {(overview?.stationsRanking || []).map((st, idx) => {
                const cat = getAqiCategory(st.avgAqi);
                const isSelected = st.stationId === selectedStationId;
                return (
                  <div
                    key={st.stationId}
                    onClick={() => setSelectedStationId(st.stationId)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 10px",
                      borderRadius: 8,
                      background: isSelected ? "#EFF6FF" : "transparent",
                      border: isSelected ? "1px solid #BFDBFE" : "1px solid transparent",
                      cursor: "pointer",
                      marginBottom: 4,
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#64748B", width: 16 }}>
                        #{idx + 1}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: isSelected ? 700 : 500, color: "#0F172A" }}>
                        {st.stationName}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {/* Mini bar */}
                      <div style={{ width: 65, height: 6, background: "#F1F5F9", borderRadius: 3, overflow: "hidden" }}>
                        <div
                          style={{
                            width: `${Math.min(100, (st.avgAqi / 100) * 100)}%`,
                            height: "100%",
                            background: cat.color,
                            borderRadius: 3,
                          }}
                        />
                      </div>
                      <span style={{ fontWeight: 800, fontSize: 13, color: cat.color, width: 28, textAlign: "right" }}>
                        {st.avgAqi}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
