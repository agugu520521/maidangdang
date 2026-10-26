import test from 'node:test';
import assert from 'node:assert/strict';
import { cp, readFile, readdir, mkdtemp, mkdir, writeFile, rm, symlink } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { extractBvid, isSocialUrl } from '../workshop/utils.js';
import { readContent, validateContent, root, labelKeys, optionalLabelKeys } from '../scripts/content.mjs';
import { build } from '../scripts/build.mjs';
import { createDevServer } from '../scripts/dev.mjs';

async function exampleContent() {
  const data = await readContent();
  const item = { id: 'fixture-image', title: '示例', category: '类别', year: '2026', description: '待上传', image: '' };
  data.images = [{ ...item }];
  data.videos = [{ ...item, id: 'fixture-video', bvid: '' }];
  data.ads = [{ ...item, id: 'fixture-ad' }];
  return data;
}

async function fixture(t) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'burgundy-build-test-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await cp(new URL('public/', root), path.join(directory, 'public'), { recursive: true });
  return directory;
}

test('B站链接可直接粘贴，自动提取 BV，拒绝短链和伪装域名', () => {
  const id = 'BV1xx411c7mD';
  for (const value of [id, `https://www.bilibili.com/video/${id}/?spm_id_from=333&p=2`, `bilibili.com/video/${id}`, `https://m.bilibili.com/video/${id}/`]) {
    assert.equal(extractBvid(value), id);
  }
  for (const value of ['https://b23.tv/abc', 'BV123', `https://evil.com/video/${id}`, `https://bilibili.com.evil.com/video/${id}`, `javascript:${id}`]) {
    assert.equal(extractBvid(value), null);
  }
});

test('当前内容符合完整可编辑 schema；空作品列表同样有效', async () => {
  const data = await readContent();
  assert.doesNotThrow(() => validateContent(data));
  for (const key of labelKeys) assert.equal(typeof data.labels[key], 'string');
  for (const category of ['images', 'videos', 'ads']) assert.ok(Array.isArray(data[category]));
  const empty = structuredClone(data);
  empty.images = []; empty.videos = []; empty.ads = [];
  assert.doesNotThrow(() => validateContent(empty));
});

test('拒绝远程或越界图片路径、无效 BV、重复 ID 与无效文字样式', async () => {
  const data = await exampleContent();
  for (const image of ['https://example.com/x.jpg', 'media/../../private.webp', 'media/test.jpg']) {
    const invalid = structuredClone(data); invalid.images[0].image = image;
    assert.throws(() => validateContent(invalid), /本地上传/);
  }
  for (const bvid of ['<script>', undefined, 123]) {
    const invalid = structuredClone(data); invalid.videos[0].bvid = bvid;
    assert.throws(() => validateContent(invalid), /BV/);
  }
  const style = structuredClone(data); style.titleStyle = 'invalid';
  assert.throws(() => validateContent(style), /样式/);
  const duplicate = structuredClone(data); duplicate.ads[0].id = data.images[0].id;
  assert.throws(() => validateContent(duplicate), /唯一编号/);
  const longNav = structuredClone(data); longNav.labels.navHome = '字'.repeat(13);
  assert.throws(() => validateContent(longNav), /导航/);
});

test('详情字段兼容旧作品，并限制文字、图库数量与本地图片路径', async () => {
  const data = await exampleContent();
  assert.doesNotThrow(() => validateContent(data));
  for (const key of optionalLabelKeys) {
    const custom = structuredClone(data); custom.labels[key] = '自己的分区标题';
    assert.doesNotThrow(() => validateContent(custom));
    custom.labels[key] = '字'.repeat(2001);
    assert.throws(() => validateContent(custom), /详情分区文字/);
  }
  const item = data.images[0];
  Object.assign(item, { role: '视觉设计', process: '草稿\n制作过程', outcome: '完成系列视觉', gallery: [{ image: 'media/aaaaaaaa.webp', caption: '过程草稿' }] });
  assert.doesNotThrow(() => validateContent(data));
  for (const [key, limit] of [['role', 300], ['process', 12000], ['outcome', 6000]]) {
    const invalid = structuredClone(data); invalid.images[0][key] = '字'.repeat(limit + 1);
    assert.throws(() => validateContent(invalid), /作品详情/);
    invalid.images[0][key] = null;
    assert.throws(() => validateContent(invalid), /作品详情/);
  }
  for (const gallery of [null, {}, Array(13).fill(item.gallery[0]), [{ image: 'https://example.com/image.webp', caption: '' }], [{ image: 'media/../../secret.webp', caption: '' }], [{ image: '', caption: '' }], [{ image: 'media/aaaaaaaa.webp', caption: '字'.repeat(501) }]]) {
    const invalid = structuredClone(data); invalid.images[0].gallery = gallery;
    assert.throws(() => validateContent(invalid), /图库/);
  }
});

test('社交地址可留空，拒绝伪装域名、非 HTTPS 和带凭证的链接', async () => {
  const data = await exampleContent();
  data.socials = { linkedin: 'https://www.linkedin.com/in/example', behance: 'https://www.behance.net/example', github: 'https://github.com/example' };
  assert.doesNotThrow(() => validateContent(data));
  for (const [kind, value] of Object.entries(data.socials)) assert.equal(isSocialUrl(kind, value), true);
  for (const value of ['http://github.com/example', 'https://github.com.evil.com/example', 'https://evil.com/github.com', 'javascript:alert(1)', 'https://user:pass@github.com/example', 'https://github.com:444/example', 123]) {
    const invalid = structuredClone(data); invalid.socials.github = value;
    assert.equal(isSocialUrl('github', value), false);
    assert.throws(() => validateContent(invalid), /社交链接/);
  }
  for (const socials of [null, [], { unknown: '' }, { github: 'https://www.behance.net/example' }]) {
    const invalid = structuredClone(data); invalid.socials = socials;
    assert.throws(() => validateContent(invalid), /社交链接/);
  }
  data.socials = { github: '', linkedin: '', behance: '' };
  assert.doesNotThrow(() => validateContent(data));
});

test('构建只包含当前引用媒体，排除工坊、接口、隐藏文件及源映射', async t => {
  const projectRoot = await fixture(t);
  const data = await exampleContent();
  const mediaDir = path.join(projectRoot, 'public/media');
  await mkdir(mediaDir, { recursive: true });
  await writeFile(path.join(mediaDir, 'aaaaaaaa.webp'), 'referenced');
  await writeFile(path.join(mediaDir, 'bbbbbbbb.webp'), 'unused');
  await writeFile(path.join(mediaDir, 'dddddddd.webp'), 'gallery only');
  data.images[0].image = 'media/aaaaaaaa.webp';
  data.videos[0].gallery = [{ image: 'media/dddddddd.webp', caption: '视频制作过程' }];
  data.ads[0].gallery = [{ image: 'media/aaaaaaaa.webp', caption: '共用封面，只拷贝一次' }];
  for (const folder of ['workshop', 'api', 'scripts', '.private']) {
    await mkdir(path.join(projectRoot, 'public', folder), { recursive: true });
    await writeFile(path.join(projectRoot, 'public', folder, 'secret.txt'), 'private');
  }
  await writeFile(path.join(projectRoot, 'public', 'secret.js.map'), 'source map');
  await symlink(fileURLToPath(new URL('scripts/dev.mjs', root)), path.join(projectRoot, 'public', 'private-link.mjs'));
  await build(data, { projectRoot });
  await build(data, { projectRoot });
  const dist = path.join(projectRoot, 'dist');
  const files = await readdir(dist, { recursive: true });
  for (const file of ['index.html', 'site.js', 'styles.css', 'planet-scene.js', 'data.json']) assert.ok(files.includes(file), file);
  assert.equal(files.some(file => /(?:^|\/)(?:workshop|api|scripts|content|tests|qa|\.private)(?:\/|$)|\.map$|private-link/.test(file)), false);
  assert.deepEqual(files.filter(file => file.startsWith('media/')).sort(), ['media/aaaaaaaa.webp', 'media/dddddddd.webp']);
  assert.deepEqual(JSON.parse(await readFile(path.join(dist, 'data.json'), 'utf8')), data);
  for (const file of ['index.html', 'site.js']) assert.doesNotMatch(await readFile(path.join(dist, file), 'utf8'), /\/api\/|\/workshop\//);
});

test('字体许可和素材署名随公开网站保留且文本未变化', async t => {
  const projectRoot = await fixture(t);
  await build(await readContent(), { projectRoot });
  for (const file of ['assets/ATTRIBUTION.md', 'assets/fonts/OFL-Inter.txt', 'assets/fonts/OFL-Cormorant.txt']) {
    const actual = await readFile(path.join(projectRoot, 'dist', file), 'utf8');
    const original = await readFile(new URL('public/' + file, root), 'utf8');
    assert.ok(actual.length > 100);
    assert.equal(actual, original);
  }
});

test('空作品与空图片可构建；丢失的引用图片阻止构建并保留之前产物', async t => {
  const projectRoot = await fixture(t);
  const data = await readContent();
  data.images = []; data.videos = []; data.ads = [];
  await build(data, { projectRoot });
  const before = await readFile(path.join(projectRoot, 'dist/data.json'), 'utf8');
  const missing = await exampleContent(); missing.images[0].image = 'media/cccccccc.webp';
  await assert.rejects(build(missing, { projectRoot }), /图片文件不存在/);
  const missingGallery = await exampleContent(); missingGallery.ads[0].gallery = [{ image: 'media/eeeeeeee.webp', caption: '' }];
  await assert.rejects(build(missingGallery, { projectRoot }), /图片文件不存在/);
  assert.equal(await readFile(path.join(projectRoot, 'dist/data.json'), 'utf8'), before);
  assert.equal((await readdir(projectRoot)).some(file => file.startsWith('.dist-')), false);
});

test('本机 API 校验会话和请求来源，公开模式完全禁用工坊与 API', async t => {
  for (const serveDist of [false, true]) {
    const server = createDevServer({ serveDist });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    t.after(() => new Promise(resolve => server.close(resolve)));
    const origin = `http://127.0.0.1:${server.address().port}`;
    const request = (route, options) => fetch(origin + route, options);
    if (serveDist) {
      for (const route of ['/api/session', '/workshop/', '/__qa/verify.html']) assert.equal((await request(route)).status, 404);
    } else {
      const session = await (await request('/api/session')).json();
      assert.match(session.token, /^[a-f0-9]{64}$/);
      assert.equal((await request('/api/save', { method: 'POST', body: '{}' })).status, 403);
      assert.equal((await request('/api/session', { headers: { Origin: 'https://example.com' } })).status, 403);
      assert.equal((await request('/api/upload', { method: 'POST', headers: { 'X-Workshop-Token': session.token }, body: 'not-webp' })).status, 400);
      assert.equal((await request('/api/save', { method: 'POST', headers: { 'X-Workshop-Token': session.token }, body: '{}' })).status, 400);
    }
    const wrongHostStatus = await new Promise((resolve, reject) => {
      const req = http.request(origin + '/', { headers: { Host: 'evil.com' } }, res => { res.resume(); res.on('end', () => resolve(res.statusCode)); });
      req.on('error', reject); req.end();
    });
    assert.equal(wrongHostStatus, 403);
    assert.equal((await request('/%00')).status, 400);
  }
});
