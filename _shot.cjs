// マニュアル用スクリーンショット保存サーバ（開発補助・配布物には含めない）
// ブラウザ側で html2canvas → dataURL を POST すると docs/img に PNG を保存する。
const http = require('http');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, 'docs', 'img');
fs.mkdirSync(OUT, { recursive: true });

http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  if (req.method !== 'POST') { res.writeHead(405); return res.end('POST only'); }

  const name = (new URL(req.url, 'http://x').searchParams.get('name') || 'shot')
    .replace(/[^a-zA-Z0-9_-]/g, '');
  let body = '';
  req.on('data', c => { body += c; });
  req.on('end', () => {
    const b64 = body.replace(/^data:image\/png;base64,/, '');
    const file = path.join(OUT, name + '.png');
    fs.writeFileSync(file, Buffer.from(b64, 'base64'));
    res.writeHead(200, { 'content-type': 'text/plain' });
    res.end(String(fs.statSync(file).size));
    console.log('saved', file, fs.statSync(file).size);
  });
}).listen(5600, () => console.log('shot server on 5600 ->', OUT));
