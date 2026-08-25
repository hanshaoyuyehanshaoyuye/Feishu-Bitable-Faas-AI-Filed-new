/**
 * 单选输出处理器
 *
 * 策略：
 * 1. 如果配置了候选项，先精确匹配
 * 2. 再做模糊匹配（包含关系）
 * 3. 未配置候选项则清理编号前缀后直接返回
 */
import type { OutputTypeHandler, ParseResult } from '../types';

export const singleSelectHandler: OutputTypeHandler = {
  getSystemInstruction(selectOptions: string[]): string {
    if (selectOptions.length === 0) {
      return '你只能输出一个分类标签文本，不要输出解释、编号或其他内容。';
    }
    const list = selectOptions.map(o => `- ${o}`).join('\n');
    return `你必须从以下选项中选择且只能选择一个，只输出选项文字，不要输出解释、编号或其他内容：\n${list}`;
  },

  parse(rawContent: string, selectOptions: string[]): ParseResult {
    let value = rawContent.trim();

    // 去除可能的编号前缀：1. / 1) / - / ① 等
    value = value.replace(/^[\d\.\)\-\s①-⑳]+/, '').trim();
    // 去除末尾标点
    value = value.replace(/[。，,.:：;；\s]+$/, '').trim();

    if (selectOptions.length === 0) {
      return { success: true, data: value };
    }

    // 精确匹配
    const exact = selectOptions.find(o => o === value);
    if (exact) {
      return { success: true, data: exact };
    }

    // 模糊匹配：AI 返回包含选项，或选项包含 AI 返回
    const fuzzy = selectOptions.find(o =>
      value.includes(o) || o.includes(value)
    );
    if (fuzzy) {
      return { success: true, data: fuzzy };
    }

    // 都没匹配上，返回原值（由飞书表格决定是否接受）
    return { success: true, data: value };
  },
};
