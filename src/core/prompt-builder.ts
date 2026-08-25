/**
 * 消息构造器
 *
 * 组合 system prompt（用户定义 + 类型指令）+ user prompt
 */
import type { ChatMessage, OutputType } from '../types';
import { getOutputHandler } from '../output-types';

export function buildMessages(
  outputType: OutputType,
  userPrompt: string,
  systemPrompt: string,
  selectOptions: string[],
): ChatMessage[] {
  const messages: ChatMessage[] = [];

  const handler = getOutputHandler(outputType);
  const typeInstruction = handler.getSystemInstruction(selectOptions);

  // 合并 system prompt：用户定义 + 类型指令
  const systemParts: string[] = [];
  if (systemPrompt) systemParts.push(systemPrompt);
  if (typeInstruction) systemParts.push(typeInstruction);

  if (systemParts.length > 0) {
    messages.push({
      role: 'system',
      content: systemParts.join('\n\n'),
    });
  }

  messages.push({ role: 'user', content: userPrompt });

  return messages;
}
