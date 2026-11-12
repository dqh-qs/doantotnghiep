import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  fetchAllStations,
  fetchStationById,
  fetchStationHistory,
} from "../services/airQualityService";

// Helper: Phân loại mức độ AQI & màu sắc
function getAqiCategory(aqi) {
  if (aqi == null) return { label: "CHƯA CÓ", color: "#94A3B8", bg: "#F1F5F9" };
  if (aqi <= 50) return { label: "TỐT", color: "#10B981", bg: "#ECFDF5" };
  if (aqi <= 100) return { label: "TRUNG BÌNH", color: "#D97706", bg: "#FEF3C7" };
  if (aqi <= 150) return { label: "KÉM", color: "#EA580C", bg: "#FFEDD5" };
  if (aqi <= 200) return { label: "XẤU", color: "#DC2626", bg: "#FEE2E2" };
  if (aqi <= 300) return { label: "RẤT XẤU", color: "#7C3AED", bg: "#EDE9FE" };
  return { label: "NGUY HẠI", color: "#9F1239", bg: "#FFE4E6" };
}

// Helper: Định dạng giờ phút
function formatTime(isoStr) {
  if (!isoStr) return "22:00";
  try {
    const d = new Date(isoStr);
    return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "22:00";
  }
}

export default function StationLocation() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [stationsList, setStationsList] = useState([]);
  const [selectedStationId, setSelectedStationId] = useState(null);
  const [stationData, setStationData] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 1. Tải danh sách tất cả các trạm
  useEffect(() => {
    async function loadStations() {
      try {
        const list = await fetchAllStations();
        setStationsList(list);

        // Lấy station_id từ URL hoặc mặc định trạm đầu tiên (Hòa Vang id=1)
        const idFromUrl = searchParams.get("id");
        const defaultId = idFromUrl ? Number(idFromUrl) : list[0]?.id || 1;
        setSelectedStationId(defaultId);
      } catch (err) {
        console.error("Lỗi khi tải danh sách trạm:", err);
        setError("Không thể kết nối đến Backend API");
      }
    }
    loadStations();
  }, []);

  // 2. Tải dữ liệu chi tiết và lịch sử khi chọn trạm
  useEffect(() => {
    if (!selectedStationId) return;

    async function loadStationDetail() {
      try {
        setLoading(true);
        // Gọi đồng thời chi tiết trạm và lịch sử 24h
        const [detail, history] = await Promise.all([
          fetchStationById(selectedStationId),
          fetchStationHistory(selectedStationId, 24).catch(() => []),
        ]);

        setStationData(detail);
        setHistoryData(history || []);
        setError(null);
      } catch (err) {
        console.error("Lỗi khi tải dữ liệu trạm:", err);
        setError(err.message || "Lỗi khi lấy dữ liệu trạm từ API");
      } finally {
        setLoading(false);
      }
    }

    loadStationDetail();
  }, [selectedStationId]);

  // Đổi trạm
  const handleStationChange = (newId) => {
    setSelectedStationId(Number(newId));
    setSearchParams({ id: newId });
  };

  // Nút lùi/tiến trạm (< >)
  const currentIndex = stationsList.findIndex((s) => s.id === selectedStationId);
  const handlePrevStation = () => {
    if (currentIndex > 0) {
      handleStationChange(stationsList[currentIndex - 1].id);
    } else if (stationsList.length > 0) {
      handleStationChange(stationsList[stationsList.length - 1].id);
    }
  };

  const handleNextStation = () => {
    if (currentIndex < stationsList.length - 1) {
      handleStationChange(stationsList[currentIndex + 1].id);
    } else if (stationsList.length > 0) {
      handleStationChange(stationsList[0].id);
    }
  };

  const station = stationData?.station || {};
  const aqi = stationData?.aqi || {};
  const weather = stationData?.weather || {};
  const pollutants = stationData?.pollutants || {};

  const aqiVal = aqi.value != null ? aqi.value : 53;
  const aqiCategory = getAqiCategory(aqiVal);
  const isOnline = station.status === "ONLINE";

  // Tạo đường biểu đồ SVG xu hướng 24h từ historyData
  const renderHistoryChart = () => {
    if (!historyData || historyData.length === 0) {
      // Fallback mô phỏng nếu chưa có nhiều điểm dữ liệu
      const samplePoints = [54, 57, 53, 55, 53, 52, 52, 62, 59];
      const maxVal = 100;
      const width = 500;
      const height = 150;
      const step = width / (samplePoints.length - 1);

      const points = samplePoints
        .map((val, idx) => `${idx * step},${height - (val / maxVal) * (height - 20) - 10}`)
        .join(" ");

      return (
        <svg width="100%" height="170" viewBox="0 0 520 170" style={{ overflow: "visible" }}>
          {/* Lưới ngang */}
          <line x1="30" y1="20" x2="520" y2="20" stroke="#F1F5F9" strokeWidth="1" />
          <text x="20" y="24" fontSize="10" fill="#94A3B8" textAnchor="end">100</text>

          <line x1="30" y1="80" x2="520" y2="80" stroke="#F1F5F9" strokeWidth="1" />
          <text x="20" y="84" fontSize="10" fill="#94A3B8" textAnchor="end">50</text>

          <line x1="30" y1="140" x2="520" y2="140" stroke="#E2E8F0" strokeWidth="1" />
          <text x="20" y="144" fontSize="10" fill="#94A3B8" textAnchor="end">0</text>

          {/* Đường line */}
          <g transform="translate(30, 0)">
            <polyline fill="none" stroke="#EAB308" strokeWidth="2.5" points={points} />
            {samplePoints.map((val, idx) => (
              <circle
                key={idx}
                cx={idx * step}
                cy={height - (val / maxVal) * (height - 20) - 10}
                r="3.5"
                fill="#FFFFFF"
                stroke="#EAB308"
                strokeWidth="2"
              />
            ))}
          </g>
        </svg>
      );
    }

    const maxVal = Math.max(100, ...historyData.map((d) => d.aqius || 0));
    const width = 500;
    const height = 140;
    const step = historyData.length > 1 ? width / (historyData.length - 1) : width;

    const points = historyData
      .map((d, idx) => {
        const val = d.aqius || 0;
        const x = idx * step;
        const y = height - (val / maxVal) * (height - 30) - 10;
        return `${x},${y}`;
      })
      .join(" ");

    return (
      <svg width="100%" height="170" viewBox="0 0 540 170" style={{ overflow: "visible" }}>
        {/* Lưới ngang */}
        <line x1="35" y1="20" x2="530" y2="20" stroke="#F1F5F9" strokeWidth="1" />
        <text x="25" y="24" fontSize="10" fill="#94A3B8" textAnchor="end">100</text>

        <line x1="35" y1="80" x2="530" y2="80" stroke="#F1F5F9" strokeWidth="1" />
        <text x="25" y="84" fontSize="10" fill="#94A3B8" textAnchor="end">50</text>

        <line x1="35" y1="140" x2="530" y2="140" stroke="#E2E8F0" strokeWidth="1" />
        <text x="25" y="144" fontSize="10" fill="#94A3B8" textAnchor="end">0</text>

        <g transform="translate(35, 0)">
          <polyline fill="none" stroke="#EAB308" strokeWidth="2.5" points={points} />
          {historyData.map((d, idx) => {
            const val = d.aqius || 0;
            const cx = idx * step;
            const cy = height - (val / maxVal) * (height - 30) - 10;
            return (
              <g key={idx}>
                <circle cx={cx} cy={cy} r="4" fill="#FFFFFF" stroke="#EAB308" strokeWidth="2" />
                <title>{`${formatTime(d.ts)}: AQI ${val}`}</title>
              </g>
            );
          })}
        </g>
      </svg>
    );
  };

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
            background: "#EFF6FF",
            color: "#2563EB",
            fontWeight: 600,
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
            color: "#64748B",
            fontWeight: 500,
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
        {error && (
          <div
            style={{
              padding: "10px 16px",
              marginBottom: 16,
              background: "rgba(248, 113, 113, 0.12)",
              border: "1px solid #FCA5A5",
              borderRadius: 8,
              color: "#DC2626",
              fontSize: 13,
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {/* --- HEADER TRẠM & BỘ CHỌN TRẠM --- */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 20,
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#64748B", fontWeight: 700, letterSpacing: "0.04em" }}>
              <span>📍</span>
              <span>{(station.province || "ĐÀ NẴNG, VIỆT NAM").toUpperCase()}</span>
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: "#0F172A", margin: "4px 0 6px" }}>
              {station.name ? `Trạm ${station.name}` : "Đang tải trạm..."}
            </h1>
            <div style={{ fontSize: 12, color: "#94A3B8" }}>
              {station.latitude && station.longitude
                ? `${station.latitude}, ${station.longitude}`
                : "15.98764, 108.13893"}{" "}
              • Cập nhật: {formatTime(station.lastUpdated)}
            </div>
          </div>

          {/* Bộ chọn trạm & Trạng thái kết nối */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ position: "relative" }}>
              <select
                value={selectedStationId || ""}
                onChange={(e) => handleStationChange(e.target.value)}
                style={{
                  padding: "8px 32px 8px 14px",
                  background: "#FFFFFF",
                  border: "1px solid #CBD5E1",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#0F172A",
                  cursor: "pointer",
                  outline: "none",
                  appearance: "none",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                }}
              >
                {stationsList.map((s, idx) => (
                  <option key={s.id} value={s.id}>
                    {idx + 1}. Trạm {s.name}
                  </option>
                ))}
              </select>
              <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", fontSize: 11, color: "#64748B" }}>
                ▼
              </span>
            </div>

            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: 20,
                background: isOnline ? "#ECFDF5" : "#FEF2F2",
                border: isOnline ? "1px solid #A7F3D0" : "1px solid #FECACA",
                fontSize: 12,
                fontWeight: 600,
                color: isOnline ? "#059669" : "#DC2626",
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: isOnline ? "#10B981" : "#EF4444",
                }}
              />
              <span>{isOnline ? "Trực tuyến" : "Mất kết nối"}</span>
            </div>
          </div>
        </div>

        {/* --- THANH ĐIỀU HƯỚNG TRẠM (< > TRẠM 1/15 | XEM TẤT CẢ TRẠM) --- */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={handlePrevStation}
              style={{
                width: 32,
                height: 32,
                background: "#FFFFFF",
                border: "1px solid #CBD5E1",
                borderRadius: 6,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "#64748B",
                fontSize: 14,
              }}
              title="Trạm trước"
            >
              ‹
            </button>
            <button
              onClick={handleNextStation}
              style={{
                width: 32,
                height: 32,
                background: "#FFFFFF",
                border: "1px solid #CBD5E1",
                borderRadius: 6,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "#64748B",
                fontSize: 14,
              }}
              title="Trạm kế tiếp"
            >
              ›
            </button>
            <span style={{ fontSize: 13, color: "#64748B", fontWeight: 500 }}>
              Trạm {currentIndex >= 0 ? currentIndex + 1 : 1} / {stationsList.length || 15}
            </span>
          </div>

          <Link
            to="/air-quality"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 14px",
              background: "#FFFFFF",
              border: "1px solid #CBD5E1",
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              color: "#334155",
              textDecoration: "none",
              boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
            }}
          >
            <span>📑</span>
            <span>Xem tất cả trạm</span>
          </Link>
        </div>

        {/* --- KHỐI CHỈ SỐ AQI & THÔNG TIN THỜI TIẾT --- */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.1fr 2.5fr",
            gap: 16,
            marginBottom: 20,
          }}
        >
          {/* Cột 1: Chỉ số AQI hiện tại */}
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: 14,
              border: "1px solid #E2E8F0",
              padding: "20px 22px",
              boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 700, color: "#0F172A" }}>
              Chỉ số AQI hiện tại
            </h3>

            {/* Vòng tròn hiển thị giá trị AQI */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <div
                style={{
                  width: 140,
                  height: 140,
                  borderRadius: "50%",
                  border: `9px solid ${aqiCategory.color}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "8px 0",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                }}
              >
                <span style={{ fontSize: 44, fontWeight: 900, color: "#0F172A" }}>
                  {loading ? "..." : aqiVal}
                </span>
              </div>

              {/* Badge mức độ */}
              <div
                style={{
                  marginTop: 10,
                  padding: "4px 14px",
                  borderRadius: 100,
                  background: aqiCategory.bg,
                  color: aqiCategory.color,
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: "0.04em",
                }}
              >
                {aqiCategory.label}
              </div>

              <div style={{ fontSize: 12, color: "#64748B", marginTop: 8 }}>
                Chất ô nhiễm chính: <strong style={{ color: "#0F172A" }}>{aqi.mainPollutant || "PM2.5"}</strong>
              </div>
            </div>
          </div>

          {/* Cột 2: Thông tin thời tiết (4 thẻ) */}
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: 14,
              border: "1px solid #E2E8F0",
              padding: "20px 22px",
              boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 700, color: "#0F172A" }}>
              Thông tin thời tiết
            </h3>

            <div
              style={{
                flex: 1,
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 12,
                alignItems: "center",
              }}
            >
              {/* Thẻ 1: Nhiệt độ */}
              <div
                style={{
                  background: "#F8FAFC",
                  borderRadius: 10,
                  padding: "20px 12px",
                  textAlign: "center",
                  border: "1px solid #F1F5F9",
                }}
              >
                <div style={{ fontSize: 22, color: "#0284C7", marginBottom: 10 }}>🌡️</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: "#0F172A" }}>
                  {weather.temperature != null ? `${weather.temperature}°C` : "30°C"}
                </div>
                <div style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>Nhiệt độ</div>
              </div>

              {/* Thẻ 2: Độ ẩm */}
              <div
                style={{
                  background: "#F8FAFC",
                  borderRadius: 10,
                  padding: "20px 12px",
                  textAlign: "center",
                  border: "1px solid #F1F5F9",
                }}
              >
                <div style={{ fontSize: 22, color: "#0284C7", marginBottom: 10 }}>💧</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: "#0F172A" }}>
                  {weather.humidity != null ? `${weather.humidity}%` : "63%"}
                </div>
                <div style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>Độ ẩm</div>
              </div>

              {/* Thẻ 3: Tốc độ gió */}
              <div
                style={{
                  background: "#F8FAFC",
                  borderRadius: 10,
                  padding: "20px 12px",
                  textAlign: "center",
                  border: "1px solid #F1F5F9",
                }}
              >
                <div style={{ fontSize: 22, color: "#0284C7", marginBottom: 10 }}>💨</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: "#0F172A" }}>
                  {weather.windSpeed != null ? `${weather.windSpeed} m/s` : "3.89 m/s"}
                </div>
                <div style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>Tốc độ gió</div>
              </div>

              {/* Thẻ 4: Chỉ số UV */}
              <div
                style={{
                  background: "#F8FAFC",
                  borderRadius: 10,
                  padding: "20px 12px",
                  textAlign: "center",
                  border: "1px solid #F1F5F9",
                }}
              >
                <div style={{ fontSize: 22, color: "#0284C7", marginBottom: 10 }}>☀️</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: "#0F172A" }}>
                  {weather.uvIndex != null ? weather.uvIndex : "--"}
                </div>
                <div style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>Chỉ số UV</div>
              </div>
            </div>
          </div>
        </div>

        {/* --- NỒNG ĐỘ CÁC CHẤT Ô NHIỄM (6 THẺ) --- */}
        <section
          style={{
            background: "#FFFFFF",
            borderRadius: 14,
            border: "1px solid #E2E8F0",
            padding: "20px 22px",
            boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
            marginBottom: 20,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#0F172A" }}>
              Nồng độ các chất ô nhiễm
            </h3>
            <span style={{ fontSize: 11, color: "#94A3B8" }}>Dữ liệu trực tiếp từ cơ sở dữ liệu</span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(6, 1fr)",
              gap: 12,
            }}
          >
            {/* PM2.5 */}
            <div
              style={{
                background: "#FFFFFF",
                borderRadius: 10,
                border: "1px solid #E2E8F0",
                borderTop: "3.5px solid #F59E0B",
                padding: "14px 12px 18px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", color: "#64748B", fontSize: 12, fontWeight: 700 }}>
                <span>PM2.5</span>
                <span style={{ fontSize: 11, cursor: "help" }} title="Bụi mịn PM2.5 (µg/m³)">ⓘ</span>
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, color: "#0F172A", marginTop: 14 }}>
                {pollutants?.PM25?.value != null ? pollutants.PM25.value : "--"}
              </div>
            </div>

            {/* PM10 */}
            <div
              style={{
                background: "#FFFFFF",
                borderRadius: 10,
                border: "1px solid #E2E8F0",
                borderTop: "3.5px solid #F59E0B",
                padding: "14px 12px 18px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", color: "#64748B", fontSize: 12, fontWeight: 700 }}>
                <span>PM10</span>
                <span style={{ fontSize: 11, cursor: "help" }} title="Bụi PM10 (µg/m³)">ⓘ</span>
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, color: "#0F172A", marginTop: 14 }}>
                {pollutants?.PM10?.value != null ? pollutants.PM10.value : "--"}
              </div>
            </div>

            {/* NO2 */}
            <div
              style={{
                background: "#FFFFFF",
                borderRadius: 10,
                border: "1px solid #E2E8F0",
                borderTop: "3.5px solid #10B981",
                padding: "14px 12px 18px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", color: "#64748B", fontSize: 12, fontWeight: 700 }}>
                <span>NO₂</span>
                <span style={{ fontSize: 11, cursor: "help" }} title="Khí NO2 (ppb)">ⓘ</span>
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, color: "#0F172A", marginTop: 14 }}>
                {pollutants?.NO2?.value != null ? pollutants.NO2.value : "--"}
              </div>
            </div>

            {/* SO2 */}
            <div
              style={{
                background: "#FFFFFF",
                borderRadius: 10,
                border: "1px solid #E2E8F0",
                borderTop: "3.5px solid #06B6D4",
                padding: "14px 12px 18px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", color: "#64748B", fontSize: 12, fontWeight: 700 }}>
                <span>SO₂</span>
                <span style={{ fontSize: 11, cursor: "help" }} title="Khí SO2 (ppb)">ⓘ</span>
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, color: "#0F172A", marginTop: 14 }}>
                {pollutants?.SO2?.value != null ? pollutants.SO2.value : "--"}
              </div>
            </div>

            {/* CO */}
            <div
              style={{
                background: "#FFFFFF",
                borderRadius: 10,
                border: "1px solid #E2E8F0",
                borderTop: "3.5px solid #3B82F6",
                padding: "14px 12px 18px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", color: "#64748B", fontSize: 12, fontWeight: 700 }}>
                <span>CO</span>
                <span style={{ fontSize: 11, cursor: "help" }} title="Khí CO (ppm)">ⓘ</span>
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, color: "#0F172A", marginTop: 14 }}>
                {pollutants?.CO?.value != null ? pollutants.CO.value : "--"}
              </div>
            </div>

            {/* O3 */}
            <div
              style={{
                background: "#FFFFFF",
                borderRadius: 10,
                border: "1px solid #E2E8F0",
                borderTop: "3.5px solid #6366F1",
                padding: "14px 12px 18px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", color: "#64748B", fontSize: 12, fontWeight: 700 }}>
                <span>O₃</span>
                <span style={{ fontSize: 11, cursor: "help" }} title="Khí Ozone O3 (ppb)">ⓘ</span>
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, color: "#0F172A", marginTop: 14 }}>
                {pollutants?.O3?.value != null ? pollutants.O3.value : "--"}
              </div>
            </div>
          </div>
        </section>

        {/* --- XU HƯỚNG AQI TRONG 24 GIỜ & THÔNG TIN TRẠM --- */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2.3fr 1.3fr",
            gap: 16,
          }}
        >
          {/* Cột 1: Biểu đồ xu hướng AQI 24h */}
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: 14,
              border: "1px solid #E2E8F0",
              padding: "20px 22px",
              boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 14,
              }}
            >
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#0F172A" }}>
                Xu hướng AQI trong 24 giờ
              </h3>
              <span style={{ fontSize: 11, color: "#64748B", background: "#F1F5F9", padding: "3px 8px", borderRadius: 4 }}>
                {station.name ? `Trạm ${station.name}` : ""}
              </span>
            </div>

            {/* Biểu đồ SVG */}
            {renderHistoryChart()}
          </div>

          {/* Cột 2: Thông tin trạm */}
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: 14,
              border: "1px solid #E2E8F0",
              padding: "20px 22px",
              boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
            }}
          >
            <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 700, color: "#0F172A" }}>
              Thông tin trạm
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #F1F5F9", paddingBottom: 10 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#64748B" }}>
                  <span>🏛️</span>
                  <span>Thành phố / tỉnh</span>
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>
                  {station.city || station.province || "Đà Nẵng"}
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #F1F5F9", paddingBottom: 10 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#64748B" }}>
                  <span>🌐</span>
                  <span>Quốc gia</span>
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>
                  {station.country || "Vietnam"}
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #F1F5F9", paddingBottom: 10 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#64748B" }}>
                  <span>📍</span>
                  <span>Tọa độ GPS</span>
                </span>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#0F172A", fontFamily: "monospace" }}>
                  {station.latitude && station.longitude
                    ? `${Number(station.latitude).toFixed(4)}, ${Number(station.longitude).toFixed(4)}`
                    : "--"}
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#64748B" }}>
                  <span>🏷️</span>
                  <span>Mã trạm</span>
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#2563EB", background: "#EFF6FF", padding: "2px 8px", borderRadius: 4 }}>
                  Trạm #{String(station.id || 1).padStart(2, "0")}
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

