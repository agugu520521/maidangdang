import { extractBvid, isSocialUrl } from './utils.js';
const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let data, token, tab = 'general', selected = { images: 0, videos: 0, ads: 0 }, dirty = false, busy = false, uploading = false, revision = 0;
const preview = $('#preview');
function status(text, error = false) { $('#save-status').textContent = text; $('#save-status').classList.toggle('error', error); }
function update() { preview.contentWindow?.postMessage({ type: 'portfolio:update', data }, location.origin); }
function changed() { dirty = true; revision++; status('有未保存的修改 · 右侧已更新'); update(); }
function field(key, label, value, multiline = false, help = '', limit = 2000) {
  return `<label class="field">${label}${multiline ? `<textarea data-key="${key}" maxlength="${limit}">${esc(value)}</textarea>` : `<input data-key="${key}" value="${esc(value)}" maxlength="${key === 'year' ? 12 : limit}" ${key === 'email' ? 'type="email"' : key.startsWith('socials.') ? 'type="url" placeholder="https://…"' : ''}>`}${help ? `<small>${help}</small>` : ''}</label>`;
}
function choices(key, label, options) {
  return `<div class="field choice-field"><span class="choice-label">${label}</span><div class="choice-options" role="group" aria-label="${label}">${options.map(option => `<label class="choice-card${key === 'textColor' ? ' color-choice' : ''}"><input type="radio" name="${key}" data-key="${key}" value="${option.value}" ${data[key] === option.value ? 'checked' : ''}>${option.color ? `<i class="color-dot" style="--swatch:${option.color}" aria-hidden="true"></i>` : ''}<span><strong>${option.title}</strong><small>${option.note}</small></span></label>`).join('')}</div></div>`;
}
function detailEditor(item) {
  const gallery = item.gallery ?? [];
  return `<button type="button" class="detail-preview-button" data-action="preview-detail">在右侧预览这件作品详情 ↗</button><fieldset class="project-detail-fields"><legend>详情内容（选填）</legend><p class="section-note">点击右侧作品可查看详情。下面的文字与图片会实时更新；没有资料可以先留空。</p>${field('role', '我的角色', item.role, false, '例如：视觉设计、摄影、剪辑。最多 300 字。', 300)}${field('process', '设计过程', item.process, true, '写下灵感、尝试和制作步骤，回车分段。最多 12000 字。', 12000)}${field('outcome', '项目成果', item.outcome, true, '填写实际完成的内容或自己的总结。最多 6000 字。', 6000)}</fieldset><fieldset class="gallery-editor"><legend>详情图库 · ${gallery.length} / 12 张</legend><p class="section-note">封面之外的过程图和展示图，只出现在作品详情中。每张自动压缩至 2MB 以下。</p><div class="gallery-list">${gallery.map((picture, i) => `<div class="gallery-item"><div class="gallery-item-heading"><span>图片 ${String(i + 1).padStart(2, '0')}</span><div class="gallery-item-tools"><button type="button" data-action="gallery-up" data-index="${i}" aria-label="图库第 ${i + 1} 张前移" ${i === 0 ? 'disabled' : ''}>↑</button><button type="button" data-action="gallery-down" data-index="${i}" aria-label="图库第 ${i + 1} 张后移" ${i === gallery.length - 1 ? 'disabled' : ''}>↓</button><button type="button" data-action="gallery-remove" data-index="${i}" aria-label="删除图库第 ${i + 1} 张">删除</button></div></div><label class="gallery-image-label"><img src="/${esc(picture.image)}" alt="${esc(picture.caption || `详情图库第 ${i + 1} 张`)}"><span>点击更换图片</span><input type="file" data-gallery-replace="${i}" accept="image/jpeg,image/png,image/webp" aria-label="更换图库第 ${i + 1} 张"></label><label class="field">图片说明（选填）<textarea data-gallery-caption="${i}" maxlength="500" placeholder="例如：最初的构图草稿">${esc(picture.caption)}</textarea><small>最多 500 字，也会作为图片的文字描述。</small></label></div>`).join('')}</div><label class="gallery-add ${gallery.length >= 12 ? 'is-disabled' : ''}"><span>＋ 从电脑添加详情图片</span><small>${gallery.length >= 12 ? '已达到 12 张上限，可先删除一张' : '可一次选择多张 · JPG / PNG / WebP'}</small><input id="gallery-upload" type="file" multiple accept="image/jpeg,image/png,image/webp" aria-label="添加详情图库图片" ${gallery.length >= 12 ? 'disabled' : ''}></label><p id="gallery-upload-status" class="gallery-upload-status" role="status"></p></fieldset>`;
}
function renderEditor() {
  const form = $('#editor');
  if (tab === 'general') {
    form.innerHTML = `<fieldset><legend>01 / 关于你</legend>${field('name', '你的名字 / 网站名称', data.name)}${field('role', '身份或创作方向', data.role)}${field('title', '首页大标题', data.title, true, '按回车可以换行。建议 2—3 行，长标题可以缩短。')}${field('intro', '首页介绍', data.intro, true)}${field('labels.heroCaption', '宇宙场景短句', data.labels.heroCaption, false, '显示在首页宇宙画面中的英文或中文短句。')}</fieldset><fieldset><legend>02 / 选一种你喜欢的文字风格</legend>${choices('titleStyle', '标题样式 · 点选后看右侧效果', [{value:'editorial',title:'艺术杂志：纤细衬线',note:'字形有细小笔锋，接近参考图的优雅感。'},{value:'modern',title:'现代简洁：清爽无衬线',note:'字形干净利落，中文和英文都容易阅读。'},{value:'minimal',title:'极简留白：轻盈衬线',note:'标题稍小、节奏更安静，适合克制的表达。'}])}${choices('textColor', '文字配色 · 深浅背景自动适配', [{value:'burgundy',title:'勃艮第红',note:'酒红与柔玫瑰，延续宇宙氛围。',color:'#722f44'},{value:'ink',title:'暖墨黑',note:'墨黑与暖白，清楚而经典。',color:'#30282d'},{value:'clay',title:'陶土棕',note:'暖棕与浅陶色，温柔自然。',color:'#98735e'}])}</fieldset><fieldset><legend>03 / 联系方式</legend>${field('email', '合作邮箱（选填）', data.email, false, '填好后，页尾合作按钮会打开邮件。')}${field('location', '所在城市 / 页尾短句', data.location)}</fieldset>`;
    form.insertAdjacentHTML('beforeend', `<details class="help text-group"><summary>社交主页（选填）</summary><div class="detail-fields"><p class="section-note">填写后会出现在页尾。请粘贴自己的完整 HTTPS 主页地址；没有账号可以留空。</p>${field('socials.linkedin', 'LinkedIn 主页', data.socials?.linkedin, false, '支持 linkedin.com 或 www.linkedin.com。')}${field('socials.behance', 'Behance 主页', data.socials?.behance, false, '支持 behance.net 或 www.behance.net。')}${field('socials.github', 'GitHub 主页', data.socials?.github, false, '支持 github.com 或 www.github.com。')}</div></details>`);
    const labelGroups = [
      ['导航文字', {navHome:'首页导航',navImages:'图片页导航',navVideos:'视频页导航',navAds:'广告页导航'}],
      ['首页分区文字', {selectedTitle:'精选作品总标题',selectedIntro:'精选作品总介绍',imageSection:'首页图片区标题',imageEnglish:'首页图片区英文',videoSection:'首页视频区标题',videoEnglish:'首页视频区英文',adSection:'首页广告区标题',adEnglish:'首页广告区英文'}],
      ['作品分页文字', {imagesTitle:'图片分页标题',imagesIntro:'图片分页介绍',videosTitle:'视频分页标题',videosIntro:'视频分页介绍',adsTitle:'广告分页标题',adsIntro:'广告分页介绍'}],
      ['作品详情文字', {detailOverview:'作品概览标题',detailSummary:'项目简介标题',detailProcess:'设计过程标题',detailGallery:'详情图库标题',detailOutcome:'项目成果标题'}],
      ['页尾与按钮文字', {footerTitle:'页尾大标题',footerEnglish:'页尾英文短句',contact:'合作按钮文字',explore:'向下探索文字',viewAll:'查看全部文字',watch:'观看影片文字'}]
    ];
    form.insertAdjacentHTML('beforeend', labelGroups.map(([group, labels]) => `<details class="help text-group"><summary>${group}</summary><div class="detail-fields">${Object.entries(labels).map(([key, title]) => field('labels.' + key, title, data.labels[key], ['selectedTitle','selectedIntro','footerTitle','imagesIntro','videosIntro','adsIntro'].includes(key))).join('')}</div></details>`).join(''));
    form.querySelectorAll('[data-key^="labels.nav"]').forEach(input => input.maxLength = 12);
  } else {
    const list = data[tab];
    const index = Math.min(selected[tab], Math.max(0, list.length - 1)); selected[tab] = index;
    const item = list[index];
    const note = { images: '首页展示前 6 张，更多图片会出现在“图片作品”页。点击 ↑ ↓ 可调整首页展示顺序。', videos: '首页整屏展示第 1 个视频，点击封面后使用 B站播放器播放。这里上传的是封面图片，视频来自 B站链接。', ads: '首页展示前 4 张，更多作品会出现在“广告作品”页。点击 ↑ ↓ 可调整首页展示顺序。' }[tab];
    form.innerHTML = `<p class="section-note">${note}</p><label class="field item-select">选择要编辑的作品<select id="work-select" ${list.length ? '' : 'disabled'}>${list.map((it, i) => `<option value="${i}" ${i === index ? 'selected' : ''}>${String(i + 1).padStart(2,'0')} · ${esc(it.title || '未命名作品')}</option>`).join('')}</select></label><div class="item-tools"><button type="button" data-action="add">＋ 添加</button>${item ? `<button type="button" data-action="up" aria-label="作品前移" title="前移：更早展示" ${index === 0 ? 'disabled' : ''}>↑</button><button type="button" data-action="down" aria-label="作品后移" title="后移：更晚展示" ${index === list.length - 1 ? 'disabled' : ''}>↓</button><button type="button" data-action="remove" class="danger">删除</button>` : ''}</div>${item ? `<fieldset><legend>作品信息</legend>${field('title', '作品名称', item.title)}${field('category', '分类 / 标签', item.category)}${field('year', '创作年份', item.year)}${field('description', '作品介绍（点击作品后可见）', item.description, true)}</fieldset><div class="upload-section"><label class="field">${tab === 'videos' ? '视频封面' : '作品图片'}<span class="upload-box">${item.image ? `<img src="/${esc(item.image)}" alt="当前图片预览">` : '<span class="upload-prompt"><b>＋</b>从电脑选择图片<small>JPG / PNG / WebP · 自动压缩</small></span>'}<input id="image-upload" type="file" accept="image/jpeg,image/png,image/webp" aria-label="${tab === 'videos' ? '上传视频封面' : '上传作品图片'}"></span></label><div class="upload-caption"><span id="upload-status">${item.image ? '点击图片可重新上传' : '保存为清晰的 WebP，小于 2MB'}</span>${item.image ? '<button type="button" data-action="clear-image">移除图片</button>' : ''}</div></div>${tab === 'videos' ? `<label class="field">B站视频链接 / BV 编号<input id="bili-input" value="${esc(item.bvid)}" placeholder="粘贴完整链接或 BV 编号" spellcheck="false" autocomplete="off"><small class="bili-example">链接保留到 BV 编号末尾：<code>https://www.bilibili.com/video/<b>BVxxxxxxxxxx</b>/</code>问号后面的参数不用。完整链接也可自动识别。</small><small id="bili-status">${item.bvid ? '已识别：' + esc(item.bvid) + ' · 将播放第 1 集' : '还没有填写视频链接。'}</small></label>` : ''}` : '<p class="empty-editor">点击“添加”放入你的第一个作品。</p>'}`;
    if (item) form.insertAdjacentHTML('beforeend', detailEditor(item));
  }
}
$('#editor').addEventListener('submit', event => event.preventDefault());
$('#editor').addEventListener('invalid', event => { const section = event.target.closest('details'); if (section) section.open = true; }, true);
$('#editor').addEventListener('input', event => {
  const key = event.target.dataset.key;
  if (key) {
    const target = tab === 'general' ? data : data[tab][selected[tab]];
    if (key.startsWith('labels.')) target.labels[key.slice(7)] = event.target.value;
    else if (key.startsWith('socials.')) {
      const kind = key.slice(8), value = event.target.value.trim();
      target.socials ??= {};
      target.socials[kind] = value;
      event.target.setCustomValidity(isSocialUrl(kind, value) ? '' : '请填写对应平台官方域名的 https:// 完整地址，或留空');
    }
    else target[key] = event.target.value;
    if (tab !== 'general' && key === 'title') $('#work-select').options[selected[tab]].textContent = `${String(selected[tab] + 1).padStart(2,'0')} · ${event.target.value || '未命名作品'}`;
    changed();
  }
  if (event.target.dataset.galleryCaption !== undefined && tab !== 'general') {
    const picture = data[tab][selected[tab]].gallery?.[Number(event.target.dataset.galleryCaption)];
    if (picture) { picture.caption = event.target.value; changed(); }
  }
  if (event.target.id === 'bili-input') {
    const bvid = extractBvid(event.target.value);
    data.videos[selected.videos].bvid = bvid || '';
    const valid = bvid || !event.target.value.trim();
    event.target.setCustomValidity(valid ? '' : '请填写 BV 编号或完整 bilibili.com 视频链接');
    $('#bili-status').textContent = bvid ? `已识别：${bvid} · 将播放第 1 集` : event.target.value.trim() ? '未识别。请复制完整 bilibili.com/video/BV… 链接，短链接需先打开。' : '可以直接粘贴完整 B站视频链接。';
    $('#bili-status').className = valid ? 'bvid-valid' : 'bvid-invalid'; changed();
  }
});
async function compressAndUpload(file) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('请上传 JPG、PNG 或 WebP 图片');
  const image = await createImageBitmap(file, { imageOrientation: 'from-image' });
  let scale = Math.min(1, 3000 / Math.max(image.width, image.height));
  const canvas = document.createElement('canvas');
  let blob;
  try {
    for (let attempt = 0; attempt < 10; attempt++) {
      canvas.width = Math.max(1, Math.round(image.width * scale)); canvas.height = Math.max(1, Math.round(image.height * scale));
      canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
      const quality = Math.max(.66, .9 - attempt * .04);
      blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', quality));
      if (blob && blob.type === 'image/webp' && blob.size < 2 * 1024 * 1024) break;
      scale *= .8;
    }
  } finally { image.close(); }
  if (!blob || blob.type !== 'image/webp' || blob.size >= 2 * 1024 * 1024) throw new Error('图片处理失败，请换一张图片重试');
  const response = await fetch('/api/upload', { method: 'POST', headers: { 'X-Workshop-Token': token, 'Content-Type': 'image/webp' }, body: blob });
  const result = await response.json(); if (!response.ok) throw new Error(result.error);
  return result;
}
$('#editor').addEventListener('change', async event => {
  if (event.target.id === 'work-select') { selected[tab] = Number(event.target.value); renderEditor(); return; }
  const addGallery = event.target.id === 'gallery-upload';
  const replaceGallery = event.target.dataset.galleryReplace !== undefined;
  if (event.target.id !== 'image-upload' && !addGallery && !replaceGallery) return;
  const input = event.target, files = Array.from(input.files || []);
  if (!files.length) return;
  if (uploading) { input.value = ''; return status('请等待当前图片处理完成后再上传', true); }
  const item = data[tab][selected[tab]], targetTab = tab;
  const picture = replaceGallery ? item.gallery?.[Number(input.dataset.galleryReplace)] : null;
  if (replaceGallery && !picture) return;
  if (addGallery && (item.gallery?.length ?? 0) + files.length > 12) {
    input.value = ''; return status(`本次最多还可添加 ${12 - (item.gallery?.length ?? 0)} 张详情图片，请重新选择`, true);
  }
  uploading = true; $('#save').disabled = true;
  let completed = 0, lastSize = 0, failure;
  try {
    for (const file of files) {
      status(`正在压缩并上传图片 ${completed + 1} / ${files.length}…`);
      const result = await compressAndUpload(file);
      if (!data[targetTab].includes(item)) break;
      if (addGallery) { item.gallery ??= []; item.gallery.push({ image: result.image, caption: '' }); }
      else if (replaceGallery) picture.image = result.image;
      else item.image = result.image;
      completed++; lastSize = result.size; changed();
    }
  } catch (error) { failure = error.message || '图片处理失败，请重试'; }
  finally {
    input.value = '';
    uploading = false; $('#save').disabled = busy;
    if (tab === targetTab && data[tab][selected[tab]] === item) {
      const scroll = $('.editor-scroll').scrollTop;
      renderEditor(); $('.editor-scroll').scrollTop = scroll;
      const uploadStatus = $(addGallery || replaceGallery ? '#gallery-upload-status' : '#upload-status');
      if (uploadStatus && completed) uploadStatus.textContent = completed > 1 ? `已添加 ${completed} 张 · 每张均小于 2MB` : `已压缩至 ${Math.round(lastSize / 1024)} KB · 修改后记得保存`;
    }
    if (failure) status(`${completed ? `已完成 ${completed} 张；` : ''}${failure}`, true);
  }
});
$('#editor').addEventListener('click', event => {
  const button = event.target.closest('[data-action]');
  const action = button?.dataset.action;
  if (!action || tab === 'general') return;
  if (action === 'preview-detail') {
    const item = data[tab][selected[tab]];
    if (item) preview.contentWindow?.postMessage({ type: 'portfolio:update', page: '/' + tab + '/' + encodeURIComponent(item.id) }, location.origin);
    return;
  }
  if (uploading) return status('请等待当前图片处理完成后再调整作品', true);
  const list = data[tab], index = selected[tab];
  if (action.startsWith('gallery-')) {
    const gallery = list[index]?.gallery, pictureIndex = Number(button.dataset.index);
    if (!gallery?.[pictureIndex]) return;
    if (action === 'gallery-remove') gallery.splice(pictureIndex, 1);
    else if (action === 'gallery-up' && pictureIndex > 0) [gallery[pictureIndex - 1], gallery[pictureIndex]] = [gallery[pictureIndex], gallery[pictureIndex - 1]];
    else if (action === 'gallery-down' && pictureIndex < gallery.length - 1) [gallery[pictureIndex + 1], gallery[pictureIndex]] = [gallery[pictureIndex], gallery[pictureIndex + 1]];
    const scroll = $('.editor-scroll').scrollTop;
    renderEditor(); $('.editor-scroll').scrollTop = scroll; changed();
    const focusIndex = Math.max(0, Math.min(gallery.length - 1, pictureIndex + (action === 'gallery-up' ? -1 : action === 'gallery-down' ? 1 : 0)));
    const nextFocus = $(`[data-action="${action}"][data-index="${focusIndex}"]:not(:disabled)`) || $(`[data-action="gallery-remove"][data-index="${focusIndex}"]`) || $('#gallery-upload');
    nextFocus?.focus({ preventScroll: true });
    return;
  }
  if (action === 'add') {
    if (list.length >= 100) return status('每类最多支持 100 个作品', true);
    list.push({ id: crypto.randomUUID(), title: '新作品', category: tab === 'videos' ? '个人短片' : '视觉创作', year: String(new Date().getFullYear()), description: '', image: '', role: '', process: '', outcome: '', gallery: [], ...(tab === 'videos' ? { bvid: '' } : {}) }); selected[tab] = list.length - 1;
  } else if (action === 'remove') {
    if (!confirm('删除当前作品？保存后生效。未使用的图片仍保留在本地素材目录。')) return;
    list.splice(index, 1); selected[tab] = Math.max(0, index - 1);
  } else if (action === 'clear-image') list[index].image = '';
  else if (action === 'up' && index > 0) { [list[index - 1], list[index]] = [list[index], list[index - 1]]; selected[tab]--; }
  else if (action === 'down' && index < list.length - 1) { [list[index + 1], list[index]] = [list[index], list[index + 1]]; selected[tab]++; }
  renderEditor(); changed();
});
document.querySelectorAll('[data-tab]').forEach(button => button.addEventListener('click', () => {
  if (!data) return;
  if (!$('#editor').reportValidity()) return;
  tab = button.dataset.tab;
  document.querySelectorAll('[data-tab]').forEach(b => b.setAttribute('aria-selected', String(b === button)));
  renderEditor(); preview.contentWindow.postMessage({ type: 'portfolio:update', page: tab === 'general' ? '/' : '/' + tab }, location.origin);
}));
$('#save').addEventListener('click', async () => {
  if (!$('#editor').reportValidity() || busy || uploading) return;
  busy = true; $('#save').disabled = true;
  const savedRevision = revision;
  status('正在保存，并生成 dist…');
  try {
    const response = await fetch('/api/save', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Workshop-Token': token }, body: JSON.stringify(data) });
    const result = await response.json(); if (!response.ok) throw new Error(result.error);
    dirty = revision !== savedRevision;
    status(dirty ? '网站已生成；还有新的修改待保存' : `已保存 · dist 已生成 · ${new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`);
  } catch (error) { status(`保存失败：${error.message}`, true); }
  finally { busy = false; $('#save').disabled = uploading; }
});
for (const mode of ['desktop', 'mobile']) $('#' + mode).addEventListener('click', () => {
  preview.classList.toggle('mobile', mode === 'mobile');
  for (const other of ['desktop', 'mobile']) { $('#' + other).classList.toggle('active', other === mode); $('#' + other).setAttribute('aria-pressed', String(other === mode)); }
});
window.addEventListener('message', event => { if (event.origin === location.origin && event.source === preview.contentWindow && event.data?.type === 'portfolio:ready' && data) update(); });
window.addEventListener('beforeunload', event => { if (dirty || uploading || busy) { event.preventDefault(); event.returnValue = ''; } });
try {
  const [contentResponse, sessionResponse] = await Promise.all([fetch('/data.json'), fetch('/api/session')]);
  if (!contentResponse.ok || !sessionResponse.ok) throw new Error('无法连接本地服务，请重新启动工坊');
  data = await contentResponse.json(); token = (await sessionResponse.json()).token;
  data.labels = {
    heroCaption: 'A UNIVERSE OF ONE’S OWN',
    selectedTitle: 'Selected\nWorks.',
    selectedIntro: 'A space for ideas to take shape.\n这里呈现我的图像、影像与广告作品。',
    videoSection: '流动的故事',
    videoEnglish: 'MOTION PICTURE',
    detailOverview: '关于作品',
    detailSummary: '创作起点',
    detailProcess: '创作过程',
    detailGallery: '作品细节',
    detailOutcome: '创作收获',
    ...data.labels
  };
  renderEditor(); update(); $('#save').disabled = false; status('内容已载入 · 修改后记得保存');
} catch (error) { status(error.message, true); }
