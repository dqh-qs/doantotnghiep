import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";

import AirQuality from "./pages/AirQuality";
import StationLocation from "./pages/StationLocation";
import Weather from "./pages/Weather";
import AiForecast from "./pages/AiForecast";
import SystemMonitoring from "./pages/SystemMonitoring";
import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";

// Khung layout chung (Sidebar + Topbar) cho cac trang du bao, he thong
function Layout({ children }) {
  return (
    <div style={{ display: "flex" }}>
      <Sidebar />
      <div style={{ flex: 1 }}>
        <Topbar />
        {children}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Trang dang nhap - khong co Sidebar/Topbar */}
        <Route path="/login" element={<Login />} />

        {/* Trang quan tri - khong co Sidebar/Topbar, co navbar rieng */}
        <Route path="/admin" element={<AdminDashboard />} />

        {/* Trang giam sat mang luoi Da Nang (Bản đồ) - day du sidebar + map + kpi */}
        <Route path="/" element={<Navigate to="/air-quality" replace />} />
        <Route path="/air-quality" element={<AirQuality />} />

        {/* Trang chi tiet vi tri tram (Vị trí) - 1:1 theo Lowcoder */}
        <Route path="/location" element={<StationLocation />} />
        <Route path="/station" element={<StationLocation />} />

        {/* Cac trang con lai - dung Layout chung */}
        <Route
          path="/weather"
          element={
            <Layout>
              <Weather />
            </Layout>
          }
        />
        {/* Trang du bao chat luong khong khi bang AI 24h - day du sidebar + KPI + chart 24h */}
        <Route path="/forecast" element={<AiForecast />} />
        {/* Trang quan tri & nhat ky he thong - day du sidebar + KPI + logs 1:1 theo Lowcoder */}
        <Route path="/system" element={<SystemMonitoring />} />

        {/* Bat ky duong dan nao khac -> quay ve trang chinh */}
        <Route path="*" element={<Navigate to="/air-quality" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
