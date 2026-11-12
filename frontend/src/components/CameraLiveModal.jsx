import React from "react";
import { DANANG_CAMERAS } from "../data/danangCameras";

export default function CameraLiveModal({ camera, onClose, onSelectCamera }) {
  if (!camera) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(15, 23, 42, 0.75)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 820,
          background: "#0F172A",
          borderRadius: 16,
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          color: "#FFFFFF",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "rgba(30, 41, 59, 0.6)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: "linear-gradient(135deg, #2563EB, #1D4ED8)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
                boxShadow: "0 4px 10px rgba(37, 99, 235, 0.3)",
              }}
            >
              📹
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#FFFFFF" }}>
                  {camera.name}
                </h3>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    background: "rgba(239, 68, 68, 0.2)",
                    border: "1px solid rgba(239, 68, 68, 0.4)",
                    color: "#F87171",
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: 12,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "#EF4444",
                      boxShadow: "0 0 6px #EF4444",
                    }}
                  />
                  LIVE
                </span>
              </div>
              <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>
                📍 {camera.address} • {camera.district}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <a
              href="https://camera.0511.vn/camera.html"
              target="_blank"
              rel="noreferrer"
              title="Mở nguồn gốc camera.0511.vn"
              style={{
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                color: "#94A3B8",
                fontSize: 11,
                padding: "6px 12px",
                borderRadius: 8,
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: 5,
                transition: "all 0.15s ease",
              }}
            >
              Nguồn: camera.0511.vn ↗
            </a>
            <button
              onClick={onClose}
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                color: "#94A3B8",
                fontSize: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(239, 68, 68, 0.2)";
                e.currentTarget.style.color = "#EF4444";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
                e.currentTarget.style.color = "#94A3B8";
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Khung phát Video Trực tiếp (16:9 Player) */}
        <div style={{ position: "relative", width: "100%", paddingBottom: "56.25%", background: "#000000" }}>
          <iframe
            key={camera.videoId}
            src={camera.embedUrl}
            title={camera.name}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              border: "none",
            }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>

        {/* Thanh chọn nhanh các điểm Camera khác */}
        <div
          style={{
            padding: "14px 20px",
            background: "rgba(15, 23, 42, 0.95)",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", marginBottom: 8, letterSpacing: "0.5px" }}>
            Chọn điểm Camera khác ({DANANG_CAMERAS.length} điểm trực tiếp):
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {DANANG_CAMERAS.map((c) => {
              const isCurrent = c.id === camera.id;
              return (
                <button
                  key={c.id}
                  onClick={() => onSelectCamera && onSelectCamera(c)}
                  style={{
                    background: isCurrent ? "#2563EB" : "rgba(30, 41, 59, 0.8)",
                    border: isCurrent ? "1px solid #60A5FA" : "1px solid rgba(255, 255, 255, 0.1)",
                    color: isCurrent ? "#FFFFFF" : "#CBD5E1",
                    padding: "6px 12px",
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: isCurrent ? 700 : 500,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    transition: "all 0.15s ease",
                  }}
                >
                  <span style={{ fontSize: 14 }}>📹</span>
                  <span>{c.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

