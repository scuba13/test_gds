import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const port = process.env.PORT ? Number(process.env.PORT) : 5173;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function sendJson(res, statusCode, body) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (chunks.length === 0) return {};
  const raw = Buffer.concat(chunks).toString('utf-8');
  return JSON.parse(raw);
}

async function proxyToBackend(req, res) {
  const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
  const backendUrl = new URL(url.pathname + url.search, 'http://backend:3001');

  const init = {
    method: req.method,
    headers: {
      // forward content type, accept, and cookie for session
      ...(req.headers['content-type']
        ? { 'content-type': req.headers['content-type'] }
        : {}),
      ...(req.headers.accept ? { accept: req.headers.accept } : {}),
      ...(req.headers.cookie ? { cookie: req.headers.cookie } : {}),
    },
  };

  if (req.method && !['GET', 'HEAD'].includes(req.method)) {
    const body = await readJson(req);
    init.body = JSON.stringify(body);
  }

  const backendRes = await fetch(backendUrl, init);

  // Forward set-cookie so browser stores HttpOnly cookie for backend domain.
  const setCookie = backendRes.headers.get('set-cookie');
  if (setCookie) res.setHeader('set-cookie', setCookie);

  const contentType = backendRes.headers.get('content-type') ?? 'application/json';
  res.writeHead(backendRes.status, {
    'content-type': contentType,
    'cache-control': 'no-store',
  });

  const text = await backendRes.text();
  res.end(text);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', `http://${req.headers.host}`);

    if (url.pathname.startsWith('/api/')) {
      // Map /api/* -> /* on backend
      req.url = url.pathname.replace('/api', '') + url.search;
      return await proxyToBackend(req, res);
    }

    if (url.pathname === '/' || url.pathname === '/index.html') {
      const html = await readFile(path.join(__dirname, 'index.html'), 'utf-8');
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      });
      res.end(html);
      return;
    }

    if (url.pathname === '/app.js') {
      const js = await readFile(path.join(__dirname, 'app.js'), 'utf-8');
      res.writeHead(200, {
        'Content-Type': 'text/javascript; charset=utf-8',
        'Cache-Control': 'no-store',
      });
      res.end(js);
      return;
    }

    sendJson(res, 404, { error: 'Not found' });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[frontend] request error', err);
    sendJson(res, 500, { error: 'Internal Server Error' });
  }
});

server.listen(port, '0.0.0.0', () => {
  // eslint-disable-next-line no-console
  console.log(`[frontend] listening on http://0.0.0.0:${port}`);
});
