/**
 * 日期时间输出处理器
 *
 * 策略：
 * 1. 直接 Date.parse
 * 2. 提取 YYYY-MM-DD / YYYY年MM月DD日 等格式
 * 3. 仅提取到年月日的，补 T00:00:00Z
 */
import type { OutputTypeHandler, ParseResult } from '../types';

function parseDirect(s: string): Date | null {
  // 只接受明确带时区或 ISO 8601 完整格式的字符串
  // 避免本地时区导致的日期偏移
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s)) {
    const ts = Date.parse(s);
    if (!isNaN(ts)) return new Date(ts);
  }
  return null;
}

const DATE_PATTERNS = [
  // 2025-08-01 / 2025/08/01
  /(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/,
  // 2025年8月1日
  /(\d{4})年(\d{1,2})月(\d{1,2})日/,
  // 2025.08.01
  /(\d{4})\.(\d{1,2})\.(\d{1,2})/,
];

function parseFromPatterns(s: string): Date | null {
  for (const re of DATE_PATTERNS) {
    const m = s.match(re);
    if (m) {
      const [, y, mo, d] = m;
      const date = new Date(`${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}T00:00:00Z`);
      if (!isNaN(date.getTime())) return date;
    }
  }
  return null;
}

export const datetimeHandler: OutputTypeHandler = {
  getSystemInstruction(): string {
    return '你只能输出一个日期，格式为 YYYY-MM-DD（如 2025-08-01）。如果同时有时间，输出 YYYY-MM-DD HH:mm。不要输出任何解释文字。';
  },

  parse(rawContent: string): ParseResult {
    const trimmed = rawContent.trim();

    // 1. 直接解析
    let date = parseDirect(trimmed);
    if (date) {
      return { success: true, data: date.toISOString() };
    }

    // 2. 从文本中提取日期模式
    date = parseFromPatterns(trimmed);
    if (date) {
      return { success: true, data: date.toISOString() };
    }

    return {
      success: false,
      errorMsg: `无法解析日期: ${trimmed.slice(0, 100)}`,
    };
  },
};
