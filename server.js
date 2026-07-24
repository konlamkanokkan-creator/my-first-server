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
  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  let client;
  try {
    // 3. ขอเชื่อมต่อและส่งคำสั่ง SQL ไปดึงข้อมูลจากตาราง students
    client = await pool.connect();
    const result = await client.query('SELECT * FROM students');

    // 4. สร้างโครงสร้าง HTML พร้อม CSS สไตล์ Dr.STONE และมินิเกมผสมสูตร Nital
    let html = `
    <!DOCTYPE html>
    <html lang="th">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Kingdom of Science - Student Database</title>
        <style>
            /* ธีมห้องทดลองวิทยาศาสตร์ Dr.STONE */
            body {
                background: linear-gradient(180deg, #0b1a0e, #132a13, #31572c);
                color: #ecf39e;
                font-family: 'Courier New', Courier, monospace, sans-serif;
                margin: 0;
                padding: 20px;
                display: flex;
                flex-direction: column;
                align-items: center;
                min-height: 100vh;
                overflow-x: hidden;
                position: relative;
            }

            /* บีกเกอร์ทดลองเรืองแสง */
            .beaker {
                width: 70px;
                height: 90px;
                border: 4px solid #a3b18a;
                border-top: none;
                border-radius: 0 0 15px 15px;
                position: relative;
                margin: 20px 0;
                background: rgba(163, 177, 138, 0.1);
                box-shadow: 0 0 20px #a3b18a, inset 0 0 15px #10b981;
                overflow: hidden;
            }

            .beaker::before {
                content: '';
                position: absolute;
                bottom: 0;
                width: 100%;
                height: 60%;
                background: #10b981;
                box-shadow: 0 0 15px #10b981;
                animation: liquid 3s ease-in-out infinite alternate;
            }

            @keyframes liquid {
                0% { height: 50%; }
                100% { height: 75%; }
            }

            h1 {
                text-shadow: 0 0 10px #10b981;
                text-align: center;
                color: #10b981;
                letter-spacing: 2px;
            }

            .container {
                background: rgba(19, 42, 19, 0.7);
                backdrop-filter: blur(8px);
                border-radius: 10px;
                padding: 25px;
                box-shadow: 0 0 25px rgba(16, 185, 129, 0.2);
                border: 1px solid #a3b18a;
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
                border-bottom: 1px solid rgba(163, 177, 138, 0.2);
            }

            th {
                color: #10b981;
                font-size: 1.1em;
                text-transform: uppercase;
            }

            tr:hover {
                background: rgba(16, 185, 129, 0.1);
            }

            .game-box {
                background: rgba(49, 87, 44, 0.3);
                border: 2px dashed #10b981;
                border-radius: 10px;
                padding: 20px;
                text-align: center;
                max-width: 600px;
                width: 90%;
                box-shadow: 0 0 15px rgba(16, 185, 129, 0.15);
                margin-bottom: 30px;
            }

            .btn-action {
                background: #10b981;
                color: #0b1a0e;
                border: none;
                padding: 12px 25px;
                font-size: 16px;
                font-weight: bold;
                border-radius: 5px;
                cursor: pointer;
                transition: all 0.3s ease;
                box-shadow: 0 0 10px rgba(16, 185, 129, 0.4);
                margin: 5px;
                font-family: inherit;
            }

            .btn-action:hover {
                transform: scale(1.05);
                box-shadow: 0 0 20px rgba(16, 185, 129, 0.8);
                background: #34d399;
            }

            #formula-result {
                margin-top: 15px;
                font-size: 1.1em;
                font-weight: bold;
                color: #ecf39e;
                min-height: 30px;
            }

            /* สไตล์มินิเกมถอนคำสาปหินนก */
            .lab-controls {
                display: flex;
                flex-direction: column;
                gap: 12px;
                margin: 15px 0;
                align-items: center;
            }

            .slider-group {
                display: flex;
                align-items: center;
                gap: 10px;
                width: 80%;
                justify-content: space-between;
            }

            .bird-stage {
                font-size: 80px;
                margin: 15px 0;
                transition: all 0.5s ease;
                display: inline-block;
                filter: grayscale(100%) contrast(150%); /* สภาพกลายเป็นหิน */
            }

            .bird-revived {
                filter: grayscale(0%) contrast(100%);
                animation: reviveGlow 1s infinite alternate;
                transform: scale(1.2);
            }

            @keyframes reviveGlow {
                0% { text-shadow: 0 0 10px #10b981; }
                100% { text-shadow: 0 0 30px #ecf39e, 0 0 40px #10b981; }
            }

            #revive-status {
                font-size: 1.1em;
                font-weight: bold;
                min-height: 40px;
                color: #ecf39e;
            }
        </style>
    </head>
    <body>

        <!-- บีกเกอร์ทดลองเรืองแสง -->
        <div class="beaker"></div>

        <h1>🧪 KINGDOM OF SCIENCE DATABASE 🧪</h1>

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

    html += `
                </tbody>
            </table>
        </div>

        <!-- ลูกเล่นที่ 1: สุ่มคำคมการทดลองวิทยาศาสตร์ (Senku) -->
        <div class="game-box">
            <h3>🔬 มินิเกม: ตรวจวิเคราะห์อัตราความสำเร็จ 10,000,000% 🔬</h3>
            <p>กดปุ่มเพื่อเริ่มการประมวลผลทางวิทยาศาสตร์โดยเซ็นคู!</p>
            <button class="btn-action" onclick="analyzeScience()">คำนวณผลลัพธ์</button>
            <div id="formula-result"></div>
        </div>

        <!-- ลูกเล่นที่ 2: มินิเกมผสมน้ำยา Nital คืนชีฟให้นกหิน -->
        <div class="game-box">
            <h3>🦅 มินิเกม: ภารกิจสังเคราะห์ Nital คืนชีพนกหิน 🦅</h3>
            <p>ปรับสัดส่วนเพื่อสังเคราะห์ **Nital Fluid** ถอนคำสาปหินให้นกนางแอ่น!</p>
            
            <!-- ตัวแสดงผลนก -->
            <div id="bird" class="bird-stage">🦅</div>
            <div id="revive-status">สถานะ: นกยังคงเป็นหินไร้ปฏิกิริยา...</div>

            <!-- ส่วนปรับผสมสารเคมี -->
            <div class="lab-controls">
                <div class="slider-group">
                    <label for="nitric">🧪 กรดไนตริก (Nitric Acid): <span id="nitric-val">50</span>%</label>
                    <input type="range" id="nitric" min="0" max="100" value="50" oninput="updateSliders('nitric')">
                </div>
                <div class="slider-group">
                    <label for="alcohol">🍷 แอลกอฮอล์ (Alcohol): <span id="alcohol-val">50</span>%</label>
                    <input type="range" id="alcohol" min="0" max="100" value="50" oninput="updateSliders('alcohol')">
                </div>
            </div>

            <button class="btn-action" onclick="applyNital()">🧪 ราดน้ำยา Nital!</button>
            <button class="btn-action" style="background: #a3b18a;" onclick="resetGame()">🔄 เริ่มใหม่</button>
        </div>

        <script>
            // === โค้ดมินิเกมวิเคราะห์วิทยาศาสตร์ ===
            const scienceQuotes = [
                "🧪 ความสำเร็จในการรันโค้ดเทอมนี้คือ 10,000,000%!",
                "⚡ วิทยาศาสตร์ไม่ได้โกหก: ถ้าพยายามต่อไป เกรด A จะสังเคราะห์ขึ้นมาเอง!",
                "🪨 ต่อให้ถูกสต๊อกเป็นหินไป 3,700 ปี สมองก็ยังต้องประมวลผลต่อไป!",
                "💡 กฎของธรรมชาติ: โค้ดที่ไม่มีบั๊ก คือผลลัพธ์ของการทดลองนับพันครั้ง",
                "🔥 สังเคราะห์พลังงานสำเร็จ! วันนี้คุณมีกำลังใจลุยโปรเจกต์เต็มร้อย",
                "🧬 ตรวจพบโครงสร้างความขยันระดับเซลล์! การเรียนสัปดาห์นี้จะฉลุย"
            ];

            function analyzeScience() {
                const resultDiv = document.getElementById('formula-result');
                resultDiv.style.opacity = 0;
                setTimeout(() => {
                    const randomIndex = Math.floor(Math.random() * scienceQuotes.length);
                    resultDiv.innerText = scienceQuotes[randomIndex];
                    resultDiv.style.opacity = 1;
                }, 300);
            }

            // === โค้ดมินิเกมสกัดน้ำยา Nital คืนชีพนก ===
            function updateSliders(changed) {
                const nitricInput = document.getElementById('nitric');
                const alcoholInput = document.getElementById('alcohol');
                
                if (changed === 'nitric') {
                    alcoholInput.value = 100 - nitricInput.value;
                } else {
                    nitricInput.value = 100 - alcoholInput.value;
                }

                document.getElementById('nitric-val').innerText = nitricInput.value;
                document.getElementById('alcohol-val').innerText = alcoholInput.value;
            }

            function applyNital() {
                const nitric = parseInt(document.getElementById('nitric').value);
                const alcohol = parseInt(document.getElementById('alcohol').value);
                const bird = document.getElementById('bird');
                const status = document.getElementById('revive-status');

                // สูตรที่ถูกต้องตามเรื่อง Dr.STONE คือ Nitric Acid 30% + Alcohol 70% (ยอมให้คลาดเคลื่อนได้ +-2%)
                if (nitric >= 28 && nitric <= 32 && alcohol >= 68 && alcohol <= 72) {
                    bird.className = "bird-stage bird-revived";
                    bird.innerText = "🕊️"; // นกสลัดหินหลุดและบินได้!
                    status.innerHTML = "<span style='color: #10b981;'>✨ สำเร็จ 10,000,000%! ชั้นหินปริแตก นกฟื้นคืนชีพแล้ว! ✨</span>";
                } else {
                    bird.className = "bird-stage";
                    bird.innerText = "🦅";
                    status.innerHTML = "<span style='color: #ef4444;'>❌ ไม่เกิดปฏิกิริยาใดๆ... สัดส่วนสารเคมียังไม่ถูกต้อง! (ลองปรับกรดใกล้ๆ 30%)</span>";
                }
            }

            function resetGame() {
                const bird = document.getElementById('bird');
                const status = document.getElementById('revive-status');
                bird.className = "bird-stage";
                bird.innerText = "🦅";
                status.innerText = "สถานะ: นกยังคงเป็นหินไร้ปฏิกิริยา...";
                document.getElementById('nitric').value = 50;
                document.getElementById('alcohol').value = 50;
                document.getElementById('nitric-val').innerText = 50;
                document.getElementById('alcohol-val').innerText = 50;
            }
        </script>

    </body>
    </html>`;

    res.statusCode = 200;
    res.end(html);
  } catch (err) {
    console.error("Database or Server Error:", err);
    res.statusCode = 500;
    res.end(`<h1>เกิดข้อผิดพลาดในการทดลอง!</h1><p>${err.message}</p>`);
  } finally {
    if (client) {
      client.release();
    }
  }
});

server.listen(port, () => {
  console.log(`Kingdom of Science Server is running on port: ${port}`);
});
