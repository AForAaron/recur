/**
 * 轻量 UUID v4 生成。
 * 不用 crypto.randomUUID 是为了在小程序端（H5 之外的运行时）也能跑，
 * 概率冲突在个人订阅量级（<1000 条）下可忽略。
 */
export function uuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
