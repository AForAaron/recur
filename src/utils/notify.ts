/**
 * 浏览器通知 + Service Worker 注册
 *
 * 提醒策略（MVP）：
 *  - 每次 App 启动时检查一次"未来 N 天会扣费的订阅"
 *  - 对每条订阅，根据 notify_days_before 提前几天提示
 *  - 用户授权通知权限后才能弹出
 *  - 已发送过的（按 today+subId+days 维度）24 小时内不重复
 *
 * 限制：浏览器通知只在页面打开时触发；真正的"定时推送"需要云函数，阶段 2 实现。
 */

const REMINDED_KEY = "recur:notified";
const PERMISSION_KEY = "recur:notify:permission";

interface NotifiedMap {
  [key: string]: number;  // key = `${subId}-${daysLeft}` → unix ms
}

function getReminded(): NotifiedMap {
  try {
    return JSON.parse(uni.getStorageSync(REMINDED_KEY) || "{}");
  } catch {
    return {};
  }
}

function setReminded(map: NotifiedMap): void {
  uni.setStorageSync(REMINDED_KEY, JSON.stringify(map));
}

function makeKey(subId: string, daysLeft: number, today: string): string {
  return `${today}-${subId}-${daysLeft}`;
}

/** 注册 Service Worker（H5 端） */
export async function registerServiceWorker(): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    await navigator.serviceWorker.register("/static/sw.js");
  } catch (e) {
    console.warn("[notify] SW 注册失败", e);
  }
}

/** 请求通知权限 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof Notification === "undefined") return "denied";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  const result = await Notification.requestPermission();
  uni.setStorageSync(PERMISSION_KEY, result);
  return result;
}

/** 当前权限 */
export function notificationPermission(): NotificationPermission {
  if (typeof Notification === "undefined") return "denied";
  return Notification.permission;
}

/** 直接通过主页面 Notification 弹（无需 SW） */
export function showNotification(title: string, body?: string, url?: string): void {
  if (typeof Notification === "undefined") return;
  if (Notification.permission !== "granted") return;
  try {
    const n = new Notification(title, {
      body,
      icon: "/static/icon-192.png",
      tag: "recur",
    });
    if (url) n.onclick = () => window.focus();
  } catch (e) {
    console.warn("[notify] 弹通知失败", e);
  }
}

/**
 * 检查所有订阅，对未来 N 天内会扣费/结束的项发出提醒。
 * 仅在 H5 端可用（小程序/App 用各自的通知通道，阶段 2 实现）。
 */
export function checkAndNotify(
  subscriptions: Array<{
    id: string;
    name: string;
    icon: string;
    next_billing_date: string | null;
    is_trial: boolean;
    trial_end_date: string | null;
    notify_days_before: number[];
  }>,
  daysAhead = 30
): { sent: number } {
  if (typeof window === "undefined") return { sent: 0 };
  if (typeof Notification === "undefined" || Notification.permission !== "granted") {
    return { sent: 0 };
  }

  const today = new Date().toISOString().slice(0, 10);
  const reminded = getReminded();
  let sent = 0;
  const now = Date.now();

  for (const s of subscriptions) {
    const targetDate = s.is_trial ? s.trial_end_date : s.next_billing_date;
    if (!targetDate) continue;
    const diffDays = Math.round(
      (new Date(targetDate).getTime() - new Date(today).getTime()) / 86_400_000
    );
    if (diffDays < 0 || diffDays > daysAhead) continue;

    for (const d of s.notify_days_before) {
      if (d !== diffDays) continue;
      const key = makeKey(s.id, d, today);
      const last = reminded[key] || 0;
      // 24 小时内不重复
      if (now - last < 86_400_000) continue;

      const title = s.is_trial
        ? `${s.icon} ${s.name} 试用还剩 ${d} 天`
        : `${s.icon} ${s.name} ${d} 天后扣费`;
      const body = s.is_trial
        ? `届时将${s.is_trial ? "转为付费" : ""}，请确认是否继续`
        : `提前提醒，可提前取消避免扣费`;

      showNotification(title, body);
      reminded[key] = now;
      sent++;
    }
  }

  setReminded(reminded);
  return { sent };
}
