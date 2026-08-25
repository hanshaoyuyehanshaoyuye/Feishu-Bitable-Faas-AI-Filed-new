# OneAPI 对接指南

## 为什么用 OneAPI

| 问题 | OneAPI 解决方案 |
|------|---------------|
| API Key 分散在各个字段配置中 | 统一网关，一个令牌访问所有模型 |
| 无法控制调用量 | 每个令牌设独立额度 |
| 无调用统计 | 完整日志 + 仪表盘 |
| 模型切换麻烦 | 统一 OpenAI 格式，后端自动路由 |
| 频率不可控 | 令牌级速率限制 |

## 配置步骤

### 1. 部署 OneAPI

参考 [songquanpeng/one-api](https://github.com/songquanpeng/one-api)。

### 2. 添加模型渠道

在 OneAPI 后台 → 渠道 → 添加渠道：
- 类型：选你的服务商（OpenAI / Anthropic / 硅基流动 等）
- 模型：填写支持的模型名称
- API Key：服务商密钥

### 3. 创建令牌

令牌 → 添加令牌：
- 名称：如「飞书多维表格-AI字段」
- 额度：设置每月/总调用额度（建议先给小量测试）
- 速率限制：如 60 次/分钟
- 模型限制：限定可使用的模型（可选）

### 4. 配置 AI 字段

在飞书多维表格创建 AI 字段时：

| 配置项 | 填入 |
|--------|------|
| API 地址 | `https://your-oneapi.com/v1/chat/completions` |
| API Key | OneAPI 中创建的令牌（sk-xxx） |
| 模型 ID | 对应渠道的模型名 |

### 5. 域名白名单

如果你的 OneAPI 域名不在内置白名单中，需要：

1. 编辑 `src/index.ts` 中的 `basekit.addDomainList([...])`
2. 加入你的 OneAPI 域名
3. 重新打包：`npm run pack`
4. 上传新的扩展包

## 常用 OneAPI 部署方式

| 方式 | 适合场景 | 成本 |
|------|---------|------|
| 自建服务器 Docker | 公司内部使用 | 低（一台小机即可） |
| Vercel / Railway 一键部署 | 快速验证 | 低（免费额度够用） |
| 购买 SaaS 版 | 不想运维 | 中 |
