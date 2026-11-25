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
          'INSERT INTO products (product_code, product_name, category, quantity, price) VALUES (\$1, \$2, \$3, \$4, \$5) RETURNING *',
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
          'UPDATE products SET product_code = \$1, product_name = \$2, category = \$3, quantity = \$4, price = \$5 WHERE id = \$6 RETURNING *',
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

      const result = await client.query('DELETE FROM products WHERE id = \$1 RETURNING *', [id]);

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

        const prodRes = await client.query('SELECT * FROM products WHERE id = \$1', [id]);
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
          res.end(JSON.stringify({ error: `สต็อกไม่พอ (เหลือเพียง ${product.quantity} ชิ้น)` }));
          return;
        }

        const updatedProductRes = await client.query(
          'UPDATE products SET quantity = quantity - \$1 WHERE id = \$2 RETURNING *',
          [sellQty, id]
        );

        const unitPrice = Number(product.price);
        const totalAmount = unitPrice * sellQty;

        await client.query(
          `INSERT INTO sales_logs (product_id, product_code, product_name, sold_qty, unit_price, total_amount)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [product.id, product.product_code, product.product_name, sellQty, unitPrice, totalAmount]
        );

        const currentSales = await client.query('SELECT * FROM sales_summary ORDER BY id ASC LIMIT 1');
        const salesId = currentSales.rows[0].id;

        const updatedSalesRes = await client.query(
          `UPDATE sales_summary
           SET total_revenue = total_revenue + $1, total_orders = total_orders + 1, updated_at = CURRENT_TIMESTAMP
           WHERE id = $2 RETURNING *`,
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
          `${row.product_code} ${row.product_name} ${row.category || 'ทั่วไป'}`.toLowerCase()
        );

        rowsHtml += `
          <tr class="product-row"
              data-status="${stockFilterAttr}"
              data-search="${searchStr}"
              data-id="${row.id}"
              data-code="${escapeHtml(row.product_code)}"
              data-name="${escapeHtml(row.product_name)}"
              data-category="${escapeHtml(row.category || 'ทั่วไป')}"
              data-quantity="${qty}"
              data-price="${Number(row.price)}">
            <td>${escapeHtml(row.product_code)}</td>
            <td><strong>${escapeHtml(row.product_name)}</strong></td>
            <td>${escapeHtml(row.category || 'ทั่วไป')}</td>
            <td>
              <div class="stock-cell">
                <div class="progress-track">
                  <div class="progress-fill" style="width:${barWidth}%; background:${barColor};"></div>
                </div>
                <span>${qty} ชิ้น</span>
              </div>
            </td>
            <td>฿${Number(row.price).toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
            <td>${statusBadge}</td>
            <td class="actions-col">
              <button type="button" class="btn btn-sell" onclick="openSellFromRow(this)" ${qty <= 0 ? 'disabled' : ''}>ขายออก</button>
              <button type="button" class="btn btn-edit" onclick="openEditFromRow(this)">แก้ไข</button>
              <button type="button" class="btn btn-delete" onclick="deleteProduct(${row.id})">ลบ</button>
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
               <div>${alertMessages.join('<br>')}</div>
             </div>
             <div class="alert-actions">
               ${outOfStockItems.length > 0 ? `<button type="button" class="btn btn-outline-danger" onclick="filterTable('out')">ดูหมดสต็อก</button>` : ''}
               ${lowStockItems.length > 0 ? `<button type="button" class="btn btn-outline-warning" onclick="filterTable('low')">ดูใกล้หมด</button>` : ''}
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
        ? recentSalesRes.rows.map(
