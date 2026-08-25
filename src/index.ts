/**
 * 飞书多维表格 AI 自定义字段（增强版）
 *
 * 入口文件：注册字段 + 域名白名单 + 路由到核心模块
 *
 * 架构：
 * config/      常量配置（域名白名单、默认值）
 * core/        核心逻辑（校验、prompt构造、API调用、解析器）
 * output-types/ 各输出类型处理器（独立模块，可单测）
 * utils/       工具函数（日志、JSON 等）
 * types.ts     全局类型定义
 */

import {
  basekit,
  FieldComponent,
  FieldType,
  FieldCode,
} from '@lark-opdev/block-basekit-server-api';

import type { FieldContext } from '@lark-opdev/block-basekit-server-api';

import { ALLOWED_DOMAINS } from './config/domains';
import { validateAndResolve } from './core/validator';
import { buildMessages } from './core/prompt-builder';
import { callChatCompletion, buildRequestBody } from './core/api-client';
import { parseOutput } from './core/output-parser';
import { createLogger } from './utils/logger';

import type { FaasContext, FieldConfig } from './types';

// ============================================================
// 域名白名单
// ============================================================
basekit.addDomainList(ALLOWED_DOMAINS);

// ============================================================
// 字段注册
// ============================================================
basekit.addField({
  formItems: [
    // --- 基础配置 ---
    {
      key: 'outputType',
      label: '输出类型',
      component: FieldComponent.SingleSelect,
      props: {
        options: [
          { label: '文本（总结/翻译/生成）', value: 'text' },
          { label: '数字（评分/计算/金额）', value: 'number' },
          { label: '单选（分类/标签/判断）', value: 'single_select' },
          { label: '多选（多标签/关键词）', value: 'multi_select' },
          { label: '日期（提取/转换）', value: 'datetime' },
          { label: '对象（JSON 结构化）', value: 'object' },
        ],
      },
      validator: { required: true },
    },
    {
      key: 'userPromptTemplate',
      label: '提示词',
      component: FieldComponent.Input,
      props: {
        placeholder: '点击【⊕引用字段】插入表格字段，然后描述你要AI做什么',
        multiline: true,
        rows: 4,
      },
      validator: { required: true },
    },
    {
      key: 'systemPrompt',
      label: '系统提示词（选填）',
      component: FieldComponent.Input,
      props: {
        placeholder: '设定AI角色，如"你是一个专业的数据分析助手"',
        multiline: true,
        rows: 2,
      },
    },

    // --- 模型配置 ---
    {
      key: 'apiUrl',
      label: 'API 地址',
      component: FieldComponent.Input,
      props: { placeholder: '默认：https://api.siliconflow.cn/v1/chat/completions' },
    },
    {
      key: 'apiKey',
      label: 'API Key',
      component: FieldComponent.Input,
      props: { placeholder: 'sk-xxxxxxxxxx' },
      validator: { required: true },
    },
    {
      key: 'modelId',
      label: '模型 ID',
      component: FieldComponent.Input,
      props: { placeholder: '默认：THUDM/glm-4-9b-chat' },
    },

    // --- 参数配置 ---
    {
      key: 'temperature',
      label: '温度（选填，0-2）',
      component: FieldComponent.Input,
      props: { placeholder: '默认 1.0，越低越确定' },
    },
    {
      key: 'maxTokens',
      label: '最大 Token（选填）',
      component: FieldComponent.Input,
      props: { placeholder: '默认不限制，上限 8000' },
    },

    // --- 选项配置 ---
    {
      key: 'selectOptions',
      label: '候选项（单选/多选专用，每行一个）',
      component: FieldComponent.Input,
      props: {
        placeholder: '如：\n正面\n中性\n负面\n\n选择单选/多选输出类型时填写',
        multiline: true,
        rows: 3,
      },
    },
  ],

  // 字段输出类型：统一使用 Text，value 为文本形式
  // （飞书 FaaS 字段的 resultType 在注册时固定，无法按行动态切换）
  // 若要显示不同类型的值，统一序列化为字符串展示
  resultType: { type: FieldType.Text },

  // ============================================================
  // execute：主流程
  // ============================================================
  execute: async (params: { [key: string]: any }, context: FieldContext) => {
    const formItemParams = params as unknown as FieldConfig;
    const logger = createLogger(context.logID);

    // 1. 校验 + 解析配置
    const validation = validateAndResolve(formItemParams);
    if (!validation.ok || !validation.config) {
      logger.warn('config validation failed:', validation.errorMsg);
      return {
        code: FieldCode.ConfigError,
        msg: validation.errorMsg || '配置校验失败',
      };
    }

    const cfg = validation.config;
    logger.info(`output=${cfg.outputType}, model=${cfg.modelId}`);

    // 2. 构造消息
    const messages = buildMessages(
      cfg.outputType,
      cfg.userPrompt,
      cfg.systemPrompt,
      cfg.selectOptions,
    );

    // 3. 构造请求体
    const requestBody = buildRequestBody(
      cfg.modelId,
      messages,
      cfg.temperature,
      cfg.maxTokens,
    );

    // 4. 调用 AI API（context 类型兼容：FieldContext 包含 FaasContext 需要的全部字段）
    const apiResult = await callChatCompletion(
      cfg.apiUrl,
      cfg.apiKey,
      requestBody,
      context as unknown as FaasContext,
    );

    if (!apiResult.success || apiResult.content === undefined) {
      logger.error('api call failed:', apiResult.errorMsg);
      return {
        code: FieldCode.Error,
        msg: apiResult.errorMsg || 'AI 调用失败',
      };
    }

    // 5. 解析输出
    const parsed = parseOutput(
      apiResult.content,
      cfg.outputType,
      cfg.selectOptions,
    );

    if (!parsed.success) {
      logger.warn('output parse failed:', parsed.errorMsg);
      return {
        code: FieldCode.Error,
        msg: parsed.errorMsg || '输出解析失败',
      };
    }

    logger.info('success');

    // resultType 是 Text，统一转为字符串展示
    let displayValue: string;
    if (typeof parsed.data === 'string') {
      displayValue = parsed.data;
    } else if (typeof parsed.data === 'number') {
      displayValue = String(parsed.data);
    } else if (Array.isArray(parsed.data)) {
      displayValue = parsed.data.join(', ');
    } else if (parsed.data && typeof parsed.data === 'object') {
      displayValue = JSON.stringify(parsed.data, null, 2);
    } else {
      displayValue = '';
    }

    return {
      code: FieldCode.Success,
      data: displayValue,
    };
  },
});

export default basekit;
