<template>
  <view class="page">
    <!-- 汇总：与首页同一套结构 —— 单一主数值 + 一行次要信息。
         三等分的 hero-metric 模板让三个数字权重相同，读不出重点。 -->
    <view class="summary">
      <text class="summary-label">累计已付</text>
      <text class="summary-value">¥{{ Math.round(store.totalCumulativeRMB) }}</text>
      <view class="summary-meta">
        <text class="summary-meta-item">本月 ¥{{ Math.round(store.totalMonthlyRMB) }}</text>
        <text class="summary-dot">·</text>
        <text class="summary-meta-item">本年 ¥{{ Math.round(store.totalYearlyRMB) }}</text>
      </view>
    </view>

    <!-- 分类饼图 -->
    <view class="card">
      <view class="card-title">
        <text>分类分布</text>
        <text class="card-meta">仅正式订阅 · RMB</text>
      </view>

      <view v-if="categoryData.length === 0" class="empty">
        <text class="empty-icon">📊</text>
        <text class="empty-text">还没有订阅数据</text>
      </view>

      <view v-else class="pie-block">
        <view class="pie-wrap">
          <svg :width="pieSize" :height="pieSize" :viewBox="`0 0 ${pieSize} ${pieSize}`">
            <g :transform="`translate(${pieSize / 2}, ${pieSize / 2})`">
              <path
                v-for="(slice, i) in pieSlices"
                :key="i"
                :d="slice.d"
                :fill="slice.color"
              />
              <circle r="60" :fill="CARD_HEX" />
              <text text-anchor="middle" y="-6" class="pie-center-label">月支出</text>
              <text text-anchor="middle" y="22" class="pie-center-value">¥{{ Math.round(store.totalMonthlyRMB) }}</text>
            </g>
          </svg>
        </view>

        <view class="pie-legend">
          <view
            v-for="cat in categoryData"
            :key="cat.id"
            class="legend-row"
          >
            <view class="legend-dot" :style="{ background: cat.color }"></view>
            <text class="legend-name">{{ cat.name }}</text>
            <text class="legend-pct">{{ cat.percent.toFixed(0) }}%</text>
            <text class="legend-amount">¥{{ cat.monthlyRMB.toFixed(0) }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 月度柱图（未来 12 个月预测，统一 RMB） -->
    <view class="card">
      <view class="card-title">
        <text>未来 12 个月</text>
        <text class="card-meta">RMB · 基于当前活跃订阅</text>
      </view>

      <view class="bar-chart">
        <view
          v-for="(bar, i) in monthBars"
          :key="i"
          class="bar-col"
        >
          <view class="bar-value">¥{{ Math.round(bar.amount) }}</view>
          <view class="bar-track">
            <view class="bar-fill" :style="{ transform: `scaleY(${Math.max(bar.height / 100, 0.02)})` }"></view>
          </view>
          <text class="bar-label">{{ bar.label }}</text>
        </view>
      </view>
    </view>

    <!-- 试用面板 -->
    <view class="card">
      <view class="card-title">
        <text>当前试用</text>
        <text class="card-meta">{{ store.trials.length }} 项</text>
      </view>

      <view v-if="store.trials.length === 0" class="empty empty-tight">
        <text class="empty-text">当前没有试用</text>
      </view>

      <view v-else>
        <view
          v-for="t in sortedTrials"
          :key="t.id"
          class="trial-row"
          role="button"
          tabindex="0"
          :aria-label="`${t.name}，${t.trial_end_date}，${trialLeftText(t)}`"
          @click="goDetail(t.id)"
        >
          <view class="trial-tile" :style="{ background: mono(t.name).bg }" aria-hidden="true">
            <text class="trial-tile-letter" :style="{ color: mono(t.name).fg }">{{ mono(t.name).letter }}</text>
          </view>
          <view class="trial-main">
            <text class="trial-name">{{ t.name }}</text>
            <text class="trial-end">{{ t.trial_end_date }} · {{ trialLeftText(t) }}</text>
          </view>
          <text class="trial-action">查看 →</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useSubscriptionsStore } from "@/store/subscriptions";
import { daysToKeyDate } from "@/utils/billing";
import { monogram } from "@/utils/monogram";
import type { Subscription } from "@/types/subscription";

const store = useSubscriptionsStore();
const mono = monogram;

/** 卡片底色，与 uni.scss 的 $recur-card 一致。SVG 的 fill 无法读 SCSS 变量。 */
const CARD_HEX = "#FFFFFF";

// ====== 饼图 ======
const pieSize = 240;
const pieRadius = 100;

const categoryData = computed(() => {
  const map = new Map<string, number>();
  for (const s of store.active) {
    const m = store.cny(s.amount * (30 / daysPerCycle(s)), s.currency);
    map.set(s.category_id, (map.get(s.category_id) || 0) + m);
  }
  const total = Array.from(map.values()).reduce((a, b) => a + b, 0);
  const out: Array<{ id: string; name: string; color: string; monthlyRMB: number; percent: number }> = [];
  for (const [id, monthlyRMB] of map) {
    const cat = store.categories.find(c => c.id === id);
    if (!cat || monthlyRMB <= 0) continue;
    out.push({
      id,
      name: cat.name,
      color: cat.color,
      monthlyRMB,
      percent: total > 0 ? (monthlyRMB / total) * 100 : 0,
    });
  }
  return out.sort((a, b) => b.monthlyRMB - a.monthlyRMB);
});

function daysPerCycle(s: Subscription): number {
  const map = { daily: 1, weekly: 7, monthly: 30, quarterly: 90, yearly: 365, custom: s.cycle_days || 30 };
  return map[s.cycle];
}

const pieSlices = computed(() => {
  const data = categoryData.value;
  const total = data.reduce((sum, d) => sum + d.monthlyRMB, 0);
  if (total <= 0) return [];

  let startAngle = -Math.PI / 2;
  const slices: Array<{ d: string; color: string }> = [];

  for (const item of data) {
    const angle = (item.monthlyRMB / total) * Math.PI * 2;
    const endAngle = startAngle + angle;
    const largeArc = angle > Math.PI ? 1 : 0;
    const x1 = pieRadius * Math.cos(startAngle);
    const y1 = pieRadius * Math.sin(startAngle);
    const x2 = pieRadius * Math.cos(endAngle);
    const y2 = pieRadius * Math.sin(endAngle);
    const d = `M 0 0 L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${pieRadius} ${pieRadius} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
    slices.push({ d, color: item.color });
    startAngle = endAngle;
  }
  return slices;
});

// ====== 柱图 ======
const monthBars = computed(() => {
  const now = new Date();
  const bars: Array<{ label: string; amount: number; height: number }> = [];
  let max = 0;

  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const ymKey = d.getFullYear() * 12 + d.getMonth();
    const amount = computeMonthCost(ymKey);
    bars.push({ label: `${d.getMonth() + 1}月`, amount, height: 0 });
    if (amount > max) max = amount;
  }

  for (const b of bars) {
    b.height = max > 0 ? (b.amount / max) * 100 : 0;
  }
  return bars;
});

function computeMonthCost(ymIndex: number): number {
  let total = 0;
  for (const s of store.active) {
    if (!s.start_date) continue;
    const startY = Number(s.start_date.slice(0, 4));
    const startM = Number(s.start_date.slice(5, 7));
    if (startY * 12 + startM <= ymIndex) {
      const monthly = (s.amount / daysPerCycle(s)) * 30;
      total += store.cny(monthly, s.currency);
    }
  }
  return total;
}

// ====== 试用 ======
const sortedTrials = computed(() =>
  [...store.trials].sort((a, b) =>
    (a.trial_end_date || "9999").localeCompare(b.trial_end_date || "9999")
  )
);

/** 试用倒计时文案。已结束的不显示为"剩 0 天"。 */
function trialLeftText(t: Subscription): string {
  const d = daysToKeyDate(t);
  if (d === null) return "未设定";
  if (d < 0) return `已结束 ${-d} 天`;
  if (d === 0) return "今日结束";
  return `剩 ${d} 天`;
}

function goDetail(id: string) {
  uni.navigateTo({ url: `/pages/detail/detail?id=${id}` });
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  padding: 20rpx 24rpx 60rpx;
}

.summary {
  background: $recur-card;
  border-radius: $recur-radius-card;
  padding: 36rpx 32rpx 32rpx;
  margin-bottom: 24rpx;
}
.summary-label {
  display: block;
  font-size: $recur-fs-sm;
  color: $recur-text-3;
  margin-bottom: 8rpx;
}
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

.card {
  background: $recur-card;
  border-radius: $recur-radius-card;
  padding: 28rpx;
  margin-bottom: 16rpx;
}
.card-title {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 24rpx;
  > text:first-child {
    font-size: $recur-fs-title;
    font-weight: 600;
    color: $recur-text-1;
  }
}
.card-meta {
  font-size: $recur-fs-xs;
  color: $recur-text-3;
}

.pie-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24rpx;
}
.pie-wrap {
  width: 240rpx;
  height: 240rpx;
}
.pie-center-label {
  font-size: 22rpx;
  fill: $recur-text-3;
}
.pie-center-value {
  font-size: 30rpx;
  font-weight: 600;
  fill: $recur-text-1;
  font-feature-settings: "tnum";
}

.pie-legend {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.legend-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  font-size: $recur-fs-sm;
}
.legend-dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
}
.legend-name {
  flex: 1;
  color: $recur-text-2;
}
.legend-pct {
  color: $recur-text-3;
  font-feature-settings: "tnum";
}
.legend-amount {
  color: $recur-text-1;
  font-weight: 600;
  font-feature-settings: "tnum";
  min-width: 100rpx;
  text-align: right;
}

.bar-chart {
  display: flex;
  align-items: flex-end;
  gap: 8rpx;
  height: 320rpx;
  padding: 0 8rpx;
}
.bar-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  height: 100%;
  justify-content: flex-end;
}
.bar-value {
  font-size: $recur-fs-xs;
  color: $recur-text-3;
  font-feature-settings: "tnum";
  height: 28rpx;
}
.bar-track {
  width: 100%;
  flex: 1;
  display: flex;
  align-items: flex-end;
  background: $recur-card-soft;
  border-radius: 8rpx 8rpx 0 0;
  overflow: hidden;
}
/* 用 transform 而非 height 做动画 —— 改 height 会触发 layout thrash。
 * 圆角交给父级 .bar-track（有 overflow:hidden），
 * 避免 scaleY 把自身圆角压变形。 */
.bar-fill {
  width: 100%;
  height: 100%;
  background: linear-gradient(180deg, $recur-primary-soft 0%, $recur-primary 100%);
  transform-origin: bottom;
  transition: transform 0.3s ease;
}
.bar-label {
  font-size: $recur-fs-xs;
  color: $recur-text-3;
}

.trial-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 16rpx 0;
  &:not(:last-child) {
    border-bottom: 1rpx solid $recur-divider;
  }
}
.trial-tile {
  width: 64rpx;
  height: 64rpx;
  flex: 0 0 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 14rpx;
}
.trial-tile-letter {
  font-size: 26rpx;
  font-weight: 600;
  line-height: 1;
}
.trial-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}
.trial-name {
  font-size: $recur-fs-body;
  font-weight: 500;
  color: $recur-text-1;
}
.trial-end {
  font-size: $recur-fs-xs;
  color: $recur-text-3;
}
.trial-action {
  font-size: $recur-fs-sm;
  color: $recur-primary-strong;
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  padding: 60rpx 0;
}
.empty-tight { padding: 24rpx 0; }
.empty-icon {
  font-size: 64rpx;
  opacity: 0.5;
}
.empty-text {
  font-size: $recur-fs-sm;
  color: $recur-text-3;
}
</style>
