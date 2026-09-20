<template>
  <view class="page">
    <!-- 提醒 -->
    <view class="card">
      <view class="card-title">提醒</view>

      <view class="row">
        <text class="row-label">浏览器通知</text>
        <text class="row-value" :class="{ ok: notifyPerm === 'granted', off: notifyPerm === 'denied' }">
          {{ permLabel }}
        </text>
      </view>

      <view v-if="notifyPerm !== 'granted'" class="action" role="button" tabindex="0" @click="requestPerm">
        申请通知权限
      </view>
    </view>

    <!-- 汇率维护 -->
    <view class="card">
      <view class="card-title">
        <text>汇率</text>
        <text class="card-meta">1 外币 = X 人民币</text>
      </view>

      <view class="rate-row" v-for="meta in currencyList" :key="meta.code">
        <text class="rate-code">{{ meta.code }}</text>
        <text class="rate-symbol">{{ meta.symbol }}</text>
        <input
          v-model.number="rateDraft[meta.code]"
          type="digit"
          class="rate-input"
          :placeholder="String(defaultRate(meta.code))"
        />
        <text class="rate-suffix">CNY</text>
      </view>

      <view class="action action-primary" role="button" tabindex="0" @click="saveRates">保存汇率</view>
      <view class="action" role="button" tabindex="0" @click="resetRates">恢复默认</view>
    </view>

    <!-- 显示 -->
    <view class="card">
      <view class="card-title">显示</view>

      <view class="row">
        <text class="row-label">主题</text>
        <view class="seg">
          <view
            v-for="opt in themes"
            :key="opt.value"
            class="seg-item"
            :class="{ active: settings.theme === opt.value }"
            role="radio"
            :aria-checked="settings.theme === opt.value"
            tabindex="0"
            @click="setTheme(opt.value)"
          >
            {{ opt.label }}
          </view>
        </view>
      </view>
    </view>

    <!-- 数据 -->
    <view class="card">
      <view class="card-title">数据</view>

      <view class="action action-primary" role="button" tabindex="0" @click="onUpgrade">升级订阅数据</view>
      <view class="action" role="button" tabindex="0" @click="onImportSeed">从模板补充订阅</view>
      <view class="action" role="button" tabindex="0" @click="onExport">导出 JSON</view>
      <view class="action" role="button" tabindex="0" @click="onImport">从 JSON 导入</view>
      <view class="action action-danger" role="button" tabindex="0" @click="onClear">清空所有数据</view>
    </view>

    <!-- 关于 -->
    <view class="card">
      <view class="card-title">关于</view>

      <view class="row">
        <text class="row-label">名称</text>
        <text class="row-value">Recur</text>
      </view>
      <view class="row">
        <text class="row-label">版本</text>
        <text class="row-value">0.1.0</text>
      </view>
      <view class="row">
        <text class="row-label">订阅条目</text>
        <text class="row-value">{{ store.subscriptions.length }}</text>
      </view>
    </view>

    <view class="footer">
      <text>Recur · 让自动续费不再偷偷扣钱</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { useSubscriptionsStore } from "@/store/subscriptions";
import { notificationPermission, requestNotificationPermission } from "@/utils/notify";
import { storage } from "@/utils/storage";
import { CURRENCY_META } from "@/utils/format";
import { applyTheme, THEME_OPTIONS } from "@/utils/theme";
import { USER_TEMPLATES } from "@/data/templates";
import { DEFAULT_SETTINGS } from "@/types/subscription";
import { todayStr } from "@/utils/date";
import type { Theme, Currency } from "@/types/subscription";

const store = useSubscriptionsStore();

/** 危险色，与 uni.scss 的 $recur-danger 一致。uni-app 模态框 API 只接受字符串。 */
const DANGER_HEX = "#B91C1C";
const settings = computed(() => store.settings);
const notifyPerm = ref<NotificationPermission>(notificationPermission());

const themes = THEME_OPTIONS;

// 汇率维护：本地 draft，未点保存前不影响全局
const rateDraft = reactive<Record<string, number | undefined>>({ ...settings.value.exchange_rates });
const currencyList = CURRENCY_META.filter(c => c.code !== "CNY");

function defaultRate(code: Currency): number {
  return DEFAULT_SETTINGS.exchange_rates[code] || 1;
}

function saveRates() {
  const next: Record<string, number> = {};
  for (const meta of currencyList) {
    const v = rateDraft[meta.code];
    if (typeof v === "number" && v > 0) next[meta.code] = v;
  }
  next.CNY = 1;
  store.updateRates(next);
  uni.showToast({ title: "已保存" });
}

function resetRates() {
  Object.assign(rateDraft, DEFAULT_SETTINGS.exchange_rates);
  const next: Record<string, number> = { ...DEFAULT_SETTINGS.exchange_rates } as Record<string, number>;
  store.updateRates(next);
  uni.showToast({ title: "已恢复默认" });
}

const permLabel = computed(() => {
  if (notifyPerm.value === "granted") return "已开启";
  if (notifyPerm.value === "denied") return "已拒绝";
  return "未授权";
});

function setTheme(t: Theme) {
  store.settings.theme = t;
  store.persist();
  applyTheme(t);   // 直接生效，不依赖 watch 链路
}

async function requestPerm() {
  const result = await requestNotificationPermission();
  notifyPerm.value = result;
  if (result === "granted") uni.showToast({ title: "已开启" });
  else if (result === "denied") uni.showToast({ title: "请在浏览器设置中开启", icon: "none" });
}

function onExport() {
  const payload = {
    version: 1,
    exported_at: new Date().toISOString(),
    subscriptions: store.subscriptions,
    categories: store.categories,
    settings: store.settings,
  };
  const json = JSON.stringify(payload, null, 2);
  if (typeof window !== "undefined" && typeof URL !== "undefined") {
    try {
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `recur-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      uni.showToast({ title: "已下载" });
      return;
    } catch { /* fallthrough */ }
  }
  uni.setClipboardData({ data: json, success: () => uni.showToast({ title: "已复制到剪贴板" }) });
}

function onImport() {
  uni.showModal({
    title: "导入数据",
    content: "请将 JSON 内容粘贴到下方输入框（开发中）",
    showCancel: false,
  });
}

function onUpgrade() {
  uni.showModal({
    title: "升级订阅数据",
    content: "将根据 USER_TEMPLATES 重新整理你的订阅：清理已废弃条目 · 同步模板字段变更 · 补齐新增模板 · 修复倒计时异常。已手动修改的字段（如金额、日期）不会被覆盖。",
    success: (r) => {
      if (!r.confirm) return;
      const { changes } = store.upgradeUserData();
      uni.showModal({
        title: "升级完成",
        content: changes.join("\n"),
        showCancel: false,
      });
    },
  });
}

/** 从 USER_TEMPLATES 补充新订阅（跳过已存在的同名项） */
function onImportSeed() {
  uni.showModal({
    title: "从模板补充订阅",
    content: `将根据 USER_TEMPLATES 补充 ${USER_TEMPLATES.length} 条新订阅。已存在的同名项目会跳过。`,
    success: (r) => {
      if (!r.confirm) return;
      let added = 0;
      let skipped = 0;
      for (const t of USER_TEMPLATES) {
        const exists = store.subscriptions.find((s) => s.name === t.name);
        if (exists) { skipped++; continue; }
        const now = Date.now();
        store.add({
          name: t.name,
          icon: t.icon,
          amount: t.amount,
          currency: t.currency,
          cycle: t.cycle,
          cycle_days: t.cycle_days,
          start_date: t.default_start_date || todayStr(),
          next_billing_date: t.default_next_billing_date ?? null,
          status: t.is_trial ? "trial" : "active",
          is_trial: !!t.is_trial,
          trial_end_date: t.default_trial_end_date ?? null,
          trial_converts_to: t.is_trial ? "manual" : null,
          auto_renew: !t.is_trial,
          category_id: t.category_id,
          tags: [...t.tags],
          notes: t.notes,
          cancel_url: t.cancel_url,
          notify_channels: [...t.notify_channels],
          notify_days_before: [...t.notify_days_before],
          archived_at: null,
        });
        added++;
      }
      uni.showToast({ title: `新增 ${added} 条${skipped ? ` · 跳过 ${skipped}` : ""}`, icon: "none" });
    },
  });
}

function onClear() {
  uni.showModal({
    title: "确认清空",
    content: "所有订阅、设置都将被删除，无法恢复",
    confirmColor: DANGER_HEX,
    success: (r) => {
      if (r.confirm) {
        storage.clearAll();
        uni.showToast({ title: "已清空" });
        setTimeout(() => uni.reLaunch({ url: "/pages/index/index" }), 600);
      }
    },
  });
}

onShow(() => {
  notifyPerm.value = notificationPermission();
  // 每次进入同步最新 store 汇率到 draft
  Object.assign(rateDraft, settings.value.exchange_rates);
});
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  padding: 20rpx 24rpx 60rpx;
}

.card {
  background: $recur-card;
  border-radius: $recur-radius-card;
  padding: 8rpx 28rpx;
  margin-bottom: 16rpx;
}
.card-title {
  font-size: $recur-fs-title;
  font-weight: 600;
  color: $recur-text-1;
  padding: 20rpx 0 16rpx;
  margin-bottom: 4rpx;
  border-bottom: 1rpx solid $recur-divider;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}
.card-meta {
  font-size: $recur-fs-xs;
  color: $recur-text-3;
  font-weight: 400;
}

.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 0;
  font-size: $recur-fs-body;
  &:not(:last-child) { border-bottom: 1rpx solid $recur-divider; }
}
.row-label { color: $recur-text-2; }
.row-value { color: $recur-text-1; font-weight: 500; }
.row-value.ok { color: $recur-success; }
.row-value.off { color: $recur-text-3; }

/* —— 汇率行 —— */
.rate-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 20rpx 0;
  border-bottom: 1rpx solid $recur-divider;
  &:last-of-type { border-bottom: none; }
}
.rate-code {
  width: 60rpx;
  font-size: $recur-fs-body;
  font-weight: 600;
  color: $recur-text-1;
}
.rate-symbol {
  width: 40rpx;
  font-size: $recur-fs-body;
  color: $recur-text-3;
}
.rate-input {
  flex: 1;
  height: 64rpx;
  padding: 0 20rpx;
  background: $recur-card-soft;
  border-radius: $recur-radius-input;
  font-size: $recur-fs-body;
  font-feature-settings: "tnum";
  text-align: right;
}
.rate-suffix {
  font-size: $recur-fs-xs;
  color: $recur-text-3;
  width: 56rpx;
  text-align: right;
}

.seg {
  display: flex;
  background: $recur-card-soft;
  padding: 4rpx;
  border-radius: $recur-radius-pill;
}
.seg-item {
  min-height: 72rpx;               // 次级控件，取 36px 折中
  padding: 0 20rpx;
  display: inline-flex;
  align-items: center;
  font-size: $recur-fs-xs;
  color: $recur-text-3;
  border-radius: $recur-radius-pill;
}
.seg-item.active {
  background: $recur-card;
  color: $recur-primary-strong;
  font-weight: 600;
}

.action {
  min-height: $recur-tap-min;      // 触摸目标下限
  padding: 20rpx 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: $recur-fs-body;
  color: $recur-text-2;
  text-align: center;
  border-bottom: 1rpx solid $recur-divider;
  &:last-child { border-bottom: none; }
}
.action-primary {
  color: $recur-primary-strong;
  font-weight: 600;
  margin-top: 12rpx;
}
.action-danger { color: $recur-danger; }

.footer {
  text-align: center;
  font-size: $recur-fs-xs;
  color: $recur-text-3;
  padding: 40rpx 0;
}
</style>
