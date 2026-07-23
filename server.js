const http = require('http');
// 1. เรียกใช้งาน Pool จากไลบรารี pg สำหรับจัดการการเชื่อมต่อฐานข้อมูล
const { Pool } = require('pg');

// 2. ตั้งค่าการเชื่อมต่อ โดยดึง URL มาจาก Environment Variable ของ Railway
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // แนะนำให้เปิด ssl สำหรับการเชื่อมต่อไปยัง Railway (ป้องกัน Error ในบางกรณี)
  ssl: {
    rejectUnauthorized: false
  }
});

const port = process.env.PORT || 3000;

const server = http.createServer(async (req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  try {
    // 3. ขอเชื่อมต่อและส่งคำสั่ง SQL ไปดึงข้อมูลจากตาราง students
    const client = await pool.connect(); // แก้ไขข้อความแฝงจากตัวอักษรไทย
    const result = await client.query('SELECT * FROM students');
    client.release(); // คืนการเชื่อมต่อเมื่อใช้งานเสร็จ

    // 4. นำข้อมูลที่ได้ (result.rows) มาประกอบเป็นตาราง HTML
    let html = `<h1>ฐานข้อมูลนักศึกษา (ทดสอบการเชื่อมต่อ)</h1>`;
    html += `<table border="1" cellpadding="10" style="border-collapse: collapse;">`;
    
    // แก้ไขตรงนี้: เปลี่ยนหัวตาราง (TH) ให้เป็นชื่อหัวข้อ ไม่ใช่ข้อมูลนักศึกษาตัวอย่าง
    html += `<tr><th>รหัสนักศึกษา</th><th>ชื่อ-นามสกุล</th></tr>`;
    
    // วนลูปนำข้อมูลแต่ละแถวมาแสดง
    result.rows.forEach(row => {
      html += `<tr><td>${row.student_id}</td><td>${row.student_name}</td></tr>`;
    });
    
    html += `</table>`;
    res.end(html);
  } catch (err) {
    // กรณีเชื่อมต่อไม่ได้หรือเขียนชื่อตารางผิด
    console.error(err);
    res.end(`<h1>เกิดข้อผิดพลาด!</h1><p>${err.message}</p>`);
  }
});

server.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});
