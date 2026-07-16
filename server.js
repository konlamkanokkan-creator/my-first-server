// 1. เรียกใช้งาน Module 'http'
const http = require('http');

// 2. กำหนด Port
const port = process.env.PORT || 3000;

// 3. สร้าง Web Server
const server = http.createServer((req, res) => {

    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');

    res.end(`
<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">

<title>Dr. STONE Theme Web Server</title>

<style>

*{
    margin:0;
    padding:0;
    box-sizing:border-box;
}

body{

    font-family:Arial,sans-serif;

    height:100vh;

    display:flex;

    justify-content:center;

    align-items:center;

    background:
    linear-gradient(rgba(0,0,0,.45),rgba(0,0,0,.45)),
    linear-gradient(135deg,#1b4332,#2d6a4f,#40916c,#95d5b2);

    background-size:cover;

    overflow:hidden;

}

/* ลายพื้นหลังแนววิทยาศาสตร์ */
body::before{

    content:"";

    position:absolute;

    width:100%;

    height:100%;

    background-image:

    radial-gradient(circle,rgba(255,255,255,.08) 2px,transparent 2px),

    linear-gradient(90deg,rgba(255,255,255,.04) 1px,transparent 1px),

    linear-gradient(rgba(255,255,255,.04) 1px,transparent 1px);

    background-size:40px 40px;

    animation:move 15s linear infinite;

}

@keyframes move{

    from{

        transform:translateY(0);

    }

    to{

        transform:translateY(40px);

    }

}

.card{

    position:relative;

    z-index:2;

    width:700px;

    max-width:90%;

    padding:40px;

    border-radius:20px;

    background:rgba(255,255,255,.15);

    backdrop-filter:blur(12px);

    box-shadow:0 0 25px rgba(0,0,0,.4);

    text-align:center;

}

h1{

    color:#7CFC00;

    font-size:42px;

    margin-bottom:20px;

}

h2{

    color:white;

    margin-bottom:20px;

}

p{

    color:white;

    font-size:20px;

    line-height:1.8;

}

.badge{

    display:inline-block;

    margin-top:25px;

    padding:10px 25px;

    background:#7CFC00;

    color:black;

    border-radius:50px;

    font-weight:bold;

}

.footer{

    margin-top:20px;

    color:#ddd;

}

</style>

</head>

<body>

<div class="card">

<h1>⚗️ SCIENCE KINGDOM ⚗️</h1>

<h2>Web Server Node.js</h2>

<p>

สวัสดีครับ<br><br>

นี่คือ Web Server ของ

<br><br>

<b>นางสาวกนกกาญจน์ คนล่ำ</b>

<br>

รหัสนักศึกษา <b>69319010173</b>

<br><br>

เครื่องแม่ข่ายทำงานปกติบนระบบ Railway แล้ว

</p>

<div class="badge">

🚀 Powered by Node.js

</div>

<div class="footer">

Science • Nature • Technology

</div>

</div>

</body>

</html>

`);

});

// 4. เปิด Server
server.listen(port, () => {

    console.log(\`Server is running! เครื่องแม่ข่ายเปิดทำงานแล้วที่ช่องทาง: \${port}\`);

});
