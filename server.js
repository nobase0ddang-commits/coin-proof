// CoinProof 시연용 로컬 서버: 이 폴더의 파일만 http://localhost:5177 로 보여 준다. 외부 접속은 받지 않는다.
const http = require('http'), fs = require('fs'), path = require('path');
const root = __dirname, port = 5177;
const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.csv':'text/csv; charset=utf-8', '.svg':'image/svg+xml', '.png':'image/png' };
http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const file = path.join(root, p);
  if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
    res.end(buf);
  });
}).listen(port, '127.0.0.1', () => console.log(`CoinProof: http://localhost:${port}`));
