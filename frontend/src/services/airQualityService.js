import { getToken } from "./authService";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api";
const DEFAULT_API_KEY =
  import.meta.env.VITE_API_KEY || "ak_live_c8309aea8e45d9ec1dac752573a092aa5225aa9e66e0f3e6";

function getHeaders() {
  const token = getToken();
  const apiKey = localStorage.getItem("api_key") || DEFAULT_API_KEY;
  const headers = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (apiKey) headers["x-api-key"] = apiKey;
  return headers;
}

export async function fetchDashboardOverview() {
  const res = await fetch(`${API_BASE_URL}/dashboard/overview`, {
    headers: getHeaders(),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Lỗi khi gọi API (${res.status})`);
  }

  return res.json();
}

export async function fetchAllStations() {
  const res = await fetch(`${API_BASE_URL}/stations`, {
    headers: getHeaders(),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Lỗi khi lấy danh sách trạm (${res.status})`);
  }

  return res.json();
}

export async function fetchStationById(stationId) {
  const res = await fetch(`${API_BASE_URL}/stations/${stationId}`, {
    headers: getHeaders(),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Lỗi khi lấy chi tiết trạm (${res.status})`);
  }

  return res.json();
}

export async function fetchStationHistory(stationId, hours = 24) {
  const res = await fetch(`${API_BASE_URL}/stations/${stationId}/air-quality/history?hours=${hours}`, {
    headers: getHeaders(),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Lỗi khi lấy lịch sử trạm (${res.status})`);
  }

  return res.json();
}

export async function fetchSystemOverview(period = "24h") {
  const res = await fetch(`${API_BASE_URL}/v1/system/overview?period=${period}`, {
    headers: getHeaders(),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Lỗi khi lấy tổng quan hệ thống (${res.status})`);
  }

  const json = await res.json();
  return json.data || json;
}

export async function fetchSystemLogs({ page = 1, limit = 15, station_id, status } = {}) {
  const params = new URLSearchParams();
  if (page) params.append("page", page);
  if (limit) params.append("limit", limit);
  if (station_id) params.append("station_id", station_id);
  if (status && status !== "all") params.append("status", status);

  const res = await fetch(`${API_BASE_URL}/v1/system/logs?${params.toString()}`, {
    headers: getHeaders(),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Lỗi khi lấy nhật ký hệ thống (${res.status})`);
  }

  return res.json();
}

// =================== AI FORECAST SERVICE ===================

export async function fetchForecastOverview() {
  const res = await fetch(`${API_BASE_URL}/forecast/overview`, {
    headers: getHeaders(),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Lỗi khi lấy tổng quan dự báo AI (${res.status})`);
  }

  return res.json();
}

export async function fetchStationForecast(stationId, hours = 24) {
  const res = await fetch(`${API_BASE_URL}/forecast/station/${stationId}?hours=${hours}`, {
    headers: getHeaders(),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Lỗi khi lấy dự báo trạm (${res.status})`);
  }

  return res.json();
}

export async function triggerRunAiForecast(stationId = null, hours = 24) {
  const res = await fetch(`${API_BASE_URL}/forecast/run`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ station_id: stationId, hours }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Lỗi khi chạy mô hình dự báo (${res.status})`);
  }

  return res.json();
}
