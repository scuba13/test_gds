import http from 'node:http';

const port = process.env.PORT ? Number(process.env.PORT) : 5173;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('frontend placeholder\n');
});

server.listen(port, '0.0.0.0', () => {
  // eslint-disable-next-line no-console
  console.log(`[frontend] listening on http://0.0.0.0:${port}`);
});
