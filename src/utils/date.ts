import type { Cycle } from "@/types/subscription";

/** 预置周期 → 天数 */
const CYCLE_DAYS: Record<Exclude<Cycle, "custom">, number> = {
  daily: 1,
  weekly: 7,
  monthly: 30,
  quarterly: 90,
  yearly: 365,
};

export function cycleToDays(cycle: Cycle, customDays?: number | null): number {
  if (cycle === "custom") return customDays && customDays > 0 ? customDays : 30;
  return CYCLE_DAYS[cycle];
}

export function todayStr(): string {
  return formatDate(new Date());
}

export function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function addDays(s: string, days: number): string {
  const d = parseDate(s);
  d.setDate(d.getDate() + days);
  return formatDate(d);
}

/** b - a（天）。正数表示 b 在 a 之后。 */
export function daysBetween(a: string, b: string): number {
  const da = parseDate(a).getTime();
  const db = parseDate(b).getTime();
  return Math.round((db - da) / 86_400_000);
}

/** 计算下次扣费日。从 start_date 出发，按 cycle 向前滚动，直到 ≥ 今天。 */
export function nextBillingDate(
  startDate: string,
  cycle: Cycle,
  customDays: number | null
): string {
  if (!startDate) return todayStr();
  const step = cycleToDays(cycle, customDays);
  if (step <= 0) return startDate;
  const today = todayStr();
  let cur = startDate;
  // 滚动直到 cur ≥ today（防御性兜底 1000 次，避免死循环）
  // daysBetween(cur, today) = today - cur；< 0 表示 cur 在 today 之后
  for (let i = 0; i < 1000; i++) {
    if (daysBetween(cur, today) <= 0) break;
    cur = addDays(cur, step);
  }
  return cur;
}
