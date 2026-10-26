import './universe.js';
import { readRoute, workHref, listHref, filterWorks, categories } from './routes.js';

const home = document.querySelector('#home-view');
const pageView = document.querySelector('#page-view');
const siteOrigin = new URL(document.baseURI).origin;
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const lines = value => escape(value).replace(/\n/g, '<br>');
const localImage = item => /^media\/[a-f0-9-]+\.webp$/.test(item.image || '') ? item.image : '';
const pageLabels = {home:'navHome',images:'navImages',videos:'navVideos',ads:'navAds'};
let data, currentKey, currentRoute, toastTimer;
const positions = new Map();
let listMemory = {};
try { listMemory = JSON.parse(sessionStorage.getItem('portfolio:list-memory') || '{}'); } catch { /* Storage is optional. */ }
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

function placeholder(index, video = false) {
  return `<div class="placeholder art-${index % 6}${video ? ' placeholder-video' : ''}" aria-hidden="true"><span class="art-orbit"></span><span class="art-plane"></span><span class="placeholder-label">${video ? 'MOTION' : 'VISUAL STUDY'} / ${String(index + 1).padStart(2, '0')}<small>待上传${video ? '视频封面' : '你的作品'}</small></span></div>`;
}
function artwork(item, index, video = false, eager = false) {
  const image = localImage(item);
  return image ? `<img src="${image}" alt="${escape(item.title)}" width="1600" height="1200" loading="${eager ? 'eager' : 'lazy'}" decoding="async">` : placeholder(index, video);
}
function sectionHead(number, title, english, category) {
  return `<div class="section-head"><div><p class="eyebrow">${number} / ${escape(english)}</p><h2 class="collection-title">${lines(title)}</h2></div><a class="text-link" href="#/${category}">${escape(data.labels.viewAll)} <span aria-hidden="true">↗</span></a></div>`;
}
function cards(items, category) {
  return `<div class="work-grid ${category === 'ads' ? 'ad-grid' : ''}">${items.map(item => {
    const index = data[category].indexOf(item);
    return `<a class="work-card" href="${escape(workHref(category,item.id))}" aria-label="查看${escape(item.title)}"><div class="work-image">${artwork(item,index)}<span class="card-open" aria-hidden="true">↗</span></div><div class="work-caption"><div class="caption-title"><span class="work-number">${String(index+1).padStart(2,'0')}</span><h3>${escape(item.title)}</h3></div><span>${escape(item.category)} · ${escape(item.year)}</span></div></a>`;
  }).join('')}</div>`;
}
function videoCard(item, index, featured = false) {
  return `<a class="video-feature${featured ? ' featured' : ''}" href="${escape(workHref('videos',item.id))}" aria-label="查看影片${escape(item.title)}">${artwork(item,index,true)}<span class="video-shade"></span><span class="video-top"><span class="eyebrow">${escape(data.labels.videoEnglish)}</span>${featured ? `<span class="featured-heading">${escape(data.labels.videoSection)}</span>` : ''}</span><span class="play-button" aria-hidden="true">▷</span><span class="video-caption"><span class="eyebrow">${escape(item.category)} · ${escape(item.year)}</span><span class="video-title">${escape(item.title)}</span><span class="watch-label">${escape(data.labels.watch)} <span aria-hidden="true">↗</span></span></span></a>`;
}
function pageIntro(title, english, intro, count) {
  return `<section class="page-intro"><p class="eyebrow">${escape(english)} / ${String(count).padStart(2,'0')} WORKS</p><h1 tabindex="-1">${lines(title)}</h1><p>${lines(intro)}</p></section>`;
}
function renderHome() {
  const labels = data.labels;
  const titleLines = data.title.split('\n').filter(Boolean);
  document.querySelector('#hero-title').innerHTML = titleLines.map((line,i) => i === titleLines.length-1 ? `<em>${escape(line)}</em>` : `<span>${escape(line)}</span>`).join('');
  document.querySelector('#hero-role').textContent = data.role;
  document.querySelector('#hero-intro').innerHTML = lines(data.intro);
  document.querySelector('#explore-label').textContent = labels.explore;
  document.querySelector('.hero-caption').textContent = labels.heroCaption;
  document.querySelector('#works-title').innerHTML = lines(labels.selectedTitle);
  document.querySelector('#selected-intro').innerHTML = lines(labels.selectedIntro);
  document.querySelector('#home-images').innerHTML = sectionHead('01',labels.imageSection,labels.imageEnglish,'images') + (data.images.length ? cards(data.images.slice(0,6),'images') : '<p class="empty">图片作品待补充。</p>');
  document.querySelector('#home-video').innerHTML = data.videos[0] ? videoCard(data.videos[0],0,true) : '<p class="empty">视频作品待补充。</p>';
  document.querySelector('#home-ads').innerHTML = sectionHead('03',labels.adSection,labels.adEnglish,'ads') + (data.ads.length ? cards(data.ads.slice(0,4),'ads') : '<p class="empty">广告作品待补充。</p>');
}
function renderList(route) {
  const page = route.page, labels = data.labels;
  const items = filterWorks(data[page],route.filter,route.search);
  const available = [...new Set(data[page].map(item=>item.category).filter(Boolean))];
  const filters = ['',...available];
  const toolbar = `<div class="collection-toolbar"><div class="filter-list" role="group" aria-label="按作品分类筛选">${filters.map(category=>`<button type="button" class="filter-button" data-filter="${escape(category)}" aria-pressed="${category===route.filter}">${escape(category || '全部 / ALL')}</button>`).join('')}</div><p class="result-count" aria-live="polite">${items.length} / ${data[page].length} 件作品</p></div><form class="collection-search" role="search"><label for="work-search">搜索作品</label><input id="work-search" name="q" type="search" maxlength="200" value="${escape(route.search)}" placeholder="作品名称、分类或关键词"><button type="submit">搜索 ↗</button></form>`;
  const results = items.length ? page==='videos' ? `<div class="video-list">${items.map(item=>videoCard(item,data.videos.indexOf(item))).join('')}</div>` : cards(items,page) : `<div class="empty-state"><h2>暂时没有匹配的作品</h2><p>换一个分类或关键词，再看看。</p><a class="text-link" href="#/${page}">查看全部作品 ↗</a></div>`;
  pageView.innerHTML = pageIntro(labels[page+'Title'], labels[page==='images'?'imageEnglish':page==='ads'?'adEnglish':'videoEnglish'], labels[page+'Intro'],data[page].length) + `<section class="selected-works gallery-section" aria-label="作品列表">${toolbar}${results}</section>`;
}
function returnHref(category) {
  const saved = listMemory[category]?.key;
  return typeof saved === 'string' && readRoute(saved).kind === 'list' && readRoute(saved).page === category ? saved : `#/${category}`;
}
function renderMissing(page = 'images') {
  pageView.innerHTML = `<section class="project-not-found"><p class="eyebrow">404 / NOT FOUND</p><h1 tabindex="-1">作品暂未找到。</h1><p>这个地址可能有误，或作品已被调整。回到列表，继续看看其他作品。</p><a href="#/${categories.includes(page)?page:'images'}">返回作品列表 ↗</a></section>`;
}
function videoPlayer(item) {
  return `<iframe src="https://player.bilibili.com/player.html?bvid=${item.bvid}&p=1&autoplay=1&danmaku=0" title="${escape(item.title)} · B站播放器" allow="fullscreen; autoplay; encrypted-media; picture-in-picture" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;
}
function renderDetail(route) {
  const items = data[route.page];
  const index = items.findIndex(item=>item.id===route.id), item = items[index];
  if (!item) { renderMissing(route.page); return; }
  document.title = `${item.title} · ${data.name}`;
  const next = items.length>1 ? items[(index+1)%items.length] : null;
  const isVideo = route.page==='videos', hasVideo = isVideo && /^BV[A-Za-z0-9]{10}$/.test(item.bvid || '');
  const cover = hasVideo ? `<button class="detail-video-poster" type="button" data-play-video aria-label="播放${escape(item.title)}">${artwork(item,index,true,true)}<span class="play-button" aria-hidden="true">▷</span><span>点击播放 · Bilibili</span></button>` : artwork(item,index,isVideo,true);
  const gallery = (item.gallery || []).filter(picture=>localImage(picture));
  const back = escape(returnHref(route.page));
  pageView.innerHTML = `<article class="project-detail"><nav class="detail-breadcrumb" aria-label="作品导航"><a href="${back}">← 返回${escape(data.labels[pageLabels[route.page]])}</a><span class="detail-position">${String(index+1).padStart(2,'0')} / ${String(items.length).padStart(2,'0')}</span></nav><header class="project-heading"><p class="eyebrow">${escape(item.category)} / ${escape(item.year)}</p><h1 tabindex="-1">${escape(item.title)}</h1><p class="detail-lead">${escape(item.description || '作品介绍待补充。')}</p></header><div class="project-cover">${cover}</div>${isVideo&&!hasVideo?'<p class="video-pending">影片待补充，目前展示封面。</p>':''}<section class="project-overview"><h2>${escape(data.labels.detailOverview ?? '关于作品')}</h2><dl class="project-facts"><dt>作品类型</dt><dd>${escape(item.category || '待补充')}</dd><dt>创作年份</dt><dd>${escape(item.year || '待补充')}</dd><dt>我的角色</dt><dd>${escape(item.role || '待补充')}</dd></dl><div class="project-summary"><h2>${escape(data.labels.detailSummary ?? '创作起点')}</h2><p>${escape(item.description || '项目简介待补充。')}</p>${hasVideo?`<a class="external-video" href="https://www.bilibili.com/video/${item.bvid}/" target="_blank" rel="noopener">在 B站打开影片 ↗</a>`:''}</div></section><section class="project-story"><span class="story-number" aria-hidden="true">01</span><div><h2>${escape(data.labels.detailProcess ?? '创作过程')}</h2><p>${escape(item.process || '创作思路、尝试与制作过程待补充。')}</p></div></section><section class="project-gallery"><div class="gallery-heading"><h2>${escape(data.labels.detailGallery ?? '作品细节')}</h2><p class="eyebrow">DETAILS / ${String(gallery.length).padStart(2,'0')}</p></div>${gallery.length?`<div class="detail-gallery-grid">${gallery.map((picture,i)=>`<figure><img src="${localImage(picture)}" alt="${escape(picture.caption || item.title+' · 细节 '+(i+1))}" width="1600" height="1200" loading="lazy" decoding="async"><figcaption>${String(i+1).padStart(2,'0')} / ${escape(picture.caption || '作品细节')}</figcaption></figure>`).join('')}</div>`:'<div class="empty-state"><p>更多作品细节待补充。</p></div>'}</section><section class="project-story"><span class="story-number" aria-hidden="true">02</span><div><h2>${escape(data.labels.detailOutcome ?? '创作收获')}</h2><p>${escape(item.outcome || '项目成果与创作感受待补充。')}</p></div></section><nav class="project-pagination" aria-label="继续浏览作品"><a class="return-list" href="${back}">← 返回作品列表</a>${next?`<a class="next-project" href="${escape(workHref(route.page,next.id))}"><span>下一个作品 / NEXT</span><h2>${escape(next.title)}</h2><span aria-hidden="true">→</span></a>`:'<span class="result-count">你已看完这个分类的作品。</span>'}</nav></article>`;
}
function socialLinks() {
  const hosts={linkedin:'linkedin.com',behance:'behance.net',github:'github.com'};
  return Object.entries(hosts).flatMap(([key,host])=>{
    try {
      const url=new URL(data.socials?.[key]);
      if(url.protocol!=='https:' || !(url.hostname===host || url.hostname.endsWith('.'+host)) || url.username || url.password) return [];
      return [`<a href="${escape(url.href)}" target="_blank" rel="noopener noreferrer">${{linkedin:'LinkedIn',behance:'Behance',github:'GitHub'}[key]} ↗</a>`];
    } catch { return []; }
  }).join('');
}
function renderFooter() {
  const labels = data.labels;
  const titleLines=labels.footerTitle.split('\n');
  const footerTitle=titleLines.map((line,i)=>i===titleLines.length-1?`<em>${escape(line)}</em>`:escape(line)).join('<br>');
  document.querySelector('#contact').innerHTML = `<div class="footer-atmosphere" aria-hidden="true"><i class="footer-orbit"></i><i class="footer-star"></i></div><div class="footer-top"><div><p class="eyebrow">${escape(labels.footerEnglish)}</p><h2>${footerTitle}</h2></div>${data.email ? `<a class="contact-circle" href="mailto:${escape(data.email)}">${escape(labels.contact)} <span aria-hidden="true">↗</span></a>` : '<span class="contact-pending">联系方式待补充<small>期待下一次创作与相遇。</small></span>'}</div><div class="footer-links">${data.email?`<a href="mailto:${escape(data.email)}">EMAIL ↗</a>`:''}${socialLinks()}</div><div class="footer-bottom"><span>© ${new Date().getFullYear()} ${escape(data.name)}</span><span>${escape(data.location)}</span><a class="back-top" href="#/" data-back-top>回到首页 ↑</a></div><a class="asset-credit" href="assets/ATTRIBUTION.md" target="_blank" rel="noopener">素材来源与授权 ↗</a>`;
}
function bindImageFallbacks() {
  document.querySelectorAll('.work-image img,.video-feature>img,.project-cover img,.detail-gallery-grid img').forEach(img => img.addEventListener('error', () => { img.replaceWith(Object.assign(document.createElement('div'),{className:'image-unavailable',textContent:'图片暂不可用。'})); },{once:true}));
}
function rememberPosition(focusHref) {
  if (!currentKey) return;
  const position={key:currentKey,y:window.scrollY,focus:focusHref || ''};
  positions.set(currentKey,position);
  if(currentRoute?.kind==='list') {
    listMemory[currentRoute.page]=position;
    try { sessionStorage.setItem('portfolio:list-memory',JSON.stringify(listMemory)); } catch { /* Storage is optional. */ }
  }
}
function render({navigate=false, reset=false}={}) {
  if (!data) return;
  const key=location.hash || '#/';
  const route=readRoute(key), changed=key!==currentKey;
  const oldKey=currentKey;
  currentKey=key;currentRoute=route;
  const page=route.page;
  document.body.dataset.page=page;
  document.body.dataset.titleStyle=data.titleStyle;
  document.body.dataset.textColor=data.textColor;
  document.querySelector('#brand').textContent=data.name;
  document.querySelector('.wordmark').setAttribute('aria-label',`${data.name}，返回首页`);
  for(const [name,label] of Object.entries(pageLabels)) {
    const link=document.querySelector(`.main-nav [data-page="${name}"]`);
    link.textContent=data.labels[label];
    if(name===page)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');
  }
  document.title=`${data.labels[pageLabels[page]] || '页面未找到'} · ${data.name}`;
  home.hidden=route.kind!=='home';pageView.hidden=route.kind==='home';
  if(route.kind==='home') { pageView.replaceChildren(); renderHome(); }
  else if(route.kind==='list')renderList(route);
  else if(route.kind==='detail')renderDetail(route);
  else renderMissing(page);
  renderFooter();bindImageFallbacks();
  if(changed || reset) {
    window.dispatchEvent(new Event('resize'));
    requestAnimationFrame(()=>{
      if(currentKey!==key)return;
      const remembered=!reset && (positions.get(key) || (route.kind==='list' && listMemory[page]?.key===key ? listMemory[page] : null));
      window.scrollTo({top:remembered?.y || 0,behavior:'instant'});
      if(navigate && oldKey) {
        const visibleView=route.kind==='home'?home:pageView;
        const target=remembered?.focus ? [...visibleView.querySelectorAll('.work-card,.video-feature')].find(a=>a.getAttribute('href')===remembered.focus) : null;
        (target || document.querySelector(route.kind==='home'?'#hero-title':'#page-view h1'))?.focus({preventScroll:true});
      }
    });
  }
}
function navigate(href, {reset=false,focusHref}={}) {
  rememberPosition(focusHref);
  if(location.hash!==href)history.pushState(null,'',href);
  render({navigate:true,reset});
}
function notify(message) {
  const toast=document.querySelector('#toast');toast.textContent=message;toast.classList.add('visible');
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('visible'),3800);
}
document.addEventListener('click',event=>{
  if(event.target.closest('.skip-link')) {
    event.preventDefault();
    const main=document.querySelector('main');
    main.focus({preventScroll:true});main.scrollIntoView({behavior:'instant'});
    return;
  }
  const filter=event.target.closest('[data-filter]');
  if(filter && currentRoute?.kind==='list') {
    const href=listHref(currentRoute.page,filter.dataset.filter,currentRoute.search);
    positions.set(href,{y:window.scrollY});
    navigate(href);
    requestAnimationFrame(()=>document.querySelector('.filter-button[aria-pressed="true"]')?.focus({preventScroll:true}));
    return;
  }
  const play=event.target.closest('[data-play-video]');
  if(play && currentRoute?.kind==='detail') {
    const item=data[currentRoute.page].find(item=>item.id===currentRoute.id);
    if(item && /^BV[A-Za-z0-9]{10}$/.test(item.bvid || '')) {play.parentElement.innerHTML=videoPlayer(item);document.querySelector('.project-cover iframe')?.focus();}
    return;
  }
  const link=event.target.closest('a[href^="#/"]');
  if(!link || event.defaultPrevented || event.button!==0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)return;
  event.preventDefault();
  const href=link.getAttribute('href');
  navigate(href,{reset:link.hasAttribute('data-back-top') || link.classList.contains('wordmark'),focusHref:link.matches('.work-card,.video-feature')?href:undefined});
});
document.addEventListener('submit',event=>{
  if(!event.target.matches('.collection-search'))return;
  event.preventDefault();
  const href=listHref(currentRoute.page,currentRoute.filter,new FormData(event.target).get('q'));
  positions.set(href,{y:window.scrollY});navigate(href);
  requestAnimationFrame(()=>document.querySelector('#work-search')?.focus({preventScroll:true}));
});
document.querySelector('.scroll-cue').addEventListener('click',event=>{
  event.preventDefault();document.querySelector('#work').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
});
const onHistory=()=>{if((location.hash||'#/')!==currentKey){rememberPosition();render({navigate:true});}};
window.addEventListener('popstate',onHistory);
window.addEventListener('hashchange',onHistory);
window.addEventListener('pagehide',()=>rememberPosition());

// Only the same-origin local editor can update the preview. The published bundle is static.
window.addEventListener('message',event=>{
  if(event.origin!==siteOrigin || event.source!==window.parent || event.data?.type!=='portfolio:update')return;
  if(event.data.data){data=event.data.data;render();}
  if(event.data.page && readRoute('#'+event.data.page).kind!=='missing')navigate('#'+event.data.page);
});
try {
  const response=await fetch('data.json',{cache:'no-store'});
  if(!response.ok)throw new Error('读取作品内容失败');
  if(!data)data=await response.json();
  render();window.parent.postMessage({type:'portfolio:ready'},siteOrigin);
} catch { notify('作品内容暂时无法读取。请刷新页面重试。'); }
