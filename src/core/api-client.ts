/**
 * AI API 客户端
 *
 * 封装 OpenAI 兼容格式的 /v1/chat/completions 调用
 * 支持：超时控制、指数退避重试、响应缓存
 */
import type {
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatMessage,
  FaasContext,
} from '../types';
import { TTLCache, hashCacheKey } from '../utils/cache';
import { DEFAULTS } from '../config/defaults';

export interface ApiResult {
  success: boolean;
  content?: string;
  errorMsg?: string;
  statusCode?: number;
  fromCache?: boolean;
}

/** 请求超时（毫秒） */
const TIMEOUT_MS = 30_000;

/** 最大重试次数（不含首次请求） */
const MAX_RETRIES = 2;

/** 重试初始等待（毫秒），指数退避 base */
const RETRY_BASE_DELAY_MS = 1000;

/** 缓存 TTL（毫秒）— 5 分钟，平衡新鲜度与节省 */
const CACHE_TTL_MS = 5 * 60 * 1000;

/** 缓存最大条目 */
const CACHE_MAX_SIZE = 200;

/** 全局响应缓存（同实例内共享） */
const responseCache = new TTLCache<string, string>(CACHE_TTL_MS, CACHE_MAX_SIZE);

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** 判断是否应该重试 */
function shouldRetry(statusCode: number | undefined, attempt: number): boolean {
  if (attempt >= MAX_RETRIES) return false;
  // 网络错误（无 statusCode）或 5xx / 429 重试
  if (statusCode === undefined) return true;
  if (statusCode >= 500) return true;
  if (statusCode === 429) return true;
  return false;
}

export async function callChatCompletion(
  apiUrl: string,
  apiKey: string,
  requestBody: ChatCompletionRequest,
  ctx: FaasContext,
): Promise<ApiResult> {
  const { fetch, logID } = ctx;

  // --- 缓存检查 ---
  const cacheKey = hashCacheKey({
    url: apiUrl,
    model: requestBody.model,
    messages: requestBody.messages,
    temperature: requestBody.temperature,
    max_tokens: requestBody.max_tokens,
  });

  const cached = responseCache.get(cacheKey);
  if (cached !== undefined) {
    console.log(`[${logID}] cache hit`);
    return { success: true, content: cached, fromCache: true };
  }

  console.log(`[${logID}] API call: model=${requestBody.model}, url=${apiUrl}`);

  // --- 带重试的请求循环 ---
  let lastError: string = '';
  let lastStatusCode: number | undefined;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const delayMs = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
      console.log(`[${logID}] retry ${attempt}/${MAX_RETRIES} after ${delayMs}ms`);
      await sleep(delayMs);
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal as any,
      });

      clearTimeout(timeoutId);
      lastStatusCode = response.status;

      if (!response.ok) {
        const errText = await response.text();
        console.error(`[${logID}] API error ${response.status}: ${errText.slice(0, 200)}`);

        let errorMsg = `API 错误 (${response.status})`;
        try {
          const errJson = JSON.parse(errText);
          errorMsg = errJson.error?.message || errJson.message || errorMsg;
        } catch {
          errorMsg = `${errorMsg}: ${errText.slice(0, 200)}`;
        }

        lastError = errorMsg;

        if (shouldRetry(response.status, attempt)) {
          continue;
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
        lastError = result.error.message;
        // 响应体里的 error 也重试（部分平台 200 返回错误体）
        if (attempt < MAX_RETRIES) continue;
        return {
          success: false,
          errorMsg: result.error.message,
          statusCode: response.status,
        };
      }

      const content = result.choices?.[0]?.message?.content;
      if (content === undefined || content === null) {
        console.error(`[${logID}] API returned empty content`);
        return {
          success: false,
          errorMsg: 'AI 返回内容为空',
          statusCode: response.status,
        };
      }

      console.log(
        `[${logID}] API success: ${result.usage?.total_tokens ?? '?'} tokens, ` +
        `finish_reason=${result.choices?.[0]?.finish_reason ?? 'unknown'}`
      );

      // 写入缓存
      responseCache.set(cacheKey, content);

      return { success: true, content };

    } catch (e: any) {
      const isTimeout = e?.name === 'AbortError' || e?.code === 20;
      const msg = isTimeout
        ? `请求超时 (${TIMEOUT_MS / 1000}s)`
        : `网络错误: ${e?.message || e}`;

      console.error(`[${logID}] ${msg}`);
      lastError = msg;
      lastStatusCode = undefined;

      if (shouldRetry(undefined, attempt)) {
        continue;
      }
      return { success: false, errorMsg: msg };
    }
  }

  // 所有重试都用完
  return {
    success: false,
    errorMsg: `${lastError}（已重试 ${MAX_RETRIES} 次）`,
    statusCode: lastStatusCode,
  };
}

/** 构造 API 请求体 */
export function buildRequestBody(
  model: string,
  messages: ChatMessage[],
  temperature: number,
  maxTokens: number | null,
): ChatCompletionRequest {
  const body: ChatCompletionRequest = { model, messages };
  if (temperature !== undefined) body.temperature = temperature;
  if (maxTokens !== null) body.max_tokens = maxTokens;
  return body;
}

/** 导出缓存实例用于测试/调试 */
export const _cache = responseCache;

/** 导出配置常量用于测试 */
export const _config = { TIMEOUT_MS, MAX_RETRIES, RETRY_BASE_DELAY_MS, CACHE_TTL_MS };
