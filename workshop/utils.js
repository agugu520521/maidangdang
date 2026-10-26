export function extractBvid(value) {
  const trimmed = value.trim();
  if (/^BV[A-Za-z0-9]{10}$/.test(trimmed)) return trimmed;
  try {
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : 'https://' + trimmed);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    if (url.hostname !== 'bilibili.com' && !url.hostname.endsWith('.bilibili.com')) return null;
    return url.pathname.match(/^\/video\/(BV[A-Za-z0-9]{10})(?:\/|$)/)?.[1] || null;
  } catch { return null; }
}

export function isSocialUrl(kind, value) {
  const domains = { linkedin: 'linkedin.com', behance: 'behance.net', github: 'github.com' };
  if (!Object.hasOwn(domains, kind) || typeof value !== 'string' || value.length > 2000) return false;
  if (value === '') return true;
  try {
    const url = new URL(value);
    return value === value.trim() && url.protocol === 'https:' && !url.username && !url.password && !url.port
      && [domains[kind], 'www.' + domains[kind]].includes(url.hostname);
  } catch { return false; }
}
