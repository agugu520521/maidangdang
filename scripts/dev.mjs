import http from 'node:http';
import { readFile, realpath, lstat, writeFile, mkdir, rename, rm } from 'node:fs/promises';
import { randomUUID, randomBytes } from 'node:crypto';
import { execFile } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { root, contentPath, readContent, validateContent } from './content.mjs';
import { build } from './build.mjs';

const projectRoot = fileURLToPath(root);
const mime = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.avif': 'image/avif', '.gif': 'image/gif', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8',
};
function json(res, status, value, head = false) {
  const bytes = Buffer.from(JSON.stringify(value));
  res.writeHead(status, {
    'Content-Type': mime['.json'], 'Content-Length': bytes.length,
    'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
  });
  res.end(head ? undefined : bytes);
}
async function body(req, limit) {
  if (Number(req.headers['content-length']) > limit) throw new Error('上传文件太大');
  const chunks = []; let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw new Error('上传文件太大');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
function insideRoot(target, base) { return target === base || target.startsWith(base + path.sep); }

// Exported so the test suite can exercise real HTTP requests on a temporary port.
export function createDevServer({ serveDist = false } = {}) {
  const token = randomBytes(32).toString('hex');
  const publicDir = path.join(projectRoot, serveDist ? 'dist' : 'public');
  const editorDir = path.join(projectRoot, 'workshop');
  const qaDir = path.join(projectRoot, 'qa');
  let saving = false;
  return http.createServer(async (req, res) => {
    try {
      if (!/^127\.0\.0\.1(?::\d+)?$/.test(req.headers.host || '')) return json(res, 403, { error: '仅支持本机访问' });
      const url = new URL(req.url || '/', `http://${req.headers.host}`);
      const decoded = decodeURIComponent(url.pathname);
      if (decoded.includes('\0') || decoded.includes('\\')) return json(res, 400, { error: '无法识别此地址' });
      if (decoded.startsWith('/api/')) {
        if (serveDist) return json(res, 404, { error: '公开网站没有工坊接口' });
        if (req.headers.origin && req.headers.origin !== url.origin) return json(res, 403, { error: '请在本地工坊操作' });
        if (req.method === 'GET' && decoded === '/api/session') return json(res, 200, { token });
        if (req.method !== 'POST' || req.headers['x-workshop-token'] !== token) return json(res, 403, { error: '请刷新本地工坊后重试' });
        if (decoded === '/api/upload') {
          const bytes = await body(req, 2 * 1024 * 1024 - 1);
          if (bytes.length < 12 || bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WEBP') {
            return json(res, 400, { error: '请上传工坊处理后的图片' });
          }
          const image = `media/${randomUUID()}.webp`;
          await mkdir(path.join(projectRoot, 'public/media'), { recursive: true });
          await writeFile(path.join(projectRoot, 'public', image), bytes);
          return json(res, 200, { image, size: bytes.length });
        }
        if (decoded === '/api/save') {
          if (saving) return json(res, 409, { error: '正在保存，请稍候' });
          saving = true;
          const temp = new URL(`content/.site-${randomUUID()}.json`, root);
          try {
            const data = validateContent(JSON.parse((await body(req, 16 * 1024 * 1024)).toString('utf8')));
            await writeFile(temp, JSON.stringify(data, null, 2) + '\n');
            const dist = await build(data);
            await rename(temp, contentPath);
            return json(res, 200, { ok: true, dist });
          } finally {
            saving = false;
            await rm(temp, { force: true });
          }
        }
        return json(res, 404, { error: '接口不存在' });
      }
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.setHeader('Allow', 'GET, HEAD');
        return json(res, 405, { error: '不支持此操作' });
      }
      if (!serveDist && decoded === '/data.json') return json(res, 200, await readContent(), req.method === 'HEAD');
      const isEditor = decoded === '/workshop' || decoded.startsWith('/workshop/');
      const isQA = decoded.startsWith('/__qa/') || decoded.startsWith('/qa/');
      if (serveDist && (isEditor || isQA)) return json(res, 404, { error: '公开网站没有工坊入口' });
      if (decoded === '/workshop') {
        res.writeHead(302, { Location: '/workshop/', 'Cache-Control': 'no-store' });
        return res.end();
      }
      const base = isEditor ? editorDir : isQA ? qaDir : publicDir;
      let relative = isEditor ? decoded.slice('/workshop'.length) : isQA ? decoded.replace(/^\/(?:__qa|qa)/, '') : decoded;
      if (!relative || relative === '/') relative = '/index.html';
      const target = path.resolve(base, '.' + relative);
      if (!insideRoot(target, base)) return json(res, 403, { error: '无权访问' });
      const resolvedRoot = await realpath(base);
      const resolvedTarget = await realpath(target);
      if (!insideRoot(resolvedTarget, resolvedRoot)) return json(res, 403, { error: '无权访问' });
      const details = await lstat(resolvedTarget);
      if (!details.isFile()) return json(res, 404, { error: '文件不存在' });
      res.writeHead(200, {
        'Content-Type': mime[path.extname(target).toLowerCase()] || 'application/octet-stream',
        'Content-Length': details.size, 'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff', 'Cross-Origin-Resource-Policy': 'same-origin',
      });
      res.end(req.method === 'HEAD' ? undefined : await readFile(resolvedTarget));
    } catch (error) {
      const missing = error.code === 'ENOENT' || error.code === 'ENOTDIR';
      json(res, missing ? 404 : 400, { error: missing ? '文件不存在' : error.message });
    }
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const portValue = process.env.PORT ?? '4174';
  if (!/^\d+$/.test(portValue) || Number(portValue) > 65535) {
    console.error('PORT 需要是 0–65535 范围内的数字。');
    process.exitCode = 1;
  } else {
    const serveDist = process.argv.includes('--dist');
    const port = Number(portValue);
    const server = createDevServer({ serveDist });
    server.on('error', error => {
      console.error(error.code === 'EADDRINUSE'
        ? `${port} 端口已被占用。若工坊已打开，请使用现有窗口；否则关闭旧服务后重试。`
        : `本地服务无法启动：${error.message}`);
      process.exitCode = 1;
    });
    server.listen(port, '127.0.0.1', () => {
      const address = `http://127.0.0.1:${server.address().port}`;
      console.log(serveDist ? `构建产物预览：${address}/` : `本地工坊：${address}/workshop/`);
      if (!serveDist) console.log(`网站预览：${address}/`);
      console.log('使用期间保留终端窗口。按 Control+C 停止服务。');
      if (process.argv.includes('--open')) {
        const command = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'explorer.exe' : 'xdg-open';
        const target = `${address}${serveDist ? '/' : '/workshop/'}`;
        execFile(command, [target], error => { if (error) console.log(`请手动访问：${target}`); });
      }
    });
    for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
  }
}
