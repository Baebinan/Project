const { Client } = require('pg');

const client = new Client({
user: 'postgres', // เปลี่ยนตามชื่อ user ของคุณ
host: 'localhost',

database: 'my_database', // เปลี่ยนตามชื่อฐานข้อมูลของคุณ
password: 'rootroot', // ใส่รหัสผ่านของ user postgres ที่คุณตั้งไว้
port: 5432,
});

client.connect()
.then(() => console.log('Connected to PostgreSQL'))
.catch(err => console.error('Connection error', err.stack));

module.exports = client;