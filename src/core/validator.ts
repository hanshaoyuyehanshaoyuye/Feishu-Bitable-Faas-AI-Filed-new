/**
 * 配置校验与解析
 *
 * 把用户输入的表单值（全是 string）解析为带类型的 ResolvedConfig
 * 并做基础合法性校验，提前拦截无效配置
 */
import { DEFAULTS } from '../config/defaults';
import type { FieldConfig, ResolvedConfig, OutputType } from '../types';

const OUTPUT_TYPES: OutputType[] = [
  'text', 'number', 'single_select', 'multi_select', 'datetime', 'object',
];

export interface ValidationResult {
  ok: boolean;
  config?: ResolvedConfig;
  errorMsg?: string;
}

export function validateAndResolve(cfg: Partial<FieldConfig>): ValidationResult {
  // 必填校验
  if (!cfg.apiKey?.trim()) {
    return { ok: false, errorMsg: '请填写 API Key' };
  }
  if (!cfg.userPromptTemplate?.trim()) {
    return { ok: false, errorMsg: '请填写提示词' };
  }

  // 输出类型
  let outputType: OutputType = DEFAULTS.OUTPUT_TYPE;
  if (cfg.outputType && OUTPUT_TYPES.includes(cfg.outputType as OutputType)) {
    outputType = cfg.outputType as OutputType;
  }

  // API URL
  const apiUrl = cfg.apiUrl?.trim() || DEFAULTS.API_URL;
  if (!/^https?:\/\//i.test(apiUrl)) {
    return { ok: false, errorMsg: 'API 地址必须以 http:// 或 https:// 开头' };
  }

  // 模型
  const modelId = cfg.modelId?.trim() || DEFAULTS.MODEL_ID;

  // temperature
  let temperature: number = DEFAULTS.TEMPERATURE;
  if (cfg.temperature?.trim()) {
    const t = parseFloat(cfg.temperature);
    if (isNaN(t)) {
      return { ok: false, errorMsg: '温度必须是数字' };
    }
    if (t < DEFAULTS.TEMPERATURE_MIN || t > DEFAULTS.TEMPERATURE_MAX) {
      return { ok: false, errorMsg: `温度必须在 ${DEFAULTS.TEMPERATURE_MIN}-${DEFAULTS.TEMPERATURE_MAX} 之间` };
    }
    temperature = t;
  }

  // maxTokens
  let maxTokens: number | null = null;
  if (cfg.maxTokens?.trim()) {
    const n = parseInt(cfg.maxTokens, 10);
    if (isNaN(n) || n <= 0) {
      return { ok: false, errorMsg: '最大 Token 必须是正整数' };
    }
    if (n > DEFAULTS.MAX_TOKENS_HARD_LIMIT) {
      return { ok: false, errorMsg: `最大 Token 不能超过 ${DEFAULTS.MAX_TOKENS_HARD_LIMIT}` };
    }
    maxTokens = n;
  }

  // 候选项
  const selectOptions = parseSelectOptions(cfg.selectOptions);

  return {
    ok: true,
    config: {
      outputType,
      apiUrl,
      apiKey: cfg.apiKey.trim(),
      modelId,
      temperature,
      maxTokens,
      systemPrompt: cfg.systemPrompt?.trim() || '',
      userPrompt: cfg.userPromptTemplate.trim(),
      selectOptions,
    },
  };
}

function parseSelectOptions(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean);
}
