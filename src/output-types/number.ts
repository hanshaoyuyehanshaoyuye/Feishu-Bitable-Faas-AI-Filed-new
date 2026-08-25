/**
 * 数字输出处理器
 *
 * 策略：
 * 1. 优先尝试直接 parseFloat
 * 2. 失败则从文本中提取第一个数字（兼容带单位、带中文的输出）
 * 3. 都失败返回错误
 */
import type { OutputTypeHandler, ParseResult } from '../types';

export const numberHandler: OutputTypeHandler = {
  getSystemInstruction(): string {
    return '你只能输出一个数字，不要输出任何文字、解释或单位。例如：42';
  },

  parse(rawContent: string): ParseResult {
    const trimmed = rawContent.trim();

    // 1. 直接解析
    const direct = parseFloat(trimmed);
    if (!isNaN(direct) && isFinite(direct)) {
      return { success: true, data: direct };
    }

    // 2. 提取第一个数字（支持负数、小数）
    const match = trimmed.match(/-?\d+(\.\d+)?/);
    if (match) {
      const num = parseFloat(match[0]);
      if (!isNaN(num) && isFinite(num)) {
        return { success: true, data: num };
      }
    }

    return {
      success: false,
      errorMsg: `无法从AI返回中提取数字: ${trimmed.slice(0, 100)}`,
    };
  },
};
