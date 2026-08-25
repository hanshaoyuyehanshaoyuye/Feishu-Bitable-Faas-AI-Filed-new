/**
 * 输出类型处理器注册表
 * 新增输出类型：加文件 + 在这里注册
 */
import type { OutputType, OutputTypeHandler } from '../types';
import { textHandler } from './text';
import { numberHandler } from './number';
import { singleSelectHandler } from './single-select';
import { multiSelectHandler } from './multi-select';
import { datetimeHandler } from './datetime';
import { objectHandler } from './object';

export const outputHandlers: Record<OutputType, OutputTypeHandler> = {
  text: textHandler,
  number: numberHandler,
  single_select: singleSelectHandler,
  multi_select: multiSelectHandler,
  datetime: datetimeHandler,
  object: objectHandler,
};

export function getOutputHandler(type: OutputType): OutputTypeHandler {
  const handler = outputHandlers[type];
  if (!handler) {
    // 未知类型兜底到文本
    return outputHandlers.text;
  }
  return handler;
}
