// server.js
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import { pool } from "./db.js";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = 3000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "../public"))); // ให้เปิดไฟล์ HTML ได้จากโฟลเดอร์นี้

// ✅ สมัครสมาชิก
app.post("/register", async (req, res) => {
  try {
    const { username, email, phone, password } = req.body;

    // ตรวจสอบข้อมูลครบ
    if (!username || !email || !phone || !password) {
      return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบทุกช่อง" });
    }

    // ตรวจสอบชื่อซ้ำ
    const existing = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: "ชื่อผู้ใช้นี้ถูกใช้แล้ว" });
    }

    // เพิ่ม role เริ่มต้นเป็น "customer"
    const role = username === "admin" ? "admin" : "customer";

    // ✅ บันทึกข้อมูลผู้ใช้ (พร้อมเบอร์โทร)
    await pool.query(
      "INSERT INTO users (username, email, phone, password, role) VALUES ($1, $2, $3, $4, $5)",
      [username, email, phone, password, role]
    );

    res.json({ message: "สมัครสมาชิกสำเร็จ!" });
  } catch (err) {
    console.error("❌ Register Error:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในเซิร์ฟเวอร์" });
  }
});

// ✅ เข้าสู่ระบบ
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    // ตรวจสอบข้อมูลครบ
    if (!username || !password) {
      return res.status(400).json({ message: "กรุณากรอกชื่อผู้ใช้และรหัสผ่าน" });
    }

    // ค้นหาผู้ใช้ในฐานข้อมูล
    const result = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
    if (result.rows.length === 0) {
      return res.status(401).json({ message: "ไม่พบบัญชีผู้ใช้" });
    }

    const user = result.rows[0];

    // ตรวจสอบรหัสผ่าน
    if (user.password !== password) {
      return res.status(401).json({ message: "รหัสผ่านไม่ถูกต้อง" });
    }

    // ✅ ส่งข้อมูลผู้ใช้กลับไป
    res.json({
      message: "เข้าสู่ระบบสำเร็จ",
      username: user.username,
      email: user.email,
      phone: user.phone, // ✅ ส่งเบอร์กลับไปด้วย
      role: user.role || "customer",
    });
  } catch (err) {
    console.error("❌ Login Error:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในเซิร์ฟเวอร์" });
  }
});

// ✅ หน้าแรก
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

// ✅ อัปเดตที่อยู่
app.post("/update-address", async (req, res) => {
  try {
    const { username, address } = req.body;
    if (!username || !address) {
      return res.status(400).json({ message: "ข้อมูลไม่ครบ" });
    }

    await pool.query("UPDATE users SET address = $1 WHERE username = $2", [address, username]);
    res.json({ message: "อัปเดตที่อยู่สำเร็จ" });
  } catch (err) {
    console.error("❌ Update Address Error:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในเซิร์ฟเวอร์" });
  }
});

// ✅ ดึงข้อมูลผู้ใช้ทั้งหมด (ให้ admin ใช้ดู)
app.get("/users", async (req, res) => {
  try {
    const result = await pool.query("SELECT username, email, phone, address FROM users WHERE role = 'customer'");
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Get Users Error:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในเซิร์ฟเวอร์" });
  }
});

// ✅ บันทึกคำสั่งซื้อจากลูกค้า
app.post("/place-order", async (req, res) => {
  try {
    const { username, items } = req.body;

    if (!username || !items || items.length === 0) {
      return res.status(400).json({ message: "ข้อมูลไม่ครบ" });
    }

    for (const item of items) {
      await pool.query(
        "INSERT INTO orders (username, product_name, price, status) VALUES ($1, $2, $3, $4)",
        [username, item.name, item.price, "ได้รับออเดอร์แล้ว"]
      );
    }

    res.json({ message: "บันทึกคำสั่งซื้อสำเร็จ" });
  } catch (err) {
    console.error("❌ Place Order Error:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในเซิร์ฟเวอร์" });
  }
});

// ✅ เริ่มเซิร์ฟเวอร์
app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
