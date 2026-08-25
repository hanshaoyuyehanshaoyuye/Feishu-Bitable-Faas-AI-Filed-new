/**
 * 多选输出处理器
 *
 * 策略：
 * 1. 按换行/逗号/顿号/分号拆分
 * 2. 每条清理编号前缀
 * 3. 如果配置了候选项，过滤匹配项
 */
import type { OutputTypeHandler, ParseResult } from '../types';

const SPLIT_PATTERNS = [
  /\n+/,       // 换行
  /\s*,\s*/,   // 英文逗号
  /\s*，\s*/,  // 中文逗号
  /\s*、\s*/,  // 顿号
  /\s*；\s*/,  // 中文分号
  /\s*;\s*/,   // 英文分号
];

function cleanItem(s: string): string {
  let v = s.trim();
  // 去除编号前缀
  v = v.replace(/^[\d\.\)\-\s①-⑳【\[\]]+/, '').trim();
  // 去除末尾标点
  v = v.replace(/[。，,.:：;；\s\-]+$/, '').trim();
  return v;
}

export const multiSelectHandler: OutputTypeHandler = {
  getSystemInstruction(selectOptions: string[]): string {
    if (selectOptions.length === 0) {
      return '你只能输出多个标签，用英文逗号分隔，不要输出解释、编号或其他内容。';
    }
    const list = selectOptions.map(o => `- ${o}`).join('\n');
    return `你必须从以下选项中选择一个或多个，只输出选中的选项（用英文逗号分隔），不要输出解释、编号或其他内容：\n${list}`;
  },

  parse(rawContent: string, selectOptions: string[]): ParseResult {
    const trimmed = rawContent.trim();
    if (!trimmed) {
      return { success: true, data: [] };
    }

    // 尝试各种分隔符，取拆分数量最多（且 >1）的那种
    let bestSplit: string[] = [trimmed];
    for (const pattern of SPLIT_PATTERNS) {
      const parts = trimmed.split(pattern).filter(Boolean);
      if (parts.length > bestSplit.length) {
        bestSplit = parts;
      }
    }

    let items = bestSplit.map(cleanItem).filter(Boolean);
    // 去重（保序）
    items = Array.from(new Set(items));

    if (selectOptions.length === 0) {
      return { success: true, data: items };
    }

    // 过滤：只保留候选项中匹配的
    const matched = new Set<string>();
    for (const item of items) {
      const found = selectOptions.find(o =>
        o === item || o.includes(item) || item.includes(o)
      );
      if (found) matched.add(found);
    }

    return { success: true, data: Array.from(matched) };
  },
};
