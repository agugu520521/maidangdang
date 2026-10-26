import test from 'node:test';
import assert from 'node:assert/strict';
import {readRoute, workHref, listHref, filterWorks} from '../public/routes.js';

test('作品永久地址保留稳定编号，编码中文和分隔符，拒绝无效地址', () => {
  const id = '山野 / 2026?#';
  assert.deepEqual(readRoute(workHref('images',id)), {page:'images',kind:'detail',id});
  for (const hash of ['#/unknown', '#/images/a/b', '#/images/%zz', '#/images/']) assert.equal(readRoute(hash).kind,'missing');
  assert.equal(readRoute('#/ads/ad-1').kind,'detail');
  assert.equal(readRoute('#/').kind,'home');
});
test('分类与关键词可组合，条件在网址中往返还原，无结果返回空数组', () => {
  const items=[{title:'山野',category:'摄影 & 自然',description:'日落'},{title:'城市',category:'摄影 & 自然',description:'晨光'},{title:'海报',category:'设计',description:'日落'}];
  const route=readRoute(listHref('images','摄影 & 自然','日落'));
  assert.equal(route.filter,'摄影 & 自然');assert.equal(route.search,'日落');
  assert.deepEqual(filterWorks(items,route.filter,route.search),[items[0]]);
  assert.deepEqual(filterWorks(items,'设计','晨光'),[]);
  assert.equal(filterWorks(items).length,3);
});
