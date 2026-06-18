import http from 'http';
import net from 'net';

const LISTEN_PORT = parseInt(process.env.MIRROR_PORT || '8081');
const TARGET_PORT = parseInt(process.env.TARGET_PORT || '5000');

const server = http.createServer((req, res) => {
  const options = {
    hostname: 'localhost',
    port: TARGET_PORT,
    path: req.url,
    method: req.method,
    headers: { ...req.headers, host: `localhost:${TARGET_PORT}` },
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on('error', () => {
    if (!res.headersSent) res.writeHead(502);
    res.end();
  });

  req.pipe(proxyReq, { end: true });
});

server.on('upgrade', (req, socket, head) => {
  const conn = net.connect(TARGET_PORT, 'localhost', () => {
    const headers =
      `${req.method} ${req.url} HTTP/1.1\r\n` +
      Object.entries(req.headers).map(([k, v]) => `${k}: ${v}`).join('\r\n') +
      '\r\n\r\n';
    conn.write(headers);
    if (head && head.length) conn.write(head);
    conn.pipe(socket);
    socket.pipe(conn);
  });
  conn.on('error', () => socket.destroy());
  socket.on('error', () => conn.destroy());
});

server.listen(LISTEN_PORT, '0.0.0.0', () => {
  console.log(`[proxy-mirror] :${LISTEN_PORT} → :${TARGET_PORT}`);
});
