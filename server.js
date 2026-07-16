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

<title>Outer Space & Moon Theme Web Server</title>

<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800&family=Noto+Sans+Thai:wght@300;400;600&display=swap');

:root{
  --bg-deep-space: #0a0e27; /* deep space blue */
  --moon-light: #e8d4b8; /* moon glow */
  --star-white: #f0f0f0;
  --nebula-purple: #8b5fbf;
  --nebula-cyan: #4a9eff;
  --accent-gold: #ffd700;
}

*{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%}
body{
  font-family: 'Inter', 'Noto Sans Thai', Arial, sans-serif;
  background: 
    radial-gradient(circle at 15% 25%, rgba(75, 158, 255, 0.1), transparent 25%),
    radial-gradient(circle at 85% 20%, rgba(139, 95, 191, 0.12), transparent 30%),
    linear-gradient(180deg, #0a0e27 0%, #0f1535 50%, #14192f 100%);
  color: #d4e4f7;
  display:flex;
  align-items:center;
  justify-content:center;
  padding:40px;
  position: relative;
  overflow: hidden;
}

/* Animated stars background */
body::before {
  content: '';
  position: fixed;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  background-image: 
    radial-gradient(2px 2px at 20% 30%, white, rgba(255,255,255,0)),
    radial-gradient(2px 2px at 60% 70%, white, rgba(255,255,255,0)),
    radial-gradient(1px 1px at 50% 50%, white, rgba(255,255,255,0)),
    radial-gradient(1px 1px at 80% 10%, white, rgba(255,255,255,0)),
    radial-gradient(2px 2px at 90% 60%, white, rgba(255,255,255,0)),
    radial-gradient(1px 1px at 30% 80%, white, rgba(255,255,255,0)),
    radial-gradient(1px 1px at 10% 60%, white, rgba(255,255,255,0));
  background-repeat: repeat;
  background-size: 200% 200%;
  animation: twinkle 5s ease-in-out infinite;
  pointer-events: none;
  z-index: 0;
}

@keyframes twinkle {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

.scene{
  position:relative;
  width:960px;
  max-width:95%;
  border-radius:20px;
  overflow:hidden;
  box-shadow: 0 20px 60px rgba(0,0,0,0.8), 0 0 40px rgba(75, 158, 255, 0.15);
  background: linear-gradient(135deg, rgba(20, 30, 60, 0.7), rgba(60, 40, 100, 0.6));
  border: 1px solid rgba(232, 212, 184, 0.15);
  z-index: 1;
}

.header{
  padding:28px 36px;
  display:flex;
  gap:20px;
  align-items:center;
  background: linear-gradient(90deg, rgba(139, 95, 191, 0.1), rgba(74, 158, 255, 0.08));
  border-bottom: 1px solid rgba(232, 212, 184, 0.1);
}

.logo{
  width:84px;height:84px;border-radius:50%;
  display:flex;align-items:center;justify-content:center;
  background: radial-gradient(circle at 35% 35%, #ffd700, #d4af37);
  box-shadow: inset 0 -8px 20px rgba(0,0,0,0.3), 0 0 30px rgba(255, 215, 0, 0.4);
  font-weight:800;color:#2a2a2a;font-size:36px;
  position: relative;
}

.logo::after {
  content: '';
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.4), transparent);
  pointer-events: none;
}

.title{
  flex:1;
}
.title h1{font-size:22px;color:var(--moon-light);letter-spacing:1px}
.title p{color:#b8d4ff;opacity:0.9;margin-top:6px}

.main{
  display:flex;gap:24px;padding:34px;
}

.card{
  flex:1;
  background: linear-gradient(135deg, rgba(74, 158, 255, 0.05), rgba(139, 95, 191, 0.05));
  border-radius:14px;padding:24px;position:relative;
  min-height:260px;
  border: 1px solid rgba(232, 212, 184, 0.08);
  backdrop-filter: blur(10px);
}

.card h2{color:var(--nebula-cyan);margin-bottom:8px;font-size:20px}
.card p{color:#d4e4f7;line-height:1.7}

.badge{
  display:inline-block;padding:10px 16px;border-radius:999px;
  background: linear-gradient(90deg, var(--nebula-cyan), var(--nebula-purple));
  color:#0a0e27;font-weight:700;margin-top:18px;
  box-shadow: 0 4px 15px rgba(74, 158, 255, 0.3);
}

.footer{
  padding:18px 36px;background:linear-gradient(0deg, rgba(74, 158, 255, 0.05), rgba(139, 95, 191, 0.03));
  border-top:1px solid rgba(232, 212, 184, 0.1);color:#b8d4ff;font-size:14px;text-align:center;
}

/* Moon ornaments */
.moon-glow{
  position:absolute;right:-30px;top:-30px;width:200px;height:200px;
  border-radius:50%;background:radial-gradient(circle at 35% 35%, rgba(232, 212, 184, 0.08), transparent);
  opacity:0.6;filter:blur(20px);
}

.stars-orbit{
  position:absolute;right:20px;top:20px;opacity:0.15;filter:blur(0.4px)
}

/* Responsive */
@media (max-width:760px){
  .main{flex-direction:column}
  .logo{width:64px;height:64px;font-size:28px}
}

/* floating satellite animation */
.satellite{
  position:absolute;right:40px;top:40px;width:100px;opacity:0.8;transform-origin:center bottom;animation:orbit 12s linear infinite;
}

@keyframes orbit{
  0%{transform:translateX(0) translateY(0) rotate(0deg)}
  25%{transform:translateX(20px) translateY(-15px) rotate(90deg)}
  50%{transform:translateX(0) translateY(-30px) rotate(180deg)}
  75%{transform:translateX(-20px) translateY(-15px) rotate(270deg)}
  100%{transform:translateX(0) translateY(0) rotate(360deg)}
}

</style>
</head>
<body>

<div class="moon-glow"></div>

<div class="scene" role="main">
  <div class="header">
    <div class="logo">🌙</div>
    <div class="title">
      <h1>OUTER SPACE & MOON — CELESTIAL SERVER</h1>
      <p>ธีม: อวกาศลึก จันทรา และดาว — แสดงสถานะเครื่องแม่ข่ายจากห้องดูดาว</p>
    </div>
    <div style="text-align:right">
      <div style="font-size:12px;color:#b8d4ff">Server</div>
      <div style="font-weight:700;color:var(--moon-light)">Node.js • Active</div>
    </div>
  </div>

  <div class="main">
    <div class="card">
      <h2>🚀 ยินดีต้อนรับสู่อวกาศ</h2>
      <p>
        สวัสดีครับ/ค่ะ — นี่คือ Web Server ในธีมอวกาศและจันทรา
        เหมือนกับการสำรวจจักรวาลอันกว้างใหญ่ที่ประดับไปด้วยดาวเบิกบาน
      </p>

      <p style="margin-top:12px">
        <strong>นางสาวกนกกาญจน์ คนล่ำ</strong><br>
        รหัสนักศึกษา <strong>69319010173</strong>
      </p>

      <div class="badge">✨ Powered by Node.js</div>

    </div>

    <div class="card" aria-hidden="false">
      <h2>🛰️ สถานะการบินของดาวเทียม</h2>
      <p id="statusText">กำลังตรวจสอบระบบ...</p>

      <div style="margin-top:12px;font-size:13px;color:#b8d4ff">สถิติ: เครื่องแม่ข่ายโคจรบนระบบ Railway ด้วยความสมบูรณ์แบบ</div>
    </div>
  </div>

  <div class="footer">🌌 Space • Stars • Moon — Celestial inspired UI 🌠</div>

  <!-- Moon SVG decoration -->
  <svg class="stars-orbit" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" style="position:absolute;right:18px;top:18px;opacity:0.2">
    <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(232, 212, 184, 0.5)" stroke-width="0.5" />
    <circle cx="32" cy="8" r="3" fill="rgba(240, 240, 240, 0.9)" />
    <circle cx="50" cy="24" r="2" fill="rgba(240, 240, 240, 0.8)" />
    <circle cx="56" cy="42" r="2.5" fill="rgba(240, 240, 240, 0.85)" />
    <circle cx="32" cy="56" r="3" fill="rgba(240, 240, 240, 0.9)" />
    <circle cx="14" cy="42" r="2" fill="rgba(240, 240, 240, 0.8)" />
    <circle cx="8" cy="24" r="2.5" fill="rgba(240, 240, 240, 0.85)" />
  </svg>

  <!-- Satellite path -->
  <svg class="satellite" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <g>
      <rect x="40" y="40" width="20" height="20" fill="#4a9eff" opacity="0.8" rx="2" />
      <rect x="35" y="45" width="30" height="10" fill="#8b5fbf" opacity="0.6" rx="1" />
      <circle cx="50" cy="50" r="4" fill="#ffd700" />
    </g>
  </svg>

</div>

<script>
// client-side script for dynamic status updates
(function(){
  const status = document.getElementById('statusText');
  const messages = [
    '🌙 จันทรา: ชัดเจน • ดาว: มองเห็นได้ ✔️',
    '🛰️ ดาวเทียม: โคจรปกติ • สัญญาณ: เข้มแข็ง',
    '🚀 ระบบ: พร้อมใช้งาน — อำนาจจากอวกาศอันลึกลับ'
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
