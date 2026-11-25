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

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

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
        reject(new Error('รูปแบบข้อมูล JSON ไม่ถูกต้อง'));
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

    // สร้างตารางสินค้า ตารางสรุปยอดขาย และตารางประวัติการขายออก
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        product_code VARCHAR(50) NOT NULL UNIQUE,
        product_name VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL DEFAULT 'ทั่วไป',
        quantity INTEGER NOT NULL DEFAULT 0,
        price DECIMAL(10, 2) NOT NULL DEFAULT 0.00
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS sales_summary (
        id SERIAL PRIMARY KEY,
        total_revenue DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
        total_orders INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS sales_logs (
        id SERIAL PRIMARY KEY,
        product_id INTEGER,
        product_code VARCHAR(50),
        product_name VARCHAR(255) NOT NULL,
        sold_qty INTEGER NOT NULL,
        unit_price DECIMAL(10, 2) NOT NULL,
        total_amount DECIMAL(12, 2) NOT NULL,
        sold_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const salesInit = await client.query('SELECT * FROM sales_summary ORDER BY id ASC LIMIT 1');
    if (salesInit.rows.length === 0) {
      await client.query('INSERT INTO sales_summary (total_revenue, total_orders) VALUES (0, 0)');
    }

    // ==================== API Routes: สินค้า ====================
    if (pathname === '/api/products' && req.method === 'GET') {
      const result = await client.query('SELECT * FROM products ORDER BY id ASC');
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(result.rows));
      return;
    }

    if (pathname === '/api/products' && req.method === 'POST') {
      try {
        const data = await readJsonBody(req);
        const product_code = String(data.product_code || '').trim();
        const product_name = String(data.product_name || '').trim();
        const category = String(data.category || 'ทั่วไป').trim() || 'ทั่วไป';
        const quantity = parseInt(data.quantity, 10);
        const price = parseFloat(data.price);

        if (!product_code || !product_name || Number.isNaN(quantity) || quantity < 0 || Number.isNaN(price) || price < 0) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: 'กรุณากรอกข้อมูลสินค้าให้ครบถ้วนและถูกต้อง' }));
          return;
        }

        const result = await client.query(
          'INSERT INTO products (product_code, product_name, category, quantity, price) VALUES ($1, $2, $3, $4, $5) RETURNING *',
          [product_code, product_name, category, quantity, price]
        );

        res.writeHead(201, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(result.rows[0]));
      } catch (err) {
        const message = err.code === '23505'
          ? 'รหัสสินค้านี้มีอยู่ในระบบแล้ว กรุณาใช้รหัสอื่น'
          : err.message;
        res.writeHead(err.code === '23505' ? 400 : 500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: message }));
      }
      return;
    }

    if (pathname === '/api/products' && req.method === 'PUT') {
      try {
        const data = await readJsonBody(req);
        const id = parseInt(data.id, 10);
        const product_code = String(data.product_code || '').trim();
        const product_name = String(data.product_name || '').trim();
        const category = String(data.category || 'ทั่วไป').trim() || 'ทั่วไป';
        const quantity = parseInt(data.quantity, 10);
        const price = parseFloat(data.price);

        if (!id || !product_code || !product_name || Number.isNaN(quantity) || quantity < 0 || Number.isNaN(price) || price < 0) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: 'กรุณากรอกข้อมูลสินค้าให้ครบถ้วนและถูกต้อง' }));
          return;
        }

        const result = await client.query(
          'UPDATE products SET product_code = $1, product_name = $2, category = $3, quantity = $4, price = $5 WHERE id = $6 RETURNING *',
          [product_code, product_name, category, quantity, price, id]
        );

        if (result.rows.length === 0) {
          res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: 'ไม่พบข้อมูลสินค้า' }));
          return;
        }

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(result.rows[0]));
      } catch (err) {
        const message = err.code === '23505'
          ? 'รหัสสินค้านี้ซ้ำกับรายการอื่นในระบบ'
          : err.message;
        res.writeHead(err.code === '23505' ? 400 : 500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: message }));
      }
      return;
    }

    if (pathname === '/api/products' && req.method === 'DELETE') {
      const id = parseInt(query.id, 10);
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

    // ==================== API Routes: การขายออก ====================
    if (pathname === '/api/sales' && req.method === 'POST') {
      try {
        const data = await readJsonBody(req);
        const id = parseInt(data.id, 10);
        const sellQty = parseInt(data.sellQty, 10);

        if (!id || Number.isNaN(sellQty) || sellQty <= 0) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: 'กรุณาระบุจำนวนที่ต้องการขายอย่างน้อย 1 ชิ้น' }));
          return;
        }

        await client.query('BEGIN');

        const prodRes = await client.query('SELECT * FROM products WHERE id = $1', [id]);
        if (prodRes.rows.length === 0) {
          await client.query('ROLLBACK');
          res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: 'ไม่พบสินค้าในระบบ' }));
          return;
        }

        const product = prodRes.rows[0];
        if (Number(product.quantity) < sellQty) {
          await client.query('ROLLBACK');
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: `สต็อกไม่พอ (เหลือเพียง \${product.quantity} ชิ้น)` }));
          return;
        }

        const updatedProductRes = await client.query(
          'UPDATE products SET quantity = quantity - $1 WHERE id = $2 RETURNING *',
          [sellQty, id]
        );

        const unitPrice = Number(product.price);
        const totalAmount = unitPrice * sellQty;

        await client.query(
          `INSERT INTO sales_logs (product_id, product_code, product_name, sold_qty, unit_price, total_amount)
           VALUES (\$1, \$2, \$3, \$4, \$5, \$6)`,
          [product.id, product.product_code, product.product_name, sellQty, unitPrice, totalAmount]
        );

        const currentSales = await client.query('SELECT * FROM sales_summary ORDER BY id ASC LIMIT 1');
        const salesId = currentSales.rows[0].id;

        const updatedSalesRes = await client.query(
          `UPDATE sales_summary
           SET total_revenue = total_revenue + \$1, total_orders = total_orders + 1, updated_at = CURRENT_TIMESTAMP
           WHERE id = \$2 RETURNING *`,
          [totalAmount, salesId]
        );

        await client.query('COMMIT');

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
          product: updatedProductRes.rows[0],
          sales: updatedSalesRes.rows[0],
          soldAmount: totalAmount
        }));
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: err.message }));
      }
      return;
    }

    // ==================== Main Page ====================
    if (pathname === '/' && req.method === 'GET') {
      const result = await client.query('SELECT * FROM products ORDER BY id ASC');
      const salesResult = await client.query('SELECT * FROM sales_summary ORDER BY id ASC LIMIT 1');
      const salesData = salesResult.rows[0] || { total_revenue: 0, total_orders: 0 };

      const chartByProductRes = await client.query(`
        SELECT product_name, SUM(total_amount) AS revenue, SUM(sold_qty) AS units_sold
        FROM sales_logs
        GROUP BY product_name
        ORDER BY revenue DESC
        LIMIT 8
      `);

      const recentSalesRes = await client.query(`
        SELECT * FROM sales_logs
        ORDER BY sold_at DESC, id DESC
        LIMIT 8
      `);

      const totalSkus = result.rows.length;
      const totalStockValue = result.rows.reduce(
        (sum, item) => sum + Number(item.quantity || 0) * Number(item.price || 0),
        0
      );
      const lowStockItems = result.rows.filter(item => Number(item.quantity) > 0 && Number(item.quantity) <= 5);
      const outOfStockItems = result.rows.filter(item => Number(item.quantity) <= 0);

      let rowsHtml = '';
      result.rows.forEach(row => {
        const qty = Number(row.quantity || 0);
        let statusBadge = '<span class="badge badge-ok">พร้อมขาย</span>';
        let stockFilterAttr = 'ok';
        let barColor = '#2563eb';
        const barWidth = qty <= 0 ? 0 : Math.min(100, Math.max(8, (qty / 50) * 100));

        if (qty <= 0) {
          statusBadge = '<span class="badge badge-out">หมดสต็อก</span>';
          stockFilterAttr = 'out';
          barColor = '#dc2626';
        } else if (qty <= 5) {
          statusBadge = '<span class="badge badge-low">ใกล้หมด</span>';
          stockFilterAttr = 'low';
          barColor = '#d97706';
        }

        const searchStr = escapeHtml(
          `\${row.product_code} ${row.product_name}${row.category || 'ทั่วไป'}`.toLowerCase()
        );

        rowsHtml += `
          <tr class="product-row"
              data-status="\${stockFilterAttr}"
              data-search="\${searchStr}"
              data-id="\${row.id}"
              data-code="\${escapeHtml(row.product_code)}"
              data-name="\${escapeHtml(row.product_name)}"
              data-category="\${escapeHtml(row.category || 'ทั่วไป')}"
              data-quantity="\${qty}"
              data-price="\${Number(row.price)}">
            <td>\${escapeHtml(row.product_code)}</td>
            <td><strong>\${escapeHtml(row.product_name)}</strong></td>
            <td>\${escapeHtml(row.category || 'ทั่วไป')}</td>
            <td>
              <div class="stock-cell">
                <div class="progress-track">
                  <div class="progress-fill" style="width:${barWidth}\%; background:${barColor};"></div>
                </div>
                <span>\${qty} ชิ้น</span>
              </div>
            </td>
            <td>฿\${Number(row.price).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
            <td>\${statusBadge}</td>
            <td class="actions-col">
              <button type="button" class="btn btn-sell" onclick="openSellFromRow(this)" \${qty <= 0 ? 'disabled' : ''}>ขายออก</button>
              <button type="button" class="btn btn-edit" onclick="openEditFromRow(this)">แก้ไข</button>
              <button type="button" class="btn btn-delete" onclick="deleteProduct(\${row.id})">ลบ</button>
            </td>
          </tr>`;
      });

      const alertMessages = [];
      if (outOfStockItems.length > 0) {
        alertMessages.push(
          `<strong>สินค้าหมดสต็อก (${outOfStockItems.length} รายการ):</strong> ${outOfStockItems.map(i => escapeHtml(i.product_name)).join(', ')}`
        );
      }
      if (lowStockItems.length > 0) {
        alertMessages.push(
          `<strong>สินค้าใกล้หมดสต็อก &le; 5 ชิ้น (${lowStockItems.length} รายการ):</strong> ${lowStockItems.map(i => `${escapeHtml(i.product_name)} (เหลือ ${i.quantity})`).join(', ')}`
        );
      }

      const alertBannerHtml = alertMessages.length > 0
        ? `<div class="alert-banner">
             <div class="alert-icon">!</div>
             <div class="alert-content">
               <div class="alert-title">แจ้งเตือนสถานะคลังสินค้า</div>
               <div>\${alertMessages.join('<br>')}</div>
             </div>
             <div class="alert-actions">
               \${outOfStockItems.length > 0 ? `<button type="button" class="btn btn-outline-danger" onclick="filterTable('out')">ดูหมดสต็อก</button>` : ''}
               \${lowStockItems.length > 0 ? `<button type="button" class="btn btn-outline-warning" onclick="filterTable('low')">ดูใกล้หมด</button>` : ''}
             </div>
           </div>`
        : `<div class="alert-banner alert-info">
             <div class="alert-icon">✓</div>
             <div class="alert-content">
               <strong>สถานะคลังสินค้าปกติ:</strong> ไม่มีรายการสินค้าที่หมดสต็อกหรือใกล้หมดในขณะนี้
             </div>
           </div>`;

      const chartItems = chartByProductRes.rows.map(r => ({
        name: String(r.product_name || ''),
        revenue: Number(r.revenue || 0),
        units: Number(r.units_sold || 0)
      }));

      const recentSalesRowsHtml = recentSalesRes.rows.length > 0
        ? recentSalesRes.rows.map(log => `
            <tr>
              <td><strong>\${escapeHtml(log.product_name)}</strong></td>
              <td>\${Number(log.sold_qty)} ชิ้น</td>
              <td>฿\${Number(log.total_amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
              <td class="muted-cell">\${escapeHtml(new Date(log.sold_at).toLocaleString('th-TH'))}</td>
            </tr>`).join('')
        : '<tr><td colspan="4" style="text-align:center; padding:18px; color:#64748b;">ยังไม่มีประวัติการขายออก</td></tr>';

      const html = `
      <!DOCTYPE html>
      <html lang="th">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>ระบบบริหารคลังสินค้าและสรุปยอดขาย</title>
          <style>
              :root {
                  --navy-dark: #0f294a;
                  --navy-mid: #1e3a8a;
                  --blue-primary: #1d4ed8;
                  --blue-hover: #1e40af;
                  --blue-soft: #eff6ff;
                  --blue-border: #bfdbfe;
                  --bg-page: #f1f5f9;
                  --surface: #ffffff;
                  --text-main: #0f172a;
                  --text-muted: #64748b;
                  --border-light: #e2e8f0;
              }

              * { box-sizing: border-box; }

              body {
                  margin: 0;
                  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                  background: var(--bg-page);
                  color: var(--text-main);
                  display: flex;
                  min-height: 100vh;
              }

              .sidebar {
                  width: 240px;
                  background: linear-gradient(180deg, var(--navy-dark) 0%, var(--navy-mid) 100%);
                  color: #ffffff;
                  padding: 24px 16px;
                  flex-shrink: 0;
                  display: flex;
                  flex-direction: column;
                  gap: 8px;
              }

              .brand {
                  font-size: 1.15rem;
                  font-weight: 700;
                  padding: 8px 12px 20px;
                  border-bottom: 1px solid rgba(255, 255, 255, 0.15);
                  margin-bottom: 8px;
              }

              .brand span {
                  display: block;
                  font-size: 0.78rem;
                  font-weight: 400;
                  color: #93c5fd;
                  margin-top: 4px;
              }

              .nav-item {
                  padding: 11px 14px;
                  border-radius: 8px;
                  color: #dbeafe;
                  text-decoration: none;
                  font-size: 0.95rem;
                  display: block;
                  cursor: pointer;
              }

              .nav-item.active, .nav-item:hover {
                  background: rgba(255, 255, 255, 0.16);
                  color: #ffffff;
                  font-weight: 600;
              }

              .main-content {
                  flex: 1;
                  padding: 28px 32px;
                  max-width: 1320px;
                  margin: 0 auto;
                  width: 100%;
              }

              .top-header {
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  flex-wrap: wrap;
                  gap: 16px;
                  margin-bottom: 20px;
              }

              .top-header h1 {
                  margin: 0;
                  font-size: 1.55rem;
                  color: var(--navy-dark);
              }

              .top-header p {
                  margin: 4px 0 0;
                  color: var(--text-muted);
                  font-size: 0.9rem;
              }

              .kpi-grid {
                  display: grid;
                  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
                  gap: 16px;
                  margin-bottom: 20px;
              }

              .kpi-card {
                  background: var(--surface);
                  border: 1px solid var(--border-light);
                  border-top: 4px solid var(--blue-primary);
                  border-radius: 10px;
                  padding: 18px 20px;
                  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05);
              }

              .kpi-card.sales-card {
                  background: linear-gradient(135deg, var(--navy-dark) 0%, var(--blue-primary) 100%);
                  color: #ffffff;
                  border-top-color: #60a5fa;
              }

              .kpi-label {
                  font-size: 0.85rem;
                  color: var(--text-muted);
                  margin-bottom: 8px;
              }

              .sales-card .kpi-label { color: #bfdbfe; }

              .kpi-value {
                  font-size: 1.55rem;
                  font-weight: 700;
              }

              .kpi-sub {
                  font-size: 0.8rem;
                  color: var(--text-muted);
                  margin-top: 6px;
              }

              .sales-card .kpi-sub { color: #dbeafe; }

              .alert-banner {
                  display: flex;
                  align-items: center;
                  gap: 14px;
                  background: #fffbeb;
                  border: 1px solid #fcd34d;
                  border-left: 5px solid #d97706;
                  color: #78350f;
                  padding: 14px 18px;
                  border-radius: 10px;
                  margin-bottom: 22px;
              }

              .alert-banner.alert-info {
                  background: var(--blue-soft);
                  border-color: var(--blue-border);
                  border-left-color: var(--blue-primary);
                  color: var(--navy-dark);
              }

              .alert-icon {
                  width: 28px;
                  height: 28px;
                  border-radius: 50%;
                  background: #f59e0b;
                  color: #ffffff;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-weight: 700;
                  flex-shrink: 0;
              }

              .alert-info .alert-icon { background: var(--blue-primary); }

              .alert-content { flex: 1; font-size: 0.92rem; line-height: 1.5; }
              .alert-title { font-weight: 700; margin-bottom: 2px; }
              .alert-actions { display: flex; gap: 8px; flex-wrap: wrap; }

              .analytics-grid {
                  display: grid;
                  grid-template-columns: 1.35fr 1fr;
                  gap: 20px;
                  margin-bottom: 22px;
              }

              .card-panel {
                  background: var(--surface);
                  border: 1px solid var(--border-light);
                  border-radius: 10px;
                  padding: 20px;
                  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05);
              }

              .section-title {
                  margin: 0 0 14px;
                  font-size: 1.08rem;
                  color: var(--navy-dark);
                  font-weight: 700;
              }

              .chart-wrapper {
                  width: 100%;
                  background: #f8fbff;
                  border: 1px solid var(--blue-border);
                  border-radius: 8px;
                  padding: 12px;
              }

              #salesChartCanvas {
                  width: 100%;
                  height: 230px;
                  display: block;
              }

              .toolbar {
                  display: flex;
                  flex-wrap: wrap;
                  gap: 10px;
                  justify-content: space-between;
                  align-items: center;
                  margin-bottom: 16px;
              }

              .search-input {
                  flex: 1;
                  min-width: 240px;
                  padding: 10px 14px;
                  border: 1px solid #cbd5e1;
                  border-radius: 8px;
                  font-size: 0.95rem;
              }

              .search-input:focus {
                  outline: none;
                  border-color: var(--blue-primary);
                  box-shadow: 0 0 0 3px rgba(29, 78, 216, 0.15);
              }

              .filter-group {
                  display: flex;
                  gap: 8px;
                  flex-wrap: wrap;
              }

              .btn {
                  border: none;
                  border-radius: 8px;
                  padding: 9px 14px;
                  font-size: 0.9rem;
                  font-weight: 600;
                  cursor: pointer;
                  transition: background 0.15s ease;
              }

              .btn-primary {
                  background: var(--blue-primary);
                  color: #ffffff;
              }

              .btn-primary:hover { background: var(--blue-hover); }

              .btn-filter {
                  background: var(--blue-soft);
                  color: var(--navy-dark);
                  border: 1px solid var(--blue-border);
              }

              .btn-filter.active {
                  background: var(--blue-primary);
                  color: #ffffff;
                  border-color: var(--blue-primary);
              }

              .btn-outline-warning {
                  background: #ffffff;
                  color: #92400e;
                  border: 1px solid #f59e0b;
                  padding: 7px 12px;
                  font-size: 0.85rem;
              }

              .btn-outline-danger {
                  background: #ffffff;
                  color: #b91c1c;
                  border: 1px solid #ef4444;
                  padding: 7px 12px;
                  font-size: 0.85rem;
              }

              .btn-sell {
                  background: #1d4ed8;
                  color: #ffffff;
                  padding: 6px 10px;
                  font-size: 0.82rem;
              }

              .btn-sell:hover:not(:disabled) { background: #1e40af; }

              .btn-sell:disabled {
                  opacity: 0.4;
                  cursor: not-allowed;
              }

              .btn-edit {
                  background: #e0f2fe;
                  color: #0369a1;
                  padding: 6px 10px;
                  font-size: 0.82rem;
              }

              .btn-delete {
                  background: #fee2e2;
                  color: #b91c1c;
                  padding: 6px 10px;
                  font-size: 0.82rem;
              }

              .btn-secondary {
                  background: #e2e8f0;
                  color: #334155;
              }

              table {
                  width: 100%;
                  border-collapse: collapse;
                  font-size: 0.92rem;
              }

              th {
                  background: #f8fafc;
                  color: var(--navy-dark);
                  font-weight: 700;
                  text-align: left;
                  padding: 12px;
                  border-bottom: 2px solid var(--border-light);
              }

              td {
                  padding: 12px;
                  border-bottom: 1px solid var(--border-light);
                  vertical-align: middle;
              }

              tr:hover td { background: #f8fbff; }

              .actions-col { white-space: nowrap; }
              .muted-cell { color: var(--text-muted); font-size: 0.83rem; }

              .stock-cell {
                  display: flex;
                  align-items: center;
                  gap: 10px;
              }

              .progress-track {
                  width: 90px;
                  height: 8px;
                  background: #e2e8f0;
                  border-radius: 999px;
                  overflow: hidden;
              }

              .progress-fill {
                  height: 100%;
                  border-radius: 999px;
              }

              .badge {
                  padding: 4px 10px;
                  border-radius: 999px;
                  font-size: 0.78rem;
                  font-weight: 700;
                  display: inline-block;
              }

              .badge-ok { background: #dbeafe; color: #1d4ed8; }
              .badge-low { background: #fef3c7; color: #b45309; }
              .badge-out { background: #fee2e2; color: #b91c1c; }

              .status-toast {
                  padding: 12px 16px;
                  border-radius: 8px;
                  margin-bottom: 14px;
                  font-size: 0.9rem;
                  display: none;
              }

              .status-toast.success {
                  display: block;
                  background: #dbeafe;
                  color: #1e3a8a;
                  border: 1px solid #93c5fd;
              }

              .status-toast.error {
                  display: block;
                  background: #fee2e2;
                  color: #991b1b;
                  border: 1px solid #fca5a5;
              }

              .modal {
                  display: none;
                  position: fixed;
                  z-index: 1000;
                  inset: 0;
                  background: rgba(15, 23, 42, 0.55);
                  align-items: center;
                  justify-content: center;
                  padding: 16px;
              }

              .modal.open { display: flex; }

              .modal-content {
                  background: #ffffff;
                  border-radius: 12px;
                  width: 100%;
                  max-width: 460px;
                  padding: 24px;
                  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);
              }

              .modal-header {
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  margin-bottom: 16px;
              }

              .modal-header h2 {
                  margin: 0;
                  font-size: 1.2rem;
                  color: var(--navy-dark);
              }

              .close-btn {
                  background: none;
                  border: none;
                  font-size: 1.5rem;
                  cursor: pointer;
                  color: var(--text-muted);
              }

              .form-group { margin-bottom: 14px; }

              .form-group label {
                  display: block;
                  font-size: 0.88rem;
                  font-weight: 600;
                  margin-bottom: 6px;
                  color: var(--navy-dark);
              }

              .form-group input {
                  width: 100%;
                  padding: 10px 12px;
                  border: 1px solid #cbd5e1;
                  border-radius: 8px;
                  font-size: 0.95rem;
              }

              .sell-summary-box {
                  background: var(--blue-soft);
                  border: 1px solid var(--blue-border);
                  border-radius: 8px;
                  padding: 12px;
                  margin-bottom: 14px;
                  font-size: 0.9rem;
                  color: var(--navy-dark);
              }

              .modal-actions {
                  display: flex;
                  justify-content: flex-end;
                  gap: 10px;
                  margin-top: 18px;
              }

              @media (max-width: 960px) {
                  .analytics-grid { grid-template-columns: 1fr; }
              }

              @media (max-width: 768px) {
                  body { flex-direction: column; }
                  .sidebar { width: 100%; flex-direction: row; overflow-x: auto; padding: 12px; }
                  .brand { border-bottom: none; margin-bottom: 0; padding: 6px 10px; }
                  .main-content { padding: 18px 14px; }
              }
          </style>
      </head>
      <body>
          <aside class="sidebar">
              <div class="brand">
                  คลังสินค้าและยอดขาย
                  <span>ระบบจัดการร้านค้า</span>
              </div>
              <a class="nav-item active" data-nav="all" onclick="filterTable('all')">ภาพรวมคลังและยอดขาย</a>
              <a class="nav-item" data-nav="low" onclick="filterTable('low')">รายการใกล้หมด</a>
              <a class="nav-item" data-nav="out" onclick="filterTable('out')">รายการหมดสต็อก</a>
          </aside>

          <main class="main-content">
              <div class="top-header">
                  <div>
                      <h1>บอร์ดสรุปยอดขายและคลังสินค้า</h1>
                      <p>บันทึกการขายออก ตรวจสอบกราฟยอดขาย และติดตามสถานะสต็อกคงเหลือ</p>
                  </div>
                  <button type="button" class="btn btn-primary" onclick="openAddModal()">+ เพิ่มสินค้าใหม่</button>
              </div>

              <section class="kpi-grid">
                  <div class="kpi-card sales-card">
                      <div class="kpi-label">ยอดขายสะสมทั้งหมด</div>
                      <div class="kpi-value">฿\${Number(salesData.total_revenue || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</div>
                      <div class="kpi-sub">บันทึกรายการขายออกแล้ว \${Number(salesData.total_orders || 0).toLocaleString('th-TH')} ครั้ง</div>
                  </div>
                  <div class="kpi-card">
                      <div class="kpi-label">มูลค่าสต็อกคงเหลือ</div>
                      <div class="kpi-value">฿\${totalStockValue.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</div>
                      <div class="kpi-sub">คำนวณจากจำนวนคงเหลือ × ราคาต่อหน่วย</div>
                  </div>
                  <div class="kpi-card">
                      <div class="kpi-label">สินค้าทั้งหมด (รายการ)</div>
                      <div class="kpi-value">\${totalSkus}</div>
                      <div class="kpi-sub">ใกล้หมด ${lowStockItems.length} รายการ \vert{} หมดสต็อก ${outOfStockItems.length} รายการ</div>
                  </div>
              </section>

              \${alertBannerHtml}

              <div id="statusToast" class="status-toast"></div>

              <section class="analytics-grid">
                  <div class="card-panel">
                      <h2 class="section-title">กราฟสรุปยอดขายแยกตามสินค้า (บาท)</h2>
                      <div class="chart-wrapper">
                          <canvas id="salesChartCanvas" width="600" height="230"></canvas>
                      </div>
                  </div>

                  <div class="card-panel">
                      <h2 class="section-title">ประวัติการขายออกล่าสุด</h2>
                      <div style="overflow-x:auto;">
                          <table>
                              <thead>
                                  <tr>
                                      <th>สินค้า</th>
                                      <th>จำนวน</th>
                                      <th>ยอดขาย</th>
                                      <th>เวลา</th>
                                  </tr>
                              </thead>
                              <tbody>
                                  \${recentSalesRowsHtml}
                              </tbody>
                          </table>
                      </div>
                  </div>
              </section>

              <section class="card-panel">
                  <div class="toolbar">
                      <input type="text" id="searchInput" class="search-input" placeholder="ค้นหารหัสสินค้า ชื่อสินค้า หรือหมวดหมู่..." oninput="applyFilters()">
                      <div class="filter-group">
                          <button type="button" class="btn btn-filter active" data-filter="all" onclick="filterTable('all')">ทั้งหมด (\${totalSkus})</button>
                          <button type="button" class="btn btn-filter" data-filter="low" onclick="filterTable('low')">ใกล้หมด (\${lowStockItems.length})</button>
                          <button type="button" class="btn btn-filter" data-filter="out" onclick="filterTable('out')">หมดสต็อก (\${outOfStockItems.length})</button>
                      </div>
                  </div>

                  <div style="overflow-x:auto;">
                      <table>
                          <thead>
                              <tr>
                                  <th>รหัสสินค้า</th>
                                  <th>ชื่อสินค้า</th>
                                  <th>หมวดหมู่</th>
                                  <th>คงเหลือ</th>
                                  <th>ราคา/หน่วย</th>
                                  <th>
