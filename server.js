// CoinProof 시연용 로컬 서버: 이 폴더의 파일만 http://localhost:5177 로 보여 준다. 외부 접속은 받지 않는다.
// /api/upbit: 업비트 Open API "조회" 전용 중계 (브라우저는 업비트에 직접 요청할 수 없어서 여기서 서명해 대신 요청).
//   - 키는 요청 때마다 화면에서 받아 서명에만 쓰고 저장·기록하지 않음
//   - 허용 경로는 읽기 전용 조회 5개뿐 (주문·출금 같은 쓰기 요청은 막힘)
const http = require('http'), https = require('https'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const root = __dirname, port = 5177;
const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.csv':'text/csv; charset=utf-8', '.svg':'image/svg+xml', '.png':'image/png', '.webm':'video/webm', '.pdf':'application/pdf' };
const UPBIT_READ_ONLY = new Set(['/v1/accounts', '/v1/orders/closed', '/v1/order', '/v1/deposits', '/v1/withdraws']);

const b64 = b => Buffer.from(b).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
function upbitJwt(access, secret, query) {
  const payload = { access_key: access, nonce: crypto.randomUUID() };
  if (query) { payload.query_hash = crypto.createHash('sha512').update(query, 'utf8').digest('hex'); payload.query_hash_alg = 'SHA512'; }
  const head = b64(JSON.stringify({ alg: 'HS256', typ: 'JWT' })), body = b64(JSON.stringify(payload));
  return `${head}.${body}.${b64(crypto.createHmac('sha256', secret).update(`${head}.${body}`).digest())}`;
}
function upbitGet(access, secret, apiPath, params) {
  // 업비트 공식 예제와 같은 쿼리 문자열(인코딩하지 않은 key=value, 배열은 key[]=v)로 해시
  const q = Object.entries(params || {}).flatMap(([k, v]) => Array.isArray(v) ? v.map(x => `${k}[]=${x}`) : [`${k}=${v}`]).join('&');
  return new Promise((resolve, reject) => {
    const req = https.request({ host: 'api.upbit.com', path: apiPath + (q ? '?' + encodeURI(q) : ''), method: 'GET',
      headers: { Authorization: 'Bearer ' + upbitJwt(access, secret, q), Accept: 'application/json' }, timeout: 15000 }, res => {
      let d = ''; res.setEncoding('utf8'); res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, remaining: res.headers['remaining-req'] || '', body: d }));
    });
    req.on('timeout', () => req.destroy(new Error('업비트 응답 시간 초과'))); req.on('error', reject); req.end();
  });
}
function readBody(req, limit = 20000) {
  return new Promise((resolve, reject) => { let d = ''; req.on('data', c => { d += c; if (d.length > limit) { reject(new Error('too large')); req.destroy(); } }); req.on('end', () => resolve(d)); });
}

const server = http.createServer(async (req, res) => {
  let p; try { p = decodeURIComponent(req.url.split('?')[0]); } catch { res.writeHead(400); return res.end('bad request'); }
  if (p === '/api/upbit') {
    const send = (code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(obj)); };
    // 다른 웹사이트가 이 PC의 서버를 몰래 부르지 못하도록 이 앱 화면에서 온 요청만 받음
    const origin = req.headers.origin || '';
    if (req.method !== 'POST' || !/^http:\/\/(localhost|127\.0\.0\.1):5177$/.test(origin) || !/application\/json/.test(req.headers['content-type'] || ''))
      return send(403, { error: '이 앱 화면에서 온 요청만 받습니다' });
    try {
      const { access, secret, path: apiPath, params } = JSON.parse(await readBody(req));
      if (!UPBIT_READ_ONLY.has(apiPath)) return send(400, { error: '조회 전용 경로만 허용됩니다' });
      if (!access || !secret) return send(400, { error: 'Access Key와 Secret Key를 넣으세요' });
      const r = await upbitGet(String(access).trim(), String(secret).trim(), apiPath, params);
      let body; try { body = JSON.parse(r.body); } catch { body = r.body; }
      return send(200, { status: r.status, remaining: r.remaining, body });
    } catch (e) { return send(502, { error: e.message }); }
  }
  if (p === '/') p = '/index.html';
  if (/(^|\/)\.[^/]/.test(p)) { res.writeHead(403); return res.end(); }   // .env 같은 숨김 파일은 보여 주지 않음
  const file = path.join(root, p);
  if (file !== root && !file.startsWith(root + path.sep)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
    res.end(buf);
  });
});
// 서버가 실제로 뜬 뒤에 브라우저를 연다 (먼저 열면 "연결할 수 없음"이 뜰 수 있음)
const url = `http://localhost:${port}`;
const openBrowser = () => { if (process.argv.includes('--no-open')) return; const cmd = process.platform === 'win32' ? `start "" ${url}` : process.platform === 'darwin' ? `open ${url}` : `xdg-open ${url}`; require('child_process').exec(cmd); };
server.on('error', e => {
  if (e.code === 'EADDRINUSE') { console.log(`이미 켜져 있습니다: ${url} (브라우저만 다시 엽니다)`); openBrowser(); }
  else console.error('서버 오류:', e.message);
});
server.listen(port, '127.0.0.1', () => { console.log(`CoinProof: ${url}`); openBrowser(); });
