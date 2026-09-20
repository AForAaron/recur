/**
 * 金额格式化工具
 *
 * 设计原则：
 *  - 用户记忆的"实际订阅成本"用原币种显示（卡片主金额）
 *  - 用于横向对比 / 聚合统计时统一折算为 RMB（KPI、累计、饼图、柱图）
 *  - CNY 即 RMB，UI 一律显示 ¥ 符号
 */

import type { Currency } from "@/types/subscription";
import { toCNY } from "./billing";

const SYMBOLS: Record<Currency, string> = {
  CNY: "¥",
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  HKD: "HK$",
  AUD: "A$",
  SGD: "S$",
  THB: "฿",
  MYR: "RM",
};

/** 原币种格式化（小数：JPY 取整，其他保留 2 位；整数不补零） */
export function formatAmount(amount: number, currency: Currency): string {
  const sym = SYMBOLS[currency] || "¥";
  const isJpy = currency === "JPY";
  const value = isJpy
    ? Math.round(amount).toString()
    : amount.toFixed(amount % 1 === 0 ? 0 : 2);
  return `${sym}${value}`;
}

/** 纯 RMB 格式化 */
export function formatCNY(amount: number): string {
  return `¥${amount.toFixed(amount % 1 === 0 ? 0 : 2)}`;
}

/**
 * 返回"原币种 + RMB 等值"两个展示串。
 * 当 currency 已是 CNY 时不重复显示 RMB。
 */
export function formatWithCNY(
  amount: number,
  currency: Currency,
  rates: Partial<Record<Currency, number>>
): { primary: string; secondary: string } {
  const primary = formatAmount(amount, currency);
  if (currency === "CNY") return { primary, secondary: "" };
  const cny = toCNY(amount, currency, rates);
  return { primary, secondary: `≈ ${formatCNY(cny)}` };
}

/** 折算成 RMB 数值（保留精度） */
export function toRMB(
  amount: number,
  currency: Currency,
  rates: Partial<Record<Currency, number>>
): number {
  return toCNY(amount, currency, rates);
}

/** 列出当前支持的币种符号表，供设置页展示 */
export const CURRENCY_META: Array<{ code: Currency; symbol: string; name: string }> = [
  { code: "CNY", symbol: "¥",   name: "人民币" },
  { code: "USD", symbol: "$",   name: "美元"   },
  { code: "EUR", symbol: "€",   name: "欧元"   },
  { code: "GBP", symbol: "£",   name: "英镑"   },
  { code: "JPY", symbol: "¥",   name: "日元"   },
  { code: "HKD", symbol: "HK$", name: "港币"   },
  { code: "AUD", symbol: "A$",  name: "澳元"   },
  { code: "SGD", symbol: "S$",  name: "新加坡元" },
  { code: "THB", symbol: "฿",   name: "泰铢"   },
  { code: "MYR", symbol: "RM",  name: "马来西亚林吉特" },
];
