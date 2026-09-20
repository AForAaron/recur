<template>
  <view class="page">
    <!-- 快速选择（仅添加模式） -->
    <view v-if="!editingId" class="quick-group">
      <view class="quick-title">
        <text class="quick-label">快速选择</text>
        <text class="quick-link" @click="openTemplatePopup">更多 →</text>
      </view>
      <scroll-view scroll-x class="quick-scroll">
        <view class="quick-row">
          <view
            v-for="t in popularTemplates"
            :key="t.id"
            class="quick-chip"
            @click="applyTemplate(t)"
          >
            <view class="quick-tile" :style="{ background: mono(t.name).bg }" aria-hidden="true">
              <text class="quick-tile-letter" :style="{ color: mono(t.name).fg }">{{ mono(t.name).letter }}</text>
            </view>
            <view class="quick-info">
              <text class="quick-name">{{ t.name }}</text>
              <text class="quick-price">{{ formatPrice(t.amount, t.currency, t.cycle) }}</text>
            </view>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 基本信息 -->
    <view class="group">
      <view class="field">
        <text class="label">名称 <text class="req">*</text></text>
        <input v-model="form.name" class="input" placeholder="如：Netflix" maxlength="40" />
      </view>

      <view class="field">
        <text class="label">图标</text>
        <view class="tile-row">
          <view class="tile-preview" :style="{ background: mono(form.name || '订阅').bg }" aria-hidden="true">
            <text class="tile-preview-letter" :style="{ color: mono(form.name || '订阅').fg }">
              {{ mono(form.name || '订阅').letter }}
            </text>
          </view>
          <text class="hint">由名称首字自动生成，配色按名称固定</text>
        </view>
      </view>

      <view class="field">
        <text class="label">分类</text>
        <scroll-view scroll-x class="chip-scroll">
          <view class="chip-row">
            <view
              v-for="c in categories"
              :key="c.id"
              class="chip"
              :class="{ active: form.category_id === c.id }"
              @click="form.category_id = c.id"
            >
              <view class="cat-dot" :style="{ background: c.color }" aria-hidden="true"></view>
              <text>{{ c.name }}</text>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- 计费 -->
    <view class="group">
      <view class="group-title">计费</view>

      <view class="field">
        <text class="label">金额 <text class="req">*</text></text>
        <view class="amount-row">
          <input v-model.number="form.amount" type="digit" class="input" placeholder="0.00" />
          <view class="picker-mini" @click="currencyPickerOpen = true">
            {{ form.currency }} <text class="picker-arrow">▾</text>
          </view>
        </view>
        <text v-if="form.amount > 0" class="hint cny-hint">
          {{ form.currency === 'CNY'
              ? `${currencySymbol} ${form.amount.toFixed(2)}`
              : `≈ ¥${cnyEquivalent}` }}
        </text>
      </view>

      <view class="field">
        <text class="label">周期 <text class="req">*</text></text>
        <view class="chip-row">
          <view
            v-for="opt in cycleOptions"
            :key="opt.value"
            class="chip"
            :class="{ active: form.cycle === opt.value }"
            @click="onCycleChange(opt.value)"
          >
            {{ opt.label }}
          </view>
        </view>
      </view>

      <view v-if="form.cycle === 'custom'" class="field">
        <text class="label">自定义天数</text>
        <input v-model.number="form.cycle_days" type="number" class="input" placeholder="如 14" />
      </view>

      <view class="field">
        <text class="label">首次扣费日 <text class="req">*</text></text>
        <picker mode="date" :value="form.start_date" @change="onStartDateChange">
          <view class="input input-picker">{{ form.start_date }}</view>
        </picker>
      </view>

      <view v-if="!form.is_trial" class="field">
        <text class="label">下次扣费日</text>
        <picker mode="date" :value="form.next_billing_date" @change="onNextDateChange">
          <view class="input input-picker">{{ form.next_billing_date || '默认 = 首次扣费日' }}</view>
        </picker>
        <text class="hint">留空则随周期自动滚动</text>
      </view>
    </view>

    <!-- 状态：试用 -->
    <view class="group">
      <view class="group-title">状态</view>

      <view class="switch-field">
        <text class="label">这是一个试用</text>
        <switch :checked="form.is_trial" :color="BRAND_HEX" @change="onTrialSwitch" />
      </view>

      <view v-if="form.is_trial" class="trial-block">
        <view class="field">
          <text class="label">试用结束日 <text class="req">*</text></text>
          <picker mode="date" :value="form.trial_end_date" @change="onTrialEndChange">
            <view class="input input-picker">{{ form.trial_end_date || '点击选择' }}</view>
          </picker>
        </view>

        <view class="field">
          <text class="label">试用结束后</text>
          <view class="chip-row">
            <view
              v-for="opt in trialEndOptions"
              :key="opt.value || 'null'"
              class="chip"
              :class="{ active: form.trial_converts_to === opt.value }"
              @click="form.trial_converts_to = opt.value"
            >
              {{ opt.label }}
            </view>
          </view>
        </view>

        <view class="trial-hint">
          试用订阅不计入"自动续费"列表，到期前 N 天单独提醒你。
        </view>
      </view>
    </view>

    <!-- 续费 -->
    <view v-if="!form.is_trial" class="group">
      <view class="group-title">续费</view>

      <view class="switch-field">
        <text class="label">自动续费</text>
        <switch :checked="form.auto_renew" :color="BRAND_HEX" @change="onAutoRenewSwitch" />
      </view>

      <view class="field">
        <text class="label">退订链接</text>
        <input v-model="form.cancel_url" class="input" placeholder="https://.../cancel" />
      </view>
    </view>

    <!-- 提醒 -->
    <view class="group">
      <view class="group-title">提醒</view>

      <view class="field">
        <text class="label">通道</text>
        <view class="chip-row">
          <view
            v-for="ch in channelOptions"
            :key="ch.value"
            class="chip"
            :class="{ active: form.notify_channels.includes(ch.value) }"
            @click="toggleChannel(ch.value)"
          >
            {{ ch.label }}
          </view>
        </view>
      </view>

      <view class="field">
        <text class="label">提前几天</text>
        <view class="chip-row">
          <view
            v-for="d in dayOptions"
            :key="d"
            class="chip"
            :class="{ active: form.notify_days_before.includes(d) }"
            @click="toggleDay(d)"
          >
            {{ d }} 天
          </view>
        </view>
      </view>
    </view>

    <!-- 备注 -->
    <view class="group">
      <view class="group-title">备注</view>
      <textarea v-model="form.notes" class="textarea" placeholder="订单号、备注……" maxlength="500" />
    </view>

    <!-- 币种选择 popup -->
    <view v-if="currencyPickerOpen" class="popup-mask" @click="currencyPickerOpen = false">
      <view class="popup-sheet" @click.stop>
        <view class="popup-title">选择币种</view>
        <view
          v-for="c in currencies"
          :key="c"
          class="popup-item"
          :class="{ active: form.currency === c }"
          @click="pickCurrency(c)"
        >
          <text class="popup-symbol">{{ currencySymbolOf(c) }}</text>
          <text class="popup-code">{{ c }}</text>
          <text class="popup-name">{{ currencyNameOf(c) }}</text>
          <text v-if="form.currency === c" class="popup-check">✓</text>
        </view>
        <view class="popup-cancel" @click="currencyPickerOpen = false">取消</view>
      </view>
    </view>

    <!-- 模板选择 popup -->
    <view v-if="templatePopupOpen" class="popup-mask" @click="templatePopupOpen = false">
      <view class="popup-sheet popup-tall" @click.stop>
        <view class="popup-title">选择订阅模板</view>
        <input v-model="templateSearch" class="popup-search" placeholder="搜索名称或标签..." />
        <scroll-view scroll-y class="popup-list">
          <view
            v-for="t in filteredTemplates"
            :key="t.id"
            class="popup-item template-item"
            @click="applyTemplate(t)"
          >
            <view class="popup-tile" :style="{ background: mono(t.name).bg }" aria-hidden="true">
              <text class="popup-tile-letter" :style="{ color: mono(t.name).fg }">{{ mono(t.name).letter }}</text>
            </view>
            <view class="template-info">
              <text class="popup-code">{{ t.name }}</text>
              <text class="popup-name">{{ formatPrice(t.amount, t.currency, t.cycle) }} · {{ t.tags.join(' / ') }}</text>
            </view>
          </view>
          <view v-if="filteredTemplates.length === 0" class="empty-mini">
            <text>未找到匹配模板</text>
          </view>
        </scroll-view>
        <view class="popup-cancel" @click="templatePopupOpen = false">取消</view>
      </view>
    </view>

    <!-- 提交 -->
    <view class="submit-bar">
      <view class="btn-secondary" role="button" tabindex="0" @click="goBack">取消</view>
      <view class="btn-primary" role="button" tabindex="0" @click="onSubmit">{{ editingId ? '保存修改' : '添加订阅' }}</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { reactive, computed, ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { useSubscriptionsStore } from "@/store/subscriptions";
import { toCNY } from "@/utils/billing";
import { formatAmount } from "@/utils/format";
import { monogram } from "@/utils/monogram";
import { getPopularTemplates, searchTemplates } from "@/data/templates";
import type { SubscriptionTemplate } from "@/data/templates";
import type {
  Cycle,
  Currency,
  Status,
  TrialConvertsTo,
  NotifyChannel,
  Subscription,
} from "@/types/subscription";

const store = useSubscriptionsStore();
const categories = computed(() => store.categories);
const mono = monogram;

/** 品牌色，与 uni.scss 的 $recur-primary 保持一致。
 *  uni-app 组件的 color prop 只接受字符串，无法读取 SCSS 变量，故在此显式声明。 */
const BRAND_HEX = "#6366F1";

// ============ 模板选择 ============
const popularTemplates = getPopularTemplates();
const templatePopupOpen = ref(false);
const templateSearch = ref("");
const filteredTemplates = computed(() => searchTemplates(templateSearch.value));

function openTemplatePopup() {
  templateSearch.value = "";
  templatePopupOpen.value = true;
}

function applyTemplate(t: SubscriptionTemplate) {
  form.name = t.name;
  form.icon = t.icon; // 保留字段以兼容旧数据，展示已改用字母瓷砖
  form.amount = t.amount;
  form.currency = t.currency;
  form.cycle = t.cycle;
  form.cycle_days = t.cycle_days;
  form.category_id = t.category_id;
  form.tags = [...t.tags];
  form.notes = t.notes;
  form.cancel_url = t.cancel_url;
  form.notify_channels = [...t.notify_channels];
  form.notify_days_before = [...t.notify_days_before];

  // 用户的私人模板带日期字段，一并填入
  if (t.default_start_date) form.start_date = t.default_start_date;
  if (t.default_next_billing_date !== undefined) {
    form.next_billing_date = t.default_next_billing_date;
  }
  if (t.default_trial_end_date !== undefined) {
    form.trial_end_date = t.default_trial_end_date;
  }
  if (t.is_trial !== undefined) {
    onTrialToggle(t.is_trial);
  }

  templatePopupOpen.value = false;
  uni.showToast({ title: `已填入「${t.name}」`, icon: "none" });
}

function formatPrice(amount: number, currency: Currency, cycle: Cycle): string {
  const suffix = { daily: "日", weekly: "周", monthly: "月", quarterly: "季", yearly: "年", custom: "自定义" };
  return `${formatAmount(amount, currency)}/${suffix[cycle]}`;
}

// 实时 RMB 等值（输入金额时即显示）
const cnyEquivalent = computed(() => {
  if (!form.amount || form.amount <= 0) return "0.00";
  if (form.currency === "CNY") return form.amount.toFixed(2);
  return toCNY(form.amount, form.currency, store.settings.exchange_rates).toFixed(2);
});

const currencySymbol = computed(() => currencySymbolOf(form.currency));

const CURRENCY_NAME_MAP: Record<Currency, string> = {
  CNY: "人民币", USD: "美元", EUR: "欧元", GBP: "英镑", JPY: "日元", HKD: "港币",
  AUD: "澳元", SGD: "新加坡元", THB: "泰铢", MYR: "马来西亚林吉特",
};
function currencyNameOf(c: Currency): string { return CURRENCY_NAME_MAP[c] || c; }
function currencySymbolOf(c: Currency): string {
  const map: Record<Currency, string> = {
    CNY: "¥", USD: "$", EUR: "€", GBP: "£", JPY: "¥", HKD: "HK$",
    AUD: "A$", SGD: "S$", THB: "฿", MYR: "RM",
  };
  return map[c] || "¥";
}

interface FormState {
  name: string;
  icon: string;
  amount: number;
  currency: Currency;
  cycle: Cycle;
  cycle_days: number | null;
  start_date: string;
  next_billing_date: string | null;
  is_trial: boolean;
  trial_end_date: string | null;
  trial_converts_to: TrialConvertsTo;
  auto_renew: boolean;
  cancel_url: string | null;
  category_id: string;
  tags: string[];
  notes: string;
  notify_channels: NotifyChannel[];
  notify_days_before: number[];
}

function blankForm(): FormState {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  return {
    name: "",
    icon: "",
    amount: 0,
    currency: "CNY",
    cycle: "monthly",
    cycle_days: null,
    start_date: `${yyyy}-${mm}-${dd}`,
    next_billing_date: `${yyyy}-${mm}-${dd}`,
    is_trial: false,
    trial_end_date: null,
    trial_converts_to: "manual",
    auto_renew: true,
    cancel_url: null,
    category_id: "other",
    tags: [],
    notes: "",
    notify_channels: ["web"],
    notify_days_before: [7, 3, 1],
  };
}

const form = reactive<FormState>(blankForm());
const editingId = ref<string | null>(null);

const currencies: Currency[] = ["CNY", "USD", "EUR", "GBP", "JPY", "HKD", "AUD", "SGD", "THB", "MYR"];

const cycleOptions: Array<{ value: Cycle; label: string }> = [
  { value: "daily",     label: "日" },
  { value: "weekly",    label: "周" },
  { value: "monthly",   label: "月" },
  { value: "quarterly", label: "季" },
  { value: "yearly",    label: "年" },
  { value: "custom",    label: "自定义" },
];

const trialEndOptions: Array<{ value: TrialConvertsTo; label: string }> = [
  { value: "manual",   label: "提醒我决定" },
  { value: "paid",     label: "自动转付费" },
  { value: "auto_end", label: "自动结束" },
];

const channelOptions: Array<{ value: NotifyChannel; label: string }> = [
  { value: "web",     label: "浏览器" },
  { value: "wx_sub",  label: "微信" },
  { value: "ios",     label: "iOS" },
  { value: "android", label: "Android" },
];

const dayOptions = [1, 3, 7, 14, 30];

function onCurrencyChange(e: any) {
  form.currency = currencies[e.detail.value as number];
}

const currencyPickerOpen = ref(false);

function pickCurrency(c: Currency) {
  form.currency = c;
  currencyPickerOpen.value = false;
}
function onAutoRenewSwitch(e: any) { form.auto_renew = e.detail.value; }
function onTrialSwitch(e: any) { onTrialToggle(!!e.detail.value); }
function onStartDateChange(e: any) { form.start_date = e.detail.value; }
function onNextDateChange(e: any) { form.next_billing_date = e.detail.value; }
function onTrialEndChange(e: any) { form.trial_end_date = e.detail.value; }

function onCycleChange(value: Cycle) {
  form.cycle = value;
  if (value !== "custom") form.cycle_days = null;
}

function onTrialToggle(checked: boolean) {
  form.is_trial = checked;
  if (checked) {
    form.next_billing_date = null;
    if (!form.trial_end_date) {
      const d = new Date();
      d.setDate(d.getDate() + 7);
      form.trial_end_date = d.toISOString().slice(0, 10);
    }
  } else {
    form.trial_end_date = null;
    if (!form.next_billing_date) form.next_billing_date = form.start_date;
  }
}

function toggleChannel(ch: NotifyChannel) {
  const i = form.notify_channels.indexOf(ch);
  if (i >= 0) form.notify_channels.splice(i, 1);
  else form.notify_channels.push(ch);
}

function toggleDay(d: number) {
  const i = form.notify_days_before.indexOf(d);
  if (i >= 0) form.notify_days_before.splice(i, 1);
  else form.notify_days_before.push(d);
}

function goBack() { uni.navigateBack(); }

function validate(): string | null {
  if (!form.name.trim()) return "请填写名称";
  if (!form.amount || form.amount < 0) return "请填写金额";
  if (!form.start_date) return "请选择首次扣费日";
  if (form.cycle === "custom" && (!form.cycle_days || form.cycle_days < 1)) {
    return "自定义周期请填写天数";
  }
  if (form.is_trial && !form.trial_end_date) return "试用请填写结束日";
  if (form.is_trial && form.trial_end_date && form.trial_end_date < form.start_date) {
    return "试用结束日不能早于首次扣费日";
  }
  return null;
}

function onSubmit() {
  const err = validate();
  if (err) {
    uni.showToast({ title: err, icon: "none" });
    return;
  }

  const base: Omit<Subscription, "id" | "created_at" | "updated_at"> = {
    name: form.name.trim(),
    icon: form.icon.trim() || "📦",
    amount: form.amount,
    currency: form.currency,
    cycle: form.cycle,
    cycle_days: form.cycle === "custom" ? form.cycle_days : null,
    start_date: form.start_date,
    next_billing_date: form.is_trial ? null : form.next_billing_date || form.start_date,
    status: (form.is_trial ? "trial" : "active") as Status,
    is_trial: form.is_trial,
    trial_end_date: form.is_trial ? form.trial_end_date : null,
    trial_converts_to: form.is_trial ? form.trial_converts_to : null,
    auto_renew: form.auto_renew,
    category_id: form.category_id,
    tags: form.tags,
    notes: form.notes.trim(),
    cancel_url: form.cancel_url?.trim() || null,
    notify_channels: form.notify_channels,
    notify_days_before: [...form.notify_days_before].sort((a, b) => b - a),
    archived_at: null,
  };

  if (editingId.value) {
    store.update(editingId.value, base);
    uni.showToast({ title: "已保存" });
    setTimeout(() => uni.navigateBack(), 500);
  } else {
    store.add(base);
    uni.showToast({ title: "已添加" });
    setTimeout(() => uni.navigateBack(), 500);
  }
}

onLoad((opts: any) => {
  if (opts?.id) {
    const sub = store.getById(opts.id);
    if (sub) {
      editingId.value = sub.id;
      Object.assign(form, {
        name: sub.name,
        icon: sub.icon,
        amount: sub.amount,
        currency: sub.currency,
        cycle: sub.cycle,
        cycle_days: sub.cycle_days,
        start_date: sub.start_date,
        next_billing_date: sub.next_billing_date,
        is_trial: sub.is_trial,
        trial_end_date: sub.trial_end_date,
        trial_converts_to: sub.trial_converts_to || "manual",
        auto_renew: sub.auto_renew,
        cancel_url: sub.cancel_url,
        category_id: sub.category_id,
        tags: sub.tags,
        notes: sub.notes,
        notify_channels: [...sub.notify_channels],
        notify_days_before: [...sub.notify_days_before],
      });
      uni.setNavigationBarTitle({ title: "编辑订阅" });
    }
  }
});
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  padding: 24rpx 24rpx 180rpx;
}

/* —— 快速选择 —— */
.quick-group {
  background: $recur-card;
  border-radius: $recur-radius-card;
  padding: 24rpx 28rpx;
  margin-bottom: $recur-gap-card;
}
.quick-title {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 16rpx;
}
.quick-label {
  font-size: $recur-fs-title;
  font-weight: 600;
  color: $recur-text-1;
}
.quick-link {
  font-size: $recur-fs-sm;
  color: $recur-primary-strong;
}
.quick-scroll { white-space: nowrap; }
.quick-row {
  display: inline-flex;
  gap: 12rpx;
  padding-right: 28rpx;
}
.quick-chip {
  display: inline-flex;
  align-items: center;
  gap: 10rpx;
  padding: 14rpx 20rpx;
  background: $recur-card-soft;
  border-radius: $recur-radius-input;
  transition: background-color 0.15s ease;
}
.quick-chip:active { background: $recur-primary-bg; }
.quick-tile {
  width: 56rpx;
  height: 56rpx;
  flex: 0 0 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12rpx;
}
.quick-tile-letter {
  font-size: 24rpx;
  font-weight: 600;
  line-height: 1;
}
.quick-info {
  display: flex;
  flex-direction: column;
  gap: 2rpx;
}
.quick-name {
  font-size: $recur-fs-sm;
  color: $recur-text-1;
  font-weight: 500;
}
.quick-price {
  font-size: $recur-fs-xs;
  color: $recur-text-3;
  font-feature-settings: "tnum";
}

/* —— 卡片化靠底色 + 间距，不靠边框 —— */
.group {
  background: $recur-card;
  border-radius: $recur-radius-card;
  padding: $recur-pad-card;
  margin-bottom: $recur-gap-card;
}

.group-title {
  font-size: $recur-fs-title;
  font-weight: 600;
  color: $recur-text-1;
  margin-bottom: $recur-gap-field;
}

.field {
  margin-bottom: $recur-gap-field;
  &:last-child { margin-bottom: 0; }
}

.label {
  display: block;
  font-size: $recur-fs-sm;
  color: $recur-text-3;
  margin-bottom: 12rpx;
}

.req { color: $recur-danger; }

.input {
  width: 100%;
  height: 80rpx;
  padding: 0 24rpx;
  background: $recur-card-soft;
  border-radius: $recur-radius-input;
  font-size: $recur-fs-body;
  color: $recur-text-1;
  box-sizing: border-box;
}

.input-picker {
  display: flex;
  align-items: center;
}

.picker-mini {
  height: 80rpx;
  padding: 0 24rpx;
  background: $recur-card-soft;
  border-radius: $recur-radius-input;
  display: flex;
  align-items: center;
  font-size: $recur-fs-body;
  color: $recur-text-2;
  min-width: 140rpx;
  justify-content: center;
}

.tile-row {
  display: flex;
  align-items: center;
  gap: 20rpx;
}
.tile-preview {
  width: 88rpx;
  height: 88rpx;
  flex: 0 0 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 18rpx;
}
.tile-preview-letter {
  font-size: 36rpx;
  font-weight: 600;
  line-height: 1;
}

.amount-row {
  display: flex;
  gap: 16rpx;
  .input { flex: 1; }
}

.hint {
  display: block;
  font-size: $recur-fs-xs;
  color: $recur-text-3;
  margin-top: 8rpx;
}
.cny-hint {
  color: $recur-primary-strong;
  font-weight: 500;
  font-feature-settings: "tnum";
}

.chip-scroll {
  white-space: nowrap;
}
.chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}
.chip {
  min-height: $recur-tap-min;      // 触摸目标下限
  padding: 0 28rpx;
  display: inline-flex;
  align-items: center;
  gap: 10rpx;
  background: $recur-card-soft;
  color: $recur-text-2;
  border-radius: $recur-radius-pill;
  font-size: $recur-fs-sm;
  transition: background-color 0.15s ease;
}
/* 分类色点：替代 emoji，与统计页饼图图例同色系 */
.cat-dot {
  width: 14rpx;
  height: 14rpx;
  border-radius: 50%;
  flex: 0 0 14rpx;
}
.chip.active {
  background: $recur-primary-bg;
  color: $recur-primary-strong;
  font-weight: 600;
}

.switch-field {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4rpx 0;
  .label { margin-bottom: 0; font-size: $recur-fs-body; color: $recur-text-2; }
}

.trial-block {
  margin-top: $recur-gap-field;
  padding-top: $recur-gap-field;
  border-top: 1rpx solid $recur-divider;
}

.trial-hint {
  background: $recur-trial-bg;
  color: $recur-trial-text;
  padding: 16rpx 20rpx;
  border-radius: $recur-radius-input;
  font-size: $recur-fs-xs;
  margin-top: 16rpx;
  line-height: 1.6;
}

.textarea {
  width: 100%;
  height: 160rpx;
  padding: 20rpx 24rpx;
  background: $recur-card-soft;
  border-radius: $recur-radius-input;
  font-size: $recur-fs-body;
  color: $recur-text-1;
  box-sizing: border-box;
}

.submit-bar {
  position: fixed;
  left: 0; right: 0; bottom: 0;
  padding: 20rpx 32rpx calc(20rpx + env(safe-area-inset-bottom));
  background: $recur-scrim;
  backdrop-filter: blur(20rpx);
  display: flex;
  gap: 16rpx;
}

.btn-primary,
.btn-secondary {
  flex: 1;
  height: 88rpx;
  border-radius: $recur-radius-btn;
  font-size: $recur-fs-body;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-primary {
  background: $recur-primary-solid;   // 实底按钮，白字在其上
  color: $recur-text-inverse;
  &.active { background: $recur-primary-hover; }
}

.btn-secondary {
  background: $recur-card-soft;
  color: $recur-text-2;
}

/* —— 币种选择 popup —— */
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
.popup-tile {
  width: 64rpx;
  height: 64rpx;
  flex: 0 0 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 14rpx;
}
.popup-tile-letter {
  font-size: 26rpx;
  font-weight: 600;
  line-height: 1;
}
.popup-code {
  width: 80rpx;
  font-weight: 600;
  color: $recur-text-1;
}
.popup-name {
  flex: 1;
  color: $recur-text-2;
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

/* —— 模板 popup —— */
.popup-tall {
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}
.popup-search {
  height: 72rpx;
  padding: 0 24rpx;
  background: $recur-card-soft;
  border-radius: $recur-radius-input;
  font-size: $recur-fs-body;
  margin-bottom: 16rpx;
}
.popup-list {
  max-height: 60vh;
}
.template-item {
  align-items: center;
}
.template-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  min-width: 0;
}
.template-info .popup-code {
  width: auto;
  font-size: $recur-fs-body;
}
.template-info .popup-name {
  font-size: $recur-fs-xs;
  color: $recur-text-3;
  font-feature-settings: "tnum";
}
.empty-mini {
  padding: 60rpx 0;
  text-align: center;
  color: $recur-text-3;
  font-size: $recur-fs-sm;
}

/* #ifdef H5 */
/* 桌面端：提交栏与弹层是 fixed 定位，需对齐到居中列 */
@media screen and (min-width: 768px) {
  .submit-bar {
    left: 50%;
    right: auto;
    width: var(--recur-app-w, 430px);
    transform: translateX(-50%);
  }
  .popup-sheet {
    max-width: var(--recur-app-w, 430px);
  }
}
/* #endif */
</style>
