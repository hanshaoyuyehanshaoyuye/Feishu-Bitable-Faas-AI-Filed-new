/**
 * 输出类型解析器单元测试
 *
 * 覆盖 6 种 output type 的 parse 逻辑
 * 运行：npx tsx test/output-types.test.ts  或  tsc && node dist/test/...
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { textHandler } from '../src/output-types/text';
import { numberHandler } from '../src/output-types/number';
import { singleSelectHandler } from '../src/output-types/single-select';
import { multiSelectHandler } from '../src/output-types/multi-select';
import { datetimeHandler } from '../src/output-types/datetime';
import { objectHandler } from '../src/output-types/object';

// ============================================================
// Text
// ============================================================
test('textHandler: 去除首尾空白', () => {
  const r = textHandler.parse('  hello world  ', []);
  assert.equal(r.success, true);
  assert.equal(r.data, 'hello world');
});

test('textHandler: 空字符串', () => {
  const r = textHandler.parse('   ', []);
  assert.equal(r.success, true);
  assert.equal(r.data, '');
});

test('textHandler: getSystemInstruction 返回空', () => {
  const instr = textHandler.getSystemInstruction([]);
  assert.equal(typeof instr, 'string');
  // text 类型无特殊格式要求，指令简短
  assert.ok(instr.length < 100);
});

// ============================================================
// Number
// ============================================================
test('numberHandler: 纯数字', () => {
  const r = numberHandler.parse('42', []);
  assert.equal(r.success, true);
  assert.equal(r.data, 42);
});

test('numberHandler: 小数', () => {
  const r = numberHandler.parse('3.14', []);
  assert.equal(r.success, true);
  assert.equal(r.data, 3.14);
});

test('numberHandler: 带单位和文字（提取第一个数字）', () => {
  const r = numberHandler.parse('总价是 1234.56 元', []);
  assert.equal(r.success, true);
  assert.equal(r.data, 1234.56);
});

test('numberHandler: 负数', () => {
  const r = numberHandler.parse('-99.5', []);
  assert.equal(r.success, true);
  assert.equal(r.data, -99.5);
});

test('numberHandler: 百分号数字', () => {
  const r = numberHandler.parse('增长率：85.3%', []);
  assert.equal(r.success, true);
  assert.equal(r.data, 85.3);
});

test('numberHandler: 无数字返回错误', () => {
  const r = numberHandler.parse('没有数字的文本', []);
  assert.equal(r.success, false);
  assert.ok(r.errorMsg);
});

test('numberHandler: getSystemInstruction 包含数字格式要求', () => {
  const instr = numberHandler.getSystemInstruction([]);
  assert.ok(instr.includes('数字'));
});

// ============================================================
// Single Select
// ============================================================
const EMOTION_OPTIONS = ['正面', '中性', '负面'];

test('singleSelectHandler: 精确匹配', () => {
  const r = singleSelectHandler.parse('正面', EMOTION_OPTIONS);
  assert.equal(r.success, true);
  assert.equal(r.data, '正面');
});

test('singleSelectHandler: 去除编号前缀 "1. "', () => {
  const r = singleSelectHandler.parse('2. 中性', EMOTION_OPTIONS);
  assert.equal(r.success, true);
  assert.equal(r.data, '中性');
});

test('singleSelectHandler: 去除编号 "1) "', () => {
  const r = singleSelectHandler.parse('3) 负面', EMOTION_OPTIONS);
  assert.equal(r.success, true);
  assert.equal(r.data, '负面');
});

test('singleSelectHandler: 带前后文本', () => {
  const r = singleSelectHandler.parse('分析结果：正面情绪', EMOTION_OPTIONS);
  assert.equal(r.success, true);
  assert.equal(r.data, '正面');
});

test('singleSelectHandler: 模糊匹配（选项包含在文本中）', () => {
  const r = singleSelectHandler.parse('整体来看偏负面一些', EMOTION_OPTIONS);
  assert.equal(r.success, true);
  assert.equal(r.data, '负面');
});

test('singleSelectHandler: 完全不匹配返回原值（容错，由飞书校验）', () => {
  const r = singleSelectHandler.parse('不知道说啥', EMOTION_OPTIONS);
  assert.equal(r.success, true);
  assert.equal(r.data, '不知道说啥');
});

test('singleSelectHandler: 空选项列表返回清理后的值', () => {
  const r = singleSelectHandler.parse('1. hello', []);
  assert.equal(r.success, true);
  assert.equal(r.data, 'hello');
});

test('singleSelectHandler: getSystemInstruction 列出选项', () => {
  const instr = singleSelectHandler.getSystemInstruction(EMOTION_OPTIONS);
  assert.ok(instr.includes('正面'));
  assert.ok(instr.includes('只能选择一个'));
});

// ============================================================
// Multi Select
// ============================================================
const TAG_OPTIONS = ['科技', '财经', '体育', '娱乐', '教育'];

test('multiSelectHandler: 换行分隔', () => {
  const r = multiSelectHandler.parse('科技\n体育\n教育', TAG_OPTIONS);
  assert.equal(r.success, true);
  assert.deepEqual(r.data, ['科技', '体育', '教育']);
});

test('multiSelectHandler: 中文逗号分隔', () => {
  const r = multiSelectHandler.parse('科技、财经、娱乐', TAG_OPTIONS);
  assert.equal(r.success, true);
  assert.deepEqual(r.data, ['科技', '财经', '娱乐']);
});

test('multiSelectHandler: 英文逗号分隔', () => {
  const r = multiSelectHandler.parse('科技, 体育,教育', TAG_OPTIONS);
  assert.equal(r.success, true);
  assert.deepEqual(r.data, ['科技', '体育', '教育']);
});

test('multiSelectHandler: 分号分隔', () => {
  const r = multiSelectHandler.parse('科技;财经;体育', TAG_OPTIONS);
  assert.equal(r.success, true);
  assert.deepEqual(r.data, ['科技', '财经', '体育']);
});

test('multiSelectHandler: 过滤不在选项中的值', () => {
  const r = multiSelectHandler.parse('科技、不存在的、体育、xxx', TAG_OPTIONS);
  assert.equal(r.success, true);
  assert.deepEqual(r.data, ['科技', '体育']);
});

test('multiSelectHandler: 去重', () => {
  const r = multiSelectHandler.parse('科技、科技、教育、科技', TAG_OPTIONS);
  assert.equal(r.success, true);
  assert.deepEqual(r.data, ['科技', '教育']);
});

test('multiSelectHandler: 带编号前缀', () => {
  const r = multiSelectHandler.parse('1. 科技\n2. 财经\n3. 体育', TAG_OPTIONS);
  assert.equal(r.success, true);
  assert.deepEqual(r.data, ['科技', '财经', '体育']);
});

test('multiSelectHandler: 全部不在选项中返回空数组（容错）', () => {
  const r = multiSelectHandler.parse('xxx、yyy', TAG_OPTIONS);
  assert.equal(r.success, true);
  assert.deepEqual(r.data, []);
});

test('multiSelectHandler: getSystemInstruction 包含多选说明', () => {
  const instr = multiSelectHandler.getSystemInstruction(TAG_OPTIONS);
  assert.ok(instr.includes('选择一个或多个'));
});

// ============================================================
// DateTime
// ============================================================
test('datetimeHandler: YYYY-MM-DD 标准格式', () => {
  const r = datetimeHandler.parse('2024-06-15', []);
  assert.equal(r.success, true);
  const d = new Date(r.data as number);
  assert.equal(d.getUTCFullYear(), 2024);
  assert.equal(d.getUTCMonth(), 5); // 0-indexed: June = 5
  assert.equal(d.getUTCDate(), 15);
});

test('datetimeHandler: 中文年月日', () => {
  const r = datetimeHandler.parse('2024年3月8日', []);
  assert.equal(r.success, true);
  const d = new Date(r.data as number);
  assert.equal(d.getUTCFullYear(), 2024);
  assert.equal(d.getUTCMonth(), 2);
  assert.equal(d.getUTCDate(), 8);
});

test('datetimeHandler: 点号分隔', () => {
  const r = datetimeHandler.parse('2024.12.25', []);
  assert.equal(r.success, true);
  const d = new Date(r.data as number);
  assert.equal(d.getUTCFullYear(), 2024);
  assert.equal(d.getUTCMonth(), 11);
  assert.equal(d.getUTCDate(), 25);
});

test('datetimeHandler: 从文本中提取日期', () => {
  const r = datetimeHandler.parse('订单日期：2024-07-01，已发货', []);
  assert.equal(r.success, true);
  const d = new Date(r.data as number);
  assert.equal(d.getUTCFullYear(), 2024);
  assert.equal(d.getUTCMonth(), 6);
  assert.equal(d.getUTCDate(), 1);
});

test('datetimeHandler: 无效日期返回错误', () => {
  const r = datetimeHandler.parse('不是日期的文本', []);
  assert.equal(r.success, false);
});

test('datetimeHandler: getSystemInstruction 包含日期格式', () => {
  const instr = datetimeHandler.getSystemInstruction([]);
  assert.ok(instr.includes('日期'));
});

// ============================================================
// Object
// ============================================================
test('objectHandler: 标准 JSON', () => {
  const r = objectHandler.parse('{"name": "test", "value": 123}', []);
  assert.equal(r.success, true);
  assert.deepEqual(r.data, { name: 'test', value: 123 });
});

test('objectHandler: 带 markdown 代码块包裹', () => {
  const r = objectHandler.parse('```json\n{"key": "val"}\n```', []);
  assert.equal(r.success, true);
  assert.deepEqual(r.data, { key: 'val' });
});

test('objectHandler: 带语言标识的代码块', () => {
  const r = objectHandler.parse('```\n{"a": 1}\n```', []);
  assert.equal(r.success, true);
  assert.deepEqual(r.data, { a: 1 });
});

test('objectHandler: 前后有说明文字 + 代码块', () => {
  const r = objectHandler.parse('好的，这是结果：\n```json\n{"result": "ok"}\n```\n希望对你有帮助', []);
  assert.equal(r.success, true);
  assert.deepEqual(r.data, { result: 'ok' });
});

test('objectHandler: 无效 JSON 返回 raw 包装', () => {
  const r = objectHandler.parse('这不是 JSON', []);
  // 不严格失败，而是包装为 { raw: "..." }
  assert.equal(r.success, true);
  assert.equal(typeof r.data, 'object');
  assert.equal((r.data as any).raw, '这不是 JSON');
});

test('objectHandler: JSON 数组', () => {
  const r = objectHandler.parse('[1, 2, 3]', []);
  assert.equal(r.success, true);
  assert.deepEqual(r.data, [1, 2, 3]);
});

test('objectHandler: getSystemInstruction 包含 JSON 说明', () => {
  const instr = objectHandler.getSystemInstruction([]);
  assert.ok(instr.toLowerCase().includes('json'));
});

// ============================================================
// 边界：所有 handler 的 getSystemInstruction 都是非空字符串
// ============================================================
test('所有 handler 的 getSystemInstruction 返回字符串', () => {
  const handlers = [textHandler, numberHandler, singleSelectHandler, multiSelectHandler, datetimeHandler, objectHandler];
  for (const h of handlers) {
    const instr = h.getSystemInstruction(['选项A', '选项B']);
    assert.equal(typeof instr, 'string', '返回类型必须是 string');
  }
  // text 类型允许返回空字符串（无特殊格式要求）
  assert.equal(textHandler.getSystemInstruction([]).length, 0);
  // 其他类型必须返回非空指令
  assert.ok(numberHandler.getSystemInstruction([]).length > 0);
  assert.ok(singleSelectHandler.getSystemInstruction(['a']).length > 0);
  assert.ok(multiSelectHandler.getSystemInstruction(['a']).length > 0);
  assert.ok(datetimeHandler.getSystemInstruction([]).length > 0);
  assert.ok(objectHandler.getSystemInstruction([]).length > 0);
});
