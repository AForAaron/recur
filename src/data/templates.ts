/**
 * Recur 订阅模板库
 *
 * 用途：在"添加订阅"页顶部展示快速选择，一键预填表单字段。
 * 每个模板只提供默认值，用户可在表单内任意修改。
 *
 * 注意：金额、币种是参考默认值，会随官方调价变化——用户最终以表单输入为准。
 */

import type { Cycle, Currency, NotifyChannel } from "@/types/subscription";

export interface SubscriptionTemplate {
  /** 唯一 id */
  id: string;
  /** 显示名 */
  name: string;
  /** 图标 emoji */
  icon: string;
  /** 单期金额 */
  amount: number;
  /** 币种 */
  currency: Currency;
  /** 计费周期 */
  cycle: Cycle;
  /** 自定义周期天数（cycle='custom' 时用） */
  cycle_days: number | null;
  /** 分类 id（见 DEFAULT_CATEGORIES） */
  category_id: string;
  /** 标签 */
  tags: string[];
  /** 备注 */
  notes: string;
  /** 退订链接（官方取消订阅页） */
  cancel_url: string | null;
  /** 默认提醒规则 */
  notify_channels: NotifyChannel[];
  notify_days_before: number[];
  /** 显示在"常用"快捷栏 */
  popular?: boolean;

  /** 用户实例的首次扣费日（可选）。applyTemplate 时填入 form.start_date。 */
  default_start_date?: string | null;
  /** 用户实例的下次扣费日（可选）。applyTemplate 时填入 form.next_billing_date。 */
  default_next_billing_date?: string | null;
  /** 用户实例的试用结束日（可选，is_trial=true 时用）。 */
  default_trial_end_date?: string | null;
  /** 用户实例是否标记为试用 */
  is_trial?: boolean;
  /** 用户实例是否开自动续费（默认：试用→false，否则→true） */
  auto_renew?: boolean;
}

/** 内置模板库（持续扩充中） */
export const TEMPLATES: SubscriptionTemplate[] = [
  // ============ AI 编程 / 对话 ============
  {
    id: "chatgpt-plus",
    name: "ChatGPT Plus",
    icon: "🤖",
    amount: 20,
    currency: "USD",
    cycle: "monthly",
    cycle_days: null,
    category_id: "ai",
    tags: ["AI", "OpenAI"],
    notes: "",
    cancel_url: "https://chatgpt.com/#settings/Subscription",
    notify_channels: ["web"],
    notify_days_before: [3, 1],
    popular: true,
  },
  {
    id: "chatgpt-team",
    name: "ChatGPT Team",
    icon: "🤖",
    amount: 25,
    currency: "USD",
    cycle: "monthly",
    cycle_days: null,
    category_id: "ai",
    tags: ["AI", "OpenAI"],
    notes: "按席位计费",
    cancel_url: "https://chatgpt.com/#settings/Subscription",
    notify_channels: ["web"],
    notify_days_before: [7, 3],
  },
  {
    id: "chatgpt-pro",
    name: "ChatGPT Pro",
    icon: "🤖",
    amount: 200,
    currency: "USD",
    cycle: "monthly",
    cycle_days: null,
    category_id: "ai",
    tags: ["AI", "OpenAI"],
    notes: "高阶推理额度",
    cancel_url: "https://chatgpt.com/#settings/Subscription",
    notify_channels: ["web"],
    notify_days_before: [7, 3, 1],
  },
  {
    id: "claude-pro",
    name: "Claude Pro",
    icon: "✳️",
    amount: 20,
    currency: "USD",
    cycle: "monthly",
    cycle_days: null,
    category_id: "ai",
    tags: ["AI", "Anthropic"],
    notes: "",
    cancel_url: "https://claude.ai/settings/billing",
    notify_channels: ["web"],
    notify_days_before: [3, 1],
    popular: true,
  },
  {
    id: "claude-max",
    name: "Claude Max",
    icon: "✳️",
    amount: 100,
    currency: "USD",
    cycle: "monthly",
    cycle_days: null,
    category_id: "ai",
    tags: ["AI", "Anthropic"],
    notes: "5x 用量额度",
    cancel_url: "https://claude.ai/settings/billing",
    notify_channels: ["web"],
    notify_days_before: [7, 3],
  },
  {
    id: "cursor-pro",
    name: "Cursor Pro",
    icon: "⌨️",
    amount: 20,
    currency: "USD",
    cycle: "monthly",
    cycle_days: null,
    category_id: "tools",
    tags: ["AI", "IDE"],
    notes: "",
    cancel_url: "https://www.cursor.com/settings",
    notify_channels: ["web"],
    notify_days_before: [3, 1],
    popular: true,
  },
  {
    id: "github-copilot",
    name: "GitHub Copilot",
    icon: "🐙",
    amount: 10,
    currency: "USD",
    cycle: "monthly",
    cycle_days: null,
    category_id: "tools",
    tags: ["AI", "开发"],
    notes: "",
    cancel_url: "https://github.com/settings/billing",
    notify_channels: ["web"],
    notify_days_before: [3, 1],
    popular: true,
  },
  {
    id: "perplexity-pro",
    name: "Perplexity Pro",
    icon: "🔍",
    amount: 20,
    currency: "USD",
    cycle: "monthly",
    cycle_days: null,
    category_id: "ai",
    tags: ["AI", "搜索"],
    notes: "",
    cancel_url: "https://www.perplexity.ai/settings",
    notify_channels: ["web"],
    notify_days_before: [3, 1],
  },
  {
    id: "midjourney",
    name: "Midjourney",
    icon: "🎨",
    amount: 10,
    currency: "USD",
    cycle: "monthly",
    cycle_days: null,
    category_id: "ai",
    tags: ["AI", "图像"],
    notes: "Basic Plan",
    cancel_url: "https://www.midjourney.com/account",
    notify_channels: ["web"],
    notify_days_before: [3, 1],
  },

  // ============ 视频 / 娱乐 ============
  {
    id: "netflix-standard",
    name: "Netflix",
    icon: "🎬",
    amount: 15.49,
    currency: "USD",
    cycle: "monthly",
    cycle_days: null,
    category_id: "entertainment",
    tags: ["视频"],
    notes: "Standard with Ads",
    cancel_url: "https://www.netflix.com/cancelplan",
    notify_channels: ["web"],
    notify_days_before: [3, 1],
    popular: true,
  },
  {
    id: "disney-plus",
    name: "Disney+",
    icon: "🏰",
    amount: 13.99,
    currency: "USD",
    cycle: "monthly",
    cycle_days: null,
    category_id: "entertainment",
    tags: ["视频"],
    notes: "Premium",
    cancel_url: "https://www.disneyplus.com/account/subscription",
    notify_channels: ["web"],
    notify_days_before: [3, 1],
  },
  {
    id: "youtube-premium",
    name: "YouTube Premium",
    icon: "▶️",
    amount: 13.99,
    currency: "USD",
    cycle: "monthly",
    cycle_days: null,
    category_id: "entertainment",
    tags: ["视频"],
    notes: "",
    cancel_url: "https://www.youtube.com/paid_memberships",
    notify_channels: ["web"],
    notify_days_before: [3, 1],
    popular: true,
  },
  {
    id: "apple-tv-plus",
    name: "Apple TV+",
    icon: "📺",
    amount: 9.99,
    currency: "USD",
    cycle: "monthly",
    cycle_days: null,
    category_id: "entertainment",
    tags: ["视频"],
    notes: "",
    cancel_url: "https://support.apple.com/HT207594",
    notify_channels: ["web"],
    notify_days_before: [3, 1],
  },

  // ============ 音乐 ============
  {
    id: "spotify-premium",
    name: "Spotify Premium",
    icon: "🎵",
    amount: 11.99,
    currency: "USD",
    cycle: "monthly",
    cycle_days: null,
    category_id: "music",
    tags: ["音乐"],
    notes: "",
    cancel_url: "https://www.spotify.com/account/subscription/",
    notify_channels: ["web"],
    notify_days_before: [3, 1],
    popular: true,
  },
  {
    id: "apple-music",
    name: "Apple Music",
    icon: "🎶",
    amount: 10.99,
    currency: "USD",
    cycle: "monthly",
    cycle_days: null,
    category_id: "music",
    tags: ["音乐"],
    notes: "",
    cancel_url: "https://support.apple.com/HT207594",
    notify_channels: ["web"],
    notify_days_before: [3, 1],
  },

  // ============ 云存储 ============
  {
    id: "icloud-plus",
    name: "iCloud+",
    icon: "☁️",
    amount: 2.99,
    currency: "USD",
    cycle: "monthly",
    cycle_days: null,
    category_id: "cloud",
    tags: ["云存储"],
    notes: "200GB",
    cancel_url: "https://support.apple.com/HT207594",
    notify_channels: ["web"],
    notify_days_before: [3, 1],
  },
  {
    id: "google-one",
    name: "Google One",
    icon: "☁️",
    amount: 1.99,
    currency: "USD",
    cycle: "monthly",
    cycle_days: null,
    category_id: "cloud",
    tags: ["云存储"],
    notes: "100GB",
    cancel_url: "https://one.google.com/storage/management",
    notify_channels: ["web"],
    notify_days_before: [3, 1],
  },

  // ============ 效率工具 ============
  {
    id: "notion-plus",
    name: "Notion Plus",
    icon: "📝",
    amount: 10,
    currency: "USD",
    cycle: "monthly",
    cycle_days: null,
    category_id: "tools",
    tags: ["笔记"],
    notes: "",
    cancel_url: "https://www.notion.so/settings",
    notify_channels: ["web"],
    notify_days_before: [3, 1],
    popular: true,
  },
  {
    id: "figma-professional",
    name: "Figma Professional",
    icon: "🎨",
    amount: 15,
    currency: "USD",
    cycle: "monthly",
    cycle_days: null,
    category_id: "tools",
    tags: ["设计"],
    notes: "",
    cancel_url: "https://www.figma.com/settings",
    notify_channels: ["web"],
    notify_days_before: [3, 1],
  },
  {
    id: "1password",
    name: "1Password",
    icon: "🔐",
    amount: 2.99,
    currency: "USD",
    cycle: "monthly",
    cycle_days: null,
    category_id: "tools",
    tags: ["密码"],
    notes: "",
    cancel_url: "https://my.1password.com/billing",
    notify_channels: ["web"],
    notify_days_before: [3, 1],
  },
  {
    id: "microsoft-365",
    name: "Microsoft 365",
    icon: "📊",
    amount: 9.99,
    currency: "USD",
    cycle: "monthly",
    cycle_days: null,
    category_id: "tools",
    tags: ["办公"],
    notes: "",
    cancel_url: "https://account.microsoft.com/services",
    notify_channels: ["web"],
    notify_days_before: [3, 1],
  },
  {
    id: "adobe-cc",
    name: "Adobe Creative Cloud",
    icon: "🎨",
    amount: 54.99,
    currency: "USD",
    cycle: "monthly",
    cycle_days: null,
    category_id: "tools",
    tags: ["设计"],
    notes: "",
    cancel_url: "https://account.adobe.com/plans",
    notify_channels: ["web"],
    notify_days_before: [7, 3],
  },

  // ============ 中文服务 ============
  {
    id: "bilibili-bigvip",
    name: "B站大会员",
    icon: "📺",
    amount: 168,
    currency: "CNY",
    cycle: "yearly",
    cycle_days: null,
    category_id: "entertainment",
    tags: ["视频"],
    notes: "年度大会员",
    cancel_url: "https://account.bilibili.com/account/bigVip",
    notify_channels: ["web"],
    notify_days_before: [14, 7, 3],
    popular: true,
  },
  {
    id: "netease-music",
    name: "网易云音乐",
    icon: "🎵",
    amount: 15,
    currency: "CNY",
    cycle: "monthly",
    cycle_days: null,
    category_id: "music",
    tags: ["音乐"],
    notes: "黑胶 VIP",
    cancel_url: "https://music.163.com/member",
    notify_channels: ["web"],
    notify_days_before: [3, 1],
  },
  {
    id: "baidu-netdisk-svip",
    name: "百度网盘 SVIP",
    icon: "💾",
    amount: 263,
    currency: "CNY",
    cycle: "yearly",
    cycle_days: null,
    category_id: "cloud",
    tags: ["云存储"],
    notes: "",
    cancel_url: "https://pan.baidu.com/buy/center",
    notify_channels: ["web"],
    notify_days_before: [14, 7, 3],
  },
  {
    id: "aliyun-pan",
    name: "阿里云盘会员",
    icon: "💾",
    amount: 15,
    currency: "CNY",
    cycle: "monthly",
    cycle_days: null,
    category_id: "cloud",
    tags: ["云存储"],
    notes: "SVIP",
    cancel_url: "https://www.alipan.com/vip",
    notify_channels: ["web"],
    notify_days_before: [3, 1],
  },
  {
    id: "tencent-video",
    name: "腾讯视频 VIP",
    icon: "📺",
    amount: 253,
    currency: "CNY",
    cycle: "yearly",
    cycle_days: null,
    category_id: "entertainment",
    tags: ["视频"],
    notes: "",
    cancel_url: "https://v.qq.com/u/",
    notify_channels: ["web"],
    notify_days_before: [14, 7, 3],
  },
  {
    id: "iqiyi",
    name: "爱奇艺",
    icon: "📺",
    amount: 248,
    currency: "CNY",
    cycle: "yearly",
    cycle_days: null,
    category_id: "entertainment",
    tags: ["视频"],
    notes: "黄金 VIP 年卡",
    cancel_url: "https://www.iqiyi.com/u/",
    notify_channels: ["web"],
    notify_days_before: [14, 7, 3],
  },
];

/** 获取标记为 popular 的模板（首页快速栏用） */
export function getPopularTemplates(): SubscriptionTemplate[] {
  return TEMPLATES.filter((t) => t.popular);
}

/** 按分类筛选 */
export function getTemplatesByCategory(categoryId: string): SubscriptionTemplate[] {
  return TEMPLATES.filter((t) => t.category_id === categoryId);
}

/** 按 id 查 */
export function getTemplateById(id: string): SubscriptionTemplate | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

/** 模糊搜索 */
export function searchTemplates(keyword: string): SubscriptionTemplate[] {
  const kw = keyword.trim().toLowerCase();
  if (!kw) return TEMPLATES;
  return TEMPLATES.filter(
    (t) =>
      t.name.toLowerCase().includes(kw) ||
      t.tags.some((tag) => tag.toLowerCase().includes(kw))
  );
}

/* ============================================================
 * 用户私人订阅模板 —— 从 gitignore 的本地文件加载
 *
 * 真实订阅数据存在 src/data/user-templates.local.ts（不进版本控制）。
 * 用 import.meta.glob 动态加载：文件不存在时返回空对象，回退为空数组，
 * 因此新克隆的仓库可以直接构建，只是没有种子数据。
 *
 * 重建本地文件：cp src/data/user-templates.example.ts src/data/user-templates.local.ts
 * ============================================================ */

const _localModules = import.meta.glob<{ USER_TEMPLATES: SubscriptionTemplate[] }>(
  "./user-templates.local.ts",
  { eager: true }
);

export const USER_TEMPLATES: SubscriptionTemplate[] =
  Object.values(_localModules)[0]?.USER_TEMPLATES ?? [];
