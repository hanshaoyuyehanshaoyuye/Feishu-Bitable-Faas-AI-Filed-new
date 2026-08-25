/**
 * 缓存工具单元测试
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { TTLCache, hashCacheKey } from '../src/utils/cache';

test('TTLCache: 基本 set/get', () => {
  const cache = new TTLCache<string, number>(1000);
  cache.set('a', 1);
  assert.equal(cache.get('a'), 1);
  assert.equal(cache.size, 1);
});

test('TTLCache: 未命中返回 undefined', () => {
  const cache = new TTLCache<string, number>(1000);
  assert.equal(cache.get('nonexistent'), undefined);
});

test('TTLCache: has() 方法', () => {
  const cache = new TTLCache<string, number>(1000);
  assert.equal(cache.has('x'), false);
  cache.set('x', 42);
  assert.equal(cache.has('x'), true);
});

test('TTLCache: TTL 过期后返回 undefined', async () => {
  const cache = new TTLCache<string, number>(10); // 10ms TTL
  cache.set('k', 100);
  assert.equal(cache.get('k'), 100);
  await new Promise(r => setTimeout(r, 50));
  assert.equal(cache.get('k'), undefined);
});

test('TTLCache: clear() 清空所有', () => {
  const cache = new TTLCache<string, number>(1000);
  cache.set('a', 1);
  cache.set('b', 2);
  assert.equal(cache.size, 2);
  cache.clear();
  assert.equal(cache.size, 0);
  assert.equal(cache.get('a'), undefined);
});

test('TTLCache: maxSize 限制，超量自动清理', () => {
  const cache = new TTLCache<string, number>(10000, 10);
  for (let i = 0; i < 10; i++) {
    cache.set(`key${i}`, i);
  }
  assert.equal(cache.size, 10);
  // 第 11 个触发清理
  cache.set('key10', 10);
  assert.ok(cache.size <= 10);
  // 清理后还能正常 get
  assert.equal(cache.get('key10'), 10);
});

test('TTLCache: 覆盖已有 key', () => {
  const cache = new TTLCache<string, number>(1000);
  cache.set('x', 1);
  cache.set('x', 2);
  assert.equal(cache.get('x'), 2);
  assert.equal(cache.size, 1);
});

test('hashCacheKey: 相同输入产生相同 hash', () => {
  const obj1 = { a: 1, b: ['x', 'y'] };
  const obj2 = { a: 1, b: ['x', 'y'] };
  assert.equal(hashCacheKey(obj1), hashCacheKey(obj2));
});

test('hashCacheKey: 不同输入产生不同 hash', () => {
  const h1 = hashCacheKey({ model: 'gpt-4', prompt: 'hello' });
  const h2 = hashCacheKey({ model: 'gpt-4', prompt: 'world' });
  assert.notEqual(h1, h2);
});

test('hashCacheKey: 返回字符串', () => {
  const h = hashCacheKey({ test: true });
  assert.equal(typeof h, 'string');
  assert.ok(h.length > 0);
});
