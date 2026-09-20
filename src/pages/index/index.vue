<template>
  <view class="page">
    <!-- KPI（统一以 RMB 显示） -->
    <view class="kpi">
      <view class="kpi-item">
        <text class="kpi-label">本月</text>
        <text class="kpi-value">¥{{ Math.round(store.totalMonthlyRMB) }}</text>
      </view>
      <view class="kpi-divider"></view>
      <view class="kpi-item">
        <text class="kpi-label">日均</text>
        <text class="kpi-value">¥{{ store.totalDailyRMB.toFixed(1) }}</text>
      </view>
      <view class="kpi-divider"></view>
      <view class="kpi-item">
        <text class="kpi-label">试用</text>
        <text class="kpi-value">{{ store.trials.length }}</text>
      </view>
    </view>

    <!-- 未来扣费时间轴 -->
    <view v-if="upcoming7.length > 0" class="timeline">
      <view class="timeline-header">
        <text class="section-title">未来 7 天</text>
        <text class="timeline-count">{{ upcoming7.length }} 笔 · ¥{{ Math.round(totalUpcomingRMB) }}</text>
      </view>
      <scroll-view scroll-x class="timeline-scroll">
        <view class="timeline-row">
          <view
            v-for="u in upcoming7"
            :key="u.sub.id"
            class="timeline-card"
            @click="goDetail(u.sub.id)"
          >
            <text class="timeline-day">剩 {{ u.daysLeft }} 天</text>
            <text class="timeline-icon">{{ u.sub.icon }}</text>
            <text class="timeline-name">{{ u.sub.name }}</text>
            <text class="timeline-amount">{{ formatAmount(u.sub.amount, u.sub.currency) }}</text>
            <text v-if="u.sub.currency !== 'CNY'" class="timeline-cny">≈ ¥{{ store.cny(u.sub.amount, u.sub.currency).toFixed(0) }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- Tab + 排序 -->
    <view class="tabs-row">
      <view class="tabs" role="tablist" aria-label="订阅筛选">
        <view
          v-for="t in tabs"
          :key="t.value"
          class="tab"
          :class="{ active: activeTab === t.value }"
          role="tab"
          :aria-label="`${t.label}，${t.count} 项`"
          :aria-selected="activeTab === t.value"
          :tabindex="activeTab === t.value ? 0 : -1"
          @click="activeTab = t.value"
        >
          <text>{{ t.label }}</text>
          <text class="tab-count">{{ t.count }}</text>
        </view>
      </view>
      <view
        class="sort-btn"
        role="button"
        aria-label="排序方式"
        tabindex="0"
        @click="sortPopupOpen = true"
      >
        <text class="sort-icon" aria-hidden="true">⇅</text>
      </view>
    </view>

    <!-- 列表 -->
    <view v-if="sortedList.length === 0" class="empty">
      <text class="empty-icon">📭</text>
      <text class="empty-text">{{ emptyText }}</text>
      <view class="empty-btn" @click="goAdd">添加订阅</view>
    </view>

    <view v-else class="list">
      <view
        v-for="(sub, idx) in sortedList"
        :key="sub.id"
        class="card"
        role="button"
        tabindex="0"
        :aria-label="cardAriaLabel(sub)"
        @click="goDetail(sub.id)"
        @longpress="onLongPress(sub)"
      >
        <view class="card-left">
          <text class="card-icon" aria-hidden="true">{{ sub.icon }}</text>
        </view>
        <view class="card-main">
          <view class="card-title-row">
            <text class="card-name">{{ sub.name }}</text>
            <view v-if="sub.is_trial" class="badge badge-trial">试用</view>
            <view v-if="!sub.auto_renew && !sub.is_trial && sub.status === 'active'" class="badge badge-nonrenew">非自动续费</view>
          </view>
          <view class="card-meta">
            <text class="card-cycle">{{ cycleLabel(sub.cycle, sub.cycle_days) }} · 日均 ¥{{ store.cny(dailyCost(sub), sub.currency).toFixed(2) }}</text>
          </view>
        </view>
        <view class="card-right">
          <text class="card-amount">{{ formatAmount(sub.amount, sub.currency) }}</text>
          <text v-if="sub.currency !== 'CNY'" class="card-cny">≈ ¥{{ store.cny(sub.amount, sub.currency).toFixed(0) }}</text>
          <text class="card-next">{{ nextBillingLabel(sub) }}</text>
        </view>
      </view>
    </view>

    <!-- FAB -->
    <view class="fab" role="button" aria-label="添加订阅" tabindex="0" @click="goAdd">
      <text class="fab-icon" aria-hidden="true">+</text>
    </view>

    <!-- 排序 popup -->
    <view v-if="sortPopupOpen" class="popup-mask" @click="sortPopupOpen = false">
      <view class="popup-sheet" @click.stop>
        <view class="popup-title">排序方式</view>
        <view
          v-for="opt in sortOptions"
          :key="opt.value"
          class="popup-item"
          :class="{ active: sortBy === opt.value }"
          @click="pickSort(opt.value)"
        >
          <text class="popup-name">{{ opt.label }}</text>
          <text v-if="sortBy === opt.value" class="popup-check">✓</text>
        </view>
        <view class="popup-cancel" @click="sortPopupOpen = false">取消</view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { onShow, onPullDownRefresh } from "@dcloudio/uni-app";
import { useSubscriptionsStore } from "@/store/subscriptions";
import {
  dailyCost,
  monthlyCost,
  cumulativePaid,
  daysUntilNextBilling,
  trialDaysRemaining,
} from "@/utils/billing";
import { formatAmount } from "@/utils/format";
import type { Subscription, Cycle } from "@/types/subscription";

const store = useSubscriptionsStore();
onShow(() => store.rollForwardAll());

// ====== Tab ======
type TabValue = "all" | "active" | "trial" | "non_renewing";
const activeTab = ref<TabValue>("all");

const tabs = computed(() => [
  { value: "all" as TabValue,           label: "全部",       count: store.subscriptions.filter(s => !s.archived_at).length },
  { value: "active" as TabValue,        label: "正式",       count: store.active.length },
  { value: "trial" as TabValue,         label: "试用",       count: store.trials.length },
  { value: "non_renewing" as TabValue,  label: "非自动续费", count: store.subscriptions.filter(s => !s.archived_at && !s.auto_renew && !s.is_trial && s.status === 'active').length },
]);

// ====== 筛选 + 排序 ======
const filteredList = computed(() => {
  const list = store.subscriptions.filter(s => !s.archived_at);
  switch (activeTab.value) {
    case "active":       return list.filter(s => !s.is_trial && s.status !== "cancelled");
    case "trial":        return list.filter(s => s.is_trial && s.status !== "cancelled");
    case "non_renewing": return list.filter(s => !s.auto_renew && !s.is_trial && s.status === "active");
    default:             return list;
  }
});

type SortBy = "manual" | "next" | "price_desc" | "price_asc" | "name" | "cumulative" | "created";
const sortBy = ref<SortBy>("price_desc");

const sortOptions: Array<{ value: SortBy; label: string }> = [
  { value: "next",         label: "下次扣费日（近→远）" },
  { value: "price_desc",   label: "月均价格（高→低）" },
  { value: "price_asc",    label: "月均价格（低→高）" },
  { value: "cumulative",   label: "累计已付（多→少）" },
  { value: "name",         label: "名称（A→Z）" },
  { value: "created",      label: "添加时间（新→旧）" },
];

const sortedList = computed(() => {
  const arr = [...filteredList.value];
  switch (sortBy.value) {
    case "price_desc":
      return arr.sort((a, b) =>
        store.cny(monthlyCost(b), b.currency) - store.cny(monthlyCost(a), a.currency)
      );
    case "price_asc":
      return arr.sort((a, b) =>
        store.cny(monthlyCost(a), a.currency) - store.cny(monthlyCost(b), b.currency)
      );
    case "cumulative":
      return arr.sort((a, b) =>
        store.cny(cumulativePaid(b), b.currency) - store.cny(cumulativePaid(a), a.currency)
      );
    case "name":
      return arr.sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
    case "created":
      return arr.sort((a, b) => b.created_at - a.created_at);
    case "next":
    default:
      return arr.sort((a, b) => {
        const ka = a.next_billing_date || a.trial_end_date || "9999-12-31";
        const kb = b.next_billing_date || b.trial_end_date || "9999-12-31";
        return ka.localeCompare(kb);
      });
  }
});

const sortPopupOpen = ref(false);
function pickSort(v: SortBy) {
  sortBy.value = v;
  sortPopupOpen.value = false;
  uni.showToast({ title: "已应用排序", icon: "none" });
}

// ====== 时间轴 ======
const upcoming7 = computed(() => store.upcoming(7));
const totalUpcomingRMB = computed(() =>
  upcoming7.value.reduce((sum, u) => sum + store.cny(u.sub.amount, u.sub.currency), 0)
);

const emptyText = computed(() => {
  if (activeTab.value === "active") return "还没有正式订阅";
  if (activeTab.value === "trial") return "当前没有试用中的订阅";
  if (activeTab.value === "non_renewing") return "当前没有非自动续费的订阅";
  return "点右下角 + 开始记录你的第一笔订阅";
});

// ====== 格式化 ======
function cycleLabel(cycle: Cycle, customDays: number | null): string {
  const map: Record<Cycle, string> = { daily: "日", weekly: "周", monthly: "月", quarterly: "季", yearly: "年", custom: `${customDays || 0}天` };
  return `${map[cycle]}费`;
}

function nextBillingLabel(sub: Subscription): string {
  if (sub.is_trial) {
    const left = trialDaysRemaining(sub);
    if (left === 0) return "今日到期";
    return `${left} 天后结束`;
  }
  const d = daysUntilNextBilling(sub);
  if (d === null) return "未设定";
  if (d === 0) return "今日扣费";
  return `${d} 天后`;
}

/** 卡片无障碍标签：把视觉上分散的信息合成一句话 */
function cardAriaLabel(sub: Subscription): string {
  const parts = [sub.name, formatAmount(sub.amount, sub.currency)];
  if (sub.currency !== "CNY") {
    parts.push(`约合 ${store.cny(sub.amount, sub.currency).toFixed(0)} 元`);
  }
  parts.push(cycleLabel(sub.cycle, sub.cycle_days));
  parts.push(nextBillingLabel(sub));
  if (sub.is_trial) parts.push("试用中");
  else if (!sub.auto_renew && sub.status === "active") parts.push("非自动续费");
  return parts.join("，");
}

// ====== 导航 ======
function goAdd() { uni.navigateTo({ url: "/pages/add/add" }); }
function goDetail(id: string) { uni.navigateTo({ url: `/pages/detail/detail?id=${id}` }); }

// ====== 长按菜单 ======
function onLongPress(sub: Subscription) {
  uni.showActionSheet({
    itemList: ["编辑", "↑ 上移", "↓ 下移", "⤒ 移到顶部", "⤓ 移到底部", "删除"],
    success: (e) => {
      switch (e.tapIndex) {
        case 0: uni.navigateTo({ url: `/pages/add/add?id=${sub.id}` }); break;
        case 1: if (store.moveSubscription(sub.id, "up")) uni.showToast({ title: "已上移", icon: "none" }); break;
        case 2: if (store.moveSubscription(sub.id, "down")) uni.showToast({ title: "已下移", icon: "none" }); break;
        case 3: if (store.moveSubscription(sub.id, "top")) uni.showToast({ title: "已置顶", icon: "none" }); break;
        case 4: if (store.moveSubscription(sub.id, "bottom")) uni.showToast({ title: "已置底", icon: "none" }); break;
        case 5:
          uni.showModal({
            title: "确认删除",
            content: `删除「${sub.name}」将无法恢复`,
            success: (r) => {
              if (r.confirm) {
                store.remove(sub.id);
                uni.showToast({ title: "已删除" });
              }
            },
          });
          break;
      }
    },
  });
}

onPullDownRefresh(() => {
  store.rollForwardAll();
  setTimeout(() => uni.stopPullDownRefresh(), 600);
});
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  padding: 20rpx 24rpx 160rpx;
}

.kpi {
  background: $recur-card;
  border-radius: $recur-radius-card;
  padding: 28rpx 32rpx;
  display: flex;
  align-items: center;
  margin-bottom: 16rpx;
}
.kpi-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}
.kpi-label {
  font-size: $recur-fs-xs;
  color: $recur-text-3;
}
.kpi-value {
  font-size: 36rpx;
  font-weight: 600;
  color: $recur-text-1;
  font-feature-settings: "tnum";
}
.kpi-divider {
  width: 1rpx;
  height: 48rpx;
  background: $recur-divider;
}

.timeline {
  background: $recur-card;
  border-radius: $recur-radius-card;
  padding: 24rpx 28rpx 28rpx;
  margin-bottom: 16rpx;
}
.timeline-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 16rpx;
}
.section-title {
  font-size: $recur-fs-title;
  font-weight: 600;
  color: $recur-text-1;
}
.timeline-count {
  font-size: $recur-fs-xs;
  color: $recur-text-3;
  font-feature-settings: "tnum";
}
.timeline-scroll { white-space: nowrap; }
.timeline-row {
  display: inline-flex;
  gap: 16rpx;
  padding-right: 28rpx;
}
.timeline-card {
  display: inline-flex;
  flex-direction: column;
  gap: 4rpx;
  padding: 20rpx 24rpx;
  background: $recur-primary-bg;
  border-radius: $recur-radius-input;
  min-width: 200rpx;
}
.timeline-day {
  font-size: $recur-fs-xs;
  color: $recur-primary-strong;    // 文字场景需 6.29:1
  font-weight: 600;
}
.timeline-icon { font-size: 36rpx; }
.timeline-name {
  font-size: $recur-fs-sm;
  color: $recur-text-1;
  font-weight: 500;
}
.timeline-amount {
  font-size: $recur-fs-body;
  color: $recur-text-1;
  font-weight: 600;
  font-feature-settings: "tnum";
}
.timeline-cny {
  font-size: $recur-fs-xs;
  color: $recur-text-3;
  font-feature-settings: "tnum";
}

/* —— Tabs + 排序按钮 —— */
.tabs-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 20rpx;
}
.tabs {
  flex: 1;
  display: flex;
  gap: 8rpx;
  background: $recur-card-soft;
  padding: 6rpx;
  border-radius: $recur-radius-pill;
}
.tab {
  flex: 1;
  min-height: $recur-tap-min;      // 88rpx = 44px，满足触摸目标下限
  padding: 0 12rpx;
  text-align: center;
  font-size: $recur-fs-sm;
  color: $recur-text-3;
  border-radius: $recur-radius-pill;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
  white-space: nowrap;
}
.tab.active {
  background: $recur-card;
  color: $recur-primary-strong;    // 6.29:1（原 $recur-primary 仅 4.47:1）
  font-weight: 600;
  box-shadow: $recur-shadow-tab;
}
.tab-count {
  font-size: $recur-fs-xs;
  // 不再用 opacity —— 半透明会稀释对比度
}

.sort-btn {
  width: $recur-tap-min;           // 88rpx = 44px
  height: $recur-tap-min;
  background: $recur-card-soft;
  border-radius: $recur-radius-pill;
  display: flex;
  align-items: center;
  justify-content: center;
}
.sort-icon {
  font-size: 32rpx;
  color: $recur-primary-strong;
  font-weight: 600;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.card {
  background: $recur-card;
  border-radius: $recur-radius-card;
  padding: 24rpx 28rpx;
  display: flex;
  align-items: center;
  gap: 20rpx;
}
.card-left {
  width: 80rpx;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: $recur-primary-bg;
  border-radius: $recur-radius-input;
}
.card-icon { font-size: 40rpx; }
.card-main { flex: 1; min-width: 0; }
.card-title-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  flex-wrap: wrap;
}
.card-name {
  font-size: $recur-fs-body;
  font-weight: 600;
  color: $recur-text-1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 360rpx;
}
.card-meta {
  font-size: $recur-fs-xs;
  color: $recur-text-3;
  margin-top: 6rpx;
}
.card-cycle {
  font-feature-settings: "tnum";
}
.card-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2rpx;
}
.card-amount {
  font-size: $recur-fs-body;
  font-weight: 600;
  color: $recur-text-1;
  font-feature-settings: "tnum";
}
.card-cny {
  font-size: $recur-fs-xs;
  color: $recur-text-3;
  font-feature-settings: "tnum";
}
.card-next {
  font-size: $recur-fs-xs;
  color: $recur-text-3;
  margin-top: 4rpx;
}

.badge {
  display: inline-flex;
  align-items: center;
  padding: 4rpx 12rpx;
  border-radius: $recur-radius-pill;
  font-size: $recur-fs-xs;
  font-weight: 500;
}
.badge-trial {
  background: $recur-trial-bg;
  color: $recur-trial-text;        // 6.37:1 ✓
}
.badge-nonrenew {
  background: $recur-trial-bg;     // 与试用同色系（原为硬编码 #FEF3C7）
  color: $recur-trial-text;        // 原为硬编码 #92400E
  padding: 4rpx 10rpx;
}

.empty {
  background: $recur-card;
  border-radius: $recur-radius-card;
  padding: 80rpx 32rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
}
.empty-icon { font-size: 72rpx; opacity: 0.5; }
.empty-text {
  font-size: $recur-fs-sm;
  color: $recur-text-3;
}
.empty-btn {
  margin-top: 16rpx;
  padding: 16rpx 40rpx;
  background: $recur-primary-strong;   // 小字号按钮底需 4.5:1
  color: $recur-text-inverse;
  border-radius: $recur-radius-btn;
  font-size: $recur-fs-sm;
  font-weight: 600;
}

.fab {
  position: fixed;
  right: 32rpx;
  bottom: 180rpx;
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  background: $recur-primary;
  color: $recur-text-inverse;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 56rpx;
  font-weight: 300;
  box-shadow: $recur-shadow-fab;
  z-index: 100;
}
.fab-icon {
  line-height: 1;
  margin-top: -8rpx;
}

/* —— Popup（复用设计系统） —— */
.popup-mask {
  position: fixed;
  inset: 0;
  background: $recur-mask;
  backdrop-filter: blur(4rpx);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 1000;
}
.popup-sheet {
  width: 100%;
  background: $recur-card;
  border-radius: $recur-radius-card $recur-radius-card 0 0;
  padding: 20rpx 24rpx calc(40rpx + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.popup-title {
  font-size: $recur-fs-body;
  font-weight: 600;
  color: $recur-text-1;
  text-align: center;
  padding: 16rpx 0 20rpx;
}
.popup-item {
  display: flex;
  align-items: center;
  gap: 20rpx;
  min-height: $recur-tap-min;      // 触摸目标下限
  padding: 16rpx 20rpx;
  border-radius: $recur-radius-input;
  font-size: $recur-fs-body;
}
.popup-item.active {
  background: $recur-primary-bg;
}
.popup-name {
  flex: 1;
  color: $recur-text-1;
}
.popup-check {
  color: $recur-primary-strong;
  font-weight: 700;
}
.popup-cancel {
  margin-top: 16rpx;
  padding: 24rpx;
  text-align: center;
  color: $recur-text-3;
  font-size: $recur-fs-body;
  background: $recur-card-soft;
  border-radius: $recur-radius-input;
}
</style>
