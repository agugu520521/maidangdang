import { readFile, lstat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const fixed = Object.freeze({
  version: 1,
  provider: 'cloudflare-pages',
  integration: 'github',
  productionBranch: 'main',
  rootDirectory: '',
  frameworkPreset: 'None',
  buildCommand: 'npm run build',
  buildScript: 'node scripts/build.mjs',
  prebuildScript: 'node scripts/check-deployment.mjs',
  outputDirectory: 'dist',
  nodeMajor: 24,
  automaticProductionDeployments: true,
  hostnameSuffix: '.pages.dev',
});

async function exists(file) {
  try { await lstat(file); return true; }
  catch (error) { if (error.code === 'ENOENT') return false; throw error; }
}

export async function assertDeploymentContract({ projectRoot = root } = {}) {
  const readJSON = async file => JSON.parse(await readFile(path.join(projectRoot, file), 'utf8'));
  const contract = await readJSON('deployment.json');
  for (const [key, expected] of Object.entries(fixed)) {
    if (contract[key] !== expected) throw new Error(`部署合同 ${key} 已变化。请恢复固定的 Cloudflare Pages Git 集成配置。`);
  }
  const pkg = await readJSON('package.json');
  if (pkg.scripts?.build !== fixed.buildScript || pkg.scripts?.prebuild !== fixed.prebuildScript) {
    throw new Error('构建入口或部署检查被修改。必须保留 npm run build → 原有静态 dist 构建。');
  }
  if ((await readFile(path.join(projectRoot, '.node-version'), 'utf8')).trim() !== String(fixed.nodeMajor)) {
    throw new Error('构建运行时主版本必须保持 Node.js 24。');
  }
  if (process.env.CF_PAGES === '1' && Number(process.versions.node.split('.')[0]) !== fixed.nodeMajor) {
    throw new Error('Pages 当前运行时不是 Node.js 24。请删除冲突的 NODE_VERSION 设置并使用项目 .node-version。');
  }
  const hash = contract.protectedFiles?.['scripts/build.mjs'];
  if (!/^[a-f0-9]{64}$/.test(hash || '') || Object.keys(contract.protectedFiles).length !== 1) {
    throw new Error('受保护的静态构建校验信息不完整。');
  }
  const actual = createHash('sha256').update(await readFile(path.join(projectRoot, 'scripts/build.mjs'))).digest('hex');
  if (actual !== hash) throw new Error('原有静态构建逻辑已变化。请恢复 scripts/build.mjs，不得通过更新校验值绕过部署约定。');
  for (const file of [
    'wrangler.toml', 'wrangler.json', 'wrangler.jsonc', 'vercel.json', 'netlify.toml',
    '.openai/hosting.json', 'functions', 'public/functions', 'public/_worker.js', 'dist/_worker.js',
  ]) {
    if (await exists(path.join(projectRoot, file))) throw new Error(`发现与固定静态 Pages Git 部署冲突的入口：${file}`);
  }
  const lock = await readJSON('package-lock.json');
  if (lock.lockfileVersion !== 3 || lock.name !== pkg.name || lock.version !== pkg.version
    || lock.packages?.['']?.name !== pkg.name || lock.packages?.['']?.version !== pkg.version) {
    throw new Error('package-lock.json 与 package.json 不一致，请同步依赖锁文件，保持原有部署方式。');
  }
  return contract;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    await assertDeploymentContract();
    console.log('部署合同检查通过：GitHub main → Cloudflare Pages → npm run build → dist。');
  } catch (error) {
    console.error(`部署合同检查失败：${error.message}`);
    process.exitCode = 1;
  }
}
