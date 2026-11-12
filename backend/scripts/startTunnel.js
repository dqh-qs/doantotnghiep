import { spawn, execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const PORT = process.env.API_PORT || 3001;
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error("❌ Không tìm thấy DATABASE_URL trong backend/.env");
    process.exit(1);
}

const { Pool } = pg;
const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

console.log("============================================================");
console.log(" 🌐 ĐANG KHỞI ĐỘNG CLOUDFLARE TUNNEL CHO PORT " + PORT + "...");
console.log("============================================================");

// Khởi chạy cloudflared tunnel
const cloudflaredProcess = spawn("cloudflared", ["tunnel", "--url", `http://localhost:${PORT}`], {
    shell: true,
});

let capturedUrl = null;

async function updateDbWithUrl(url) {
    try {
        await pool.query(
            `UPDATE app_settings 
             SET public_api_url = $1, updated_at = NOW() 
             WHERE id = 1`,
            [url]
        );
        console.log("============================================================");
        console.log(" 🚀 CLOUDFLARE TUNNEL ĐÃ SẴN SÀNG!");
        console.log(` 🔗 URL Public: \x1b[36m${url}\x1b[0m`);
        console.log(" ✅ ĐÃ TỰ ĐỘNG CẬP NHẬT VÀO DATABASE & ADMIN DASHBOARD!");

        try {
            execSync(`powershell -NoProfile -Command "Set-Clipboard -Value '${url}'"`);
            console.log(" 📋 Đã tự động copy link vào Clipboard của bạn!");
        } catch (_) { }

        console.log("  link đã có sẵn:");
        console.log("    http://localhost:5173/admin");
        console.log("============================================================");
        console.log(" Nhấn Ctrl + C để dừng tunnel.\n");
    } catch (err) {
        console.error("❌ Lỗi khi tự động cập nhật URL vào database:", err.message);
    }
}

function handleOutput(data) {
    const text = data.toString();
    process.stdout.write(text);

    if (!capturedUrl) {
        // Tìm pattern: https://xxxx.trycloudflare.com
        const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
        if (match) {
            capturedUrl = match[0];
            updateDbWithUrl(capturedUrl);
        }
    }
}

cloudflaredProcess.stdout.on("data", handleOutput);
cloudflaredProcess.stderr.on("data", handleOutput);

cloudflaredProcess.on("close", async (code) => {
    console.log(`\n🛑 Cloudflare Tunnel đã dừng (exit code: ${code})`);
    await pool.end();
    process.exit(code || 0);
});

// Xử lý khi người dùng ấn Ctrl+C
process.on("SIGINT", () => {
    console.log("\n Đang đóng Cloudflare Tunnel...");
    cloudflaredProcess.kill("SIGINT");
});

