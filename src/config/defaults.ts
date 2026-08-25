/**
 * 默认值常量
 */
import { FieldType } from '@lark-opdev/block-basekit-server-api';
import type { OutputType } from '../types';

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

/**
 * 输出类型 → 飞书 FieldType 枚举值
 * 注意：这些是 SDK 中 FieldType 枚举的实际数值
 */
export const OUTPUT_TYPE_TO_FIELD_TYPE: Record<OutputType, FieldType> = {
  text: FieldType.Text,
  number: FieldType.Number,
  single_select: FieldType.SingleSelect,
  multi_select: FieldType.MultiSelect,
  datetime: FieldType.DateTime,
  object: FieldType.Object,
};
