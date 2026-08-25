/**
 * 配额管理单元测试
 */
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { checkAndConsumeQuota, getQuotaState, _resetAllQuotas } from '../src/core/quota';
import type { QuotaConfig } from '../src/core/quota';

beforeEach(() => {
  _resetAllQuotas();
});

const UNLIMITED: QuotaConfig = { maxPerMinute: 0, maxPerDay: 0 };
const RATE_ONLY: QuotaConfig = { maxPerMinute: 3, maxPerDay: 0 };
const DAILY_ONLY: QuotaConfig = { maxPerMinute: 0, maxPerDay: 5 };
const BOTH: QuotaConfig = { maxPerMinute: 2, maxPerDay: 10 };

test('配额: 无限制配置始终允许', () => {
  for (let i = 0; i < 100; i++) {
    const r = checkAndConsumeQuota('tenant-a', UNLIMITED);
    assert.equal(r.allowed, true);
  }
});

test('配额: 速率限制 - 次数内允许', () => {
  for (let i = 0; i < 3; i++) {
    const r = checkAndConsumeQuota('tenant-a', RATE_ONLY);
    assert.equal(r.allowed, true, `第 ${i + 1} 次应该允许`);
  }
});

test('配额: 速率限制 - 超出拒绝', () => {
  for (let i = 0; i < 3; i++) {
    checkAndConsumeQuota('tenant-a', RATE_ONLY);
  }
  const r = checkAndConsumeQuota('tenant-a', RATE_ONLY);
  assert.equal(r.allowed, false);
  assert.equal(r.reason, 'rate_limit');
});

test('配额: 速率限制 - 不同租户独立计数', () => {
  // t1 用满 3 次
  for (let i = 0; i < 3; i++) checkAndConsumeQuota('t1', RATE_ONLY);
  // t2 还能继续
  const r = checkAndConsumeQuota('t2', RATE_ONLY);
  assert.equal(r.allowed, true);
});

test('配额: 每日配额 - 次数内允许', () => {
  for (let i = 0; i < 5; i++) {
    const r = checkAndConsumeQuota('tenant-a', DAILY_ONLY);
    assert.equal(r.allowed, true, `第 ${i + 1} 次应该允许`);
  }
});

test('配额: 每日配额 - 超出拒绝', () => {
  for (let i = 0; i < 5; i++) checkAndConsumeQuota('t', DAILY_ONLY);
  const r = checkAndConsumeQuota('t', DAILY_ONLY);
  assert.equal(r.allowed, false);
  assert.equal(r.reason, 'daily_quota');
});

test('配额: 双重限制 - 速率先触发', () => {
  // 2 次内通过，第 3 次触发速率（不是每日）
  checkAndConsumeQuota('t', BOTH);
  checkAndConsumeQuota('t', BOTH);
  const r = checkAndConsumeQuota('t', BOTH);
  assert.equal(r.allowed, false);
  assert.equal(r.reason, 'rate_limit');
});

test('配额: remaining 返回剩余次数', () => {
  const r1 = checkAndConsumeQuota('t', DAILY_ONLY);
  assert.equal(r1.allowed, true);
  assert.equal(r1.remaining, 4); // 5 - 1

  const r2 = checkAndConsumeQuota('t', DAILY_ONLY);
  assert.equal(r2.remaining, 3);
});

test('配额: 无限制配置 remaining 为 undefined', () => {
  const r = checkAndConsumeQuota('t', UNLIMITED);
  assert.equal(r.remaining, undefined);
});

test('配额: getQuotaState 只读不消耗', () => {
  const before = getQuotaState('t', DAILY_ONLY);
  assert.equal(before.dayCount, 0);

  checkAndConsumeQuota('t', DAILY_ONLY);

  const after = getQuotaState('t', DAILY_ONLY);
  assert.equal(after.dayCount, 1);
  assert.equal(after.maxPerDay, 5);
});

test('配额: resetAt 存在且为未来时间戳', () => {
  for (let i = 0; i < 3; i++) checkAndConsumeQuota('t', RATE_ONLY);
  const r = checkAndConsumeQuota('t', RATE_ONLY);
  assert.equal(r.allowed, false);
  assert.ok(typeof r.resetAt === 'number');
  assert.ok(r.resetAt! > Date.now() - 1000); // 允许 1s 误差
});
