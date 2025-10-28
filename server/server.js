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
app.use(express.json({ limit: "10mb" })); // รับ base64 image ได้
app.use(express.static(path.join(__dirname, "../public"))); // เสิร์ฟไฟล์หน้าเว็บจาก /public

// ---------- Helper ----------
const isEmpty = (v) => v === undefined || v === null || (typeof v === "string" && v.trim() === "");

// ---------- Auth-less sample routes (ตามของเดิม) ----------

// สมัครสมาชิก
app.post("/register", async (req, res) => {
  try {
    const { username, email, phone, password } = req.body;
    if ([username, email, phone, password].some(isEmpty)) {
      return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบทุกช่อง" });
    }

    const existing = await pool.query("SELECT 1 FROM users WHERE username = $1", [username]);
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

// เข้าสู่ระบบ
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if ([username, password].some(isEmpty)) {
      return res.status(400).json({ message: "กรุณากรอกชื่อผู้ใช้และรหัสผ่าน" });
    }

    const result = await pool.query(
      "SELECT username, email, phone, password, role FROM users WHERE username = $1",
      [username]
    );
    if (result.rows.length === 0) return res.status(401).json({ message: "ไม่พบบัญชีผู้ใช้" });

    const user = result.rows[0];
    if (user.password !== password) return res.status(401).json({ message: "รหัสผ่านไม่ถูกต้อง" });

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

// หน้าแรก
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

// อัปเดตที่อยู่
app.post("/update-address", async (req, res) => {
  try {
    const { username, address } = req.body;
    if ([username, address].some(isEmpty)) {
      return res.status(400).json({ message: "ข้อมูลไม่ครบ" });
    }
    await pool.query("UPDATE users SET address = $1 WHERE username = $2", [address, username]);
    res.json({ message: "อัปเดตที่อยู่สำเร็จ" });
  } catch (err) {
    console.error("❌ Update Address Error:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในเซิร์ฟเวอร์" });
  }
});

// อัปเดตเบอร์โทร
app.post("/update-phone", async (req, res) => {
  try {
    const { username, phone } = req.body;
    if ([username, phone].some(isEmpty)) {
      return res.status(400).json({ message: "ข้อมูลไม่ครบ" });
    }
    await pool.query("UPDATE users SET phone = $1 WHERE username = $2", [phone, username]);
    res.json({ message: "อัปเดตเบอร์โทรสำเร็จ" });
  } catch (err) {
    console.error("❌ Update Phone Error:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในเซิร์ฟเวอร์" });
  }
});

// รายชื่อลูกค้า (สำหรับ admin)
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

// บันทึกคำสั่งซื้อ (แบบง่าย)
app.post("/place-order", async (req, res) => {
  try {
    const { username, items } = req.body;
    if (isEmpty(username) || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "ข้อมูลไม่ครบ" });
    }

    // กันไม่ให้ admin สั่งซื้อ
    const u = await pool.query("SELECT role FROM users WHERE username=$1", [username]);
    if (u.rows[0]?.role === "admin") {
      return res.status(403).json({ message: "ผู้ดูแลระบบไม่สามารถสั่งซื้อได้" });
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

// ดึงประวัติคำสั่งซื้อของผู้ใช้
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


// ---------- Products CRUD (NEW) ----------

// ดึงสินค้าทั้งหมด (รองรับ ?page=index|all|both)
app.get("/products", async (req, res) => {
  try {
    const { page } = req.query;
    let sql = "SELECT * FROM products";
    const params = [];
    if (page && ["index", "all", "both"].includes(page)) {
      sql += " WHERE page = $1";
      params.push(page);
    }
    sql += " ORDER BY id DESC";
    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error("❌ Get Products Error:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในเซิร์ฟเวอร์" });
  }
});

// ดึงสินค้าเดี่ยว
app.get("/products/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query("SELECT * FROM products WHERE id=$1", [id]);
    if (!rows.length) return res.status(404).json({ message: "ไม่พบสินค้า" });
    res.json(rows[0]);
  } catch (err) {
    console.error("❌ Get Product Error:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในเซิร์ฟเวอร์" });
  }
});

// เพิ่มสินค้า
app.post("/products", async (req, res) => {
  try {
    let { name, price, stock, status, tag, page, image_url, image } = req.body;
    if ([name, price, stock, status, page].some(isEmpty)) {
      return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบ" });
    }
    // รองรับทั้ง image และ image_url จากฟอร์มปัจจุบัน
    image_url = !isEmpty(image_url) ? image_url : !isEmpty(image) ? image : null;

    const sql = `
      INSERT INTO products (name, price, stock, status, tag, page, image_url)
      VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`;
    const values = [name, Number(price), Number(stock), status, tag || null, page, image_url];

    const { rows } = await pool.query(sql, values);
    res.json(rows[0]);
  } catch (err) {
    console.error("❌ Create Product Error:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในเซิร์ฟเวอร์" });
  }
});

// แก้ไขสินค้า
app.put("/products/:id", async (req, res) => {
  try {
    const { id } = req.params;
    let { name, price, stock, status, tag, page, image_url, image } = req.body;
    image_url = !isEmpty(image_url) ? image_url : !isEmpty(image) ? image : null;

    const sql = `
      UPDATE products
      SET name=$1, price=$2, stock=$3, status=$4, tag=$5, page=$6, image_url=$7, updated_at=NOW()
      WHERE id=$8 RETURNING *`;
    const values = [name, Number(price), Number(stock), status, tag || null, page, image_url, id];

    const { rows } = await pool.query(sql, values);
    if (!rows.length) return res.status(404).json({ message: "ไม่พบสินค้า" });
    res.json(rows[0]);
  } catch (err) {
    console.error("❌ Update Product Error:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในเซิร์ฟเวอร์" });
  }
});

// ลบสินค้า
app.delete("/products/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM products WHERE id=$1", [id]);
    res.json({ message: "ลบสินค้าสำเร็จ" });
  } catch (err) {
    console.error("❌ Delete Product Error:", err);
    res.status(500).json({ message: "เกิดข้อผิดพลาดในเซิร์ฟเวอร์" });
  }
});

// ---------- Start ----------
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
