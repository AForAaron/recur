import type { Subscription } from "@/types/subscription";
import { cycleToDays, daysBetween, todayStr } from "./date";

/** 日均成本 = amount / cycle_days */
export function dailyCost(sub: Subscription): number {
  const days = cycleToDays(sub.cycle, sub.cycle_days);
  if (days <= 0) return 0;
  return sub.amount / days;
}

/** 月均折算 = daily × 30 */
export function monthlyCost(sub: Subscription): number {
  return dailyCost(sub) * 30;
}

/** 年均折算 = daily × 365 */
export function yearlyCost(sub: Subscription): number {
  return dailyCost(sub) * 365;
}

/**
 * 累计已付（简化版，MVP）
 * 公式：floor((今天 - start_date) / cycle_days + 1) × amount
 * 试用 = 0；已取消/暂停 = 0
 */
export function cumulativePaid(sub: Subscription): number {
  if (sub.is_trial) return 0;
  if (sub.status === "paused" || sub.status === "cancelled") return 0;
  if (!sub.start_date) return 0;

  const step = cycleToDays(sub.cycle, sub.cycle_days);
  if (step <= 0 || sub.amount <= 0) return 0;

  const elapsed = daysBetween(sub.start_date, todayStr());
  if (elapsed < 0) return 0;

  const periods = Math.floor(elapsed / step) + 1;
  return periods * sub.amount;
}

/** 试用是否仍在进行 */
export function isTrialActive(sub: Subscription): boolean {
  if (!sub.is_trial) return false;
  if (!sub.trial_end_date) return true;
  return daysBetween(todayStr(), sub.trial_end_date) >= 0;
}

/** 试用剩余天数（已结束返回 0） */
export function trialDaysRemaining(sub: Subscription): number {
  if (!sub.is_trial || !sub.trial_end_date) return 0;
  return Math.max(0, daysBetween(todayStr(), sub.trial_end_date));
}

/** 下次扣费倒计时。试用或无 next_billing_date 返回 null。 */
export function daysUntilNextBilling(sub: Subscription): number | null {
  if (!sub.next_billing_date) return null;
  return Math.max(0, daysBetween(todayStr(), sub.next_billing_date));
}

/* ============================================================
 * 关键日期的语义
 *
 * next_billing_date 这个字段在不同情况下含义不同：
 *   自动续费 → 「下次扣费日」，那天会真的扣钱
 *   非自动续费 → 「到期日」，那天服务结束，需要你决定是否续
 *   试用 → trial_end_date，那天试用结束
 *
 * 三者共用「关键日期」这个概念，但文案、分组、提醒都要分开，
 * 否则会把「到期」误报成「扣费」。
 * ============================================================ */

export type KeyDateKind = "trial" | "billing" | "expiry";

/** 这条订阅的关键日期属于哪一类 */
export function keyDateKind(sub: Subscription): KeyDateKind {
  if (sub.is_trial) return "trial";
  return sub.auto_renew ? "billing" : "expiry";
}

/**
 * 距关键日期的天数。**带符号**——负数表示已过。
 * 不要用 Math.max 夹到 0，否则过期项会显示成"今天"。
 */
export function daysToKeyDate(sub: Subscription): number | null {
  const d = sub.is_trial ? sub.trial_end_date : sub.next_billing_date;
  if (!d) return null;
  return daysBetween(todayStr(), d);
}

/** 关键日期是否已过 */
export function isKeyDatePassed(sub: Subscription): boolean {
  const d = daysToKeyDate(sub);
  return d !== null && d < 0;
}

/** 关键日期的文案。自动续费说「扣费」，其余说「到期」。 */
export function keyDateLabel(sub: Subscription): string {
  const d = daysToKeyDate(sub);
  if (d === null) return "未设定";
  const isBilling = keyDateKind(sub) === "billing";
  const word = isBilling ? "扣费" : "到期";
  if (d === 0) return `今日${word}`;
  if (d < 0) return isBilling ? `已过 ${-d} 天` : `已${word} ${-d} 天`;
  return `${d} 天后${word}`;
}

/** 关键日期是否在 N 天内（含已过） */
export function isKeyDateWithin(sub: Subscription, days: number): boolean {
  const d = daysToKeyDate(sub);
  return d !== null && d <= days;
}

/** 折算到 CNY */
export function toCNY(amount: number, currency: string, rates: Partial<Record<string, number>>): number {
  if (currency === "CNY") return amount;
  const rate = rates[currency] || 1;
  return amount * rate;
}
