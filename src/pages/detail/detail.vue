<template>
  <view v-if="sub" class="page">
    <!-- 头部 -->
    <view class="hero">
      <view class="hero-tile" :style="{ background: mono(sub.name).bg }" aria-hidden="true">
        <text class="hero-tile-letter" :style="{ color: mono(sub.name).fg }">{{ mono(sub.name).letter }}</text>
      </view>
      <text class="hero-name">{{ sub.name }}</text>
      <view class="hero-meta">
        <text class="hero-cycle">{{ cycleLabel(sub.cycle, sub.cycle_days) }} · {{ formatAmount(sub.amount, sub.currency) }}</text>
        <text v-if="sub.currency !== 'CNY'" class="hero-cny">≈ ¥{{ store.cny(sub.amount, sub.currency).toFixed(0) }}</text>
        <view v-if="sub.is_trial" class="badge badge-trial">试用</view>
        <view v-else-if="sub.status === 'paused'" class="badge badge-paused">已暂停</view>
        <view v-else-if="sub.status === 'cancelled'" class="badge badge-cancelled">已取消</view>
      </view>
    </view>

    <!-- 倒计时。自动续费说「扣费」，非自动续费说「到期」——
         两者的行动含义不同：前者是去付钱，后者是去做决定。 -->
    <view class="countdown">
      <text class="countdown-label">{{ countdownLabel }}</text>
      <text class="countdown-value">
        <text class="countdown-num">{{ countdownAbs }}</text>
        <text class="countdown-unit"> 天</text>
      </text>
      <text class="countdown-sub">{{ countdownSub }}</text>
    </view>

    <!-- 关键指标（双行：原币种 + RMB） -->
    <view class="metrics">
      <view class="metric">
        <text class="metric-label">日均</text>
        <text class="metric-value">{{ formatAmount(dailyNative, sub.currency) }}</text>
        <text v-if="sub.currency !== 'CNY'" class="metric-cny">≈ ¥{{ store.cny(dailyNative, sub.currency).toFixed(2) }}</text>
      </view>
      <view class="metric">
        <text class="metric-label">月均</text>
        <text class="metric-value">{{ formatAmount(monthlyNative, sub.currency) }}</text>
        <text v-if="sub.currency !== 'CNY'" class="metric-cny">≈ ¥{{ store.cny(monthlyNative, sub.currency).toFixed(0) }}</text>
      </view>
      <view class="metric">
        <text class="metric-label">累计已付</text>
        <text class="metric-value">{{ formatAmount(cumulativeNative, sub.currency) }}</text>
        <text v-if="cumulativeNative > 0 && sub.currency !== 'CNY'" class="metric-cny">≈ ¥{{ store.cny(cumulativeNative, sub.currency).toFixed(0) }}</text>
      </view>
      <view class="metric">
        <text class="metric-label">已订</text>
        <text class="metric-value">{{ daysSinceStart }} 天</text>
      </view>
    </view>

    <!-- 试用专属：结束后行为 -->
    <view v-if="sub.is_trial" class="info-card">
      <text class="info-label">试用结束后</text>
      <text class="info-value">{{ trialEndLabel }}</text>
    </view>

    <!-- 详情字段 -->
    <view class="info-card">
      <view class="info-row">
        <text class="info-label">分类</text>
        <text class="info-value">{{ categoryName }}</text>
      </view>
      <view class="info-row">
        <text class="info-label">首次扣费</text>
        <text class="info-value">{{ sub.start_date }}</text>
      </view>
      <view class="info-row">
        <text class="info-label">自动续费</text>
        <text class="info-value">{{ sub.auto_renew ? '是' : '否' }}</text>
      </view>
      <view v-if="sub.cancel_url" class="info-row" role="button" tabindex="0" aria-label="复制退订链接" @click="openCancelUrl">
        <text class="info-label">退订链接</text>
        <text class="info-value link">前往取消 →</text>
      </view>
      <view v-if="sub.notify_days_before.length > 0" class="info-row">
        <text class="info-label">提醒</text>
        <text class="info-value">提前 {{ sub.notify_days_before.join(' / ') }} 天</text>
      </view>
    </view>

    <view v-if="sub.notes" class="notes-card">
      <text class="notes-label">备注</text>
      <text class="notes-text">{{ sub.notes }}</text>
    </view>

    <!-- 操作 -->
    <view class="actions">
      <view class="action action-primary" role="button" tabindex="0" @click="onEdit"><text>编辑</text></view>
      <view v-if="sub.status === 'active'" class="action" role="button" tabindex="0" @click="onPause"><text>暂停</text></view>
      <view v-else-if="sub.status === 'paused'" class="action action-resume" role="button" tabindex="0" @click="onResume"><text>恢复</text></view>
      <view v-if="sub.status !== 'cancelled'" class="action action-warn" role="button" tabindex="0" @click="onCancel"><text>取消订阅</text></view>
      <view class="action action-danger" role="button" tabindex="0" @click="onDelete"><text>删除</text></view>
    </view>
  </view>

  <view v-else class="empty">
    <text class="empty-icon">🤔</text>
    <text class="empty-text">找不到这条订阅</text>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { useSubscriptionsStore } from "@/store/subscriptions";
import {
  dailyCost,
  monthlyCost,
  cumulativePaid,
  daysToKeyDate,
} from "@/utils/billing";
import { daysBetween, todayStr } from "@/utils/date";
import { formatAmount } from "@/utils/format";
import { monogram } from "@/utils/monogram";
import type { Cycle } from "@/types/subscription";

const store = useSubscriptionsStore();
const mono = monogram;

const subId = ref<string>("");
const sub = computed(() => store.getById(subId.value));

// ====== 指标（原币种值，复用给 RMB 折算） ======
const dailyNative = computed(() => sub.value ? dailyCost(sub.value) : 0);
const monthlyNative = computed(() => sub.value ? monthlyCost(sub.value) : 0);
const cumulativeNative = computed(() => sub.value ? cumulativePaid(sub.value) : 0);

// ====== 倒计时 ======
const keyDays = computed(() => (sub.value ? daysToKeyDate(sub.value) : null));
const countdownAbs = computed(() => Math.abs(keyDays.value ?? 0));

const countdownLabel = computed(() => {
  const s = sub.value;
  if (!s) return "";
  const d = keyDays.value;
  if (d !== null && d < 0) {
    if (s.is_trial) return "试用已结束";
    return s.auto_renew ? "已过扣费日" : "已过期";
  }
  if (s.is_trial) return "试用剩余";
  return s.auto_renew ? "下次扣费" : "距离到期";
});

const countdownSub = computed(() => {
  const s = sub.value;
  if (!s) return "";
  const money = `${formatAmount(s.amount, s.currency)} · ≈ ¥${store.cny(s.amount, s.currency).toFixed(0)}`;
  if (s.is_trial) return s.trial_end_date ? `${s.trial_end_date} 结束` : "";
  if (!s.next_billing_date) return "";
  return s.auto_renew
    ? money
    : `${s.next_billing_date} 到期 · ${money}`;
});
const daysSinceStart = computed(() => sub.value ? daysBetween(sub.value.start_date, todayStr()) : 0);

function cycleLabel(cycle: Cycle, customDays: number | null): string {
  const map: Record<Cycle, string> = { daily: "日", weekly: "周", monthly: "月", quarterly: "季", yearly: "年", custom: `${customDays || 0}天` };
  return `${map[cycle]}费`;
}

const categoryName = computed(() => {
  if (!sub.value) return "";
  return store.categories.find(c => c.id === sub.value!.category_id)?.name || "未分类";
});

const trialEndLabel = computed(() => {
  if (!sub.value) return "";
  switch (sub.value.trial_converts_to) {
    case "manual":   return "⏰ 到期前提醒你决定";
    case "paid":     return "✅ 自动转为付费订阅";
    case "auto_end": return "🛑 到期自动结束";
    default:         return "未设置";
  }
});

function onEdit() { uni.navigateTo({ url: `/pages/add/add?id=${subId.value}` }); }
function onPause() { store.update(subId.value, { status: "paused" }); uni.showToast({ title: "已暂停" }); }
function onResume() { store.update(subId.value, { status: "active" }); uni.showToast({ title: "已恢复" }); }

function onCancel() {
  uni.showModal({
    title: "确认取消",
    content: "取消后将从活跃列表移除（仍保留记录）",
    success: (r) => {
      if (r.confirm) {
        store.update(subId.value, { status: "cancelled" });
        uni.showToast({ title: "已取消" });
      }
    },
  });
}

function onDelete() {
  uni.showModal({
    title: "确认删除",
    content: `「${sub.value?.name}」将被永久删除`,
    success: (r) => {
      if (r.confirm) {
        store.remove(subId.value);
        uni.showToast({ title: "已删除" });
        setTimeout(() => uni.navigateBack(), 500);
      }
    },
  });
}

function openCancelUrl() {
  if (!sub.value?.cancel_url) return;
  uni.setClipboardData({ data: sub.value.cancel_url, success: () => uni.showToast({ title: "链接已复制" }) });
}

onLoad((opts: any) => {
  if (opts?.id) subId.value = opts.id;
});
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  padding: 20rpx 24rpx 60rpx;
}

.hero {
  background: $recur-card;
  border-radius: $recur-radius-card;
  padding: 48rpx 32rpx 32rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 16rpx;
}
.hero-tile {
  width: 120rpx;
  height: 120rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 28rpx;
  margin-bottom: 16rpx;
}
.hero-tile-letter {
  font-size: 52rpx;
  font-weight: 600;
  line-height: 1;
  letter-spacing: -0.01em;
}
.hero-name {
  font-size: $recur-fs-display;
  font-weight: 600;
  color: $recur-text-1;
}
.hero-meta {
  display: flex;
  align-items: center;
  gap: 12rpx;
  flex-wrap: wrap;
  justify-content: center;
}
.hero-cycle {
  font-size: $recur-fs-sm;
  color: $recur-text-3;
  font-feature-settings: "tnum";
}
.hero-cny {
  font-size: $recur-fs-xs;
  color: $recur-text-3;
  font-feature-settings: "tnum";
}

.badge {
  display: inline-flex;
  padding: 4rpx 12rpx;
  border-radius: $recur-radius-pill;
  font-size: $recur-fs-xs;
  font-weight: 500;
}
.badge-trial     { background: $recur-trial-bg;  color: $recur-trial-text; }
.badge-paused    { background: $recur-neutral-bg; color: $recur-neutral-text; }
.badge-cancelled { background: $recur-danger-bg;  color: $recur-danger; }

.countdown {
  background: $recur-primary-solid;   // 实底按钮用 solid，深色模式下不会变浅导致白字失效
  border-radius: $recur-radius-card;
  padding: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  margin-bottom: 16rpx;
  color: $recur-text-inverse;
}
.countdown-label {
  font-size: $recur-fs-sm;
  // 去掉 opacity —— 半透明会稀释对比度
}
.countdown-value {
  display: flex;
  align-items: baseline;
  gap: 6rpx;
}
.countdown-num {
  font-size: 64rpx;
  font-weight: 700;
  font-feature-settings: "tnum";
  line-height: 1;
}
.countdown-unit {
  font-size: $recur-fs-body;
}
.countdown-sub {
  font-size: $recur-fs-xs;
  margin-top: 4rpx;
  font-feature-settings: "tnum";
}

.metrics {
  background: $recur-card;
  border-radius: $recur-radius-card;
  padding: 28rpx;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 28rpx 32rpx;
  margin-bottom: 16rpx;
}
.metric {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}
.metric-label {
  font-size: $recur-fs-xs;
  color: $recur-text-3;
}
.metric-value {
  font-size: 32rpx;
  font-weight: 600;
  color: $recur-text-1;
  font-feature-settings: "tnum";
}
.metric-cny {
  font-size: $recur-fs-xs;
  color: $recur-text-3;
  font-feature-settings: "tnum";
}

.info-card,
.notes-card {
  background: $recur-card;
  border-radius: $recur-radius-card;
  padding: 28rpx 32rpx;
  margin-bottom: 16rpx;
}
.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14rpx 0;
  font-size: $recur-fs-body;
  &:not(:last-child) {
    border-bottom: 1rpx solid $recur-divider;
  }
}
.info-label { color: $recur-text-3; }
.info-value {
  color: $recur-text-1;
  font-weight: 500;
}
.link { color: $recur-primary-strong; }

.notes-label {
  display: block;
  font-size: $recur-fs-xs;
  color: $recur-text-3;
  margin-bottom: 12rpx;
}
.notes-text {
  font-size: $recur-fs-body;
  color: $recur-text-1;
  line-height: 1.6;
  white-space: pre-wrap;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  margin-top: 32rpx;
}
.action {
  background: $recur-card;
  border-radius: $recur-radius-card;
  padding: 28rpx;
  text-align: center;
  font-size: $recur-fs-body;
  color: $recur-text-2;
  font-weight: 500;
}
.action-primary { color: $recur-primary-strong; font-weight: 600; }
.action-resume  { color: $recur-success; font-weight: 600; }
.action-warn    { color: $recur-warning; }
.action-danger  { color: $recur-danger; }

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 200rpx 0;
  gap: 16rpx;
}
.empty-icon { font-size: 80rpx; opacity: 0.5; }
.empty-text {
  font-size: $recur-fs-sm;
  color: $recur-text-3;
}
</style>
