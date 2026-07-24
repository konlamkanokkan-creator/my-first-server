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

    // 4. สร้างโครงสร้าง HTML พร้อม CSS สไตล์ห้องทดลองวิทยาศาสตร์ Dr.STONE และมินิเกม
    let html = `
    <!DOCTYPE html>
    <html lang="th">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Kingdom of Science - Student Database</title>
        <style>
            /* ธีมห้องทดลองวิทยาศาสตร์ /Dr.STONE */
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

            /* สไตล์ตารางตลับทดลอง */
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

            /* โซนกิจกรรมทางวิทยาศาสตร์ */
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
                transition: all 0.5s ease;
            }

            /* Canvas สไตล์สำหรับเกมเก็บไนทอล */
            #nital-game-canvas {
                background: #050d07;
                border: 2px solid #10b981;
                border-radius: 5px;
                display: block;
                margin: 15px auto;
                max-width: 100%;
                touch-action: none;
            }

            .game-stats {
                font-size: 1.1em;
                color: #10b981;
                margin-top: 10px;
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

    // ปิดท้ายตาราง และใส่เกมสุ่มสูตร + เกมเก็บไนทอล
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

        <!-- ลูกเล่นที่ 2: เกมหลบหินเก็บน้ำยาไนทอล (Nital Formula) -->
        <div class="game-box">
            <h3>🧪 มินิเกม: ภารกิจปรุงน้ำยาคืนชีพ (Nital Liquid) 🧪</h3>
            <p>ใช้เมาส์หรือนิ้วควบคุมขวดแก้ว 🧪 เพื่อคุมการรับกรด nitric & alcohol 💧 และหลบเศษหิน 🪨</p>
            <button class="btn-action" id="start-game-btn" onclick="startGame()">เริ่มทดลอง / เล่นใหม่</button>
            
            <canvas id="nital-game-canvas" width="320" height="400"></canvas>
            <div class="game-stats">
                ปริมาณน้ำยา: <span id="game-score">0</span> mL | สถิติสูงสุด: <span id="high-score">0</span> mL
            </div>
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

            // === โค้ดมินิเกมเก็บสารเคมีหลบเศษหิน ===
            const canvas = document.getElementById('nital-game-canvas');
            const ctx = canvas.getContext('2d');
            
            let gameInterval;
            let score = 0;
            let highScore = 0;
            let isGameOver = true;

            // ตัวละคร (ขวดแก้ว)
            const player = {
                x: canvas.width / 2,
                y: canvas.height - 30,
                radius: 18,
                emoji: "🧪"
            };

            let fallingItems = [];

            function updatePlayerPosition(clientX) {
                const rect = canvas.getBoundingClientRect();
                const mouseX = clientX - rect.left;
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

            function createItem() {
                const isRock = Math.random() < 0.6; // โอกาสเจอหิน 60% เจอสารเคมี 40%
                const speed = 2 + Math.random() * 3 + (score / 20);
                fallingItems.push({
                    x: Math.random() * (canvas.width - 20) + 10,
                    y: 0,
                    speed: speed,
                    type: isRock ? 'rock' : 'chemical',
                    emoji: isRock ? "🪨" : "💧"
                });
            }

            function startGame() {
                clearInterval(gameInterval);
                fallingItems = [];
                score = 0;
                isGameOver = false;
                player.x = canvas.width / 2;
                document.getElementById('game-score').innerText = score;
                document.getElementById('start-game-btn').innerText = "เริ่มทดลองใหม่";

                gameInterval = setInterval(updateGame, 1000 / 60);
            }

            function updateGame() {
                if (Math.random() < 0.15) {
                    createItem();
                }

                ctx.clearRect(0, 0, canvas.width, canvas.height);

                // วาดตัวละคร (ขวดสารเคมี)
                ctx.font = "28px Serifs";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(player.emoji, player.x, player.y);

                // วาดวัตถุที่หล่นลงมา
                for (let i = 0; i < fallingItems.length; i++) {
                    let item = fallingItems[i];
                    item.y += item.speed;

                    ctx.font = "20px Serifs";
                    ctx.fillText(item.emoji, item.x, item.y);

                    // ตรวจจับการชน
                    const distX = player.x - item.x;
                    const distY = player.y - item.y;
                    const distance = Math.sqrt(distX * distX + distY * distY);

                    if (distance < player.radius + 5) {
                        if (item.type === 'rock') {
                            gameOver();
                            return;
                        } else if (item.type === 'chemical') {
                            score += 5;
                            document.getElementById('game-score').innerText = score;
                            fallingItems.splice(i, 1);
                            i--;
                            continue;
                        }
                    }

                    if (item.y > canvas.height) {
                        fallingItems.splice(i, 1);
                        i--;
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

                ctx.fillStyle = "rgba(5, 13, 7, 0.85)";
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                ctx.fillStyle = "#10b981";
                ctx.font = "bold 20px 'Courier New', monospace";
                ctx.fillText("💥 ขวดทดลองแตก! 💥", canvas.width / 2, canvas.height / 2 - 15);
                
                ctx.fillStyle = "#ecf39e";
                ctx.font = "16px 'Courier New', monospace";
                ctx.fillText("สกัดสารได้: " + score + " mL", canvas.width / 2, canvas.height / 2 + 20);
            }

            // วาดหน้าแรกก่อนกดเริ่ม
            ctx.fillStyle = "#10b981";
            ctx.font = "14px 'Courier New', monospace";
            ctx.textAlign = "center";
            ctx.fillText("กดปุ่มเพื่อเริ่มการสกัดสาร", canvas.width / 2, canvas.height / 2);
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
