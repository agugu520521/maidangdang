import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, cp, rm, readFile, writeFile, mkdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { assertDeploymentContract } from '../scripts/check-deployment.mjs';

async function fixture(t) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'pages-contract-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  for (const file of ['deployment.json', 'package.json', 'package-lock.json', '.node-version', 'scripts/build.mjs']) {
    await mkdir(path.dirname(path.join(directory, file)), { recursive: true });
    await cp(new URL('../' + file, import.meta.url), path.join(directory, file));
  }
  return directory;
}

test('页面源码可变化，固定 Pages Git 部署合同依然通过', async t => {
  const projectRoot = await fixture(t);
  await mkdir(path.join(projectRoot, 'public'));
  await writeFile(path.join(projectRoot, 'public/index.html'), '<h1>全新页面</h1>');
  await writeFile(path.join(projectRoot, 'public/styles.css'), 'body{color:rebeccapurple}');
  assert.equal((await assertDeploymentContract({ projectRoot })).outputDirectory, 'dist');
});

test('改变构建命令、输出目录、自动部署或静态构建源码会被阻止', async t => {
  const projectRoot = await fixture(t);
  const pkg = JSON.parse(await readFile(path.join(projectRoot, 'package.json'), 'utf8'));
  await writeFile(path.join(projectRoot, 'package.json'), JSON.stringify({ ...pkg, scripts: { ...pkg.scripts, build: 'other-build' } }));
  await assert.rejects(assertDeploymentContract({ projectRoot }), /构建入口/);
  await writeFile(path.join(projectRoot, 'package.json'), JSON.stringify(pkg));
  const contract = JSON.parse(await readFile(path.join(projectRoot, 'deployment.json'), 'utf8'));
  for (const change of [{ outputDirectory: 'public' }, { automaticProductionDeployments: false }]) {
    await writeFile(path.join(projectRoot, 'deployment.json'), JSON.stringify({ ...contract, ...change }));
    await assert.rejects(assertDeploymentContract({ projectRoot }), /部署合同/);
  }
  await writeFile(path.join(projectRoot, 'deployment.json'), JSON.stringify(contract));
  await writeFile(path.join(projectRoot, 'scripts/build.mjs'), '// accidental replacement');
  await assert.rejects(assertDeploymentContract({ projectRoot }), /静态构建逻辑/);
});

test('不允许新增 Worker 或其他托管平台配置取代 Pages 静态构建', async t => {
  const projectRoot = await fixture(t);
  await writeFile(path.join(projectRoot, 'wrangler.toml'), 'name = "other-platform"');
  await assert.rejects(assertDeploymentContract({ projectRoot }), /冲突/);
});
