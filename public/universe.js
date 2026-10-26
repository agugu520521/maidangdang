import { mountPlanetScene } from './planet-scene.js';

const root = document.documentElement;
const hero = document.querySelector('.hero');
const scene = document.querySelector('.cosmos');
const canvas = document.querySelector('#planet-canvas');
const motionButton = document.querySelector('.motion-toggle');
const menuButton = document.querySelector('.menu-toggle');
const nav = document.querySelector('#main-nav');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
let manuallyPaused = false;
let planet = null;
let frame = 0;
let heroVisible = true;
let scrollDirty = true;
let pointerX = 0;
let pointerY = 0;
let easedX = 0;
let easedY = 0;
let disposed = false;

// Deterministic, sparse stars: no downloads, no fast particles, no full-screen nebula.
let seed = 281019;
function random() { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; }
const stars = document.createDocumentFragment();
for (let i = 0; i < 73; i++) {
  const star = document.createElement('i');
  const bright = i % 19 === 0;
  star.className = `star${bright ? ' star--bright' : ''}`;
  star.style.cssText = `left:${(random() * 100).toFixed(2)}%;top:${(random() * 100).toFixed(2)}%;--size:${bright ? 1.8 : .55 + random() * .8}px;--opacity:${(.17 + random() * .42).toFixed(2)};--duration:${(5 + random() * 8).toFixed(1)}s;--delay:-${(random() * 12).toFixed(1)}s`;
  stars.append(star);
}
document.querySelector('#starfield').append(stars);

const clamp = (n, low = 0, high = 1) => Math.max(low, Math.min(high, n));
const smooth = (a, b, n) => { const t = clamp((n - a) / (b - a)); return t * t * (3 - 2 * t); };
function isPaused() { return manuallyPaused || reduceMotion.matches; }

function updateMotion() {
  const paused = isPaused();
  root.classList.toggle('motion-paused', paused);
  motionButton.setAttribute('aria-pressed', String(paused));
  motionButton.disabled = reduceMotion.matches;
  const label = reduceMotion.matches ? '遵循系统设置：已减少动态效果' : paused ? '开启场景动态' : '暂停场景动态';
  motionButton.setAttribute('aria-label', label);
  motionButton.title = label;
  planet?.setPaused?.(paused);
  scrollDirty = true;
  requestTick();
}

function renderFrame() {
  frame = 0;
  if (disposed || document.hidden) return;
  if (scrollDirty) {
    const progress = clamp(scrollY / (hero.offsetHeight || innerHeight), 0, 1.5);
    if (isPaused()) {
      root.style.setProperty('--scene-opacity', '1');
      root.style.setProperty('--scene-y', '0px');
      root.style.setProperty('--copy-opacity', '1');
      document.querySelector('.dark-curtain').style.opacity = '1';
    } else {
      root.style.setProperty('--scene-opacity', (1 - smooth(.16, 1.03, progress)).toFixed(4));
      root.style.setProperty('--scene-y', `${(progress * 65).toFixed(2)}px`);
      root.style.setProperty('--copy-opacity', (1 - smooth(.23, .67, progress)).toFixed(4));
      document.querySelector('.dark-curtain').style.opacity = (1 - smooth(.7, 1.3, progress) * .45).toFixed(4);
    }
    planet?.setScroll?.(progress);
    scrollDirty = false;
  }
  const animatePointer = heroVisible && !isPaused() && finePointer.matches;
  const targetX = animatePointer ? pointerX : 0;
  const targetY = animatePointer ? pointerY : 0;
  easedX += (targetX - easedX) * .055;
  easedY += (targetY - easedY) * .055;
  root.style.setProperty('--px', `${(easedX * 9).toFixed(3)}px`);
  root.style.setProperty('--py', `${(easedY * 6).toFixed(3)}px`);
  root.style.setProperty('--rose-x', `${(easedX * 15).toFixed(3)}px`);
  root.style.setProperty('--rose-y', `${(easedY * 10).toFixed(3)}px`);
  if (Math.abs(targetX - easedX) + Math.abs(targetY - easedY) > .001) requestTick();
}
function requestTick() { if (!frame && !disposed) frame = requestAnimationFrame(renderFrame); }
function onScroll() { scrollDirty = true; requestTick(); }
function onPointer(event) {
  if (!finePointer.matches || isPaused() || !heroVisible) return;
  pointerX = (event.clientX / innerWidth - .5) * 2;
  pointerY = (event.clientY / innerHeight - .5) * 2;
  requestTick();
}
function onLeave() { pointerX = 0; pointerY = 0; requestTick(); }
function onVisibility() { if (!document.hidden) { scrollDirty = true; requestTick(); } }

function closeMenu(returnFocus = false) {
  nav.classList.remove('is-open');
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-label', '打开导航菜单');
  if (returnFocus) menuButton.focus();
}
function toggleMenu() {
  const open = menuButton.getAttribute('aria-expanded') !== 'true';
  nav.classList.toggle('is-open', open);
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? '关闭导航菜单' : '打开导航菜单');
  if (open) nav.querySelector('a')?.focus();
}
function onKey(event) {
  if (!nav.classList.contains('is-open')) return;
  if (event.key === 'Escape') { event.preventDefault(); closeMenu(true); }
  if (event.key === 'Tab') {
    const links = [...nav.querySelectorAll('a')];
    const first = links[0];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); menuButton.focus(); }
    else if (!event.shiftKey && document.activeElement === menuButton) { event.preventDefault(); first?.focus(); }
  }
}
function onOutside(event) { if (!nav.contains(event.target) && !menuButton.contains(event.target)) closeMenu(); }
function onResize() { if (innerWidth > 640) closeMenu(); onScroll(); }
function toggleMotion() { manuallyPaused = !isPaused(); updateMotion(); }

menuButton.addEventListener('click', toggleMenu);
motionButton.addEventListener('click', toggleMotion);
nav.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
document.addEventListener('keydown', onKey);
document.addEventListener('click', onOutside);
window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('pointermove', onPointer, { passive: true });
document.documentElement.addEventListener('pointerleave', onLeave);
window.addEventListener('resize', onResize, { passive: true });
document.addEventListener('visibilitychange', onVisibility);
reduceMotion.addEventListener('change', updateMotion);
const observer = new IntersectionObserver(([entry]) => {
  heroVisible = entry.isIntersecting;
  scene.style.visibility = heroVisible ? 'visible' : 'hidden';
  root.classList.toggle('hero-offscreen', !heroVisible);
  if (!heroVisible) onLeave();
  else { scrollDirty = true; requestTick(); }
}, { rootMargin: '40px' });
observer.observe(hero);

// Failed optional photography never leaves a broken-image icon in the composition.
document.querySelectorAll('.cosmos img').forEach(img => {
  img.addEventListener('error', () => { img.style.visibility = 'hidden'; });
});
updateMotion();
try {
  planet = await mountPlanetScene(canvas, { hero, textureUrl: 'assets/planet-texture.webp', reducedMotion: reduceMotion.matches });
  updateMotion();
} catch (error) {
  canvas.dataset.failed = 'true';
  console.info('静态宇宙场景已启用。');
}

window.addEventListener('pagehide', event => {
  if (event.persisted) return;
  disposed = true;
  cancelAnimationFrame(frame);
  observer.disconnect();
  planet?.dispose();
  window.removeEventListener('scroll', onScroll);
  window.removeEventListener('pointermove', onPointer);
  window.removeEventListener('resize', onResize);
  document.documentElement.removeEventListener('pointerleave', onLeave);
  document.removeEventListener('visibilitychange', onVisibility);
  document.removeEventListener('keydown', onKey);
  document.removeEventListener('click', onOutside);
  reduceMotion.removeEventListener('change', updateMotion);
});
