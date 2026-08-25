/**
 * 配额与限流
 *
 * 两层控制：
 * 1. 速率限制：每分钟最多 N 次（防止突发）
 * 2. 每日配额：每个租户每天最多 N 次（防止账单爆炸）
 *
 * 存储：内存 Map，FaaS 实例级别
 * 注意：多实例部署下每实例独立计数，实际限额 ≈ 配置值 × 实例数
 *       对于账单保护是偏保守的，没问题
 */

interface RateWindow {
  minuteKey: string;   // YYYY-MM-DD-HH-mm
  count: number;
}

interface DailyQuota {
  dayKey: string;      // YYYY-MM-DD
  count: number;
}

interface TenantState {
  rate: RateWindow;
  daily: DailyQuota;
}

const tenantMap = new Map<string, TenantState>();

function getMinuteKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day}-${h}-${min}`;
}

function getDayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export interface QuotaCheckResult {
  allowed: boolean;
  reason?: 'rate_limit' | 'daily_quota';
  remaining?: number;
  resetAt?: number;
}

export interface QuotaConfig {
  /** 每分钟最大请求数，<=0 表示不限制 */
  maxPerMinute: number;
  /** 每天最大请求数，<=0 表示不限制 */
  maxPerDay: number;
}

/**
 * 检查并消耗配额
 * 成功消耗后计数 +1
 */
export function checkAndConsumeQuota(
  tenantKey: string,
  config: QuotaConfig,
): QuotaCheckResult {
  // 都不限制：快速返回
  if (config.maxPerMinute <= 0 && config.maxPerDay <= 0) {
    return { allowed: true };
  }

  const now = new Date();
  const minKey = getMinuteKey(now);
  const dayKey = getDayKey(now);

  let state = tenantMap.get(tenantKey);
  if (!state) {
    state = {
      rate: { minuteKey: minKey, count: 0 },
      daily: { dayKey, count: 0 },
    };
    tenantMap.set(tenantKey, state);
  }

  // 滚动窗口：当前分钟变了就重置
  if (state.rate.minuteKey !== minKey) {
    state.rate = { minuteKey: minKey, count: 0 };
  }
  if (state.daily.dayKey !== dayKey) {
    state.daily = { dayKey, count: 0 };
  }

  // 速率检查
  if (config.maxPerMinute > 0 && state.rate.count >= config.maxPerMinute) {
    // 计算下一分钟重置时间（秒级时间戳）
    const resetMs = (now.getMinutes() + 1) * 60 * 1000 -
      (now.getMinutes() * 60 * 1000 + now.getSeconds() * 1000 + now.getMilliseconds());
    return {
      allowed: false,
      reason: 'rate_limit',
      remaining: 0,
      resetAt: Date.now() + resetMs,
    };
  }

  // 每日配额检查
  if (config.maxPerDay > 0 && state.daily.count >= config.maxPerDay) {
    const remainingMs = (24 * 3600 * 1000) -
      (now.getHours() * 3600 * 1000 + now.getMinutes() * 60 * 1000 +
       now.getSeconds() * 1000 + now.getMilliseconds());
    return {
      allowed: false,
      reason: 'daily_quota',
      remaining: 0,
      resetAt: Date.now() + remainingMs,
    };
  }

  // 消耗
  state.rate.count++;
  state.daily.count++;

  return {
    allowed: true,
    remaining: config.maxPerDay > 0 ? config.maxPerDay - state.daily.count : undefined,
  };
}

/** 获取当前配额状态（只读，不消耗） */
export function getQuotaState(tenantKey: string, config: QuotaConfig) {
  const now = new Date();
  const state = tenantMap.get(tenantKey);
  if (!state) {
    return { minuteCount: 0, dayCount: 0 };
  }
  const minKey = getMinuteKey(now);
  const dayKey = getDayKey(now);
  return {
    minuteCount: state.rate.minuteKey === minKey ? state.rate.count : 0,
    dayCount: state.daily.dayKey === dayKey ? state.daily.count : 0,
    maxPerMinute: config.maxPerMinute,
    maxPerDay: config.maxPerDay,
  };
}

/** 重置所有配额（测试用） */
export function _resetAllQuotas(): void {
  tenantMap.clear();
}
