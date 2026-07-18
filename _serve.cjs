// 動作確認用の簡易静的サーバー（デプロイ物には含めない / .gitignore対象）
const http = require('http');
const fs = require('fs');
const path = require('path');
const PORT = process.env.PORT || 5599;
const ROOT = __dirname;
const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.css':'text/css', '.json':'application/json' };
http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const fp = path.join(ROOT, p);
  fs.readFile(fp, (e, data) => {
    if (e) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(fp)] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(PORT, () => console.log('serving ' + ROOT + ' on http://localhost:' + PORT));
