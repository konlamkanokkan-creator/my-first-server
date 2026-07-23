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

    // 4. สร้างโครงสร้าง HTML พร้อม CSS สไตล์ธีมดวงจันทร์ และมินิเกม
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
                margin-bottom: 30px;
            }

            .btn-action {
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
                margin: 5px;
            }

            .btn-action:hover {
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

            /* Canvas สไตล์สำหรับเกมหลบเม็ดฝน */
            #rain-game-canvas {
                background: rgba(11, 19, 43, 0.8);
                border: 2px solid #fbf8cc;
                border-radius: 10px;
                display: block;
                margin: 15px auto;
                max-width: 100%;
                touch-action: none; /* ป้องกันจอเลื่อนบนมือถือ */
            }

            .game-stats {
                font-size: 1.1em;
                color: #fbf8cc;
                margin-top: 10px;
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
                        <th>รหัสนักศึกษา</th>
                        <th>ชื่อ-นามสกุล</th>
                    </tr>
                </thead>
                <tbody>`;

    // วนลูปนำข้อมูลจากฐานข้อมูลมาแสดงในตาราง
    result.rows.forEach(row => {
      html += `<tr><td>${row.student_id}</td><td>${row.student_name}</td></tr>`;
    });

    // ปิดท้ายตาราง และใส่เกมเสี่ยงดวง + เกมหลบฝน
    html += `
                </tbody>
            </table>
        </div>

        <!-- ลูกเล่นที่ 1: สุ่มคำทำนายใต้แสงจันทร์ -->
        <div class="game-box">
            <h3>🔮 มินิเกม: เสี่ยงทายดวงชะตานักศึกษาใต้แสงจันทร์ 🔮</h3>
            <p>กดปุ่มเพื่อดูว่าพระจันทร์อยากบอกอะไรกับคุณในเทอมนี้?</p>
            <button class="btn-action" onclick="getFortune()">ขอกระซิบถามพระจันทร์</button>
            <div id="fortune-result"></div>
        </div>

        <!-- ลูกเล่นที่ 2: เกมหลบเม็ดฝนใต้แสงจันทร์ -->
        <div class="game-box">
            <h3>🌧️ มินิเกม: กระต่ายหลบฝนใต้แสงจันทร์ 🌧️</h3>
            <p>ใช้เมาส์หรือนิ้วลากน้องกระต่าย 🐰 หลบสายฝน 💧 เพื่อทำคะแนน!</p>
            <button class="btn-action" id="start-game-btn" onclick="startGame()">เริ่มเล่น / เล่นใหม่</button>
            
            <canvas id="rain-game-canvas" width="320" height="400"></canvas>
            <div class="game-stats">
                คะแนน: <span id="game-score">0</span> | คะแนนสูงสุด: <span id="high-score">0</span>
            </div>
        </div>

        <script>
            // === โค้ดมินิเกมเสี่ยงดวง ===
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
                resultDiv.style.opacity = 0;
                setTimeout(() => {
                    const randomIndex = Math.floor(Math.random() * fortunes.length);
                    resultDiv.innerText = fortunes[randomIndex];
                    resultDiv.style.opacity = 1;
                }, 300);
            }

            // === โค้ดมินิเกมหลบเม็ดฝน ===
            const canvas = document.getElementById('rain-game-canvas');
            const ctx = canvas.getContext('2d');
            
            let gameInterval;
            let score = 0;
            let highScore = 0;
            let isGameOver = true;

            // ตัวละคร (กระต่าย)
            const player = {
                x: canvas.width / 2,
                y: canvas.height - 30,
                radius: 18,
                emoji: "🐰"
            };

            let raindrops = [];

            // ระบบควบคุม (Mouse / Touch)
            function updatePlayerPosition(clientX) {
                const rect = canvas.getBoundingClientRect();
                const mouseX = clientX - rect.left;
                // จำกัดให้อยู่ภายใน Canvas
                player.x = Math.max(player.radius, Math.min(canvas.width - player.radius, mouseX));
            }

            canvas.addEventListener('mousemove', (e) => {
                if (!isGameOver) updatePlayerPosition(e.clientX);
            });

            canvas.addEventListener('touchmove', (e) => {
                if (!isGameOver && e.touches.length > 0) {
                    updatePlayerPosition(e.touches[0].clientX);
                }
            });

            function createRaindrop() {
                const speed = 2 + Math.random() * 3 + (score / 50); // ยิ่งคะแนนเยอะ ฝนยิ่งตกไว
                raindrops.push({
                    x: Math.random() * (canvas.width - 10) + 5,
                    y: 0,
                    length: 12 + Math.random() * 8,
                    speed: speed
                });
            }

            function startGame() {
                // ล้างค่าเดิม
                clearInterval(gameInterval);
                raindrops = [];
                score = 0;
                isGameOver = false;
                player.x = canvas.width / 2;
                document.getElementById('game-score').innerText = score;
                document.getElementById('start-game-btn').innerText = "เริ่มเล่นใหม่";

                // Loop การทำงานของเกม (60 FPS)
                gameInterval = setInterval(updateGame, 1000 / 60);
            }

            function updateGame() {
                // สุ่มสร้างเม็ดฝน
                if (Math.random() < 0.2) {
                    createRaindrop();
                }

                // เคลียร์ Canvas
                ctx.clearRect(0, 0, canvas.width, canvas.height);

                // วาดตัวละคร (กระต่าย)
                ctx.font = "28px Serifs";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(player.emoji, player.x, player.y);

                // ขยับและวาดเม็ดฝน
                for (let i = 0; i < raindrops.length; i++) {
                    let drop = raindrops[i];
                    drop.y += drop.speed;

                    // วาดสายฝนเรืองแสง
                    ctx.beginPath();
                    ctx.moveTo(drop.x, drop.y);
                    ctx.lineTo(drop.x, drop.y + drop.length);
                    ctx.strokeStyle = '#a2d2ff';
                    ctx.lineWidth = 2;
                    ctx.lineCap = 'round';
                    ctx.stroke();

                    // ตรวจจับการชน (Collision Detection)
                    const distX = player.x - drop.x;
                    const distY = player.y - (drop.y + drop.length);
                    const distance = Math.sqrt(distX * distX + distY * distY);

                    if (distance < player.radius) {
                        gameOver();
                        return;
                    }

                    // เม็ดฝนตกถึงพื้น -> เพิ่มคะแนน
                    if (drop.y > canvas.height) {
                        raindrops.splice(i, 1);
                        i--;
                        score += 1;
                        document.getElementById('game-score').innerText = score;
                    }
                }
            }

            function gameOver() {
                isGameOver = true;
                clearInterval(gameInterval);

                if (score > highScore) {
                    highScore = score;
                    document.getElementById('high-score').innerText = highScore;
                }

                // วาดข้อความ Game Over
                ctx.fillStyle = "rgba(11, 19, 43, 0.85)";
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                ctx.fillStyle = "#fbf8cc";
                ctx.font = "bold 22px 'Segoe UI', sans-serif";
                ctx.fillText("☔ เปียกฝนซะแล้ว! ☔", canvas.width / 2, canvas.height / 2 - 15);
                
                ctx.font = "16px 'Segoe UI', sans-serif";
                ctx.fillText("ทำได้ " + score + " คะแนน", canvas.width / 2, canvas.height / 2 + 20);
            }

            // วาดหน้าแรกก่อนกดเริ่มเล่น
            ctx.fillStyle = "#fbf8cc";
            ctx.font = "16px 'Segoe UI', sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("กดปุ่มด้านบนเพื่อเริ่มเล่น", canvas.width / 2, canvas.height / 2);
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
    if (client) {
      client.release();
    }
  }
});

server.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});
