export const categories = ['images', 'videos', 'ads'];

export function readRoute(hash = '') {
  const [path, query = ''] = hash.replace(/^#/, '').split('?');
  if (!path || path === '/' || ['main', 'work', 'transition'].includes(path)) return { page: 'home', kind: 'home' };
  const parts = path.split('/');
  if (parts[0] !== '' || !categories.includes(parts[1]) || parts.length > 3) return { page: 'missing', kind: 'missing' };
  const params = new URLSearchParams(query);
  if (parts.length === 2) return { page: parts[1], kind: 'list', filter: params.get('category') || '', search: params.get('q') || '' };
  try {
    const id = decodeURIComponent(parts[2]);
    return id ? { page: parts[1], kind: 'detail', id } : { page: parts[1], kind: 'missing' };
  } catch { return { page: parts[1], kind: 'missing' }; }
}

export function workHref(category, id) { return `#/${category}/${encodeURIComponent(id)}`; }
export function listHref(category, filter = '', search = '') {
  const params = new URLSearchParams();
  if (filter) params.set('category', filter);
  if (search.trim()) params.set('q', search.trim());
  return `#/${category}${params.size ? '?' + params : ''}`;
}
export function filterWorks(items, filter = '', search = '') {
  const query = search.trim().toLocaleLowerCase();
  return items.filter(item => (!filter || item.category === filter) && (!query || `${item.title} ${item.category} ${item.description}`.toLocaleLowerCase().includes(query)));
}
