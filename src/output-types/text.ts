/**
 * 文本输出处理器
 */
import type { OutputTypeHandler, ParseResult } from '../types';

export const textHandler: OutputTypeHandler = {
  getSystemInstruction(): string {
    return ''; // 文本类型无需特殊指令
  },

  parse(rawContent: string): ParseResult {
    return {
      success: true,
      data: rawContent.trim(),
    };
  },
};
