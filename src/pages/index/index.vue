<template>
  <view class="page">
    <!-- 汇总：单一主数值 + 一行次要信息（替代原先三等分的 hero-metric 模板） -->
    <view class="summary">
      <view class="summary-head">
        <text class="summary-label">本月合计</text>
        <view
          class="theme-btn"
          role="button"
          :aria-label="`外观：${themeLabel}，点击切换到下一个`"
          tabindex="0"
          @click="cycleTheme"
        >
          <view class="theme-dot" :class="`is-${store.settings.theme}`" aria-hidden="true"></view>
          <text class="theme-text">{{ themeLabel }}</text>
        </view>
      </view>
      <text class="summary-value">¥{{ Math.round(store.totalMonthlyRMB) }}</text>
      <view class="summary-meta">
        <text class="summary-meta-item">日均 ¥{{ store.totalDailyRMB.toFixed(1) }}</text>
        <text class="summary-dot">·</text>
        <text class="summary-meta-item">{{ store.autoRenewing.length }} 项自动续费</text>
        <template v-if="store.trials.length">
          <text class="summary-dot">·</text>
          <text class="summary-meta-item">{{ store.trials.length }} 项试用中</text>
        </template>
      </view>
    </view>

    <!-- 筛选 + 排序 -->
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

    <!-- 空态 -->
    <view v-if="groupedList.length === 0" class="empty">
      <text class="empty-text">{{ emptyText }}</text>
      <view class="empty-btn" role="button" tabindex="0" @click="goAdd">添加订阅</view>
    </view>

    <!-- 分组列表 -->
    <view v-else class="groups">
      <view v-for="g in groupedList" :key="g.key" class="group">
        <view class="group-head">
          <text class="group-title">{{ g.label }}</text>
          <text class="group-count">{{ g.items.length }}</text>
        </view>

        <view class="group-body">
          <view
            v-for="sub in g.items"
            :key="sub.id"
            class="card"
            role="button"
            tabindex="0"
            :aria-label="cardAriaLabel(sub)"
            @click="goDetail(sub.id)"
            @longpress="onLongPress(sub)"
          >
            <view
              class="tile"
              :style="{ background: mono(sub.name).bg }"
              aria-hidden="true"
            >
              <text class="tile-letter" :style="{ color: mono(sub.name).fg }">
                {{ mono(sub.name).letter }}
              </text>
            </view>

            <view class="card-main">
              <view class="card-title-row">
                <text class="card-name">{{ sub.name }}</text>
                <view v-if="sub.is_trial" class="badge badge-trial">试用</view>
              </view>
              <text class="card-meta">{{ metaLine(sub) }}</text>
            </view>

            <view class="card-right">
              <text class="card-amount">{{ formatAmount(sub.amount, sub.currency) }}</text>
              <text class="card-when" :class="urgencyClass(sub)">{{ nextBillingLabel(sub) }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 添加 -->
    <view class="fab" role="button" aria-label="添加订阅" tabindex="0" @click="goAdd">
      <text class="fab-icon" aria-hidden="true">+</text>
    </view>

    <!-- 排序弹层 -->
    <view v-if="sortPopupOpen" class="popup-mask" @click="sortPopupOpen = false">
      <view class="popup-sheet" @click.stop>
        <view class="popup-title">排序方式</view>
        <view
          v-for="opt in sortOptions"
          :key="opt.value"
          class="popup-item"
          :class="{ active: sortBy === opt.value }"
          role="button"
          tabindex="0"
          @click="pickSort(opt.value)"
        >
          <text class="popup-name">{{ opt.label }}</text>
          <text v-if="sortBy === opt.value" class="popup-check" aria-hidden="true">✓</text>
        </view>
        <view class="popup-cancel" role="button" tabindex="0" @click="sortPopupOpen = false">取消</view>
      </view>
    </view>

    <!-- 外观：一点即切，不弹层。
         精确选择（三选一）在设置页，这里只做快速循环。 -->
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
  daysToKeyDate,
  keyDateKind,
  keyDateLabel,
} from "@/utils/billing";
import { formatAmount } from "@/utils/format";
import { monogram } from "@/utils/monogram";
import { applyTheme, THEME_OPTIONS } from "@/utils/theme";
import type { Subscription, Cycle, Theme } from "@/types/subscription";

const store = useSubscriptionsStore();
onShow(() => store.rollForwardAll());

const mono = monogram;

// ====== Tab ======
/**
 * 四个 tab 是一次干净划分：自动续费 + 非自动续费 + 试用 = 全部。
 * 原先的「正式」是前两者之和，属于冗余，已去掉。
 */
type TabValue = "all" | "auto_renewing" | "non_renewing" | "trial";
const activeTab = ref<TabValue>("all");

const tabs = computed(() => [
  { value: "all" as TabValue,           label: "全部",       count: store.subscriptions.filter(s => !s.archived_at).length },
  { value: "auto_renewing" as TabValue, label: "自动续费",   count: store.autoRenewing.length },
  { value: "non_renewing" as TabValue,  label: "非自动续费", count: store.nonRenewing.length },
  { value: "trial" as TabValue,         label: "试用",       count: store.trials.length },
]);

// ====== 筛选 ======
const filteredList = computed(() => {
  switch (activeTab.value) {
    case "auto_renewing": return store.autoRenewing;
    case "non_renewing":  return store.nonRenewing;
    case "trial":         return store.trials;
    default:              return store.subscriptions.filter(s => !s.archived_at);
  }
});

// ====== 排序 ======
type SortBy = "next" | "price_desc" | "price_asc" | "name" | "cumulative" | "created";
const sortBy = ref<SortBy>("price_desc");

const sortOptions: Array<{ value: SortBy; label: string }> = [
  { value: "price_desc", label: "月均价格（高→低）" },
  { value: "price_asc",  label: "月均价格（低→高）" },
  { value: "next",       label: "下次扣费日（近→远）" },
  { value: "cumulative", label: "累计已付（多→少）" },
  { value: "name",       label: "名称（A→Z）" },
  { value: "created",    label: "添加时间（新→旧）" },
];

const sortedList = computed(() => {
  const arr = [...filteredList.value];
  switch (sortBy.value) {
    case "price_desc":
      return arr.sort((a, b) => store.cny(monthlyCost(b), b.currency) - store.cny(monthlyCost(a), a.currency));
    case "price_asc":
      return arr.sort((a, b) => store.cny(monthlyCost(a), a.currency) - store.cny(monthlyCost(b), b.currency));
    case "cumulative":
      return arr.sort((a, b) => store.cny(cumulativePaid(b), b.currency) - store.cny(cumulativePaid(a), a.currency));
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
}

// ====== 外观 ======
/** 循环顺序：跟随系统 → 浅色 → 深色 → 跟随系统 */
const THEME_CYCLE: Theme[] = ["auto", "light", "dark"];

const themeLabel = computed(
  () => THEME_OPTIONS.find(o => o.value === store.settings.theme)?.label ?? "跟随系统"
);

/** 一点即切。弹层是两步操作，对三态开关太重。 */
function cycleTheme() {
  const i = THEME_CYCLE.indexOf(store.settings.theme);
  const next = THEME_CYCLE[(i + 1) % THEME_CYCLE.length];
  store.settings.theme = next;
  store.persist();
  applyTheme(next);
  uni.showToast({
    title: THEME_OPTIONS.find(o => o.value === next)?.label ?? "",
    icon: "none",
    duration: 1000,
  });
}

// ====== 按紧急度分组 ======
/**
 * 一条订阅只落进第一个匹配的分组，保证不重复计数。
 *
 * 关键区别：自动续费临期是「要去付钱」，非自动续费临期是「要去做决定」。
 * 后者必须进「需要处理」，否则会被误读成「马上要扣钱」。
 */
function groupKeyOf(sub: Subscription): "action" | "soon" | "later" {
  const d = daysToKeyDate(sub);
  const isBilling = keyDateKind(sub) === "billing";

  // 已过期：任何类型都需要处理
  if (d !== null && d < 0) return "action";
  // 到期 / 试用临期 7 天内：需要做决定
  if (!isBilling && d !== null && d <= 7) return "action";
  // 自动续费 7 天内：即将扣钱
  if (isBilling && d !== null && d <= 7) return "soon";
  return "later";
}

const groupedList = computed(() => {
  const buckets: Record<string, Subscription[]> = { action: [], soon: [], later: [] };
  for (const s of sortedList.value) buckets[groupKeyOf(s)].push(s);

  const defs = [
    { key: "action", label: "需要处理" },
    { key: "soon",   label: "近期扣费" },
    { key: "later",  label: "其他订阅" },
  ];
  return defs
    .map(d => ({ ...d, items: buckets[d.key] }))
    .filter(g => g.items.length > 0);
});

const emptyText = computed(() => {
  if (activeTab.value === "auto_renewing") return "当前没有自动续费的订阅";
  if (activeTab.value === "non_renewing") return "当前没有非自动续费的订阅";
  if (activeTab.value === "trial") return "当前没有试用中的订阅";
  return "点右下角 + 开始记录第一笔订阅";
});

// ====== 格式化 ======
function cycleLabel(cycle: Cycle, customDays: number | null): string {
  const map: Record<Cycle, string> = { daily: "日", weekly: "周", monthly: "月", quarterly: "季", yearly: "年", custom: `${customDays || 0}天` };
  return `${map[cycle]}费`;
}

function metaLine(sub: Subscription): string {
  const daily = store.cny(dailyCost(sub), sub.currency).toFixed(2);
  return `${cycleLabel(sub.cycle, sub.cycle_days)} · 日均 ¥${daily}`;
}

/** 倒计时文案。自动续费说「扣费」，非自动续费与试用说「到期」。 */
function nextBillingLabel(sub: Subscription): string {
  return keyDateLabel(sub);
}

/** 倒计时按紧急度着色——列表扫下来，有颜色的就是要处理的 */
function urgencyClass(sub: Subscription): string {
  const d = daysToKeyDate(sub);
  if (d === null) return "when-idle";
  if (d < 0) return "when-urgent";     // 已过期
  if (d <= 3) return "when-urgent";
  if (d <= 7) return "when-soon";
  return "when-idle";
}

function cardAriaLabel(sub: Subscription): string {
  const parts = [sub.name, formatAmount(sub.amount, sub.currency)];
  if (sub.currency !== "CNY") parts.push(`约合 ${store.cny(sub.amount, sub.currency).toFixed(0)} 元`);
  parts.push(cycleLabel(sub.cycle, sub.cycle_days));
  parts.push(keyDateLabel(sub));
  if (sub.is_trial) parts.push("试用中");
  else if (!sub.auto_renew && sub.status === "active") parts.push("非自动续费");
  return parts.join("，");
}

// ====== 导航 ======
function goAdd() { uni.navigateTo({ url: "/pages/add/add" }); }
function goDetail(id: string) { uni.navigateTo({ url: `/pages/detail/detail?id=${id}` }); }

function onLongPress(sub: Subscription) {
  uni.showActionSheet({
    itemList: ["编辑", "暂停", "取消订阅", "删除"],
    success: (e) => {
      if (e.tapIndex === 0) uni.navigateTo({ url: `/pages/add/add?id=${sub.id}` });
      else if (e.tapIndex === 1) { store.update(sub.id, { status: "paused" }); uni.showToast({ title: "已暂停" }); }
      else if (e.tapIndex === 2) { store.update(sub.id, { status: "cancelled" }); uni.showToast({ title: "已取消" }); }
      else if (e.tapIndex === 3) {
        uni.showModal({
          title: "确认删除",
          content: `删除「${sub.name}」将无法恢复`,
          success: (r) => {
            if (r.confirm) { store.remove(sub.id); uni.showToast({ title: "已删除" }); }
          },
        });
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
  padding: 24rpx 24rpx 200rpx;
}

/* —— 汇总 —— */
.summary {
  background: $recur-card;
  border-radius: $recur-radius-card;
  padding: 36rpx 32rpx 32rpx;
  margin-bottom: 24rpx;
}
.summary-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8rpx;
}
.summary-label {
  font-size: $recur-fs-sm;
  color: $recur-text-3;
}

/* 外观切换：一点即切，带文字标签说明当前模式。
 * 图标用 CSS 绘制，不用 Unicode 字形或 emoji。
 * 空心 = 浅色 / 实心 = 深色 / 半明半暗 = 跟随系统 */
.theme-btn {
  display: inline-flex;
  align-items: center;
  gap: 10rpx;
  min-height: 60rpx;
  padding: 0 18rpx;
  margin: -10rpx -18rpx -10rpx 0;
  border-radius: $recur-radius-pill;
  background: $recur-card-soft;
}
.theme-text {
  font-size: $recur-fs-xs;
  color: $recur-text-2;
}
.theme-dot {
  width: 26rpx;
  height: 26rpx;
  flex: 0 0 26rpx;
  border-radius: 50%;
  border: 3rpx solid $recur-text-2;
  box-sizing: border-box;
}
.theme-dot.is-auto  { background: linear-gradient(90deg, $recur-text-2 50%, transparent 50%); }
.theme-dot.is-light { background: transparent; }
.theme-dot.is-dark  { background: $recur-text-2; }
.summary-value {
  display: block;
  font-size: $recur-fs-display;
  font-weight: 600;
  color: $recur-text-1;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  line-height: 1.15;
}
.summary-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8rpx;
  margin-top: 12rpx;
}
.summary-meta-item {
  font-size: $recur-fs-sm;
  color: $recur-text-2;
  font-variant-numeric: tabular-nums;
}
.summary-dot {
  font-size: $recur-fs-sm;
  color: $recur-text-3;
}

/* —— 筛选 —— */
.tabs-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 32rpx;
}
.tabs {
  flex: 1;
  display: flex;
  gap: 6rpx;
  background: $recur-card-soft;
  padding: 6rpx;
  border-radius: $recur-radius-pill;
}
.tab {
  flex: 1;
  min-height: 72rpx;
  padding: 0 8rpx;
  font-size: $recur-fs-sm;
  color: $recur-text-3;
  border-radius: $recur-radius-pill;
  display: flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
}
.tab.active {
  background: $recur-card;
  color: $recur-text-1;
  font-weight: 600;
  box-shadow: $recur-shadow-tab;
}
.sort-btn {
  width: 84rpx;
  height: 84rpx;
  background: $recur-card;
  border-radius: $recur-radius-pill;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: $recur-shadow-tab;
}
.sort-icon {
  font-size: 32rpx;
  color: $recur-text-2;
  font-weight: 600;
}

/* —— 分组 ——
 * 标题上方的留白大于下方，让分组边界一眼可辨。 */
.group {
  margin-bottom: 40rpx;
  &:last-child { margin-bottom: 0; }
}
.group-head {
  display: flex;
  align-items: baseline;
  gap: 12rpx;
  padding: 0 8rpx;
  margin-bottom: 16rpx;
}
.group-title {
  font-size: $recur-fs-title;
  font-weight: 600;
  color: $recur-text-1;
  letter-spacing: -0.01em;
}
.group-count {
  font-size: $recur-fs-sm;
  color: $recur-text-3;
  font-variant-numeric: tabular-nums;
}
.group-body {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

/* —— 卡片 —— */
.card {
  background: $recur-card;
  border-radius: $recur-radius-card;
  padding: 24rpx 28rpx;
  display: flex;
  align-items: center;
  gap: 20rpx;
}

/* 字母瓷砖：取代 emoji，统一尺寸与字重 */
.tile {
  width: 76rpx;
  height: 76rpx;
  flex: 0 0 76rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.tile-letter {
  font-size: 30rpx;
  font-weight: 600;
  line-height: 1;
  letter-spacing: -0.01em;
}

.card-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}
.card-title-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.card-name {
  font-size: $recur-fs-title;
  font-weight: 600;
  color: $recur-text-1;
  letter-spacing: -0.01em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.card-meta {
  font-size: $recur-fs-sm;
  color: $recur-text-3;
  font-variant-numeric: tabular-nums;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6rpx;
  flex: 0 0 auto;
}
.card-amount {
  font-size: $recur-fs-title;
  font-weight: 600;
  color: $recur-text-1;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
}
/* 倒计时按紧急度着色 */
.card-when {
  font-size: $recur-fs-sm;
  font-variant-numeric: tabular-nums;
}
.when-urgent { color: $recur-danger; font-weight: 600; }
.when-soon   { color: $recur-warning; font-weight: 600; }
.when-idle   { color: $recur-text-3; }

/* —— 角标 —— */
.badge {
  display: inline-flex;
  align-items: center;
  padding: 2rpx 12rpx;
  border-radius: $recur-radius-pill;
  font-size: $recur-fs-xs;
  font-weight: 500;
  flex: 0 0 auto;
}
.badge-trial {
  background: $recur-trial-bg;
  color: $recur-trial-text;
}

/* —— 空态 —— */
.empty {
  background: $recur-card;
  border-radius: $recur-radius-card;
  padding: 96rpx 32rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24rpx;
}
.empty-text {
  font-size: $recur-fs-body;
  color: $recur-text-3;
}
.empty-btn {
  padding: 20rpx 48rpx;
  background: $recur-primary-solid;
  color: $recur-text-inverse;
  border-radius: $recur-radius-btn;
  font-size: $recur-fs-body;
  font-weight: 600;
}

/* —— 添加按钮 —— */
.fab {
  position: fixed;
  right: 32rpx;
  bottom: 200rpx;
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: $recur-primary-solid;
  color: $recur-text-inverse;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 52rpx;
  font-weight: 300;
  box-shadow: $recur-shadow-fab;
  z-index: 100;
}
.fab-icon {
  line-height: 1;
  margin-top: -6rpx;
}

/* —— 弹层 —— */
.popup-mask {
  position: fixed;
  inset: 0;
  background: $recur-mask;
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
  gap: 4rpx;
}
.popup-title {
  font-size: $recur-fs-body;
  font-weight: 600;
  color: $recur-text-1;
  text-align: center;
  padding: 20rpx 0 24rpx;
}
.popup-item {
  display: flex;
  align-items: center;
  gap: 20rpx;
  min-height: $recur-tap-min;
  padding: 12rpx 20rpx;
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
  min-height: $recur-tap-min;
  display: flex;
  align-items: center;
  justify-content: center;
  color: $recur-text-3;
  font-size: $recur-fs-body;
  background: $recur-card-soft;
  border-radius: $recur-radius-input;
}

/* #ifdef H5 */
@media screen and (min-width: 768px) {
  .fab {
    right: calc(50% - var(--recur-app-w, 430px) / 2 + 16px);
  }
  .popup-sheet {
    max-width: var(--recur-app-w, 430px);
  }
}
/* #endif */
</style>
