import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { fetchDashboardOverview } from "../services/airQualityService";
import { DANANG_CAMERAS } from "../data/danangCameras";
import CameraLiveModal from "../components/CameraLiveModal";

// Helper: Chuyển đổi chỉ số AQI sang nhãn mức độ và mã màu tiêu chuẩn
function getAqiStatusAndColor(aqi) {
  if (aqi == null || aqi === undefined) {
    return { text: "Chưa có", color: "#94A3B8", bg: "#F1F5F9", textClass: "#64748B" };
  }
  if (aqi <= 50) {
    return { text: "Tốt", color: "#10B981", bg: "#ECFDF5", textClass: "#059669" };
  }
  if (aqi <= 100) {
    return { text: "Trung bình", color: "#EAB308", bg: "#FEF3C7", textClass: "#D97706" };
  }
  if (aqi <= 150) {
    return { text: "Kém (nhạy cảm)", color: "#F97316", bg: "#FFEDD5", textClass: "#EA580C" };
  }
  if (aqi <= 200) {
    return { text: "Xấu", color: "#EF4444", bg: "#FEE2E2", textClass: "#DC2626" };
  }
  if (aqi <= 300) {
    return { text: "Rất xấu", color: "#8B5CF6", bg: "#EDE9FE", textClass: "#7C3AED" };
  }
  return { text: "Nguy hại", color: "#881337", bg: "#FFE4E6", textClass: "#9F1239" };
}

// Helper: Chuyển đổi mã ô nhiễm viết tắt sang tên đầy đủ
function getPollutantLabel(code) {
  switch (code) {
    case "p2":
      return "PM2.5 (bụi mịn)";
    case "p1":
      return "PM10 (bụi)";
    case "o3":
      return "Ozone (O3)";
    case "n2":
      return "NO2";
    case "s2":
      return "SO2";
    case "co":
      return "CO";
    default:
      return code || "PM2.5 (bụi mịn)";
  }
}

// Helper: Hướng gió từ góc độ (0 - 360)
function getWindDirectionText(deg) {
  if (deg == null) return "";
  const directions = [
    "Bắc",
    "Đông Bắc",
    "Đông",
    "Đông Nam",
    "Nam",
    "Tây Nam",
    "Tây",
    "Tây Bắc",
  ];
  const index = Math.round(((deg % 360) / 45)) % 8;
  return directions[index];
}

// Helper: Định dạng thời gian
function formatUpdateTime(dateStr) {
  if (!dateStr) return "Chưa cập nhật";
  try {
    const d = new Date(dateStr);
    const time = d.toLocaleTimeString("vi-VN", { hour12: false });
    const date = d.toLocaleDateString("vi-VN");
    return `${time} ${date} (giờ VN)`;
  } catch {
    return dateStr;
  }
}

export default function DaNangAirQuality() {
  const [dashboardData, setDashboardData] = useState(null);
  const [stations, setStations] = useState([]);
  const [selectedStation, setSelectedStation] = useState(null);
  const [isListOpen, setIsListOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("bando");
  const [showCameras, setShowCameras] = useState(true);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [activeDrawerTab, setActiveDrawerTab] = useState("stations");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const mapRef = useRef(null);
  const leafletInstance = useRef(null);
  const markersLayerRef = useRef(null);
  const cameraLayerRef = useRef(null);

  // Gọi API lấy dữ liệu tổng quan từ backend
  async function loadData(isManual = false) {
    try {
      if (isManual) setRefreshing(true);
      const res = await fetchDashboardOverview();
      setDashboardData(res);

      // Chuyển đổi dữ liệu trạm từ API
      const enrichedStations = (res.map || []).map((s) => {
        const aqiInfo = getAqiStatusAndColor(s.aqius);
        const windDir = getWindDirectionText(s.windDirection);
        return {
          id: s.id,
          name: s.name,
          lat: Number(s.lat),
          lng: Number(s.lng),
          aqi: s.aqius != null ? s.aqius : 0,
          aqiStatus: aqiInfo.text,
          aqiColor: aqiInfo.color,
          aqiBg: aqiInfo.bg,
          aqiTextClass: aqiInfo.textClass,
          aqiCn: s.aqicn != null ? s.aqicn : 0,
          temperature: s.temperature != null ? s.temperature : 0,
          heatIndex: s.heatIndex != null ? s.heatIndex : s.temperature,
          humidity: s.humidity != null ? s.humidity : 0,
          windSpeed: s.windSpeed != null ? s.windSpeed : 0,
          windText: s.windSpeed != null ? `${s.windSpeed} m/s ${windDir ? `(${windDir})` : ""}`.trim() : "0 m/s",
          pressure: s.pressure != null ? s.pressure : 0,
          mainPollutant: getPollutantLabel(s.mainPollutant),
          online: !!s.online,
          updatedAt: s.updatedAt,
          formattedTime: formatUpdateTime(s.updatedAt),
          stationCode: `Trạm #${String(s.id).padStart(2, "0")}`,
          province:
            s.name.includes("Nam") ||
            s.name.includes("Tra My") ||
            s.name.includes("Hoi An") ||
            s.name.includes("Ha Lam") ||
            s.name.includes("Tien Phuoc") ||
            s.name.includes("Que Son") ||
            s.name.includes("Kham Duc") ||
            s.name.includes("Dong Giang") ||
            s.name.includes("Thanh My")
              ? "Tỉnh Quảng Nam"
              : "TP. Đà Nẵng",
        };
      });

      setStations(enrichedStations);

      // Cập nhật trạm đang chọn nếu đã có, hoặc mặc định chọn trạm đầu tiên
      setSelectedStation((prev) => {
        if (!prev) return enrichedStations[0] || null;
        const found = enrichedStations.find((item) => item.id === prev.id);
        return found || enrichedStations[0] || null;
      });

      setError(null);
    } catch (err) {
      console.error("Lỗi tải dữ liệu từ API:", err);
      setError(err.message || "Không thể kết nối đến Backend API");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  // Tải dữ liệu lần đầu và thiết lập chu kỳ tự động cập nhật mỗi 60 giây
  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      loadData();
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Khởi tạo bản đồ Leaflet
  useEffect(() => {
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    const initMap = () => {
      if (!window.L || !mapRef.current) return;

      if (!leafletInstance.current) {
        const map = window.L.map(mapRef.current, {
          center: [15.85, 108.15],
          zoom: 9.5,
          zoomControl: true,
        });

        window.L.tileLayer("https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", {
          maxZoom: 20,
          subdomains: ["mt0", "mt1", "mt2", "mt3"],
          attribution: "Leaflet | &copy; Google Maps",
        }).addTo(map);

        markersLayerRef.current = window.L.layerGroup().addTo(map);
        cameraLayerRef.current = window.L.layerGroup().addTo(map);
        leafletInstance.current = map;
      }

      // Vẽ các điểm tròn chỉ số AQI cho từng trạm
      if (markersLayerRef.current && stations.length > 0) {
        markersLayerRef.current.clearLayers();

        stations.forEach((station) => {
          if (!station.lat || !station.lng) return;

          const markerHtml = `
            <div style="
              width: 34px;
              height: 34px;
              background: ${station.aqiColor};
              border: 2px solid #FFFFFF;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              color: #FFFFFF;
              font-weight: 700;
              font-size: 13px;
              box-shadow: 0 3px 8px rgba(0,0,0,0.35);
              cursor: pointer;
              transition: transform 0.15s ease;
            ">
              ${station.aqi}
            </div>
          `;

          const customIcon = window.L.divIcon({
            className: "aqi-custom-marker",
            html: markerHtml,
            iconSize: [34, 34],
            iconAnchor: [17, 17],
          });

          const marker = window.L.marker([station.lat, station.lng], { icon: customIcon });

          marker.on("click", () => {
            setSelectedStation(station);
            if (leafletInstance.current) {
              leafletInstance.current.panTo([station.lat, station.lng], { animate: true });
            }
          });

          markersLayerRef.current.addLayer(marker);
        });
      }

      if (leafletInstance.current) {
        setTimeout(() => { leafletInstance.current?.invalidateSize(); }, 200);
      }
    };

    if (!window.L) {
      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.onload = initMap;
      document.body.appendChild(script);
    } else {
      initMap();
    }
  }, [stations]);

  // Vẽ các điểm Camera giao thông trực tiếp (Nguồn: camera.0511.vn)
  useEffect(() => {
    if (!leafletInstance.current) return;

    if (!cameraLayerRef.current) {
      cameraLayerRef.current = window.L.layerGroup().addTo(leafletInstance.current);
    }

    cameraLayerRef.current.clearLayers();
    if (!showCameras) return;

    DANANG_CAMERAS.forEach((cam) => {
      const camMarkerHtml = `
        <div style="
          position: relative;
          width: 36px;
          height: 36px;
          background: linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%);
          border: 2px solid #FFFFFF;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 10px rgba(30, 64, 175, 0.45);
          cursor: pointer;
          transition: transform 0.15s ease;
        ">
          <span style="font-size: 15px;">📹</span>
          <span style="
            position: absolute;
            top: -2px;
            right: -2px;
            width: 9px;
            height: 9px;
            background: #EF4444;
            border: 2px solid #FFFFFF;
            border-radius: 50%;
          "></span>
        </div>
      `;

      const camIcon = window.L.divIcon({
        className: "danang-camera-marker",
        html: camMarkerHtml,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const marker = window.L.marker([cam.lat, cam.lng], { icon: camIcon });

      marker.bindTooltip(
        `<div style="font-weight: 700; color: #1E40AF; font-size: 12px;">📹 ${cam.name}</div>
         <div style="font-size: 11px; color: #64748B;">${cam.district} • Bấm xem Live trực tiếp</div>`,
        { direction: "top", offset: [0, -18] }
      );

      marker.on("click", () => {
        setSelectedCamera(cam);
        if (leafletInstance.current) {
          leafletInstance.current.panTo([cam.lat, cam.lng], { animate: true });
        }
      });

      cameraLayerRef.current.addLayer(marker);
    });
  }, [showCameras]);


  // Tự động điều chỉnh kích thước bản đồ khi mở / đóng danh sách trạm
  useEffect(() => {
    if (leafletInstance.current) {
      setTimeout(() => { leafletInstance.current?.invalidateSize(); }, 150);
    }
  }, [isListOpen]);

  // Nút Toàn khu vực
  const handleResetView = () => {
    if (leafletInstance.current) {
      leafletInstance.current.setView([15.85, 108.15], 9.5);
    }
  };

  // Nút Vị trí tôi
  const handleMyLocation = () => {
    if (navigator.geolocation && leafletInstance.current) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          leafletInstance.current.setView([pos.coords.latitude, pos.coords.longitude], 12);
        },
        () => {
          // Mặc định tâm TP Đà Nẵng nếu người dùng chặn định vị
          leafletInstance.current.setView([16.054, 108.22], 12);
        }
      );
    }
  };

  // Chọn trạm từ danh sách
  const handleSelectStationFromList = (station) => {
    setSelectedStation(station);
    if (leafletInstance.current && station.lat && station.lng) {
      leafletInstance.current.panTo([station.lat, station.lng], { animate: true });
    }
  };

  // Các giá trị KPI từ API (có fallback an toàn)
  const summary = dashboardData?.summary || {};
  const totalStations = summary.totalStations ?? stations.length;
  const onlineStations = summary.onlineStations ?? 0;
  const onlineRate = summary.onlineRate ?? 0;
  const averageAqiUs = summary.averageAqiUs != null ? Math.round(summary.averageAqiUs) : 53;
  const aqiUsLevel = summary.aqiUsLevel || "TRUNG BÌNH";
  const averageTemp = summary.averageTemperature != null ? summary.averageTemperature : 29.2;
  const averageAqiCn = summary.averageAqiCn != null ? Math.round(summary.averageAqiCn) : 15;
  const aqiCnLevel = summary.aqiCnLevel || "TỐT";

  // Dữ liệu phân bố cho biểu đồ Donut từ API
  const dist = dashboardData?.statusDistribution || { good: 0, moderate: 15, sensitive: 0, unhealthy: 0, total: 15 };
  const totalDist = dist.total || 15;
  const moderatePercent = Math.round((dist.moderate / totalDist) * 100) || 100;

  // Dữ liệu thời gian cập nhật tổng thể
  const metaLastUpdated = dashboardData?.meta?.lastUpdated
    ? formatUpdateTime(dashboardData.meta.lastUpdated)
    : "22:00:00 28/08/2026 (giờ VN)";

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "#F4F7FB",
        color: "#1E2933",
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
        <button
          onClick={() => setActiveTab("bando")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 14px",
            borderRadius: 8,
            border: "none",
            background: activeTab === "bando" ? "#EFF6FF" : "transparent",
            color: activeTab === "bando" ? "#2563EB" : "#64748B",
            fontWeight: activeTab === "bando" ? 600 : 500,
            fontSize: 13,
            cursor: "pointer",
            textAlign: "left",
            width: "100%",
          }}
        >
          <span>📍</span>
          <span>Bản đồ</span>
        </button>

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
            width: "100%",
            boxSizing: "border-box",
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
      <main style={{ flex: 1, padding: "20px 24px", overflowY: "auto" }}>
        {/* Thanh cảnh báo lỗi nếu API gặp sự cố */}
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
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>⚠️ Không thể kết nối API Backend: {error} (Đang dùng dữ liệu sẵn có)</div>
            <button
              onClick={() => loadData(true)}
              style={{
                padding: "4px 10px",
                background: "#DC2626",
                color: "#FFFFFF",
                border: "none",
                borderRadius: 5,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              Thử lại
            </button>
          </div>
        )}

        {/* --- 5 THẺ CHỈ SỐ KPI TỔNG QUAN (DỮ LIỆU TỪ API /api/dashboard/overview) --- */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gap: 14,
            marginBottom: 20,
          }}
        >
          {/* Card 1: Tổng số trạm */}
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: 12,
              padding: "16px 18px",
              border: "1px solid #E2E8F0",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#64748B", fontSize: 11, fontWeight: 700, letterSpacing: "0.04em" }}>
              <span>TỔNG SỐ TRẠM</span>
              <span style={{ fontSize: 16 }}>📶</span>
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, color: "#0F172A", marginTop: 8, lineHeight: 1 }}>
              {loading ? "..." : totalStations}
            </div>
            <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 6 }}>Trạm trong hệ thống</div>
          </div>

          {/* Card 2: Trạm hoạt động */}
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: 12,
              padding: "16px 18px",
              border: "1px solid #E2E8F0",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#64748B", fontSize: 11, fontWeight: 700, letterSpacing: "0.04em" }}>
              <span>TRẠM HOẠT ĐỘNG</span>
              <span style={{ color: "#10B981", fontSize: 16 }}>📡</span>
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, color: "#10B981", marginTop: 8, lineHeight: 1 }}>
              {loading ? "..." : onlineStations}
            </div>
            <div style={{ fontSize: 11, color: "#10B981", fontWeight: 600, marginTop: 6 }}>
              {onlineRate}% hoạt động
            </div>
          </div>

          {/* Card 3: AQI (US) Trung bình */}
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: 12,
              padding: "16px 18px",
              border: "1px solid #E2E8F0",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#64748B", fontSize: 11, fontWeight: 700, letterSpacing: "0.04em" }}>
              <span>AQI (US) TRUNG BÌNH</span>
              <span style={{ color: "#EAB308", fontSize: 16 }}>💨</span>
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, color: "#D97706", marginTop: 8, lineHeight: 1 }}>
              {loading ? "..." : averageAqiUs}
            </div>
            <div style={{ fontSize: 11, color: "#D97706", fontWeight: 700, marginTop: 6, letterSpacing: "0.02em" }}>
              {aqiUsLevel.toUpperCase()}
            </div>
          </div>

          {/* Card 4: Nhiệt độ trung bình */}
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: 12,
              padding: "16px 18px",
              border: "1px solid #E2E8F0",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#64748B", fontSize: 11, fontWeight: 700, letterSpacing: "0.04em" }}>
              <span>NHIỆT ĐỘ TRUNG BÌNH</span>
              <span style={{ color: "#F97316", fontSize: 16 }}>🌡️</span>
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, color: "#EA580C", marginTop: 8, lineHeight: 1 }}>
              {loading ? "..." : `${averageTemp}°C`}
            </div>
            <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 6 }}>Trung bình các trạm</div>
          </div>

          {/* Card 5: AQI (Trung Quốc) TB */}
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: 12,
              padding: "16px 18px",
              border: "1px solid #E2E8F0",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "#64748B", fontSize: 11, fontWeight: 700, letterSpacing: "0.04em" }}>
              <span>AQI (TRUNG QUỐC) TB</span>
              <span style={{ color: "#10B981", fontSize: 16 }}>🎛️</span>
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, color: "#059669", marginTop: 8, lineHeight: 1 }}>
              {loading ? "..." : averageAqiCn}
            </div>
            <div style={{ fontSize: 11, color: "#059669", fontWeight: 700, marginTop: 6 }}>
              {aqiCnLevel.toUpperCase()}
            </div>
          </div>
        </section>

        {/* --- KHU VỰC BẢN ĐỒ & CHI TIẾT TRẠM --- */}
        <section
          style={{
            background: "#FFFFFF",
            borderRadius: 14,
            border: "1px solid #E2E8F0",
            boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
            overflow: "hidden",
            marginBottom: 20,
          }}
        >
          {/* Header thanh công cụ bản đồ */}
          <div
            style={{
              padding: "12px 18px",
              borderBottom: "1px solid #E2E8F0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "#FFFFFF",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 14, color: "#0F172A" }}>
              <span>📖</span>
              <span>Mạng lưới trạm quan trắc Thành phố Đà Nẵng</span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {/* Nút Làm mới API */}
              <button
                onClick={() => loadData(true)}
                disabled={refreshing}
                title="Tải lại dữ liệu mới nhất từ API"
                style={{
                  padding: "6px 12px",
                  background: "#F8FAFC",
                  border: "1px solid #CBD5E1",
                  borderRadius: 6,
                  fontSize: 12,
                  color: "#334155",
                  fontWeight: 500,
                  cursor: refreshing ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <span>{refreshing ? "⏳" : "🔄"}</span>
                <span>{refreshing ? "Đang tải..." : "Làm mới"}</span>
              </button>

              <button
                onClick={handleResetView}
                style={{
                  padding: "6px 12px",
                  background: "#FFFFFF",
                  border: "1px solid #CBD5E1",
                  borderRadius: 6,
                  fontSize: 12,
                  color: "#334155",
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Toàn khu vực
              </button>

              <button
                onClick={handleMyLocation}
                style={{
                  padding: "6px 12px",
                  background: "#FFFFFF",
                  border: "1px solid #CBD5E1",
                  borderRadius: 6,
                  fontSize: 12,
                  color: "#334155",
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Vị trí tôi
              </button>

              <button
                onClick={() => setIsListOpen(!isListOpen)}
                style={{
                  padding: "6px 12px",
                  background: "#FFFFFF",
                  border: "1px solid #CBD5E1",
                  borderRadius: 6,
                  fontSize: 12,
                  color: "#334155",
                  fontWeight: 500,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <span>{isListOpen ? "› Thu gọn danh sách" : "‹ Mở rộng danh sách"}</span>
              </button>
            </div>
          </div>

          {/* Vùng chứa bản đồ + popup + danh sách bên phải */}
          <div style={{ position: "relative", height: 530, display: "flex" }}>
            <div ref={mapRef} style={{ flex: 1, height: "100%", zIndex: 1 }} />

            {/* Banner thông tin nổi góc trên bên trái */}
            <div
              style={{
                position: "absolute",
                top: 14,
                left: 14,
                zIndex: 400,
                background: "rgba(255, 255, 255, 0.95)",
                padding: "8px 14px",
                borderRadius: 8,
                boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
                border: "1px solid #E2E8F0",
                pointerEvents: "none",
              }}
            >
              <div style={{ fontWeight: 800, fontSize: 12, color: "#0F172A", letterSpacing: "0.02em" }}>
                THÀNH PHỐ ĐÀ NẴNG - MẠNG LƯỚI QUAN TRẮC KHÔNG KHÍ
              </div>
              <div style={{ fontSize: 10, color: "#64748B", marginTop: 2 }}>
                {totalStations} vị trí quan trắc • Cập nhật: {metaLastUpdated}
              </div>
            </div>

            
            {/* Nút bật / tắt Camera giao thông trực tiếp */}
            <button
              onClick={() => setShowCameras((prev) => !prev)}
              style={{
                position: "absolute",
                top: 14,
                right: isListOpen ? 336 : 170,
                zIndex: 400,
                background: showCameras ? "#2563EB" : "#FFFFFF",
                color: showCameras ? "#FFFFFF" : "#334155",
                border: showCameras ? "1px solid #1D4ED8" : "1px solid #CBD5E1",
                borderRadius: 6,
                padding: "7px 12px",
                fontSize: 12,
                fontWeight: 600,
                boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                transition: "all 0.15s ease",
              }}
              title="Bật/tắt 5 camera trực tiếp từ camera.0511.vn"
            >
              <span>📹</span>
              <span>Camera ({DANANG_CAMERAS.length})</span>
              {showCameras && (
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "#4ADE80",
                  }}
                />
              )}
            </button>

            {/* Nút bật danh sách trạm nếu đang thu gọn */}
            {!isListOpen && (
              <button
                onClick={() => setIsListOpen(true)}
                style={{
                  position: "absolute",
                  top: 14,
                  right: 14,
                  zIndex: 400,
                  background: "#FFFFFF",
                  border: "1px solid #CBD5E1",
                  borderRadius: 6,
                  padding: "7px 12px",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#334155",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
                  cursor: "pointer",
                }}
              >
                ‹ Hiện danh sách trạm
              </button>
            )}

            {/* Bảng chú giải màu AQI góc dưới trái (Legend) */}
            <div
              style={{
                position: "absolute",
                bottom: 24,
                left: 14,
                zIndex: 400,
                background: "rgba(255, 255, 255, 0.96)",
                padding: "10px 14px",
                borderRadius: 8,
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                fontSize: 11,
                border: "1px solid #E2E8F0",
                minWidth: 155,
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 10, color: "#0F172A", marginBottom: 6, textTransform: "uppercase" }}>
                Màu theo bụi mịn PM2.5 (AQI US)
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#10B981" }} />
                  <span style={{ color: "#334155" }}>0-50: Tốt</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#EAB308" }} />
                  <span style={{ color: "#334155" }}>51-100: Trung bình</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#F97316" }} />
                  <span style={{ color: "#334155" }}>101-150: Kém (nhạy cảm)</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#EF4444" }} />
                  <span style={{ color: "#334155" }}>151-200: Xấu</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#8B5CF6" }} />
                  <span style={{ color: "#334155" }}>201-300: Rất xấu</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#881337" }} />
                  <span style={{ color: "#334155" }}>&gt; 300: Nguy hại</span>
                </div>
              </div>
            </div>

            {/* BẢNG THÔNG TIN CHI TIẾT TRẠM ĐANG CHỌN (POPUP NỔI) */}
            {selectedStation && (
              <div
                style={{
                  position: "absolute",
                  top: 70,
                  left: "50%",
                  transform: "translateX(-50%)",
                  zIndex: 450,
                  width: 320,
                  background: "#FFFFFF",
                  borderRadius: 12,
                  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
                  border: "1px solid #E2E8F0",
                  overflow: "hidden",
                }}
              >
                {/* Header Popup */}
                <div style={{ padding: "12px 14px 10px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0F172A" }}>{selectedStation.name}</h3>
                    <div style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>
                      {selectedStation.province} • {selectedStation.stationCode}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        fontSize: 16,
                        fontWeight: 800,
                        color: selectedStation.aqiTextClass,
                        background: selectedStation.aqiBg,
                        padding: "2px 8px",
                        borderRadius: 6,
                      }}
                    >
                      {selectedStation.aqi}
                    </span>
                    <button
                      onClick={() => setSelectedStation(null)}
                      style={{
                        background: "none",
                        border: "none",
                        fontSize: 14,
                        color: "#94A3B8",
                        cursor: "pointer",
                        padding: "0 2px",
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Banner cảnh báo mức độ */}
                <div
                  style={{
                    background: selectedStation.aqiBg,
                    padding: "8px 14px",
                    fontSize: 11,
                    fontWeight: 600,
                    color: selectedStation.aqiTextClass,
                    borderTop: "1px solid rgba(0,0,0,0.06)",
                    borderBottom: "1px solid rgba(0,0,0,0.06)",
                  }}
                >
                  AQI (US) {selectedStation.aqi} — {selectedStation.aqiStatus} • Ô nhiễm chính: {selectedStation.mainPollutant}
                </div>

                {/* Grid 6 chỉ số môi trường từ API */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 14px", padding: "14px" }}>
                  <div>
                    <div style={{ fontSize: 10, color: "#94A3B8", fontWeight: 700 }}>AQI (CN)</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#0F172A", marginTop: 2 }}>{selectedStation.aqiCn}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: "#94A3B8", fontWeight: 700 }}>NHIỆT ĐỘ</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#0F172A", marginTop: 2 }}>{selectedStation.temperature}°C</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: "#94A3B8", fontWeight: 700 }}>CHỈ SỐ NHIỆT</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#0F172A", marginTop: 2 }}>{selectedStation.heatIndex}°C</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: "#94A3B8", fontWeight: 700 }}>ĐỘ ẨM</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#0F172A", marginTop: 2 }}>{selectedStation.humidity}%</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: "#94A3B8", fontWeight: 700 }}>GIÓ</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#0F172A", marginTop: 2 }}>{selectedStation.windText}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: "#94A3B8", fontWeight: 700 }}>ÁP SUẤT</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#0F172A", marginTop: 2 }}>{selectedStation.pressure} hPa</div>
                  </div>
                </div>

                {/* Chân Popup */}
                <div style={{ padding: "8px 14px", background: "#F8FAFC", borderTop: "1px solid #F1F5F9", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 10, color: "#94A3B8" }}>
                  <span>Cập nhật: {selectedStation.formattedTime}</span>
                  <Link
                    to={`/location?id=${selectedStation.id}`}
                    style={{
                      color: "#2563EB",
                      fontWeight: 600,
                      textDecoration: "none",
                      fontSize: 11,
                      padding: "2px 8px",
                      borderRadius: 4,
                      background: "#EFF6FF",
                      border: "1px solid #BFDBFE",
                    }}
                  >
                    Xem chi tiết vị trí ↗
                  </Link>
                </div>
              </div>
            )}

            {/* DANH SÁCH 15 TRẠM BÊN PHẢI (DRAWER) */}
            {isListOpen && (
              <div
                style={{
                  width: 320,
                  height: "100%",
                  background: "#FFFFFF",
                  borderLeft: "1px solid #E2E8F0",
                  display: "flex",
                  flexDirection: "column",
                  zIndex: 350,
                  boxShadow: "-2px 0 10px rgba(0,0,0,0.05)",
                }}
              >
                {/* Header danh sách trạm */}
                
                {/* Header danh sách trạm & Camera */}
                <div style={{ display: "flex", alignItems: "center", borderBottom: "1px solid #E2E8F0", background: "#F8FAFC" }}>
                  <button
                    onClick={() => setActiveDrawerTab("stations")}
                    style={{
                      flex: 1,
                      padding: "12px 8px",
                      fontSize: 12,
                      fontWeight: activeDrawerTab === "stations" ? 700 : 500,
                      color: activeDrawerTab === "stations" ? "#2563EB" : "#64748B",
                      borderBottom: activeDrawerTab === "stations" ? "2px solid #2563EB" : "none",
                      background: activeDrawerTab === "stations" ? "#FFFFFF" : "transparent",
                      border: "none",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                    }}
                  >
                    <span>📊</span>
                    <span>Trạm ({totalStations})</span>
                  </button>
                  <button
                    onClick={() => setActiveDrawerTab("cameras")}
                    style={{
                      flex: 1,
                      padding: "12px 8px",
                      fontSize: 12,
                      fontWeight: activeDrawerTab === "cameras" ? 700 : 500,
                      color: activeDrawerTab === "cameras" ? "#2563EB" : "#64748B",
                      borderBottom: activeDrawerTab === "cameras" ? "2px solid #2563EB" : "none",
                      background: activeDrawerTab === "cameras" ? "#FFFFFF" : "transparent",
                      border: "none",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                    }}
                  >
                    <span>📹 Camera</span>
                    <span style={{ fontSize: 9, background: "#EF4444", color: "#FFF", padding: "1px 5px", borderRadius: 10, fontWeight: 700 }}>
                      5
                    </span>
                  </button>
                  <button
                    onClick={() => setIsListOpen(false)}
                    style={{
                      background: "none",
                      border: "none",
                      padding: "8px 12px",
                      cursor: "pointer",
                      color: "#94A3B8",
                      fontSize: 14,
                      fontWeight: 700,
                    }}
                    title="Thu gọn danh sách"
                  >
                    ✕
                  </button>
                </div>

                {activeDrawerTab === "stations" ? (
                  <div style={{ flex: 1, overflowY: "auto", padding: "10px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, padding: "0 4px" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#64748B" }}>MẠNG LƯỚI QUAN TRẮC</span>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: onlineStations > 0 ? "#10B981" : "#64748B",
                          background: onlineStations > 0 ? "#ECFDF5" : "#F1F5F9",
                          padding: "2px 8px",
                          borderRadius: 4,
                          border: "1px solid rgba(0,0,0,0.08)",
                        }}
                      >
                        {onlineStations}/{totalStations} TRỰC TUYẾN
                      </span>
                    </div>
                    {stations.map((s) => {
                      const isSelected = selectedStation?.id === s.id;
                      return (
                        <div
                          key={s.id}
                          onClick={() => handleSelectStationFromList(s)}
                          style={{
                            padding: "12px 14px",
                            borderRadius: 8,
                            border: isSelected ? "1.5px solid #2563EB" : "1px solid #E2E8F0",
                            background: isSelected ? "#F8FAFC" : "#FFFFFF",
                            marginBottom: 8,
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontWeight: 700, fontSize: 14, color: "#0F172A" }}>{s.name}</span>
                            <span style={{ fontWeight: 800, fontSize: 16, color: s.aqiTextClass }}>{s.aqi}</span>
                          </div>

                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#64748B", marginTop: 4 }}>
                            <span style={{ color: s.aqiTextClass, fontWeight: 600 }}>{s.aqiStatus}</span>
                            <span>
                              AQI(CN): {s.aqiCn} • {s.temperature}°C
                            </span>
                          </div>

                          <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}>
                            <span style={{ color: s.online ? "#10B981" : "#EF4444" }}>●</span>
                            <span>
                              {s.online ? "Đang trực tuyến" : "Ngoại tuyến"} • Độ ẩm {s.humidity}% • Gió {s.windSpeed} m/s
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ flex: 1, overflowY: "auto", padding: "10px" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B", marginBottom: 10, padding: "0 4px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>DANH SÁCH CAMERA 0511.VN</span>
                      <span style={{ color: "#EF4444", fontSize: 10, display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#EF4444" }} />
                        PHÁT TRỰC TIẾP
                      </span>
                    </div>
                    {DANANG_CAMERAS.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => {
                          setSelectedCamera(c);
                          if (leafletInstance.current) {
                            leafletInstance.current.panTo([c.lat, c.lng], { animate: true });
                          }
                        }}
                        style={{
                          padding: "12px 14px",
                          borderRadius: 10,
                          border: "1px solid #E2E8F0",
                          background: "#FFFFFF",
                          marginBottom: 8,
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = "#2563EB";
                          e.currentTarget.style.background = "#F8FAFC";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = "#E2E8F0";
                          e.currentTarget.style.background = "#FFFFFF";
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <span style={{ fontWeight: 700, fontSize: 13, color: "#0F172A" }}>{c.name}</span>
                          <span style={{ fontSize: 10, background: "#EFF6FF", color: "#2563EB", padding: "2px 6px", borderRadius: 4, fontWeight: 600 }}>
                            {c.badge}
                          </span>
                        </div>
                        <div style={{ fontSize: 11, color: "#64748B", marginTop: 4 }}>
                          📍 {c.address}
                        </div>
                        <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: 10, color: "#94A3B8" }}>{c.district}</span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: "#2563EB" }}>
                            Xem Live ▶
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* --- 2 BIỂU ĐỒ SO SÁNH & PHÂN BỐ Ở ĐÁY (TỰ ĐỘNG THEO DỮ LIỆU THỰC TẾ) --- */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "1.7fr 1fr",
            gap: 16,
          }}
        >
          {/* Biểu đồ 1 (Trái): So sánh AQI giữa các trạm */}
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: 14,
              border: "1px solid #E2E8F0",
              padding: "18px 20px",
              boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
            }}
          >
            <h4 style={{ margin: "0 0 2px", fontSize: 14, fontWeight: 700, color: "#0F172A" }}>
              So sánh AQI (bụi mịn PM2.5) giữa các trạm
            </h4>
            <div style={{ fontSize: 11, color: "#94A3B8", marginBottom: 16 }}>
              Dữ liệu quan trắc lúc {metaLastUpdated}
            </div>

            {/* Thanh bar chart ngang vẽ động theo dữ liệu trạm từ API */}
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {stations.map((s) => (
                <div key={s.id} style={{ display: "flex", alignItems: "center", fontSize: 11 }}>
                  <span style={{ width: 100, color: "#64748B", textAlign: "right", paddingRight: 10, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {s.name}
                  </span>
                  <div style={{ flex: 1, background: "#F1F5F9", height: 16, borderRadius: 3, overflow: "hidden" }}>
                    <div
                      style={{
                        width: `${Math.min(100, Math.max(5, (s.aqi / 100) * 100))}%`,
                        height: "100%",
                        background: s.aqiColor,
                        borderRadius: 3,
                        transition: "width 0.4s ease",
                      }}
                    />
                  </div>
                  <span style={{ width: 34, paddingLeft: 8, fontWeight: 700, color: s.aqiTextClass, fontSize: 11 }}>
                    {s.aqi}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Biểu đồ 2 (Phải): Phân bố mức AQI theo bụi mịn (Donut Chart) */}
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: 14,
              border: "1px solid #E2E8F0",
              padding: "18px 20px",
              boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <h4 style={{ margin: "0 0 2px", fontSize: 14, fontWeight: 700, color: "#0F172A" }}>
              Phân bố mức AQI theo bụi mịn
            </h4>
            <div style={{ fontSize: 11, color: "#94A3B8", marginBottom: 20 }}>Tổng cộng {totalStations} trạm</div>

            {/* Donut Chart SVG (Vòng tròn phân bố theo statusDistribution từ API) */}
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 220 }}>
              <svg width="190" height="190" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="38" fill="transparent" stroke="#F1F5F9" strokeWidth="16" />
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke="#EAB308"
                  strokeWidth="16"
                  strokeDasharray="238.76"
                  strokeDashoffset={238.76 - (238.76 * moderatePercent) / 100}
                />
                <text x="50" y="47" textAnchor="middle" fontSize="13" fontWeight="800" fill="#0F172A">
                  {totalStations} Trạm
                </text>
                <text x="50" y="60" textAnchor="middle" fontSize="9" fontWeight="600" fill="#D97706">
                  {moderatePercent}% Trung bình
                </text>
              </svg>
            </div>

            {/* Chú giải dưới biểu đồ donut */}
            <div style={{ display: "flex", justifyContent: "center", gap: 16, fontSize: 11, color: "#64748B", marginTop: "auto" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#10B981" }} />
                <span>Tốt ({dist.good || 0})</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#EAB308" }} />
                <span style={{ fontWeight: 600, color: "#D97706" }}>Trung bình ({dist.moderate || totalStations})</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Modal phát video trực tiếp Camera từ camera.0511.vn */}
      <CameraLiveModal
        camera={selectedCamera}
        onClose={() => setSelectedCamera(null)}
        onSelectCamera={(c) => setSelectedCamera(c)}
      />
    </div>
  );
}
