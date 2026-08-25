/**
 * 简单内存缓存
 *
 * 用于缓存 AI API 调用结果，减少重复请求
 * 飞书 FaaS 是无服务的，缓存仅在同一运行实例生命周期内有效
 * 对于批量更新/同字段多次引用场景有明显节省
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class TTLCache<K, V> {
  private map = new Map<K, CacheEntry<V>>();
  private readonly ttlMs: number;
  private readonly maxSize: number;

  constructor(ttlMs: number, maxSize = 500) {
    this.ttlMs = ttlMs;
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const entry = this.map.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt < Date.now()) {
      this.map.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: K, value: V): void {
    // 超上限时，清理 1/4 旧条目（简单策略，不用 LRU）
    if (this.map.size >= this.maxSize) {
      const deleteCount = Math.floor(this.maxSize / 4);
      let count = 0;
      for (const k of this.map.keys()) {
        this.map.delete(k);
        if (++count >= deleteCount) break;
      }
    }
    this.map.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  has(key: K): boolean {
    return this.get(key) !== undefined;
  }

  get size(): number {
    return this.map.size;
  }

  clear(): void {
    this.map.clear();
  }
}

/**
 * 生成稳定的缓存 key
 * 用 JSON.stringify + 简单哈希，避免超长 key
 */
export function hashCacheKey(input: unknown): string {
  const str = JSON.stringify(input);
  // djb2 hash
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
  }
  // 转 36 进制 + 原串长度，降低冲突概率
  return `${hash >>> 0}_${str.length}`;
}
