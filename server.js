const http = require('http');
const url = require('url');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const port = process.env.PORT || 3000;

// ช่วยอ่าน JSON body ของ request แบบ async/await
function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(new Error('รูปแบบ JSON ไม่ถูกต้อง'));
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const query = parsedUrl.query;

  let client;

  try {
    client = await pool.connect();

    // สร้างตารางอัตโนมัติหากยังไม่มี
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        product_code VARCHAR(50) NOT NULL UNIQUE,
        product_name VARCHAR(255) NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 0,
        price DECIMAL(10, 2) NOT NULL DEFAULT 0.00
      )
    `);

    // ==================== API Routes: สินค้า ====================
    // GET: แสดงสินค้าทั้งหมด
    if (pathname === '/api/products' && req.method === 'GET') {
      const result = await client.query('SELECT * FROM products ORDER BY id ASC');
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(result.rows));
      return;
    }

    // POST: เพิ่มสินค้าใหม่
    if (pathname === '/api/products' && req.method === 'POST') {
      try {
        const data = await readJsonBody(req);
        const product_code = (data.product_code || '').trim();
        const product_name = (data.product_name || '').trim();
        const quantity = parseInt(data.quantity, 10);
        const price = parseFloat(data.price);

        if (!product_code || !product_name || Number.isNaN(quantity) || Number.isNaN(price)) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: 'กรุณากรอกข้อมูลสินค้าให้ครบถ้วนและถูกต้อง' }));
          return;
        }

        const result = await client.query(
          'INSERT INTO products (product_code, product_name, quantity, price) VALUES ($1, $2, $3, $4) RETURNING *',
          [product_code, product_name, quantity, price]
        );

        res.writeHead(201, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(result.rows[0]));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: err.message }));
      }
      return;
    }

    // PUT: แก้ไขข้อมูลสินค้า / ปรับยอดสต็อก
    if (pathname === '/api/products' && req.method === 'PUT') {
      try {
        const data = await readJsonBody(req);
        const id = parseInt(data.id, 10);
        const product_code = (data.product_code || '').trim();
        const product_name = (data.product_name || '').trim();
        const quantity = parseInt(data.quantity, 10);
        const price = parseFloat(data.price);

        if (!id || !product_code || !product_name || Number.isNaN(quantity) || Number.isNaN(price)) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: 'กรุณากรอกข้อมูลสินค้าให้ครบถ้วน' }));
          return;
        }

        const result = await client.query(
          'UPDATE products SET product_code = $1, product_name = $2, quantity = $3, price = $4 WHERE id = $5 RETURNING *',
          [product_code, product_name, quantity, price, id]
        );

        if (result.rows.length === 0) {
          res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: 'ไม่พบข้อมูลสินค้า' }));
          return;
        }

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(result.rows[0]));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: err.message }));
      }
      return;
    }

    // DELETE: ลบสินค้า
    if (pathname === '/api/products' && req.method === 'DELETE') {
      const id = query.id;
      if (!id) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'กรุณาระบุ ID ของสินค้า' }));
        return;
      }

      const result = await client.query('DELETE FROM products WHERE id = $1 RETURNING *', [id]);

      if (result.rows.length === 0) {
        res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'ไม่พบข้อมูลสินค้า' }));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ message: 'ลบสินค้าสำเร็จ' }));
      return;
    }

    // ==================== Main Page ====================
    if (pathname === '/' && req.method === 'GET') {
      const result = await client.query('SELECT * FROM products ORDER BY id ASC');
      const totalItems = result.rows.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
      const totalValue = result.rows.reduce(
        (sum, item) => sum + Number(item.quantity || 0) * Number(item.price || 0),
        0
      );

      let rowsHtml = '';
      result.rows.forEach(row => {
        const lowStockBadge =
          row.quantity <= 5
            ? ' <span style="color:#ef4444; font-weight:bold;">(ใกล้หมด!)</span>'
            : '';
        const safeName = String(row.product_name).replace(/'/g, "\\'");
        const safeCode = String(row.product_code).replace(/'/g, "\\'");

        rowsHtml += `
          <tr id="row-${row.id}">
            <td>${row.id}</td>
            <td>${row.product_code}</td>
            <td>${row.product_name}${lowStockBadge}</td>
            <td>${row.quantity}</td>
            <td>${Number(row.price).toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿</td>
            <td>
              <button class="btn-action btn-edit" onclick="openEditModal(${row.id}, '${safeCode}', '${safeName}', ${row.quantity}, ${row.price})">✏️ แก้ไข</button>
              <button class="btn-action btn-delete" onclick="deleteProduct(${row.id})">🗑️ ลบ</button>
            </td>
          </tr>`;
      });

      const escapeButtonsHtml = result.rows
        .map(
          row =>
            `<button class="btn-action" onclick="playerEscape('${String(row.product_name).replace(/'/g, "\\'")}')" style="flex: 1; min-width: 150px; background: #8b5cf6;">📦 ${row.product_name}</button>`
        )
        .join('');

      const html = `
      <!DOCTYPE html>
      <html lang="th">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Kingdom of Science - คลังสินค้า</title>
          <style>
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
              @keyframes petrifyPulse {
                  0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0.7; }
                  100% { transform: translate(-50%, -50%) scale(1.1); opacity: 1; }
              }
              h1 {
                  text-shadow: 0 0 15px #10b981, 0 0 30px #10b981;
                  text-align: center;
                  color: #ecf39e;
                  letter-spacing: 2px;
              }
              .summary-bar {
                  display: flex;
                  justify-content: space-around;
                  gap: 12px;
                  background: rgba(16, 185, 129, 0.12);
                  border: 1px solid rgba(16, 185, 129, 0.35);
                  border-radius: 8px;
                  padding: 12px;
                  margin-bottom: 15px;
                  font-size: 0.95em;
              }
              .container {
                  background: rgba(10, 25, 14, 0.75);
                  backdrop-filter: blur(12px);
                  border-radius: 10px;
                  padding: 25px;
                  box-shadow: 0 0 30px rgba(16, 185, 129, 0.3), inset 0 0 15px rgba(16, 185, 129, 0.1);
                  border: 1px solid rgba(16, 185, 129, 0.4);
                  width: 95%;
                  max-width: 780px;
                  margin-bottom: 30px;
              }
              table {
                  width: 100%;
                  border-collapse: collapse;
                  margin-top: 15px;
              }
              th, td {
                  padding: 10px;
                  text-align: left;
                  border-bottom: 1px solid rgba(16, 185, 129, 0.2);
              }
              th {
                  color: #10b981;
                  text-transform: uppercase;
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
                  max-width: 780px;
                  width: 95%;
                  box-shadow: 0 0 25px rgba(16, 185, 129, 0.25);
                  margin-bottom: 30px;
              }
              .btn-action {
                  background: #10b981;
                  color: #040d06;
                  border: none;
                  padding: 10px 18px;
                  font-size: 15px;
                  font-weight: bold;
                  border-radius: 5px;
                  cursor: pointer;
                  transition: all 0.25s ease;
                  margin: 4px;
                  font-family: inherit;
              }
              .btn-action:hover {
                  transform: scale(1.03);
                  background: #34d399;
              }
              .btn-delete { background: #ef4444; color: #fff; padding: 6px 10px; font-size: 13px; }
              .btn-edit { background: #f59e0b; color: #040d06; padding: 6px 10px; font-size: 13px; }
              .btn-cancel { background: #6b7280; color: #fff; }
              .form-group { margin-bottom: 14px; text-align: left; }
              label { display: block; margin-bottom: 5px; color: #10b981; font-weight: bold; }
              input {
                  width: 100%;
                  padding: 10px;
                  border: 1px solid #10b981;
                  border-radius: 5px;
                  background: rgba(16, 185, 129, 0.1);
                  color: #ecf39e;
                  font-family: inherit;
                  font-size: 15px;
                  box-sizing: border-box;
              }
              .modal {
                  display: none;
                  position: fixed;
                  z-index: 1000;
                  left: 0;
                  top: 0;
                  width: 100%;
                  height: 100%;
                  background-color: rgba(0, 0, 0, 0.75);
              }
              .modal-content {
                  background: rgba(10, 25, 14, 0.96);
                  margin: 5% auto;
                  padding: 25px;
                  border: 1px solid rgba(16, 185, 129, 0.5);
                  border-radius: 10px;
                  width: 90%;
                  max-width: 480px;
              }
              .close { color: #ecf39e; float: right; font-size: 28px; cursor: pointer; }
              .status-message { padding: 10px; margin-bottom: 12px; border-radius: 5px; text-align: center; display: none; }
              .status-success { background: rgba(16, 185, 129, 0.3); color: #10b981; display: block; }
              .status-error { background: rgba(239, 68, 68, 0.3); color: #ef4444; display: block; }
              #game-arena {
                  width: 100%;
                  height: 240px;
                  background: linear-gradient(135deg, #0f1419 0%, #1a2332 100%);
                  border: 2px solid #10b981;
                  border-radius: 10px;
                  position: relative;
                  overflow: hidden;
                  margin: 12px 0;
              }
              .villain { position: absolute; font-size: 50px; right: 24px; top: 45%; }
              .player { position: absolute; font-size: 46px; left: 24px; top: 45%; }
          </style>
      </head>
      <body>
          <h1>📦 KINGDOM OF SCIENCE INVENTORY 📦</h1>

          <div class="container">
              <h2 style="text-align: center; color: #10b981;">📋 รายการสินค้าในคลัง</h2>

              <div class="summary-bar">
                  <div>จำนวนชิ้นรวม: <strong>${totalItems.toLocaleString('th-TH')}</strong> ชิ้น</div>
                  <div>มูลค่าสต็อกรวม: <strong>${totalValue.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</strong> ฿</div>
              </div>

              <div class="status-message" id="statusMessage"></div>
              <button class="btn-action" onclick="openAddModal()" style="width: 100%; margin-bottom: 12px;">➕ เพิ่มสินค้าใหม่</button>

              <table>
                  <thead>
                      <tr>
                          <th>ID</th>
                          <th>รหัสสินค้า</th>
                          <th>ชื่อสินค้า</th>
                          <th>คงเหลือ</th>
                          <th>ราคา/หน่วย</th>
                          <th>จัดการ</th>
                      </tr>
                  </thead>
                  <tbody>
                      ${rowsHtml || '<tr><td colspan="6" style="text-align:center;">ยังไม่มีสินค้าในคลัง</td></tr>'}
                  </tbody>
              </table>
          </div>

          <div class="game-box">
              <h3>🏃 มินิเกม: เร่งส่งสินค้าหนีวายร้าย 🏃</h3>
              <p>คลิกปุ่มชื่อสินค้าให้ครบ 5 ครั้งเพื่อส่งของสำเร็จ!</p>
              <div id="game-arena">
                  <div class="villain">🦹</div>
                  <div class="player" id="player">🏃</div>
              </div>
              <div id="game-status">🎮 เลือกสินค้าด้านล่างเพื่อเริ่ม...</div>
              <div id="escape-buttons" style="display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin-top: 12px;">
                  ${escapeButtonsHtml}
              </div>
              <button class="btn-action" onclick="resetEscapeGame()" style="margin-top: 14px; background: #a3b18a;">🔄 เริ่มเกมใหม่</button>
          </div>

          <div id="productModal" class="modal">
              <div class="modal-content">
                  <span class="close" onclick="closeModal()">&times;</span>
                  <h2 id="modalTitle" style="color: #ecf39e;">เพิ่มสินค้าใหม่</h2>
                  <div class="status-message" id="modalStatusMessage"></div>
                  <form id="productForm">
                      <input type="hidden" id="productDbId">
                      <div class="form-group">
                          <label for="productCodeInput">รหัสสินค้า:</label>
                          <input type="text" id="productCodeInput" placeholder="เช่น SKU-001" required>
                      </div>
                      <div class="form-group">
                          <label for="productNameInput">ชื่อสินค้า:</label>
                          <input type="text" id="productNameInput" placeholder="เช่น น้ำดื่มสมุนไพร" required>
                      </div>
                      <div class="form-group">
                          <label for="quantityInput">จำนวนคงเหลือ (ชิ้น):</label>
                          <input type="number" id="quantityInput" min="0" value="1" required>
                      </div>
                      <div class="form-group">
                          <label for="priceInput">ราคาต่อหน่วย (บาท):</label>
                          <input type="number" id="priceInput" min="0" step="0.01" value="0.00" required>
                      </div>
                      <div style="text-align: center;">
                          <button type="button" class="btn-action" onclick="saveProduct()">💾 บันทึก</button>
                          <button type="button" class="btn-action btn-cancel" onclick="closeModal()">❌ ยกเลิก</button>
                      </div>
                  </form>
              </div>
          </div>

          <script>
              const modal = document.getElementById('productModal');

              function openAddModal() {
                  document.getElementById('modalTitle').innerText = '➕ เพิ่มสินค้าใหม่';
                  document.getElementById('productForm').reset();
                  document.getElementById('productDbId').value = '';
                  document.getElementById('modalStatusMessage').className = 'status-message';
                  modal.style.display = 'block';
              }

              function openEditModal(id, code, name, quantity, price) {
                  document.getElementById('modalTitle').innerText = '✏️ แก้ไขข้อมูลสินค้า';
                  document.getElementById('productDbId').value = id;
                  document.getElementById('productCodeInput').value = code;
                  document.getElementById('productNameInput').value = name;
                  document.getElementById('quantityInput').value = quantity;
                  document.getElementById('priceInput').value = price;
                  document.getElementById('modalStatusMessage').className = 'status-message';
                  modal.style.display = 'block';
              }

              function closeModal() {
                  modal.style.display = 'none';
              }

              async function saveProduct() {
                  const id = document.getElementById('productDbId').value;
                  const product_code = document.getElementById('productCodeInput').value.trim();
                  const product_name = document.getElementById('productNameInput').value.trim();
                  const quantity = parseInt(document.getElementById('quantityInput').value, 10);
                  const price = parseFloat(document.getElementById('priceInput').value);
                  const statusDiv = document.getElementById('modalStatusMessage');

                  if (!product_code || !product_name || Number.isNaN(quantity) || Number.isNaN(price)) {
                      statusDiv.className = 'status-message status-error';
                      statusDiv.innerText = '❌ กรุณากรอกข้อมูลให้ครบถ้วน';
                      return;
                  }

                  const payload = { product_code, product_name, quantity, price };
                  if (id) payload.id = parseInt(id, 10);

                  const res = await fetch('/api/products', {
                      method: id ? 'PUT' : 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(payload)
                  });
                  const data = await res.json();

                  if (!res.ok) {
                      statusDiv.className = 'status-message status-error';
                      statusDiv.innerText = '❌ ' + (data.error || 'เกิดข้อผิดพลาด');
                      return;
                  }

                  statusDiv.className = 'status-message status-success';
                  statusDiv.innerText = '✅ บันทึกข้อมูลสินค้าเรียบร้อย';
                  setTimeout(() => location.reload(), 700);
              }

              async function deleteProduct(id) {
                  if (!confirm('ยืนยันการลบสินค้านี้?')) return;
                  const res = await fetch('/api/products?id=' + id, { method: 'DELETE' });
                  const data = await res.json();
                  if (!res.ok) {
                      alert('❌ ' + (data.error || 'ลบไม่สำเร็จ'));
                      return;
                  }
                  location.reload();
              }

              let escapeCount = {};
              const requiredEscapes = 5;

              function playerEscape(itemName) {
                  escapeCount[itemName] = (escapeCount[itemName] || 0) + 1;
                  const status = document.getElementById('game-status');
                  status.innerText = '📦 ส่ง ' + itemName + ': ' + escapeCount[itemName] + '/' + requiredEscapes + ' ครั้ง';
                  if (escapeCount[itemName] >= requiredEscapes) {
                      status.innerText = '🏆 จัดส่ง ' + itemName + ' สำเร็จ 10,000,000%!';
                  }
              }

              function resetEscapeGame() {
                  escapeCount = {};
                  document.getElementById('game-status').innerText = '🎮 เลือกสินค้าด้านล่างเพื่อเริ่ม...';
              }
          </script>
      </body>
      </html>`;

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h1>404 - ไม่พบหน้านี้</h1>');
  } catch (err) {
    console.error('Database or Server Error:', err);
    res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h1>เกิดข้อผิดพลาดในระบบ</h1><p>' + err.message + '</p>');
  } finally {
    if (client) client.release();
  }
});

server.listen(port, () => {
  console.log('Server running on port:', port);
});
