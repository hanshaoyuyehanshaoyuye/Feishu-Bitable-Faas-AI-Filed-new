/**
 * 统一日志工具
 * 所有日志带 logID，便于飞书后台追踪
 */
export function createLogger(logID: string) {
  return {
    info: (...args: any[]) => console.log(`[${logID}]`, ...args),
    warn: (...args: any[]) => console.warn(`[${logID}]`, ...args),
    error: (...args: any[]) => console.error(`[${logID}]`, ...args),
  };
}

export type Logger = ReturnType<typeof createLogger>;
