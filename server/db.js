import pkg from 'pg';
const { Pool } = pkg;

export const pool = new Pool({
  user: 'postgres',       // ← ชื่อ user ของ PostgreSQL
  host: 'localhost',
  database: 'clothingdb', // ← ชื่อฐานข้อมูล (สร้างใน pgAdmin หรือ psql)
  password: 'rootroot',       // ← ใส่รหัสจริงของคุณ
  port: 5432,
});