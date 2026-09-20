<template>
  <view class="page">
    <!-- 说明：这里放的是生命周期的终点，不是与「订阅」平级的另一类订阅。
         所以它不占筛选 tab，只在设置里留一个入口。 -->
    <view v-if="list.length === 0" class="empty">
      <text class="empty-text">还没有已取消的订阅</text>
      <text class="empty-hint">在订阅详情页点「取消订阅」，它会移到这里</text>
    </view>

    <view v-else class="list">
      <view class="hint-bar">
        <text class="hint-text">{{ list.length }} 项已取消 · 记录保留，可恢复或彻底删除</text>
      </view>

      <view
        v-for="sub in list"
        :key="sub.id"
        class="card"
        role="button"
        tabindex="0"
        :aria-label="`${sub.name}，已取消`"
        @click="goDetail(sub.id)"
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
          <text class="card-name">{{ sub.name }}</text>
          <text class="card-meta">{{ metaLine(sub) }}</text>
        </view>

        <view class="card-right">
          <view class="action-mini" role="button" tabindex="0" @click.stop="onRestore(sub)">
            <text>恢复</text>
          </view>
          <view class="action-mini action-mini--danger" role="button" tabindex="0" @click.stop="onDelete(sub)">
            <text>删除</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useSubscriptionsStore } from "@/store/subscriptions";
import { formatAmount } from "@/utils/format";
import { monogram } from "@/utils/monogram";
import type { Subscription, Cycle } from "@/types/subscription";

const store = useSubscriptionsStore();
const mono = monogram;

const list = computed(() => store.archived);

function cycleLabel(cycle: Cycle, customDays: number | null): string {
  const map: Record<Cycle, string> = {
    daily: "日", weekly: "周", monthly: "月",
    quarterly: "季", yearly: "年", custom: `${customDays || 0}天`,
  };
  return `${map[cycle]}费`;
}

function metaLine(sub: Subscription): string {
  const parts = [formatAmount(sub.amount, sub.currency), cycleLabel(sub.cycle, sub.cycle_days)];
  if (sub.archived_at) {
    const d = new Date(sub.archived_at);
    parts.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")} 取消`);
  }
  return parts.join(" · ");
}

function goDetail(id: string) {
  uni.navigateTo({ url: `/pages/detail/detail?id=${id}` });
}

function onRestore(sub: Subscription) {
  uni.showModal({
    title: "恢复订阅",
    content: `「${sub.name}」将回到订阅列表，状态设为「正式」。`,
    success: (r) => {
      if (r.confirm) {
        store.unarchive(sub.id);
        uni.showToast({ title: "已恢复" });
      }
    },
  });
}

function onDelete(sub: Subscription) {
  uni.showModal({
    title: "彻底删除",
    content: `「${sub.name}」的记录将被永久移除，累计已付等历史一并消失。此操作无法撤销。`,
    confirmColor: DANGER_HEX,
    success: (r) => {
      if (r.confirm) {
        store.remove(sub.id);
        uni.showToast({ title: "已删除" });
      }
    },
  });
}

/** 危险色，与 uni.scss 的 $recur-danger 一致。模态框 API 只接受字符串。 */
const DANGER_HEX = "#B91C1C";
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  padding: 24rpx 24rpx 60rpx;
}

.hint-bar {
  padding: 0 8rpx 20rpx;
}
.hint-text {
  font-size: $recur-fs-sm;
  color: $recur-text-3;
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

.tile {
  width: 76rpx;
  height: 76rpx;
  flex: 0 0 76rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  /* 已取消的订阅视觉上降一级：瓷砖去饱和 */
  opacity: 0.55;
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
.card-name {
  font-size: $recur-fs-title;
  font-weight: 600;
  color: $recur-text-2;
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
  align-items: center;
  gap: 12rpx;
  flex: 0 0 auto;
}
.action-mini {
  min-height: 64rpx;
  padding: 0 24rpx;
  display: inline-flex;
  align-items: center;
  border-radius: $recur-radius-pill;
  background: $recur-card-soft;
  font-size: $recur-fs-sm;
  color: $recur-text-2;
}
.action-mini--danger {
  color: $recur-danger;
}

.empty {
  background: $recur-card;
  border-radius: $recur-radius-card;
  padding: 96rpx 32rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
}
.empty-text {
  font-size: $recur-fs-body;
  color: $recur-text-2;
}
.empty-hint {
  font-size: $recur-fs-sm;
  color: $recur-text-3;
  text-align: center;
}
</style>
