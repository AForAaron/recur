/**
 * uni.storage 封装。
 * 跨端一致：H5 走 localStorage，小程序走 wx.storage，App 走 plus.storage。
 * 用 recur: 前缀避免和宿主应用数据冲突。
 */
const PREFIX = "recur:";

export const storage = {
  get<T>(key: string, fallback: T): T {
    try {
      const raw = uni.getStorageSync(PREFIX + key);
      if (raw === "" || raw === null || raw === undefined) return fallback;
      return typeof raw === "string" ? JSON.parse(raw) : (raw as T);
    } catch (e) {
      console.warn("[storage.get]", key, e);
      return fallback;
    }
  },

  set<T>(key: string, value: T): void {
    try {
      uni.setStorageSync(PREFIX + key, JSON.stringify(value));
    } catch (e) {
      console.error("[storage.set]", key, e);
    }
  },

  remove(key: string): void {
    try {
      uni.removeStorageSync(PREFIX + key);
    } catch (e) {
      console.warn("[storage.remove]", key, e);
    }
  },

  clearAll(): void {
    try {
      const info = uni.getStorageInfoSync();
      info.keys
        .filter((k) => k.startsWith(PREFIX))
        .forEach((k) => uni.removeStorageSync(k));
    } catch (e) {
      console.warn("[storage.clearAll]", e);
    }
  },
};
