// 1. เรียกใช้งาน Module 'http'
const http = require('http');

// 2. กำหนด Port
const port = process.env.PORT || 3000;

// 3. สร้าง Web Server
const server = http.createServer((req, res) => {

    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');

    res.end(`<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">

<title>Dr. STONE Theme Web Server</title>

<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800&family=Noto+Sans+Thai:wght@300;400;600&display=swap');

:root{
  --bg-1: #0f1720; /* dark */
  --green-1: #8fd19e;
  --green-2: #3aa76d;
  --stone: #cfc7b8;
  --accent: #f7dfb9;
}

*{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%}
body{
  font-family: 'Inter', 'Noto Sans Thai', Arial, sans-serif;
  background: radial-gradient(1200px 600px at 10% 10%, rgba(74,123,87,0.15), transparent),
              linear-gradient(180deg,var(--bg-1), #062019 70%);
  color: #e6f2ea;
  display:flex;
  align-items:center;
  justify-content:center;
  padding:40px;
}

.scene{
  position:relative;
  width:960px;
  max-width:95%;
  border-radius:20px;
  overflow:hidden;
  box-shadow: 0 10px 40px rgba(3,7,7,0.7);
  background: linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01));
}

.header{
  padding:28px 36px;
  display:flex;
  gap:20px;
  align-items:center;
  background: linear-gradient(90deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01));
  border-bottom: 1px solid rgba(255,255,255,0.03);
}
.logo{
  width:84px;height:84px;border-radius:18px;
  display:flex;align-items:center;justify-content:center;
  background: radial-gradient(circle at 30% 30%, var(--green-1), var(--green-2));
  box-shadow: inset 0 -6px 18px rgba(0,0,0,0.25), 0 6px 18px rgba(0,0,0,0.35);
  font-weight:800;color:#062019;font-size:28px;
}
.title{
  flex:1;
}
.title h1{font-size:22px;color:var(--accent);letter-spacing:1px}
.title p{color:#cfe8d4;opacity:0.9;margin-top:6px}

.main{
  display:flex;gap:24px;padding:34px;
}

.card{
  flex:1;
  background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.00));
  border-radius:14px;padding:24px;position:relative;
  min-height:260px;
}
.card h2{color:var(--green-1);margin-bottom:8px;font-size:20px}
.card p{color:#eaf6ea;line-height:1.7}

.badge{
  display:inline-block;padding:10px 16px;border-radius:999px;
  background: linear-gradient(90deg,var(--green-1),var(--green-2));
  color:#062019;font-weight:700;margin-top:18px;
}

.footer{
  padding:18px 36px;background:linear-gradient(0deg, rgba(255,255,255,0.01), rgba(255,255,255,0.00));
  border-top:1px solid rgba(255,255,255,0.03);color:#bfe6c6;font-size:14px;text-align:center;
}

/* Science ornaments */
.orbit{
  position:absolute;right:20px;top:20px;opacity:0.12;filter:blur(0.4px)
}
.atom{width:160px;height:160px}

/* Stone crack texture (subtle) */
.scene::after{
  content:"";position:absolute;inset:0;background-image:radial-gradient(circle at 20% 80%, rgba(255,255,255,0.015), transparent 20%),
  linear-gradient(135deg, rgba(0,0,0,0.05), transparent 40%);
  mix-blend-mode:overlay;pointer-events:none
}

/* small responsive */
@media (max-width:760px){
  .main{flex-direction:column}
  .logo{width:64px;height:64px}
}

/* floating plant animation */
.leaf{
  position:absolute;left:24px;bottom:24px;width:120px;opacity:0.9;transform-origin:center bottom;animation:sway 6s ease-in-out infinite;
}
@keyframes sway{0%{transform:translateY(0) rotate(-3deg)}50%{transform:translateY(-8px) rotate(3deg)}100%{transform:translateY(0) rotate(-3deg)}}

</style>
</head>
<body>

<div class="scene" role="main">
  <div class="header">
    <div class="logo">⚗️</div>
    <div class="title">
      <h1>Dr. STONE — SCIENCE KINGDOM</h1>
      <p>ธีม: วิทยาศาสตร์ ฟื้นฟูอารยธรรม — แสดงสถานะเครื่องแม่ข่ายด้วยสไตล์</p>
    </div>
    <div style="text-align:right">
      <div style="font-size:12px;color:#bfe6c6">Server</div>
      <div style="font-weight:700;color:var(--accent)">Node.js • Running</div>
    </div>
  </div>

  <div class="main">
    <div class="card">
      <h2>ยินดีต้อนรับ</h2>
      <p>
        สวัสดีครับ/ค่ะ — นี่คือ Web Server ในธีม Dr. STONE
        คล้ายโลกหลังการล่มสลายที่ผู้คนฟื้นฟูด้วยวิทยาศาสตร์
      </p>

      <p style="margin-top:12px">
        <strong>นางสาวกนกกาญจน์ คนล่ำ</strong><br>
        รหัสนักศึกษา <strong>69319010173</strong>
      </p>

      <div class="badge">🚀 Powered by Node.js</div>

    </div>

    <div class="card" aria-hidden="false">
      <h2>สถานะเครื่อง</h2>
      <p id="statusText">กำลังตรวจสอบ...</p>

      <div style="margin-top:12px;font-size:13px;color:#cfe8d4">ข้อมูล: เครื่องแม่ข่ายทำงานปกติบนระบบ Railway แล้ว</div>
    </div>
  </div>

  <div class="footer">Science • Nature • Technology — Dr. STONE inspired UI</div>

  <!-- ornaments: simple SVG atom and leaf -->
  <svg class="orbit atom" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" style="position:absolute;right:18px;top:18px;opacity:0.12">
    <circle cx="32" cy="32" r="6" fill="rgba(255,255,255,0.85)" />
    <g stroke="rgba(255,255,255,0.85)" stroke-width="1" fill="none" stroke-linecap="round">
      <ellipse cx="32" cy="32" rx="22" ry="8" transform="rotate(25 32 32)" />
      <ellipse cx="32" cy="32" rx="22" ry="8" transform="rotate(-35 32 32)" />
      <ellipse cx="32" cy="32" rx="22" ry="8" transform="rotate(85 32 32)" />
    </g>
  </svg>

  <svg class="leaf" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
    <path d="M10 140 C30 80, 90 40, 170 30 C130 70, 100 120, 10 140 Z" fill="#a3e39f" opacity="0.95"/>
  </svg>

</div>

<script>
// small client-side script to show dynamic status (no network calls required)
(function(){
  const status = document.getElementById('statusText');
  const messages = [
    'เครื่องแม่ข่ายออนไลน์ และระบบตรวจสอบผ่าน ✔️',
    'ฐานข้อมูล: ปกติ • เครือข่าย: เสถียร',
    'พร้อมใช้งาน — ขับเคลื่อนด้วยวิทยาศาสตร์'
  ];
  let i = 0;
  status.textContent = messages[0];
  setInterval(()=>{
    i = (i+1) % messages.length;
    status.textContent = messages[i];
  },3500);
})();
</script>

</body>
</html>`);

});

// 4. เปิด Server
server.listen(port, () => {

    console.log(`Server is running! เครื่องแม่ข่ายเปิดทำงานแล้วที่ช่องทาง: ${port}`);

});
