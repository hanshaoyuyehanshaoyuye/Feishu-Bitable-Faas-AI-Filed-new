/**
 * 输出解析器入口
 *
 * 按输出类型分派到对应 handler
 */
import type { OutputType, ParseResult } from '../types';
import { getOutputHandler } from '../output-types';

export function parseOutput(
  rawContent: string,
  outputType: OutputType,
  selectOptions: string[],
): ParseResult {
  const handler = getOutputHandler(outputType);
  return handler.parse(rawContent, selectOptions);
}
