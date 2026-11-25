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
        const product_code = (data.product_code || '').trim();
        const product_name = (data.product_name || '').trim();
        const category = (data.category || 'ทั่วไป').trim();
        const quantity = parseInt(data.quantity, 10);
        const price = parseFloat(data.price);

        if (!product_code || !product_name || Number.isNaN(quantity) || Number.isNaN(price)) {
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
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: err.message }));
      }
      return;
    }

    if (pathname === '/api/products' && req.method === 'PUT') {
      try {
        const data = await readJsonBody(req);
        const id = parseInt(data.id, 10);
        const product_code = (data.product_code || '').trim();
        const product_name = (data.product_name || '').trim();
        const category = (data.category || 'ทั่วไป').trim();
        const quantity = parseInt(data.quantity, 10);
        const price = parseFloat(data.price);

        if (!id || !product_code || !product_name || Number.isNaN(quantity) || Number.isNaN(price)) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: 'กรุณากรอกข้อมูลสินค้าให้ครบถ้วน' }));
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
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: err.message }));
      }
      return;
    }

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

    // ==================== API Routes: การขายออก ====================
    if (pathname === '/api/sales' && req.method === 'POST') {
      try {
        const data = await readJsonBody(req);
        const id = parseInt(data.id, 10);
        const sellQty = parseInt(data.sellQty, 10);

        if (!id || Number.isNaN(sellQty) || sellQty <= 0) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: 'กรุณาระบุจำนวนที่ต้องการขายให้ถูกต้อง' }));
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

      // สรุปยอดขายแยกตามชื่อสินค้าเพื่อนำไปสร้างกราฟ
      const chartByProductRes = await client.query(`
        SELECT product_name, SUM(total_amount) AS revenue, SUM(sold_qty) AS units_sold
        FROM sales_logs
        GROUP BY product_name
        ORDER BY revenue DESC
        LIMIT 8
      `);

      // ประวัติการขายล่าสุด 8 รายการ
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
        const barWidth = Math.min(100, Math.max(8, (qty / 50) * 100));

        if (qty <= 0) {
          statusBadge = '<span class="badge badge-out">หมดสต็อก</span>';
          stockFilterAttr = 'out';
          barColor = '#dc2626';
        } else if (qty <= 5) {
          statusBadge = '<span class="badge badge-low">ใกล้หมด</span>';
          stockFilterAttr = 'low';
          barColor = '#d97706';
        }

        const safeName = String(row.product_name).replace(/'/g, "\\'");
        const safeCode = String(row.product_code).replace(/'/g, "\\'");
        const safeCat = String(row.category || 'ทั่วไป').replace(/'/g, "\\'");

        rowsHtml += `
          <tr class="product-row" data-status="${stockFilterAttr}" data-search="${(row.product_code + ' ' + row.product_name + ' ' + (row.category || '')).toLowerCase()}">
            <td>\${row.product_code}</td>
            <td><strong>\${row.product_name}</strong></td>
            <td>\${row.category || 'ทั่วไป'}</td>
            <td>
              <div class="stock-cell">
                <div class="progress-track">
                  <div class="progress-fill" style="width:${qty <= 0 ? 0 : barWidth}\%; background:${barColor};"></div>
                </div>
                <span>\${qty} ชิ้น</span>
              </div>
            </td>
            <td>฿\${Number(row.price).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
            <td>\${statusBadge}</td>
            <td class="actions-col">
              <button class="btn btn-sell" onclick="openSellModal(${row.id}, '${safeCode}', '${safeName}',${qty}, ${Number(row.price)})" ${qty <= 0 ? 'disabled' : ''}>ขายออก</button>
              <button class="btn btn-edit" onclick="openEditModal(${row.id}, '${safeCode}', '${safeName}', '${safeCat}', ${qty},${row.price})">แก้ไข</button>
              <button class="btn btn-delete" onclick="deleteProduct(\${row.id})">ลบ</button>
            </td>
          </tr>`;
      });

      const alertMessages = [];
      if (outOfStockItems.length > 0) {
        alertMessages.push(
          `<strong>สินค้าหมดสต็อก (${outOfStockItems.length} รายการ):</strong> ${outOfStockItems.map(i => i.product_name).join(', ')}`
        );
      }
      if (lowStockItems.length > 0) {
        alertMessages.push(
          `<strong>สินค้าใกล้หมดสต็อก <= 5 ชิ้น (${lowStockItems.length} รายการ):</strong> ${lowStockItems.map(i => `${i.product_name} (เหลือ ${i.quantity})`).join(', ')}`
        );
      }

      const alertBannerHtml = alertMessages.length > 0
        ? `<div class="alert-banner">
             <div class="alert-icon">⚠️</div>
             <div class="alert-content">
               <div class="alert-title">แจ้งเตือนสถานะคลังสินค้า</div>
               <div>\${alertMessages.join('<br>')}</div>
             </div>
             <button class="btn btn-outline-warning" onclick="filterTable('low')">ดูใกล้หมด</button>
           </div>`
        : `<div class="alert-banner alert-info">
             <div class="alert-icon">✓</div>
             <div class="alert-content">
               <strong>สถานะคลังสินค้าปกติ:</strong> ไม่มีรายการสินค้าที่หมดสต็อกหรือใกล้หมดในขณะนี้
             </div>
           </div>`;

      const chartItems = chartByProductRes.rows.map(r => ({
        name: r.product_name,
        revenue: Number(r.revenue || 0),
        units: Number(r.units_sold || 0)
      }));

      const recentSalesRowsHtml = recentSalesRes.rows.length > 0
        ? recentSalesRes.rows.map(log => `
            <tr>
              <td><strong>\${log.product_name}</strong></td>
              <td>\${log.sold_qty} ชิ้น</td>
              <td>฿\${Number(log.total_amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
              <td class="muted-cell">\${new Date(log.sold_at).toLocaleString('th-TH')}</td>
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
                  margin
