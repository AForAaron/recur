import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type {
  Subscription,
  Category,
  AppSettings,
  Currency,
} from "@/types/subscription";
import { DEFAULT_CATEGORIES, DEFAULT_SETTINGS } from "@/types/subscription";
import { storage } from "@/utils/storage";
import { uuid } from "@/utils/id";
import { dailyCost, cumulativePaid, isTrialActive } from "@/utils/billing";
import { toCNY } from "@/utils/billing";
import { nextBillingDate, todayStr, daysBetween } from "@/utils/date";
import { USER_TEMPLATES } from "@/data/templates";

const KEY_SUBS = "subscriptions";
const KEY_CATS = "categories";
const KEY_SETTINGS = "settings";

/** 把用户私人模板转成可存入 store 的 Subscription */
function seedFromTemplates(): Subscription[] {
  const now = Date.now();
  return USER_TEMPLATES.map((t) => ({
    id: uuid(),
    name: t.name,
    icon: t.icon,
    amount: t.amount,
    currency: t.currency,
    cycle: t.cycle,
    cycle_days: t.cycle_days,
    start_date: t.default_start_date || todayStr(),
    next_billing_date: t.default_next_billing_date ?? null,
    status: (t.is_trial ? "trial" : "active") as Subscription["status"],
    is_trial: !!t.is_trial,
    trial_end_date: t.default_trial_end_date ?? null,
    trial_converts_to: (t.is_trial ? "manual" : null) as Subscription["trial_converts_to"],
    auto_renew: t.auto_renew !== undefined ? !!t.auto_renew : !t.is_trial,
    category_id: t.category_id,
    tags: [...t.tags],
    notes: t.notes,
    cancel_url: t.cancel_url,
    notify_channels: [...t.notify_channels],
    notify_days_before: [...t.notify_days_before],
    created_at: now,
    updated_at: now,
    archived_at: null,
  }));
}

export const useSubscriptionsStore = defineStore("subscriptions", () => {
  // 首次启动：若 localStorage 没数据，从 USER_TEMPLATES 载入种子
  let initialSubs = storage.get<Subscription[]>(KEY_SUBS, []);
  const hasSeeded = storage.get<boolean>("recur:seeded", false);
  if (initialSubs.length === 0 && !hasSeeded) {
    initialSubs = seedFromTemplates();
    storage.set(KEY_SUBS, initialSubs);
    storage.set("recur:seeded", true);
  }

  const subscriptions = ref<Subscription[]>(initialSubs);
  const categories = ref<Category[]>(storage.get<Category[]>(KEY_CATS, DEFAULT_CATEGORIES));
  const settings = ref<AppSettings>(storage.get<AppSettings>(KEY_SETTINGS, DEFAULT_SETTINGS));

  function persist(): void {
    storage.set(KEY_SUBS, subscriptions.value);
    storage.set(KEY_CATS, categories.value);
    storage.set(KEY_SETTINGS, settings.value);
  }

  // ============ CRUD ============
  function add(input: Omit<Subscription, "id" | "created_at" | "updated_at">): Subscription {
    const now = Date.now();
    const sub: Subscription = { ...input, id: uuid(), created_at: now, updated_at: now };
    subscriptions.value.push(sub);
    persist();
    return sub;
  }

  function update(id: string, patch: Partial<Subscription>): void {
    const idx = subscriptions.value.findIndex((s) => s.id === id);
    if (idx < 0) return;
    subscriptions.value[idx] = {
      ...subscriptions.value[idx],
      ...patch,
      updated_at: Date.now(),
    };
    persist();
  }

  function remove(id: string): void {
    subscriptions.value = subscriptions.value.filter((s) => s.id !== id);
    persist();
  }

  function archive(id: string): void {
    update(id, { archived_at: Date.now() });
  }

  function getById(id: string): Subscription | undefined {
    return subscriptions.value.find((s) => s.id === id);
  }

  // ============ 派生 ============
  /** 正式订阅中、活跃、未归档 */
  const active = computed(() =>
    subscriptions.value.filter(
      (s) => s.status === "active" && !s.is_trial && !s.archived_at
    )
  );

  /** 试用中、未取消、未归档 */
  const trials = computed(() =>
    subscriptions.value.filter(
      (s) => s.is_trial && s.status !== "cancelled" && !s.archived_at
    )
  );

  /** 已归档（含已取消） */
  const archived = computed(() => subscriptions.value.filter((s) => !!s.archived_at));

  // ============ RMB 折算聚合（所有跨币种统计都走这里） ============
  const rates = computed(() => settings.value.exchange_rates);

  /** 日均支出（RMB） */
  const totalDailyRMB = computed(() =>
    active.value.reduce(
      (sum, s) => sum + toCNY(dailyCost(s), s.currency, rates.value),
      0
    )
  );

  /** 月均支出（RMB） */
  const totalMonthlyRMB = computed(() =>
    active.value.reduce(
      (sum, s) => sum + toCNY(dailyCost(s) * 30, s.currency, rates.value),
      0
    )
  );

  /** 年均支出（RMB） */
  const totalYearlyRMB = computed(() =>
    active.value.reduce(
      (sum, s) => sum + toCNY(dailyCost(s) * 365, s.currency, rates.value),
      0
    )
  );

  /** 累计已付（RMB） */
  const totalCumulativeRMB = computed(() =>
    active.value.reduce(
      (sum, s) => sum + toCNY(cumulativePaid(s), s.currency, rates.value),
      0
    )
  );

  /** 把指定金额按当前汇率换算到 RMB */
  function cny(amount: number, currency: Currency): number {
    return toCNY(amount, currency, rates.value);
  }

  // ============ 时间轴 ============
  function upcoming(days: number) {
    const today = todayStr();
    const out: Array<{ sub: Subscription; daysLeft: number; date: string }> = [];
    for (const s of active.value) {
      if (!s.next_billing_date) continue;
      const left = daysBetween(today, s.next_billing_date);
      if (left >= 0 && left <= days) {
        out.push({ sub: s, daysLeft: left, date: s.next_billing_date });
      }
    }
    return out.sort((a, b) => a.daysLeft - b.daysLeft);
  }

  /** 把所有正式订阅的 next_billing_date 向今天之后滚动一次 */
  function rollForwardAll(): void {
    const today = todayStr();
    let changed = false;
    for (const s of subscriptions.value) {
      if (s.is_trial || s.status !== "active" || !s.next_billing_date) continue;
      const next = nextBillingDate(s.start_date, s.cycle, s.cycle_days);
      if (next !== s.next_billing_date && daysBetween(today, next) >= 0) {
        s.next_billing_date = next;
        s.updated_at = Date.now();
        changed = true;
      }
    }
    if (changed) persist();
  }

  function trialActive(sub: Subscription): boolean {
    return isTrialActive(sub);
  }

  /** 更新汇率（设置页用） */
  function updateRates(newRates: Record<string, number | undefined>): void {
    settings.value.exchange_rates = {
      ...settings.value.exchange_rates,
      ...newRates,
    } as Partial<Record<Currency, number>>;
    persist();
  }

  /** 移动订阅在数组中的位置（拖动排序的持久化） */
  function moveSubscription(
    id: string,
    direction: "top" | "up" | "down" | "bottom"
  ): boolean {
    const idx = subscriptions.value.findIndex((s) => s.id === id);
    if (idx < 0) return false;
    const [sub] = subscriptions.value.splice(idx, 1);
    let newIdx: number;
    switch (direction) {
      case "top":    newIdx = 0; break;
      case "bottom": newIdx = subscriptions.value.length; break;
      case "up":     newIdx = Math.max(0, idx - 1); break;
      case "down":   newIdx = Math.min(subscriptions.value.length, idx + 1); break;
    }
    subscriptions.value.splice(newIdx, 0, sub);
    persist();
    return true;
  }

  /**
   * 一键升级用户订阅数据：基于 USER_TEMPLATES 重新整理 store
   *  - 删除已废弃条目（如"CloudBase 试用"）
   *  - 补齐 USER_TEMPLATES 中所有缺失的订阅（不只是 CloudBase 大/小号）
   *  - 同步关键字段：currency / is_trial / trial_end_date / auto_renew
   *  - 不动用户已手动修改的字段（amount / dates / cancel_url 等）
   *  - 修复 next_billing_date 异常值（nextBillingDate bug 残留）
   */
  function upgradeUserData(): { changes: string[] } {
    const changes: string[] = [];

    // 1. 删除已废弃的"CloudBase 试用"
    const before = subscriptions.value.length;
    subscriptions.value = subscriptions.value.filter((s) => s.name !== "CloudBase 试用");
    if (subscriptions.value.length !== before) {
      changes.push(`删除旧 CloudBase 试用（${before - subscriptions.value.length} 条）`);
    }

    // 1.5 补齐缺失的分类（基于 DEFAULT_CATEGORIES；不动用户已自定义的分类）
    for (const cat of DEFAULT_CATEGORIES) {
      const exists = categories.value.find((c) => c.id === cat.id);
      if (!exists) {
        categories.value.push({ ...cat });
        changes.push(`新增分类 ${cat.name}`);
      }
    }

    // 2. 补齐 USER_TEMPLATES 中所有缺失的订阅
    for (const tpl of USER_TEMPLATES) {
      const exists = subscriptions.value.find((s) => s.name === tpl.name);
      if (exists) continue;
      const now = Date.now();
      subscriptions.value.push({
        id: cryptoRandomId(),
        name: tpl.name,
        icon: tpl.icon,
        amount: tpl.amount,
        currency: tpl.currency,
        cycle: tpl.cycle,
        cycle_days: tpl.cycle_days,
        start_date: tpl.default_start_date || todayStr(),
        next_billing_date: tpl.default_next_billing_date ?? null,
        status: tpl.is_trial ? "trial" : "active",
        is_trial: !!tpl.is_trial,
        trial_end_date: tpl.default_trial_end_date ?? null,
        trial_converts_to: tpl.is_trial ? "manual" : null,
        auto_renew: tpl.auto_renew !== undefined ? !!tpl.auto_renew : !tpl.is_trial,
        category_id: tpl.category_id,
        tags: [...tpl.tags],
        notes: tpl.notes,
        cancel_url: tpl.cancel_url,
        notify_channels: [...tpl.notify_channels],
        notify_days_before: [...tpl.notify_days_before],
        created_at: now,
        updated_at: now,
        archived_at: null,
      });
      changes.push(`新增 ${tpl.name}`);
    }

    // 3. 同步 USER_TEMPLATES 中的关键字段（不动 amount / cancel_url 等用户数据）
    for (const tpl of USER_TEMPLATES) {
      const sub = subscriptions.value.find((s) => s.name === tpl.name);
      if (!sub) continue;
      let modified = false;

      // 3a. 币种（修复如 Flowith USD→AUD）
      if (sub.currency !== tpl.currency) {
        changes.push(`${tpl.name} 币种 ${sub.currency} → ${tpl.currency}`);
        sub.currency = tpl.currency;
        modified = true;
      }

      // 3b. is_trial 标记
      const wantTrial = !!tpl.is_trial;
      if (sub.is_trial !== wantTrial) {
        changes.push(`${tpl.name} ${wantTrial ? "标记为试用" : "取消试用标记"}`);
        sub.is_trial = wantTrial;
        sub.status = wantTrial ? "trial" : "active";
        modified = true;
      }

      // 3c. trial_end_date（仅当模板有指定）
      if (tpl.default_trial_end_date && sub.trial_end_date !== tpl.default_trial_end_date) {
        sub.trial_end_date = tpl.default_trial_end_date;
        modified = true;
      }

      // 3d. auto_renew（仅当模板显式设置）
      if (tpl.auto_renew !== undefined && sub.auto_renew !== tpl.auto_renew) {
        changes.push(`${tpl.name} 自动续费 ${sub.auto_renew ? "是" : "否"} → ${tpl.auto_renew ? "是" : "否"}`);
        sub.auto_renew = !!tpl.auto_renew;
        modified = true;
      }

      // 3e. category_id（模板迁移时同步，如 澳洲电话卡/中国移动 改归 telecom）
      if (sub.category_id !== tpl.category_id) {
        changes.push(`${tpl.name} 分类 ${sub.category_id} → ${tpl.category_id}`);
        sub.category_id = tpl.category_id;
        modified = true;
      }

      if (modified) sub.updated_at = Date.now();
    }

    // 4. 修复 next_billing_date 异常值（不覆盖合理的日期）
    //    阈值：未来超过 10 年（之前 nextBillingDate bug 的残留），或过去 30 天以上
    const todayMs = new Date(todayStr()).getTime();
    for (const s of subscriptions.value) {
      if (s.is_trial || s.status !== "active" || !s.start_date || !s.next_billing_date) continue;
      const nextMs = new Date(s.next_billing_date).getTime();
      const daysDiff = (nextMs - todayMs) / 86_400_000;
      if (daysDiff < -30 || daysDiff > 3650) {
        const fixed = nextBillingDate(s.start_date, s.cycle, s.cycle_days);
        const oldVal = s.next_billing_date;
        s.next_billing_date = fixed;
        s.updated_at = Date.now();
        changes.push(`${s.name} 异常日期 ${oldVal} → ${fixed}`);
      }
    }

    persist();
    return { changes };
  }

  // cryptoRandomId 局部副本，避免循环依赖
  function cryptoRandomId(): string {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  return {
    // state
    subscriptions,
    categories,
    settings,
    // getters
    active,
    trials,
    archived,
    totalDailyRMB,
    totalMonthlyRMB,
    totalYearlyRMB,
    totalCumulativeRMB,
    // actions
    add,
    update,
    remove,
    archive,
    getById,
    upcoming,
    rollForwardAll,
    trialActive,
    cny,
    updateRates,
    moveSubscription,
    upgradeUserData,
    persist,
  };
});
