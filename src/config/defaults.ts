/**
 * 默认值常量
 */

export const DEFAULTS = {
  /** 默认 API 地址（硅基流动，国内访问快） */
  API_URL: 'https://api.siliconflow.cn/v1/chat/completions',

  /** 默认模型（智谱 GLM-4-9B，开源免费方案） */
  MODEL_ID: 'THUDM/glm-4-9b-chat',

  /** 默认 temperature */
  TEMPERATURE: 1.0,

  /** 默认输出类型 */
  OUTPUT_TYPE: 'text' as const,

  /** 温度允许范围 */
  TEMPERATURE_MIN: 0,
  TEMPERATURE_MAX: 2,

  /** 单次请求最大 token 上限（保护用户账单） */
  MAX_TOKENS_HARD_LIMIT: 8000,
} as const;

/** 输出类型对应的飞书 FieldType 值 */
export const OUTPUT_TYPE_TO_FIELD_TYPE = {
  text: 1,
  number: 2,
  single_select: 3,
  multi_select: 4,
  datetime: 5,
  object: 6,
} as const;
