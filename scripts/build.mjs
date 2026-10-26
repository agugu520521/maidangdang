import { cp, lstat, mkdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { root, readContent, validateContent } from './content.mjs';

const excludedDirectories = new Set(['node_modules', 'workshop', 'scripts', 'api', 'content', 'tests', 'qa']);
async function isPublicAsset(source, publicRoot) {
  const relative = path.relative(publicRoot, source);
  if (!relative) return true;
  const parts = relative.split(path.sep);
  if (parts[0] === 'media' || parts.some(part => part.startsWith('.') || excludedDirectories.has(part))) return false;
  if (/\.map$/i.test(source)) return false;
  // Never follow or publish a link that could reveal files outside public/.
  return !(await lstat(source)).isSymbolicLink();
}

export async function build(content, { projectRoot = fileURLToPath(root) } = {}) {
  const buildRoot = pathToFileURL(path.resolve(projectRoot) + path.sep);
  const publicRoot = fileURLToPath(new URL('public/', buildRoot));
  const data = validateContent(content ?? await readContent());
  if (!(await stat(new URL('public/index.html', buildRoot))).isFile()) throw new Error('public/index.html 不存在，无法构建。');
  const staging = new URL(`.dist-staging-${randomUUID()}/`, buildRoot);
  const backup = new URL(`.dist-backup-${randomUUID()}/`, buildRoot);
  const dist = new URL('dist/', buildRoot);
  let backedUp = false;
  try {
    await mkdir(staging);
    // Font licenses and artwork attribution remain with their public assets.
    await cp(publicRoot, staging, { recursive: true, filter: source => isPublicAsset(source, publicRoot) });
    const images = new Set([...data.images, ...data.videos, ...data.ads]
      .flatMap(item => [item.image, ...(item.gallery ?? []).map(picture => picture.image)]).filter(Boolean));
    if (images.size) {
      await mkdir(new URL('media/', staging));
      for (const image of images) {
        const source = new URL(`public/${image}`, buildRoot);
        try {
          const details = await lstat(source);
          if (!details.isFile() || details.isSymbolicLink()) throw new Error('上传的图片不可读取');
          await cp(source, new URL(image, staging));
        } catch (error) {
          if (error.code === 'ENOENT') throw new Error(`图片文件不存在：${image}。请在工坊重新上传后保存。`);
          throw error;
        }
      }
    }
    await writeFile(new URL('data.json', staging), JSON.stringify(data, null, 2) + '\n');
    try { await rename(dist, backup); backedUp = true; } catch (error) { if (error.code !== 'ENOENT') throw error; }
    try { await rename(staging, dist); } catch (error) { if (backedUp) await rename(backup, dist); throw error; }
    if (backedUp) await rm(backup, { recursive: true, force: true });
    return fileURLToPath(dist);
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { console.log(`构建成功：${await build()}`); }
  catch (error) { console.error(`构建失败：${error.message}`); process.exitCode = 1; }
}
