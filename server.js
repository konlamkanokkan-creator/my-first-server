const http = require('http');
const url = require('url');
const querystring = require('querystring');
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
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const query = parsedUrl.query;

  let client;

  try {
    client = await pool.connect();

    // ==================== API Routes ====================
    // GET: แสดงทั้งหมด
    if (pathname === '/api/students' && req.method === 'GET') {
      const result = await client.query('SELECT * FROM students ORDER BY students_id');
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(result.rows));
      return;
    }

    // POST: เพิ่มรายชื่อใหม่
    if (pathname === '/api/students' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      req.on('end', async () => {
        try {
          const data = JSON.parse(body);
          const { students_id, stude } = data;
          
          if (!students_id || !stude) {
            res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน' }));
            return;
          }

          const result = await client.query(
            'INSERT INTO students (students_id, stude) VALUES ($1, $2) RETURNING *',
            [students_id, stude]
          );
          
          res.writeHead(201, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify(result.rows[0]));
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });
      return;
    }

    // PUT: แก้ไขข้อมูล
    if (pathname === '/api/students' && req.method === 'PUT') {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      req.on('end', async () => {
        try {
          const data = JSON.parse(body);
          const { id, students_id, stude } = data;
          
          if (!id || !students_id || !stude) {
            res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน' }));
            return;
          }

          const result = await client.query(
            'UPDATE students SET students_id = $1, stude = $2 WHERE id = $3 RETURNING *',
            [students_id, stude, id]
          );
          
          if (result.rows.length === 0) {
            res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: 'ไม่พบข้อมูล' }));
            return;
          }

          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify(result.rows[0]));
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });
      return;
    }

    // DELETE: ลบข้อมูล
    if (pathname === '/api/students' && req.method === 'DELETE') {
      const id = query.id;
      if (!id) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'ระบุ ID ของข้อมูล' }));
        return;
      }

      const result = await client.query('DELETE FROM students WHERE id = $1 RETURNING *', [id]);
      
      if (result.rows.length === 0) {
        res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'ไม่พบข้อมูล' }));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ message: 'ลบข้อมูลสำเร็จ' }));
      return;
    }

    // ==================== Main Page ====================
    if (pathname === '/' && req.method === 'GET') {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      const result = await client.query('SELECT * FROM students ORDER BY students_id');

      let html = `
    <!DOCTYPE html>
    <html lang="th">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Kingdom of Science - Petrification Light</title>
        <style>
            /* ธีมพื้นหลัง: ลำแสงกลายเป็นหิน (Petrification Ray Effect) */
            body {
                background: #040d06;
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

            /* ลำแสงการกลายเป็นหินแผ่รัศมีจากกึ่งกลาง */
            body::before {
                content: '';
                position: fixed;
                top: 50%;
                left: 50%;
                width: 200vw;
                height: 200vw;
                transform: translate(-50%, -50%);
                background: radial-gradient(
                    circle,
                    rgba(16, 185, 129, 0.45) 0%,
                    rgba(16, 185, 129, 0.25) 25%,
                    rgba(5, 46, 22, 0.6) 50%,
                    rgba(4, 13, 6, 0.95) 85%
                );
                z-index: -2;
                animation: petrifyPulse 4s ease-in-out infinite alternate;
            }

            /* วงคลื่นพลังงานลำแสงส่องสว่างเรืองแสง */
            body::after {
                content: '';
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: repeating-radial-gradient(
                    circle at 50% 30%,
                    transparent 0,
                    rgba(16, 185, 129, 0.08) 20px,
                    transparent 40px
                );
                z-index: -1;
                pointer-events: none;
                animation: waveExpand 6s linear infinite;
            }

            @keyframes petrifyPulse {
                0% {
                    transform: translate(-50%, -50%) scale(0.8);
                    opacity: 0.7;
                }
                100% {
                    transform: translate(-50%, -50%) scale(1.1);
                    opacity: 1;
                }
            }

            @keyframes waveExpand {
                0% { transform: scale(1); opacity: 0.3; }
                50% { opacity: 0.8; }
                100% { transform: scale(1.3); opacity: 0.1; }
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
                box-shadow: 0 0 25px #10b981, inset 0 0 15px #10b981;
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
                text-shadow: 0 0 15px #10b981, 0 0 30px #10b981;
                text-align: center;
                color: #ecf39e;
                letter-spacing: 2px;
            }

            .container {
                background: rgba(10, 25, 14, 0.75);
                backdrop-filter: blur(12px);
                border-radius: 10px;
                padding: 25px;
                box-shadow: 0 0 30px rgba(16, 185, 129, 0.3), inset 0 0 15px rgba(16, 185, 129, 0.1);
                border: 1px solid rgba(16, 185, 129, 0.4);
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
                border-bottom: 1px solid rgba(16, 185, 129, 0.2);
            }

            th {
                color: #10b981;
                font-size: 1.1em;
                text-transform: uppercase;
                text-shadow: 0 0 8px rgba(16, 185, 129, 0.6);
            }

            tr:hover {
                background: rgba(16, 185, 129, 0.15);
            }

            .game-box {
                background: rgba(10, 25, 14, 0.8);
                backdrop-filter: blur(10px);
                border: 2px dashed #10b981;
                border-radius: 10px;
                padding: 20px;
                text-align: center;
                max-width: 600px;
                width: 90%;
                box-shadow: 0 0 25px rgba(16, 185, 129, 0.25);
                margin-bottom: 30px;
            }

            .btn-action {
                background: #10b981;
                color: #040d06;
                border: none;
                padding: 12px 25px;
                font-size: 16px;
                font-weight: bold;
                border-radius: 5px;
                cursor: pointer;
                transition: all 0.3s ease;
                box-shadow: 0 0 15px rgba(16, 185, 129, 0.5);
                margin: 5px;
                font-family: inherit;
            }

            .btn-action:hover {
                transform: scale(1.05);
                box-shadow: 0 0 25px rgba(16, 185, 129, 0.9);
                background: #34d399;
            }

            .btn-delete {
                background: #ef4444;
                padding: 6px 12px;
                font-size: 14px;
                margin: 2px;
            }

            .btn-delete:hover {
                background: #dc2626;
            }

            .btn-edit {
                background: #f59e0b;
                padding: 6px 12px;
                font-size: 14px;
                margin: 2px;
            }

            .btn-edit:hover {
                background: #d97706;
            }

            .form-group {
                margin-bottom: 15px;
                text-align: left;
            }

            label {
                display: block;
                margin-bottom: 5px;
                color: #10b981;
                font-weight: bold;
            }

            input {
                width: 100%;
                padding: 10px;
                border: 1px solid #10b981;
                border-radius: 5px;
                background: rgba(16, 185, 129, 0.1);
                color: #ecf39e;
                font-family: inherit;
                font-size: 16px;
                box-sizing: border-box;
            }

            input:focus {
                outline: none;
                box-shadow: 0 0 15px rgba(16, 185, 129, 0.6);
                background: rgba(16, 185, 129, 0.2);
            }

            .modal {
                display: none;
                position: fixed;
                z-index: 1000;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.7);
                backdrop-filter: blur(5px);
            }

            .modal-content {
                background: rgba(10, 25, 14, 0.95);
                margin: 5% auto;
                padding: 30px;
                border: 1px solid rgba(16, 185, 129, 0.4);
                border-radius: 10px;
                width: 90%;
                max-width: 500px;
                box-shadow: 0 0 40px rgba(16, 185, 129, 0.4);
            }

            .close {
                color: #ecf39e;
                float: right;
                font-size: 28px;
                font-weight: bold;
                cursor: pointer;
                transition: 0.3s;
            }

            .close:hover {
                color: #10b981;
            }

            .modal-title {
                color: #ecf39e;
                text-shadow: 0 0 15px #10b981;
                margin-bottom: 20px;
            }

            .action-buttons {
                text-align: center;
            }

            .btn-cancel {
                background: #6b7280;
                margin-top: 15px;
            }

            .btn-cancel:hover {
                background: #4b5563;
            }

            .status-message {
                padding: 10px;
                margin-bottom: 15px;
                border-radius: 5px;
                text-align: center;
                display: none;
            }

            .status-success {
                background: rgba(16, 185, 129, 0.3);
                color: #10b981;
                display: block;
            }

            .status-error {
                background: rgba(239, 68, 68, 0.3);
                color: #ef4444;
                display: block;
            }

            #formula-result {
                margin-top: 15px;
                font-size: 1.1em;
                font-weight: bold;
                color: #ecf39e;
                min-height: 30px;
            }

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
                filter: grayscale(100%) contrast(150%);
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
            <h2 style="text-align: center; color: #10b981;">📋 รายชื่อนักศึกษา</h2>
            <div class="status-message" id="statusMessage"></div>
            <button class="btn-action" onclick="openAddModal()" style="width: 100%; margin-bottom: 15px;">➕ เพิ่มรายชื่อใหม่</button>
            <table id="studentsTable">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>รหัสนักศึกษา</th>
                        <th>ชื่อ-นามสกุล</th>
                        <th>การจัดการ</th>
                    </tr>
                </thead>
                <tbody id="tableBody">`;

      // วนลูปนำข้อมูลจากฐานข้อมูลมาแสดงในตาราง
      result.rows.forEach(row => {
        html += `
                    <tr id="row-${row.id}">
                        <td>${row.id}</td>
                        <td>${row.students_id}</td>
                        <td>${row.stude}</td>
                        <td>
                            <button class="btn-action btn-edit" onclick="openEditModal(${row.id}, '${row.students_id}', '${row.stude}')">✏️ แก้ไข</button>
                            <button class="btn-action btn-delete" onclick="deleteStudent(${row.id})">🗑️ ลบ</button>
                        </td>
                    </tr>`;
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

        <!-- Modal สำหรับเพิ่มและแก้ไขรายชื่อ -->
        <div id="studentModal" class="modal">
            <div class="modal-content">
                <span class="close" onclick="closeModal()">&times;</span>
                <h2 class="modal-title" id="modalTitle">เพิ่มรายชื่อใหม่</h2>
                <div class="status-message" id="modalStatusMessage"></div>
                
                <form id="studentForm">
                    <input type="hidden" id="studentId">
                    
                    <div class="form-group">
                        <label for="studentIdInput">รหัสนักศึกษา:</label>
                        <input type="text" id="studentIdInput" placeholder="เช่น 69319010173" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="studentNameInput">ชื่อ-นามสกุล:</label>
                        <input type="text" id="studentNameInput" placeholder="เช่น กนกกาญจน์ คนล่ำ" required>
                    </div>

                    <div class="action-buttons">
                        <button type="button" class="btn-action" onclick="saveStudent()">💾 บันทึก</button>
                        <button type="button" class="btn-action btn-cancel" onclick="closeModal()">❌ ยกเลิก</button>
                    </div>
                </form>
            </div>
        </div>

        <script>
            // === โค้ดจัดการ Modal ===
            const modal = document.getElementById('studentModal');

            function openAddModal() {
                document.getElementById('modalTitle').innerText = '➕ เพิ่มรายชื่อใหม่';
                document.getElementById('studentForm').reset();
                document.getElementById('studentId').value = '';
                document.getElementById('modalStatusMessage').className = '';
                document.getElementById('modalStatusMessage').innerText = '';
                modal.style.display = 'block';
            }

            function openEditModal(id, studentId, studentName) {
                document.getElementById('modalTitle').innerText = '✏️ แก้ไขรายชื่อ';
                document.getElementById('studentId').value = id;
                document.getElementById('studentIdInput').value = studentId;
                document.getElementById('studentNameInput').value = studentName;
                document.getElementById('modalStatusMessage').className = '';
                document.getElementById('modalStatusMessage').innerText = '';
                modal.style.display = 'block';
            }

            function closeModal() {
                modal.style.display = 'none';
                document.getElementById('studentForm').reset();
            }

            window.onclick = function(event) {
                if (event.target === modal) {
                    closeModal();
                }
            }

            async function saveStudent() {
                const id = document.getElementById('studentId').value;
                const studentId = document.getElementById('studentIdInput').value.trim();
                const studentName = document.getElementById('studentNameInput').value.trim();
                const statusDiv = document.getElementById('modalStatusMessage');

                if (!studentId || !studentName) {
                    statusDiv.className = 'status-message status-error';
                    statusDiv.innerText = '❌ กรุณากรอกข้อมูลให้ครบถ้วน';
                    return;
                }

                try {
                    const method = id ? 'PUT' : 'POST';
                    const data = {
                        students_id: studentId,
                        stude: studentName
                    };

                    if (id) {
                        data.id = parseInt(id);
                    }

                    const response = await fetch('/api/students', {
                        method: method,
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(data)
                    });

                    const result = await response.json();

                    if (!response.ok) {
                        statusDiv.className = 'status-message status-error';
                        statusDiv.innerText = '❌ ' + (result.error || 'เกิดข้อผิดพลาด');
                        return;
                    }

                    statusDiv.className = 'status-message status-success';
                    statusDiv.innerText = '✅ ' + (id ? 'แก้ไข' : 'เพิ่ม') + 'ข้อมูลสำเร็จ!';
                    
                    setTimeout(() => {
                        location.reload();
                    }, 1000);
                } catch (error) {
                    statusDiv.className = 'status-message status-error';
                    statusDiv.innerText = '❌ ' + error.message;
                }
            }

            async function deleteStudent(id) {
                if (!confirm('คุณแน่ใจว่าต้องการลบรายชื่อนี้?')) {
                    return;
                }

                try {
                    const response = await fetch(\`/api/students?id=\${id}\`, {
                        method: 'DELETE'
                    });

                    const result = await response.json();

                    if (!response.ok) {
                        alert('❌ ' + (result.error || 'เกิดข้อผิดพลาด'));
                        return;
                    }

                    showStatus('✅ ลบข้อมูลสำเร็จ!', 'success');
                    setTimeout(() => {
                        location.reload();
                    }, 1000);
                } catch (error) {
                    alert('❌ ' + error.message);
                }
            }

            function showStatus(message, type) {
                const statusDiv = document.getElementById('statusMessage');
                statusDiv.className = 'status-message status-' + type;
                statusDiv.innerText = message;
            }

            // === โค้ดมินิเกมวิเคราะห์วิทยาศาสตร์ ===
            const scienceQuotes = [
                "🧪 ความสำเร็จในการรันโค้ดเทอมนี้คือ 10,000,000%!",
                "⚡ วิทยาศาสตร์ไม่ได้โกหก: ถ้าพยายามต่อไป เกรด A จะสังเคราะห์ขึ้นมา!",
                "🪨 ต่อให้ถูกสต๊อกเป็นหินไป 3,700 ปี สมองก็ยังต้องประมวลผลต่อไป!",
                "💡 กฎของธรรมชาติ: โค้ดที่ไม่มีบั๊ก คือผลลัพธ์ของการทดลองนับพัน!",
                "🔥 สังเคราะห์พลังงานสำเร็จ! วันนี้คุณมีกำลังใจลุยโปรเจกต์เต็มร้อย!",
                "🧬 ตรวจพบโครงสร้างความขยันระดับเซลล์! การเรียนสัปดาห์นี้จะฉลุย!"
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

                // สูตรที่ถูกต้อง: Nitric Acid 30% + Alcohol 70% (+-2%)
                if (nitric >= 28 && nitric <= 32 && alcohol >= 68 && alcohol <= 72) {
                    bird.className = "bird-stage bird-revived";
                    bird.innerText = "🕊️";
                    status.innerHTML = "<span style='color: #10b981;'>✨ สำเร็จ 10,000,000%! ชั้นหินปริแตก นกฟื้นคืนชีพแล้ว! ✨</span>";
                } else {
                    bird.className = "bird-stage";
                    bird.innerText = "🦅";
                    status.innerHTML = "<span style='color: #ef4444;'>❌ ไม่เกิดปฏิกิริยาใดๆ... สัดส่วนสารเคมียังไม่ถูกต้อง</span>";
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

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
      return;
    }

    // ==================== 404 ====================
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h1>404 - ไม่พบหน้านี้</h1>');

  } catch (err) {
    console.error("Database or Server Error:", err);
    res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
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
