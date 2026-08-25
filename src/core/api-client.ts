/**
 * AI API 客户端
 *
 * 封装 OpenAI 兼容格式的 /v1/chat/completions 调用
 * 统一错误处理、日志、响应解析
 */
import type {
  ChatCompletionRequest,
  ChatCompletionResponse,
  FaasContext,
} from '../types';

export interface ApiResult {
  success: boolean;
  content?: string;
  errorMsg?: string;
  statusCode?: number;
}

export async function callChatCompletion(
  apiUrl: string,
  apiKey: string,
  requestBody: ChatCompletionRequest,
  ctx: FaasContext,
): Promise<ApiResult> {
  const { fetch, logID } = ctx;

  console.log(`[${logID}] API call: model=${requestBody.model}, url=${apiUrl}`);

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[${logID}] API error ${response.status}: ${errText.slice(0, 300)}`);

      // 尝试解析结构化错误
      let errorMsg = `API 错误 (${response.status})`;
      try {
        const errJson = JSON.parse(errText);
        errorMsg = errJson.error?.message || errJson.message || errorMsg;
      } catch {
        // 非 JSON 错误体，截取前 200 字符
        errorMsg = `${errorMsg}: ${errText.slice(0, 200)}`;
      }

      return {
        success: false,
        errorMsg,
        statusCode: response.status,
      };
    }

    const result = (await response.json()) as ChatCompletionResponse;

    if (result.error) {
      console.error(`[${logID}] API response error: ${result.error.message}`);
      return {
        success: false,
        errorMsg: result.error.message,
      };
    }

    const content = result.choices?.[0]?.message?.content;
    if (content === undefined || content === null) {
      console.error(`[${logID}] API returned empty content`);
      return {
        success: false,
        errorMsg: 'AI 返回内容为空',
      };
    }

    console.log(
      `[${logID}] API success: ${result.usage?.total_tokens ?? '?'} tokens, ` +
      `finish_reason=${result.choices?.[0]?.finish_reason ?? 'unknown'}`
    );

    return { success: true, content };

  } catch (e: any) {
    console.error(`[${logID}] API call failed:`, e.message || e);
    return {
      success: false,
      errorMsg: `网络错误: ${e.message || e}`,
    };
  }
}

/** 构造 API 请求体 */
export function buildRequestBody(
  model: string,
  messages: Array<{ role: string; content: string }>,
  temperature: number,
  maxTokens: number | null,
): ChatCompletionRequest {
  const body: ChatCompletionRequest = { model, messages };
  if (temperature !== undefined) body.temperature = temperature;
  if (maxTokens !== null) body.max_tokens = maxTokens;
  return body;
}
