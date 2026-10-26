import { readFile } from 'node:fs/promises';
import { isSocialUrl } from '../workshop/utils.js';

export const root = new URL('../', import.meta.url);
export const contentPath = new URL('content/site.json', root);
export async function readContent() {
  return JSON.parse(await readFile(contentPath, 'utf8'));
}
const styles = ['editorial', 'modern', 'minimal'];
const colors = ['burgundy', 'ink', 'clay'];
export const labelKeys = [
  'navHome', 'navImages', 'navVideos', 'navAds',
  'imageSection', 'imageEnglish', 'adSection', 'adEnglish',
  'imagesTitle', 'imagesIntro', 'videosTitle', 'videosIntro', 'adsTitle', 'adsIntro',
  'footerTitle', 'footerEnglish', 'contact', 'explore', 'viewAll', 'watch',
  'heroCaption', 'selectedTitle', 'selectedIntro', 'videoSection', 'videoEnglish',
];
export const optionalLabelKeys = ['detailOverview', 'detailSummary', 'detailProcess', 'detailGallery', 'detailOutcome'];
export function validateContent(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('内容格式不正确');
  for (const key of ['name', 'role', 'title', 'intro', 'email', 'location']) {
    if (typeof data[key] !== 'string' || data[key].length > 2000) throw new Error('文字内容格式不正确');
  }
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) throw new Error('请填写有效的联系邮箱，或留空');
  if (data.socials !== undefined) {
    if (!data.socials || typeof data.socials !== 'object' || Array.isArray(data.socials)
      || Object.entries(data.socials).some(([key, value]) => !isSocialUrl(key, value))) {
      throw new Error('社交链接请填写对应 LinkedIn、Behance 或 GitHub 官网的 https:// 地址，或留空');
    }
  }
  if (!styles.includes(data.titleStyle) || !colors.includes(data.textColor)) throw new Error('文字样式不正确');
  if (!data.labels || labelKeys.some(key => typeof data.labels[key] !== 'string' || data.labels[key].length > (key.startsWith('nav') ? 12 : 2000))) {
    throw new Error('全站文字格式不正确（导航最多 12 字）');
  }
  if (optionalLabelKeys.some(key => data.labels[key] !== undefined && (typeof data.labels[key] !== 'string' || data.labels[key].length > 2000))) {
    throw new Error('作品详情分区文字格式不正确，最多 2000 字');
  }
  const ids = new Set();
  for (const category of ['images', 'videos', 'ads']) {
    if (!Array.isArray(data[category]) || data[category].length > 100) throw new Error('作品列表格式不正确');
    for (const item of data[category]) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('作品内容格式不正确');
      for (const key of ['id', 'title', 'category', 'year', 'description', 'image']) {
        if (typeof item[key] !== 'string' || item[key].length > 2000) throw new Error('作品内容格式不正确');
      }
      if (!item.id || ids.has(item.id)) throw new Error('每个作品需要唯一编号');
      ids.add(item.id);
      if (item.image && !/^media\/[a-f0-9-]+\.webp$/.test(item.image)) throw new Error('请通过本地上传选择图片');
      for (const [key, limit] of [['role', 300], ['process', 12000], ['outcome', 6000]]) {
        if (item[key] !== undefined && (typeof item[key] !== 'string' || item[key].length > limit)) {
          throw new Error(`作品详情 ${key} 格式不正确，最多 ${limit} 字`);
        }
      }
      if (item.gallery !== undefined) {
        if (!Array.isArray(item.gallery) || item.gallery.length > 12) throw new Error('每件作品的详情图库最多支持 12 张图片');
        for (const picture of item.gallery) {
          if (!picture || typeof picture !== 'object' || Array.isArray(picture)
            || typeof picture.image !== 'string' || !/^media\/[a-f0-9-]+\.webp$/.test(picture.image)) {
            throw new Error('详情图库请通过本地上传选择图片');
          }
          if (typeof picture.caption !== 'string' || picture.caption.length > 500) throw new Error('图库图片说明最多 500 字，可留空');
        }
      }
      if (category === 'videos' && (typeof item.bvid !== 'string' || (item.bvid !== '' && !/^BV[A-Za-z0-9]{10}$/.test(item.bvid)))) {
        throw new Error('请填写正确的 BV 编号');
      }
    }
  }
  return data;
}
