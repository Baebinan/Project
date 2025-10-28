// server.js
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "./db.js";

const app = express();
const PORT = 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------- Middlewares ----------
app.use(cors());
app.use(express.json()); // แทน body-parser.json()
app.use(express.static(path.join(__dirname, "../public"))); // ให้เสิร์ฟไฟล์หน้าเว็บจาก /public

// ---------- Routes ----------

// ✅ สมัครสมาชิก
app.post("/register", async (req, res) => {
  try {
    const { username, email, phone, password } = req.body;

    if (!username || !email || !phone || !password) {
      return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบทุกช่อง" });
    }

    const existing = await pool.query(
      "SELECT 1 FROM users WHERE username = $1",
      [username]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: "ชื่อผู้ใช้นี้ถูกใช้แล้ว" });
    }

    const role = username === "admin" ? "admin" : "customer";

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

    if (!username || !password) {
      return res.status(400).json({ message: "กรุณากรอกชื่อผู้ใช้และรหัสผ่าน" });
    }

    const result = await pool.query(
      "SELECT username, email, phone, password, role FROM users WHERE username = $1",
      [username]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ message: "ไม่พบบัญชีผู้ใช้" });
    }

    const user = result.rows[0];
    if (user.password !== password) {
      return res.status(401).json({ message: "รหัสผ่านไม่ถูกต้อง" });
    }

    res.json({
      message: "เข้าสู่ระบบสำเร็จ",
      username: user.username,
      email: user.email,
      phone: user.phone,
      role: user.role || "customer",
    });
  } catch (err) {
    console.error("❌ Login Error:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในเซิร์ฟเวอร์" });
  }
});

// ✅ หน้าแรก (เสิร์ฟ index.html)
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

    await pool.query(
      "UPDATE users SET address = $1 WHERE username = $2",
      [address, username]
    );
    res.json({ message: "อัปเดตที่อยู่สำเร็จ" });
  } catch (err) {
    console.error("❌ Update Address Error:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในเซิร์ฟเวอร์" });
  }
});

// ✅ อัปเดตเบอร์โทร
app.post("/update-phone", async (req, res) => {
  try {
    const { username, phone } = req.body;
    if (!username || !phone) {
      return res.status(400).json({ message: "ข้อมูลไม่ครบ" });
    }

    await pool.query(
      "UPDATE users SET phone = $1 WHERE username = $2",
      [phone, username]
    );
    res.json({ message: "อัปเดตเบอร์โทรสำเร็จ" });
  } catch (err) {
    console.error("❌ Update Phone Error:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในเซิร์ฟเวอร์" });
  }
});

// ✅ ดึงข้อมูลผู้ใช้ทั้งหมด (สำหรับ admin ดูรายชื่อลูกค้า)
app.get("/users", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT username, email, phone, address FROM users WHERE role = 'customer' ORDER BY username ASC"
    );
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

    // แนะนำให้ wrap ใน transaction ถ้ามีข้อมูลจำนวนมาก
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

// ✅ ดึงประวัติคำสั่งซื้อของผู้ใช้
app.get("/orders/:username", async (req, res) => {
  try {
    const { username } = req.params;
    const result = await pool.query(
      `SELECT id, product_name AS name, price, status
       FROM orders
       WHERE username = $1
       ORDER BY id DESC`,
      [username]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Get Orders Error:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในเซิร์ฟเวอร์" });
  }
});

// ---------- Start ----------
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
