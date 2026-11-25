'use strict';

const http = require('http');
const { Pool } = require('pg');

const port = Number(process.env.PORT) || 3000;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Set PGSSL=false for a local PostgreSQL server that does not use TLS.
  ssl: process.env.PGSSL === 'false' ? false : { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000
});

const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8' };
const MAX_BODY_BYTES = 1024 * 1024;

async function initializeDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      product_code VARCHAR(50) NOT NULL UNIQUE,
      product_name VARCHAR(255) NOT NULL,
      category VARCHAR(100) NOT NULL DEFAULT 'ทั่วไป',
      quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
      price DECIMAL(10, 2) NOT NULL DEFAULT 0.00 CHECK (price >= 0)
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sales_summary (
      id SERIAL PRIMARY KEY,
      total_revenue DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
      total_orders INTEGER NOT NULL DEFAULT 0,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sales_logs (
      id SERIAL PRIMARY KEY,
      product_id INTEGER,
      product_code VARCHAR(50),
      product_name VARCHAR(255) NOT NULL,
      sold_qty INTEGER NOT NULL CHECK (sold_qty > 0),
      unit_price DECIMAL(10, 2) NOT NULL,
      total_amount DECIMAL(12, 2) NOT NULL,
      sold_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query(`
    INSERT INTO sales_summary (total_revenue, total_orders)
    SELECT 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM sales_summary)
  `);
}

function sendJson(res, status, value) {
  res.writeHead(status, JSON_HEADERS);
  res.end(JSON.stringify(value));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    let size = 0;
    req.setEncoding('utf8');
    req.on('data', chunk => {
      size += Buffer.byteLength(chunk);
      if (size > MAX_BODY_BYTES) {
        reject(Object.assign(new Error('ข้อมูลที่ส่งมามีขนาดใหญ่เกินไป'), { statusCode: 413 }));
        req.destroy();
        return;
      }
      body += chunk;
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        const value = JSON.parse(body);
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
          return reject(Object.assign(new Error('ข้อมูล JSON ต้องเป็น object'), { statusCode: 400 }));
        }
        resolve(value);
      } catch (_error) {
        reject(Object.assign(new Error('รูปแบบ JSON ไม่ถูกต้อง'), { statusCode: 400 }));
      }
    });
    req.on('error', reject);
  });
}

function parsePositiveId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function parseProduct(data) {
  const product_code = typeof data.product_code === 'string' ? data.product_code.trim() : '';
  const product_name = typeof data.product_name === 'string' ? data.product_name.trim() : '';
  const category = typeof data.category === 'string' && data.category.trim()
    ? data.category.trim()
    : 'ทั่วไป';
  const quantity = Number(data.quantity);
  const price = Number(data.price);

  if (!product_code || product_code.length > 50 || !product_name || product_name.length > 255 ||
      category.length > 100 || !Number.isSafeInteger(quantity) || quantity < 0 ||
      !Number.isFinite(price) || price < 0 || Math.round(price * 100) !== price * 100) {
    return null;
  }
  return { product_code, product_name, category, quantity, price };
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
}

function sendError(res, error) {
  if (res.headersSent || res.destroyed) return;
  if (error.code === '23505') {
    return sendJson(res, 409, { error: 'รหัสสินค้านี้มีอยู่แล้ว' });
  }
  if (error.statusCode) {
    return sendJson(res, error.statusCode, { error: error.message });
  }
  console.error(error);
  sendJson(res, 500, { error: 'เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่อีกครั้ง' });
}

async function handleApi(req, res, pathname, searchParams) {
  if (pathname === '/api/products' && req.method === 'GET') {
    const result = await pool.query('SELECT * FROM products ORDER BY id ASC');
    return sendJson(res, 200, result.rows);
  }

  if (pathname === '/api/products' && req.method === 'POST') {
    const product = parseProduct(await readJsonBody(req));
    if (!product) return sendJson(res, 400, { error: 'กรุณากรอกข้อมูลสินค้าให้ถูกต้อง (จำนวนและราคาต้องไม่ติดลบ)' });
    const result = await pool.query(
      `INSERT INTO products (product_code, product_name, category, quantity, price)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [product.product_code, product.product_name, product.category, product.quantity, product.price]
    );
    return sendJson(res, 201, result.rows[0]);
  }

  if (pathname === '/api/products' && req.method === 'PUT') {
    const data = await readJsonBody(req);
    const id = parsePositiveId(data.id);
    const product = parseProduct(data);
    if (!id || !product) return sendJson(res, 400, { error: 'กรุณากรอกข้อมูลสินค้าให้ถูกต้อง' });
    const result = await pool.query(
      `UPDATE products SET product_code = $1, product_name = $2, category = $3,
       quantity = $4, price = $5 WHERE id = $6 RETURNING *`,
      [product.product_code, product.product_name, product.category, product.quantity, product.price, id]
    );
    if (!result.rowCount) return sendJson(res, 404, { error: 'ไม่พบข้อมูลสินค้า' });
    return sendJson(res, 200, result.rows[0]);
  }

  if (pathname === '/api/products' && req.method === 'DELETE') {
    const id = parsePositiveId(searchParams.get('id'));
    if (!id) return sendJson(res, 400, { error: 'กรุณาระบุ ID ของสินค้าให้ถูกต้อง' });
    const result = await pool.query('DELETE FROM products WHERE id = $1 RETURNING id', [id]);
    if (!result.rowCount) return sendJson(res, 404, { error: 'ไม่พบข้อมูลสินค้า' });
    return sendJson(res, 200, { message: 'ลบสินค้าสำเร็จ' });
  }

  if (pathname === '/api/sales' && req.method === 'POST') {
    const data = await readJsonBody(req);
    const id = parsePositiveId(data.id);
    const sellQty = Number(data.sellQty);
    if (!id || !Number.isSafeInteger(sellQty) || sellQty <= 0) {
      return sendJson(res, 400, { error: 'กรุณาระบุจำนวนที่ต้องการขายให้ถูกต้อง' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // Atomic stock update prevents two simultaneous sales from overselling.
      const productResult = await client.query(
        `UPDATE products SET quantity = quantity - $1
         WHERE id = $2 AND quantity >= $1 RETURNING *`,
        [sellQty, id]
      );
      if (!productResult.rowCount) {
        const exists = await client.query('SELECT quantity FROM products WHERE id = $1', [id]);
        await client.query('ROLLBACK');
        if (!exists.rowCount) return sendJson(res, 404, { error: 'ไม่พบสินค้าในระบบ' });
        return sendJson(res, 400, { error: `สต็อกไม่พอ (เหลือเพียง ${exists.rows[0].quantity} ชิ้น)` });
      }

      const product = productResult.rows[0];
      const unitPrice = Number(product.price);
      const totalAmount = Number((unitPrice * sellQty).toFixed(2));
      await client.query(
        `INSERT INTO sales_logs (product_id, product_code, product_name, sold_qty, unit_price, total_amount)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [product.id, product.product_code, product.product_name, sellQty, unitPrice, totalAmount]
      );
      const summaryResult = await client.query(
        `UPDATE sales_summary SET total_revenue = total_revenue + $1,
         total_orders = total_orders + 1, updated_at = CURRENT_TIMESTAMP
         WHERE id = (SELECT id FROM sales_summary ORDER BY id ASC LIMIT 1) RETURNING *`,
        [totalAmount]
      );
      await client.query('COMMIT');
      return sendJson(res, 200, {
        product,
        sales: summaryResult.rows[0],
        soldAmount: totalAmount
      });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  }

  return sendJson(res, 404, { error: 'ไม่พบ API ที่ร้องขอ' });
}

function renderPage(res) {
  const html = `<!doctype html>
<html lang="th">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>ระบบจัดการคลังสินค้า</title>
  <style>
    *{box-sizing:border-box}body{margin:0;padding:24px;font-family:system-ui,sans-serif;background:#f1f5f9;color:#0f172a}
    main{max-width:1100px;margin:auto}.card{background:white;padding:20px;border-radius:12px;margin:16px 0;box-shadow:0 2px 8px #0f172a12}
    h1{margin-top:0}.form{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}
    input,button{font:inherit;padding:10px;border:1px solid #cbd5e1;border-radius:7px}button{cursor:pointer;background:#1d4ed8;color:white;border:0}
    button.danger{background:#dc2626}button:disabled{opacity:.55;cursor:not-allowed}.table-wrap{overflow-x:auto}table{width:100%;border-collapse:collapse;min-width:650px}
    th,td{text-align:left;padding:10px;border-bottom:1px solid #e2e8f0}.actions{display:flex;gap:6px}.muted{color:#64748b}
    #message{min-height:1.5em;color:#b91c1c}@media(max-width:600px){body{padding:12px}}
  </style>
</head>
<body><main>
  <h1>ระบบจัดการคลังสินค้า</h1>
  <p id="summary" class="muted">กำลังโหลดข้อมูล…</p>
  <section class="card">
    <h2>เพิ่มสินค้า</h2>
    <form id="product-form" class="form">
      <input name="product_code" placeholder="รหัสสินค้า" maxlength="50" required>
      <input name="product_name" placeholder="ชื่อสินค้า" maxlength="255" required>
      <input name="category" placeholder="หมวดหมู่" maxlength="100" value="ทั่วไป">
      <input name="quantity" type="number" min="0" step="1" placeholder="จำนวน" required>
      <input name="price" type="number" min="0" step="0.01" placeholder="ราคา" required>
      <button type="submit">เพิ่มสินค้า</button>
    </form><p id="message" role="status"></p>
  </section>
  <section class="card"><h2>รายการสินค้า</h2><div class="table-wrap"><table>
    <thead><tr><th>รหัส</th><th>สินค้า</th><th>หมวดหมู่</th><th>คงเหลือ</th><th>ราคา</th><th>จัดการ</th></tr></thead>
    <tbody id="products"><tr><td colspan="6">กำลังโหลด…</td></tr></tbody>
  </table></div></section>
</main>
<script>
const tbody=document.getElementById('products');
const message=document.getElementById('message');
function esc(value){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
async function request(path,options={}){
  const response=await fetch(path,{...options,headers:{'Content-Type':'application/json',...(options.headers||{})}});
  const data=await response.json().catch(()=>({error:'ได้รับข้อมูลตอบกลับไม่ถูกต้อง'}));
  if(!response.ok)throw new Error(data.error||'ทำรายการไม่สำเร็จ');
  return data;
}
async function loadProducts(){
  try{
    const rows=await request('/api/products');
    tbody.innerHTML=rows.length?rows.map(p=>`<tr><td>${esc(p.product_code)}</td><td>${esc(p.product_name)}</td><td>${esc(p.category)}</td><td>${Number(p.quantity)}</td><td>฿${Number(p.price).toLocaleString('th-TH',{minimumFractionDigits:2})}</td><td><div class="actions"><button data-action="sell" data-id="${Number(p.id)}" ${Number(p.quantity)<=0?'disabled':''}>ขายออก</button><button class="danger" data-action="delete" data-id="${Number(p.id)}">ลบ</button></div></td></tr>`).join(''):'<tr><td colspan="6">ยังไม่มีสินค้า</td></tr>';
    const stockValue=rows.reduce((sum,p)=>sum+Number(p.quantity)*Number(p.price),0);
    document.getElementById('summary').textContent=`สินค้า ${rows.length} รายการ · มูลค่าสต็อก ฿${stockValue.toLocaleString('th-TH',{minimumFractionDigits:2})}`;
  }catch(error){message.textContent=error.message;}
}
document.getElementById('product-form').addEventListener('submit',async event=>{
  event.preventDefault();message.textContent='';
  const form=new FormData(event.currentTarget);const data=Object.fromEntries(form.entries());
  data.quantity=Number(data.quantity);data.price=Number(data.price);
  try{await request('/api/products',{method:'POST',body:JSON.stringify(data)});event.currentTarget.reset();event.currentTarget.elements.category.value='ทั่วไป';message.textContent='เพิ่มสินค้าเรียบร้อย';await loadProducts();}
  catch(error){message.textContent=error.message;}
});
tbody.addEventListener('click',async event=>{
  const button=event.target.closest('button[data-action]');if(!button)return;
  const id=Number(button.dataset.id);button.disabled=true;message.textContent='';
  try{
    if(button.dataset.action==='delete'){
      if(!confirm('ยืนยันการลบสินค้านี้?'))return;
      await request('/api/products?id='+encodeURIComponent(id),{method:'DELETE'});
    }else{
      const value=prompt('จำนวนที่ต้องการขาย');if(value===null)return;
      const sellQty=Number(value);if(!Number.isSafeInteger(sellQty)||sellQty<=0)throw new Error('กรุณาระบุจำนวนเต็มที่มากกว่า 0');
      await request('/api/sales',{method:'POST',body:JSON.stringify({id,sellQty})});
    }
    await loadProducts();
  }catch(error){message.textContent=error.message;}
  finally{button.disabled=false;}
});
loadProducts();
</script></body></html>`;
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
}

const server = http.createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    if (requestUrl.pathname.startsWith('/api/')) {
      await handleApi(req, res, requestUrl.pathname, requestUrl.searchParams);
      return;
    }
    if (requestUrl.pathname === '/' && req.method === 'GET') return renderPage(res);
    sendJson(res, 404, { error: 'ไม่พบหน้าที่ร้องขอ' });
  } catch (error) {
    sendError(res, error);
  }
});

initializeDatabase().then(() => {
  server.listen(port, () => console.log(`Server is running on port ${port}`));
}).catch(error => {
  console.error('ไม่สามารถเชื่อมต่อหรือเตรียมฐานข้อมูลได้:', error);
  process.exitCode = 1;
});

function shutdown() {
  server.close(() => pool.end().finally(() => process.exit()));
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
