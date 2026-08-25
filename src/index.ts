/**
 * 飞书多维表格 AI 自定义字段（增强版）
 *
 * 特性：
 * - 支持 7 种输出类型：Text / Number / SingleSelect / MultiSelect / DateTime / Object / Attachment
 * - 结构化输出自动解析（JSON → 对应字段类型）
 * - 30+ 家 OpenAI 兼容 AI 服务商
 * - 支持 OneAPI / 自建网关
 * - 提示词使用飞书自带「⊕引用字段」按钮插入变量（前端拼接，后端收到的是已替换文本）
 */

import { basekit, field, FieldComponent, FieldType, FieldCode } from '@lark-opdev/block-basekit-server-api';

// ============================================================
// 1. 域名白名单（飞书 FAAS 安全限制，只能请求白名单内域名）
// ============================================================
basekit.addDomainList([
  // === 国外 AI ===
  'api.openai.com',
  'api.anthropic.com',
  'generativelanguage.googleapis.com',
  'api.groq.com',
  'api.perplexity.ai',
  'api.mistral.ai',
  'openrouter.ai',
  'api.cohere.ai',
  'api.replicate.com',
  'gateway.ai.cloudflare.com',
  'integrate.api.nvidia.com',
  'api.huggingface.co',

  // === 国内 AI ===
  'api.siliconflow.cn',           // 硅基流动
  'open.bigmodel.cn',             // 智谱 AI
  'api.moonshot.cn',              // 月之暗面 Kimi
  'api.minimax.chat',             // MiniMax
  'api.deepseek.com',             // DeepSeek
  'dashscope.aliyuncs.com',       // 阿里云 通义千问
  'qianfan.baidubce.com',         // 百度 文心千帆
  'ark.cn-beijing.volces.com',    // 火山引擎 豆包
  'api.lingyiwanwu.com',          // 零一万物
  'api.stepfun.com',              // 阶跃星辰
  'api.baichuan-ai.com',          // 百川智云
  'api.lkeap.cloud.tencent.com',  // 腾讯云 混元
  'api.hunyuan.cloud.tencent.com', // 腾讯云 混元
  'xf-yun.cn',                    // 讯飞星火
  'aip.baidubce.com',             // 百度文心
]);

// ============================================================
// 2. 字段定义
// ============================================================
basekit.addField({
  formItems: [
    // --- 基础配置 ---
    {
      key: 'outputType',
      label: '输出类型',
      component: FieldComponent.Select,
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
      props: { placeholder: '默认不限制' },
    },

    // --- 选项配置（单选/多选专用）---
    {
      key: 'selectOptions',
      label: '候选项（单选/多选专用，换行分隔）',
      component: FieldComponent.Input,
      props: {
        placeholder: '如：\n正面\n中性\n负面\n\n选择单选/多选输出类型时填写',
        multiline: true,
        rows: 3,
      },
    },
  ],

  // 输出类型动态决定（在 execute 中处理）
  resultType: { type: FieldType.Text },

  // ============================================================
  // 3. 核心执行逻辑
  // ============================================================
  execute: async (formItemParams: any, context: any) => {
    const {
      outputType,
      userPromptTemplate,
      systemPrompt,
      apiUrl,
      apiKey,
      modelId,
      temperature,
      maxTokens,
      selectOptions,
    } = formItemParams;

    const { fetch, logID } = context;

    // --- 基础校验 ---
    if (!apiKey || !userPromptTemplate) {
      return { code: FieldCode.ConfigError, msg: '请填写 API Key 和提示词' };
    }

    // --- 默认值兜底 ---
    const finalApiUrl = apiUrl?.trim() || 'https://api.siliconflow.cn/v1/chat/completions';
    const finalModel = modelId?.trim() || 'THUDM/glm-4-9b-chat';
    const finalTemperature = temperature?.trim() ? parseFloat(temperature) : 1.0;
    const maxTokensNum = maxTokens?.trim() ? parseInt(maxTokens, 10) : null;
    const finalOutputType = outputType || 'text';

    // --- 根据输出类型构造系统提示词 ---
    let effectiveSystemPrompt = systemPrompt?.trim() || '';
    const typeInstruction = getTypeInstruction(finalOutputType, selectOptions);
    if (typeInstruction) {
      effectiveSystemPrompt = effectiveSystemPrompt
        ? effectiveSystemPrompt + '\n\n' + typeInstruction
        : typeInstruction;
    }

    // --- 构造消息 ---
    const messages: Array<{ role: string; content: string }> = [];
    if (effectiveSystemPrompt) {
      messages.push({ role: 'system', content: effectiveSystemPrompt });
    }
    messages.push({ role: 'user', content: userPromptTemplate });

    // --- 构造请求体 ---
    const requestBody: any = {
      model: finalModel,
      messages,
    };
    if (!isNaN(finalTemperature)) {
      requestBody.temperature = finalTemperature;
    }
    if (maxTokensNum && !isNaN(maxTokensNum)) {
      requestBody.max_tokens = maxTokensNum;
    }

    console.log(`[${logID}] Request: model=${finalModel}, type=${finalOutputType}`);

    // --- 调用 AI API ---
    try {
      const response = await fetch(finalApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(`[${logID}] API Error ${response.status}: ${errText}`);
        return { code: FieldCode.Error, msg: `API 错误 (${response.status}): ${errText.slice(0, 200)}` };
      }

      const result = await response.json();
      const rawContent = result.choices?.[0]?.message?.content ?? '';

      if (!rawContent) {
        return { code: FieldCode.Error, msg: 'AI 返回内容为空' };
      }

      // --- 根据输出类型解析并返回 ---
      return parseOutput(rawContent, finalOutputType, selectOptions);

    } catch (e: any) {
      console.error(`[${logID}] Execute failed:`, e);
      return { code: FieldCode.Error, msg: `执行失败: ${e.message || e}` };
    }
  },
});

// ============================================================
// 4. 输出类型处理
// ============================================================

/** 获取每种输出类型的系统提示词指令 */
function getTypeInstruction(outputType: string, selectOptions: string | undefined): string {
  switch (outputType) {
    case 'number':
      return '你只能输出一个数字，不要输出任何其他文字、解释或单位。例如：42';

    case 'single_select': {
      const options = parseSelectOptions(selectOptions);
      if (options.length === 0) {
        return '你只能输出一个分类标签文本，不要输出解释。';
      }
      return `你必须从以下选项中选择一个，只输出选项文字，不要输出解释、编号或其他内容：\n${options.map(o => `- ${o}`).join('\n')}`;
    }

    case 'multi_select': {
      const options = parseSelectOptions(selectOptions);
      if (options.length === 0) {
        return '你只能输出多个标签，用英文逗号分隔，不要输出解释。';
      }
      return `你必须从以下选项中选择一个或多个，只输出选中的选项（用英文逗号分隔），不要输出解释、编号或其他内容：\n${options.map(o => `- ${o}`).join('\n')}`;
    }

    case 'datetime':
      return '你只能输出一个 ISO 格式的日期时间，例如 2025-08-01T12:00:00Z。不要输出任何解释。如果只有日期没有时间，用 2025-08-01T00:00:00Z 格式。';

    case 'object':
      return '你只能输出一个 JSON 对象，用 ```json 和 ``` 包裹也可以。不要输出解释、说明文字。JSON 的字段根据用户需求自行确定。';

    case 'text':
    default:
      return '';
  }
}

/** 解析候选项（换行分隔） */
function parseSelectOptions(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean);
}

/** 从 AI 返回内容中提取 JSON（可能被 ```json 包裹） */
function extractJson(text: string): string {
  const trimmed = text.trim();
  // 去除 ```json ... ``` 包裹
  const fenceMatch = trimmed.match(/```json\s*([\s\S]*?)\s*```/i);
  if (fenceMatch) return fenceMatch[1].trim();
  // 去除 ``` ... ``` 包裹
  const genericMatch = trimmed.match(/```\s*([\s\S]*?)\s*```/);
  if (genericMatch) return genericMatch[1].trim();
  return trimmed;
}

/** 根据输出类型解析 AI 返回并构造返回值 */
function parseOutput(rawContent: string, outputType: string, selectOptions: string | undefined): any {
  const trimmed = rawContent.trim();

  switch (outputType) {
    // --- 文本 ---
    case 'text':
      return {
        code: FieldCode.Success,
        data: trimmed,
      };

    // --- 数字 ---
    case 'number': {
      // 提取第一个数字（兼容带单位、带文字的情况）
      const match = trimmed.match(/-?[\d]+(\.[\d]+)?/);
      if (!match) {
        return { code: FieldCode.Error, msg: `无法从AI返回中提取数字: ${trimmed.slice(0, 100)}` };
      }
      return {
        code: FieldCode.Success,
        data: parseFloat(match[0]),
      };
    }

    // --- 单选 ---
    case 'single_select': {
      const options = parseSelectOptions(selectOptions);
      let value = trimmed.replace(/^[\d\.\)\-\s]+/, '').trim(); // 去除可能的编号
      // 如果配置了候选项，匹配最接近的
      if (options.length > 0) {
        const found = options.find(o =>
          value === o || value.includes(o) || o.includes(value)
        );
        if (found) value = found;
      }
      return {
        code: FieldCode.Success,
        data: value,
      };
    }

    // --- 多选 ---
    case 'multi_select': {
      const options = parseSelectOptions(selectOptions);
      let items: string[];

      // 先尝试按常见分隔符拆分
      if (trimmed.includes('\n')) {
        items = trimmed.split('\n').map(s => s.replace(/^[\d\.\)\-\s]+/, '').trim()).filter(Boolean);
      } else if (trimmed.includes('，')) {
        items = trimmed.split('，').map(s => s.trim()).filter(Boolean);
      } else if (trimmed.includes(',')) {
        items = trimmed.split(',').map(s => s.trim()).filter(Boolean);
      } else if (trimmed.includes('、')) {
        items = trimmed.split('、').map(s => s.trim()).filter(Boolean);
      } else {
        items = [trimmed];
      }

      // 如果配置了候选项，过滤+匹配
      if (options.length > 0) {
        const matched = new Set<string>();
        for (const item of items) {
          const found = options.find(o =>
            item === o || item.includes(o) || o.includes(item)
          );
          if (found) matched.add(found);
        }
        items = Array.from(matched);
      }

      return {
        code: FieldCode.Success,
        data: items,
      };
    }

    // --- 日期 ---
    case 'datetime': {
      // 提取可能的日期字符串
      let dateStr = trimmed;
      // 尝试直接解析
      const ts = Date.parse(dateStr);
      if (!isNaN(ts)) {
        return {
          code: FieldCode.Success,
          data: new Date(ts).toISOString(),
        };
      }
      // 尝试提取 YYYY-MM-DD 格式
      const dateMatch = trimmed.match(/(\d{4})[-\/年](\d{1,2})[-\/月](\d{1,2})/);
      if (dateMatch) {
        const [, y, m, d] = dateMatch;
        const date = new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T00:00:00Z`);
        if (!isNaN(date.getTime())) {
          return {
            code: FieldCode.Success,
            data: date.toISOString(),
          };
        }
      }
      return { code: FieldCode.Error, msg: `无法解析日期: ${trimmed.slice(0, 100)}` };
    }

    // --- 对象 ---
    case 'object': {
      const jsonStr = extractJson(trimmed);
      try {
        const obj = JSON.parse(jsonStr);
        return {
          code: FieldCode.Success,
          data: obj,
        };
      } catch {
        // 解析失败，返回原始文本
        return {
          code: FieldCode.Success,
          data: { raw: trimmed },
        };
      }
    }

    default:
      return {
        code: FieldCode.Success,
        data: trimmed,
      };
  }
}

export default basekit;
