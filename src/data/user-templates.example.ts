/**
 * 用户私人订阅模板 —— **示例文件（假数据）**
 *
 * 真实数据放在同目录的 user-templates.local.ts，该文件被 .gitignore 排除。
 * 重建本地文件：
 *
 *     cp src/data/user-templates.example.ts src/data/user-templates.local.ts
 *
 * 然后把下面的假数据换成你自己的订阅即可。字段含义见 templates.ts 的
 * SubscriptionTemplate 接口。
 *
 * 说明：这些模板会在 store 首次初始化时作为种子数据载入（仅当 localStorage 为空）。
 * 已 seed 之后新增的条目，需在「设置」页点「升级订阅数据」触发
 * store.upgradeUserData() 才会写入 localStorage。
 */

import type { SubscriptionTemplate } from "./templates";

export const USER_TEMPLATES: SubscriptionTemplate[] = [
  {
    id: "user-example-monthly",
    name: "示例 · 月付订阅",
    icon: "🧪",
    amount: 20,
    currency: "USD",
    cycle: "monthly",
    cycle_days: null,
    category_id: "ai",
    tags: ["示例"],
    notes: "每月 26 号扣费 · 已开自动续费",
    cancel_url: "https://example.com/cancel",
    notify_channels: ["web"],
    notify_days_before: [7, 3, 1],
    popular: true,
    default_start_date: "2026-02-26",
    default_next_billing_date: "2026-10-26",
    is_trial: false,
    auto_renew: true,
  },
  {
    id: "user-example-yearly",
    name: "示例 · 年付订阅",
    icon: "📦",
    amount: 359.28,
    currency: "AUD",
    cycle: "yearly",
    cycle_days: null,
    category_id: "tools",
    tags: ["示例"],
    notes: "年费会员 · 到期 2026-12-28 · 不自动续费",
    cancel_url: null,
    notify_channels: ["web"],
    notify_days_before: [30, 14, 7, 3],
    popular: true,
    default_start_date: "2025-12-28",
    default_next_billing_date: "2026-12-28",
    is_trial: false,
    auto_renew: false,
  },
  {
    id: "user-example-trial",
    name: "示例 · 限期试用",
    icon: "⏳",
    amount: 0,
    currency: "CNY",
    cycle: "yearly",
    cycle_days: null,
    category_id: "cloud",
    tags: ["示例", "试用"],
    notes: "免费套餐 · 有效期至 2027-01-22",
    cancel_url: null,
    notify_channels: ["web"],
    notify_days_before: [30, 14, 7, 3],
    popular: true,
    default_start_date: "2026-01-22",
    default_next_billing_date: null,
    default_trial_end_date: "2027-01-22",
    is_trial: true,
    auto_renew: false,
  },
  {
    id: "user-example-custom-cycle",
    name: "示例 · 自定义周期",
    icon: "🔁",
    amount: 38.8,
    currency: "CNY",
    cycle: "custom",
    cycle_days: 456, // 15 个月
    category_id: "cloud",
    tags: ["示例"],
    notes: "15 个月一次性 · 下单 2025-11-17",
    cancel_url: null,
    notify_channels: ["web"],
    notify_days_before: [30, 7],
    popular: false,
    default_start_date: "2025-11-17",
    default_next_billing_date: null,
    default_trial_end_date: "2028-02-17",
    is_trial: false,
    auto_renew: false,
  },
];
