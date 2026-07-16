// 1. เรียกใช้งาน Module 'http'
const http = require('http');

// 2. กำหนด Port
const port = process.env.PORT || 3000;

// 3. สร้าง Server
const server = http.createServer((req, res) => {

    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');

    res.end(`
<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Kamisama Kiss Theme</title>

<style>
*{
    margin:0;
    padding:0;
    box-sizing:border-box;
}

body{
    font-family: "Sarabun", sans-serif;
    height:100vh;
    display:flex;
    justify-content:center;
    align-items:center;

    background-image:url("https://images.alphacoders.com/519/519182.jpg");
    background-size:cover;
    background-position:center;
    background-repeat:no-repeat;
}

.overlay{
    background:rgba(255,255,255,0.75);
    padding:40px;
    border-radius:20px;
    text-align:center;
    width:80%;
    max-width:700px;

    box-shadow:0 0 25px rgba(0,0,0,.4);
}

h1{
    color:#d63384;
    margin-bottom:20px;
    font-size:40px;
}

h2{
    color:#6f42c1;
    margin-bottom:15px;
}

p{
    font-size:20px;
    color:#333;
    line-height:1.8;
}

.footer{
    margin-top:25px;
    color:#444;
}
</style>

</head>

<body>

<div class="overlay">

<h1>🌸 Kamisama Kiss 🌸</h1>

<h2>Web Server Node.js</h2>

<p>
สวัสดีครับ!<br><br>

นี่คือ Web Server ของ<br>

<b>นางสาวกนกกาญจน์ คนล่ำ</b><br>

รหัสนักศึกษา <b>69319010173</b><br><br>

เครื่องแม่ข่ายทำงานปกติบนระบบ Railway แล้วครับ
</p>

<div class="footer">
สร้างด้วย Node.js + HTML + CSS
</div>

</div>

</body>
</html>
`);
});

// 4. เปิดใช้งาน Server
server.listen(port, () => {
    console.log(`Server is running! เครื่องแม่ข่ายเปิดทำงานแล้วที่ช่องทาง: ${port}`);
});
