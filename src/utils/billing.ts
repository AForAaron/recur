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

/** 折算到 CNY */
export function toCNY(amount: number, currency: string, rates: Partial<Record<string, number>>): number {
  if (currency === "CNY") return amount;
  const rate = rates[currency] || 1;
  return amount * rate;
}
