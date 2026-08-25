/**
 * 域名白名单
 * 飞书 FaaS 强制限制：只能请求白名单内的域名
 */

export const ALLOWED_DOMAINS: string[] = [
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
  'api.siliconflow.cn',            // 硅基流动
  'open.bigmodel.cn',              // 智谱 AI
  'api.moonshot.cn',               // 月之暗面 Kimi
  'api.minimax.chat',              // MiniMax
  'api.deepseek.com',              // DeepSeek
  'dashscope.aliyuncs.com',        // 阿里云 通义千问
  'qianfan.baidubce.com',          // 百度 文心千帆
  'aip.baidubce.com',              // 百度文心
  'ark.cn-beijing.volces.com',     // 火山引擎 豆包
  'api.lingyiwanwu.com',           // 零一万物
  'api.stepfun.com',               // 阶跃星辰
  'api.baichuan-ai.com',           // 百川智云
  'api.lkeap.cloud.tencent.com',   // 腾讯云 混元
  'api.hunyuan.cloud.tencent.com', // 腾讯云 混元
  'xf-yun.cn',                     // 讯飞星火

  // === 自建 / 网关（常见部署域名，使用时自行添加）===
  // 'your-oneapi.example.com',
];
