import pg from "pg";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

if (!process.env.DATABASE_URL) {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  dotenv.config({ path: path.resolve(__dirname, "../.env") });
  dotenv.config();
}
 
const { Pool } = pg;
 
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Supabase yeu cau SSL
});
 
export default pool;
