/**
 * Recur 数据模型定义
 * 字段基于 handoff.md §3 数据模型确定
 */

export type Cycle = "daily" | "weekly" | "monthly" | "quarterly" | "yearly" | "custom";
export type Currency = "CNY" | "USD" | "EUR" | "GBP" | "JPY" | "HKD" | "AUD" | "SGD" | "THB" | "MYR";
export type Status = "active" | "trial" | "paused" | "cancelled";
export type TrialConvertsTo = "paid" | "auto_end" | "manual" | null;
export type NotifyChannel = "web" | "wx_sub" | "ios" | "android";
export type Theme = "auto" | "light" | "dark";

/** 一条订阅记录 */
export interface Subscription {
  id: string;
  name: string;
  icon: string;                       // emoji 或图片 URL
  amount: number;
  currency: Currency;
  cycle: Cycle;
  cycle_days: number | null;          // cycle='custom' 时必填
  start_date: string;                 // ISO 'YYYY-MM-DD'
  next_billing_date: string | null;   // 试用 = null
  status: Status;
  is_trial: boolean;                  // 冗余字段，方便索引
  trial_end_date: string | null;
  trial_converts_to: TrialConvertsTo; // 试用结束后行为（用户已选：manual）
  auto_renew: boolean;
  category_id: string;
  tags: string[];
  cancel_url: string | null;
  notes: string;
  notify_channels: NotifyChannel[];
  notify_days_before: number[];       // [7, 3, 1]
  created_at: number;                 // unix ms
  updated_at: number;
  archived_at: number | null;
}

/** 分类 */
export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  sort_order: number;
}

/** 扣费流水（阶段 2 引入） */
export interface BillingRecord {
  id: string;
  subscription_id: string;
  billing_date: string;
  amount: number;
  currency: Currency;
  is_trial_record: boolean;
  note: string | null;
  created_at: number;
}

/** 全局设置 */
export interface AppSettings {
  default_currency: Currency;
  exchange_rates: Partial<Record<Currency, number>>;
  theme: Theme;
  notifications_enabled: boolean;
  default_notify_channels: NotifyChannel[];
  default_notify_days_before: number[];
}

/** 默认分类（启动时初始化） */
export const DEFAULT_CATEGORIES: Category[] = [
  { id: "entertainment", name: "娱乐",  icon: "🎬", color: "#FF6B6B", sort_order: 1  },
  { id: "tools",         name: "工具",  icon: "🛠️", color: "#4ECDC4", sort_order: 2  },
  { id: "ai",            name: "AI",    icon: "🤖", color: "#5B6CFF", sort_order: 3  },
  { id: "telecom",       name: "通讯",  icon: "📞", color: "#14B8A6", sort_order: 4  },
  { id: "cloud",         name: "云存储", icon: "☁️", color: "#45B7D1", sort_order: 5  },
  { id: "music",         name: "音乐",  icon: "🎵", color: "#FFA07A", sort_order: 6  },
  { id: "reading",       name: "阅读",  icon: "📚", color: "#9B59B6", sort_order: 7  },
  { id: "fitness",       name: "健身",  icon: "💪", color: "#2ECC71", sort_order: 8  },
  { id: "insurance",     name: "保险",  icon: "🛡️", color: "#34495E", sort_order: 9  },
  { id: "other",         name: "其他",  icon: "📦", color: "#95A5A6", sort_order: 99 },
];

/** 默认设置 */
export const DEFAULT_SETTINGS: AppSettings = {
  default_currency: "CNY",
  exchange_rates: {
    CNY: 1,
    USD: 7.2,
    EUR: 7.8,
    GBP: 9.0,
    JPY: 0.05,
    HKD: 0.92,
    AUD: 4.65,
    SGD: 5.35,
    THB: 0.21,
    MYR: 1.60,
  },
  theme: "auto",
  notifications_enabled: true,
  default_notify_channels: ["web"],
  default_notify_days_before: [7, 3, 1],
};
