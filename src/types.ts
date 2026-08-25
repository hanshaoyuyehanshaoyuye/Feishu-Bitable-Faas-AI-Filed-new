/**
 * 全局类型定义
 */

/** 输出类型枚举 */
export type OutputType =
  | 'text'
  | 'number'
  | 'single_select'
  | 'multi_select'
  | 'datetime'
  | 'object';

/** 字段配置（表单输入） */
export interface FieldConfig {
  outputType: OutputType;
  userPromptTemplate: string;
  systemPrompt?: string;
  apiUrl?: string;
  apiKey: string;
  modelId?: string;
  temperature?: string;
  maxTokens?: string;
  selectOptions?: string;
  maxPerMinute?: string;
  maxPerDay?: string;
}

/** 解析后的有效配置 */
export interface ResolvedConfig {
  outputType: OutputType;
  apiUrl: string;
  apiKey: string;
  modelId: string;
  temperature: number;
  maxTokens: number | null;
  systemPrompt: string;
  userPrompt: string;
  selectOptions: string[];
  maxPerMinute: number;
  maxPerDay: number;
}

/** Chat message */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** AI API 请求体 */
export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
}

/** AI API 响应（OpenAI 格式） */
export interface ChatCompletionResponse {
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason?: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  error?: {
    message: string;
    code?: string;
  };
}

/** 输出类型处理器 */
export interface OutputTypeHandler {
  /** 生成该类型的系统提示词指令（追加到 system prompt 末尾） */
  getSystemInstruction(selectOptions: string[]): string;

  /**
   * 解析 AI 返回的原始文本，转换为目标类型值
   * 返回 FieldCode.Success 的 data 或 FieldCode.Error + msg
   */
  parse(rawContent: string, selectOptions: string[]): ParseResult;
}

/** 解析结果 */
export interface ParseResult {
  success: boolean;
  data?: any;
  errorMsg?: string;
}

/** FaaS 执行上下文（飞书注入的 FieldContext 子集，我们只用这些字段） */
export interface FaasContext {
  fetch: (url: RequestInfo, init?: RequestInit) => Promise<Response>;
  logID: string;
  baseID?: string;
  tableID?: string;
  tenantKey?: string;
}
