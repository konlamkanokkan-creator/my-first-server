const http = require('http');
// 1. เรียกใช้งาน Pool จากไลบรารี pg สำหรับจัดการการเชื่อมต่อฐานข้อมูล
const { Pool } = require('pg');

// 2. ตั้งค่าการเชื่อมต่อ โดยดึง URL มาจาก Environment Variable ของ Railway
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const port = process.env.PORT || 3000;

const server = http.createServer(async (req, res) => {
  // ย้ายการกำหนด Header และ Status Code ให้เป็นสัดส่วน
  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  let client;
  try {
    // 3. ขอเชื่อมต่อและส่งคำสั่ง SQL ไปดึงข้อมูลจากตาราง students
    client = await pool.connect();
    const result = await client.query('SELECT * FROM students');

    // 4. สร้างโครงสร้าง HTML พร้อม CSS สไตล์ธีมดวงจันทร์ และ JavaScript สุ่มดวง
    let html = `
    <!DOCTYPE html>
    <html lang="th">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>ฐานข้อมูลนักศึกษาใต้แสงจันทร์</title>
        <style>
            /* ธีมท้องฟ้ากลางคืน */
            body {
                background: linear-gradient(180deg, #0b132b, #1c2541, #3a506b);
                color: #e0e1dd;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                margin: 0;
                padding: 20px;
                display: flex;
                flex-direction: column;
                align-items: center;
                min-height: 100vh;
                overflow-x: hidden;
                position: relative;
            }

            /* ลูกเล่นดวงจันทร์เรืองแสง */
            .moon {
                width: 100px;
                height: 100px;
                background: #fbf8cc;
                border-radius: 50%;
                box-shadow: 0 0 40px #fbf8cc, 0 0 80px rgba(251, 248, 204, 0.6);
                margin: 20px 0;
                animation: float 4s ease-in-out infinite;
            }

            @keyframes float {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-10px); }
            }

            h1 {
                text-shadow: 0 0 10px rgba(255,255,255,0.5);
                text-align: center;
                color: #fbf8cc;
            }

            /* สไตล์ตารางสไตล์โปร่งแสงขอบมน */
            .container {
                background: rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(10px);
                border-radius: 15px;
                padding: 25px;
                box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
                border: 1px solid rgba(255, 255, 255, 0.1);
                width: 90%;
                max-width: 600px;
                margin-bottom: 30px;
            }

            table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 15px;
            }

            th, td {
                padding: 12px;
                text-align: left;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }

            th {
                color: #fbf8cc;
                font-size: 1.1em;
            }

            tr:hover {
                background: rgba(255, 255, 255, 0.05);
            }

            /* โซนกิจกรรมร่วมสนุกเสี่ยงทายดวง */
            .game-box {
                background: rgba(251, 248, 204, 0.15);
                border: 2px dashed #fbf8cc;
                border-radius: 15px;
                padding: 20px;
                text-align: center;
                max-width: 600px;
                width: 90%;
                box-shadow: 0 0 20px rgba(251, 248, 204, 0.2);
            }

            .btn-predict {
                background: #fbf8cc;
                color: #0b132b;
                border: none;
                padding: 12px 25px;
                font-size: 16px;
                font-weight: bold;
                border-radius: 25px;
                cursor: pointer;
                transition: all 0.3s ease;
                box-shadow: 0 4px 15px rgba(251, 248, 204, 0.4);
            }

            .btn-predict:hover {
                transform: scale(1.05);
                box-shadow: 0 4px 25px rgba(251, 248, 204, 0.8);
            }

            #fortune-result {
                margin-top: 15px;
                font-size: 1.2em;
                font-weight: bold;
                color: #fbf8cc;
                min-height: 30px;
                transition: all 0.5s ease;
            }
        </style>
    </head>
    <body>

        <!-- รูปดวงจันทร์ลอยได้ -->
        <div class="moon"></div>

        <h1>🌕 ฐานข้อมูลนักศึกษา (คืนพระจันทร์เต็มดวง) 🌕</h1>

        <!-- ส่วนแสดงตารางข้อมูลนักศึกษา -->
        <div class="container">
            <table>
                <thead>
                    <tr>
                        <th>69319010173</th>
                        <th>กนกกาญจน์ คนล่ำ</th>
                    </tr>
                </thead>
                <tbody>`;

    // วนลูปนำข้อมูลจากฐานข้อมูลมาแสดงในตาราง
    result.rows.forEach(row => {
      html += `<tr><td>${row.students_id}</td><td>${row.stude}</td></tr>`;
    });

    // ปิดท้ายตาราง และใส่โค้ดเกมเสี่ยงดวงเข้าไปในฝั่ง Client
    html += `
                </tbody>
            </table>
        </div>

        <!-- ลูกเล่นร่วมสนุก: สุ่มคำทำนายใต้แสงจันทร์ -->
        <div class="game-box">
            <h3>🔮 มินิเกม: เสี่ยงทายดวงชะตานักศึกษาใต้แสงจันทร์ 🔮</h3>
            <p>กดปุ่มเพื่อดูว่าพระจันทร์อยากบอกอะไรกับคุณในเทอมนี้?</p>
            <button class="btn-predict" onclick="getFortune()">ขอกระซิบถามพระจันทร์</button>
            <div id="fortune-result"></div>
        </div>

        <script>
            // รายการคำทำนายกวนๆ สำหรับนักศึกษา
            const fortunes = [
                "🌕 พระจันทร์บอกว่า: เทอมนี้เกรด A จะพุ่งชนจนตั้งตัวไม่ทัน!",
                "🌙 พระจันทร์บอกว่า: จะมีคนแอบมองคุณจากหน้าต่างห้องเรียนวิทยาศาสตร์",
                "🌑 พระจันทร์มืดมิด: ช่วงนี้โค้ดจะรันผ่านในรอบเดียวแบบปาฏิหาริย์!",
                "🔮 คำทำนายทายทัก: สัปดาห์หน้าจะได้ลาภปาก มีเพื่อนสายเปย์เลี้ยงชาบู",
                "✨ ดวงของคุณวันนี้: พลังงานเต็มเปี่ยม อาจารย์สั่งงานปุ๊บ สมองโล่งปั๊บ (โล่งแบบไม่มีอะไรเลย)",
                "🌟 ดวงเด่นคืนนี้: จะได้เจอเนื้อคู่... ในฝันคืนนี้แหละ นอนเถอะนะ",
                "🦉 นกฮูกฝากบอก: ส่งงานตรงเวลา แล้วชีวิตจะราบรื่นอย่างเหลือเชื่อ!"
            ];

            function getFortune() {
                const resultDiv = document.getElementById('fortune-result');
                resultDiv.style.opacity = 0; // ทำเอฟเฟกต์แวบหายไปก่อนเปลี่ยนคำ
                
                setTimeout(() => {
                    const randomIndex = Math.floor(Math.random() * fortunes.length);
                    resultDiv.innerText = fortunes[randomIndex];
                    resultDiv.style.opacity = 1;
                }, 300);
            }
        </script>

    </body>
    </html>`;

    res.statusCode = 200;
    res.end(html);
  } catch (err) {
    console.error("Database or Server Error:", err);
    res.statusCode = 500;
    res.end(`<h1>เกิดข้อผิดพลาด!</h1><p>${err.message}</p>`);
  } finally {
    // ใช้ finally เพื่อการันตีว่า client จะถูกคืนเข้า Pool เสมอ แม้ว่าจะเกิด error ก็ตาม
    if (client) {
      client.release();
    }
  }
});

server.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});
