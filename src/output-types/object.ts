/**
 * 对象（JSON）输出处理器
 *
 * 策略：
 * 1. 去除 ```json ... ``` 代码块包裹
 * 2. 去除 ``` ... ``` 通用包裹
 * 3. JSON.parse
 * 4. 失败则降级返回 { raw: "原始文本" }
 */
import type { OutputTypeHandler, ParseResult } from '../types';

function extractJsonBody(text: string): string {
  const trimmed = text.trim();

  // ```json ... ```
  const jsonFence = trimmed.match(/```json\s*([\s\S]*?)\s*```/i);
  if (jsonFence) return jsonFence[1].trim();

  // ``` ... ```
  const genericFence = trimmed.match(/```\s*([\s\S]*?)\s*```/);
  if (genericFence) return genericFence[1].trim();

  return trimmed;
}

export const objectHandler: OutputTypeHandler = {
  getSystemInstruction(): string {
    return '你只能输出一个 JSON 对象。不要输出解释、说明文字。如果用代码块包裹，请使用 ```json 标记。';
  },

  parse(rawContent: string): ParseResult {
    const jsonStr = extractJsonBody(rawContent);

    try {
      const obj = JSON.parse(jsonStr);
      return { success: true, data: obj };
    } catch {
      // 降级：返回原始文本，避免完全失败
      return {
        success: true,
        data: { raw: rawContent.trim() },
      };
    }
  },
};
