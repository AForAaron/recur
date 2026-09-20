<script setup lang="ts">
import { onLaunch, onShow } from "@dcloudio/uni-app";
import { registerServiceWorker, checkAndNotify } from "@/utils/notify";
import { useSubscriptionsStore } from "@/store/subscriptions";
import { applyTheme } from "@/utils/theme";

const store = useSubscriptionsStore();

onLaunch(() => {
  applyTheme(store.settings.theme);

  // #ifdef H5
  registerServiceWorker();

  // auto 模式下跟随系统切换
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (store.settings.theme === "auto") applyTheme("auto");
  });
  // #endif

  // 检查并发出提醒（仅 H5 + 用户已授权时生效）
  setTimeout(() => {
    try {
      checkAndNotify(store.subscriptions);
    } catch (e) {
      console.warn("[Recur] notify check failed", e);
    }
  }, 1500);
});

onShow(() => {
  applyTheme(store.settings.theme);
});
</script>

<style lang="scss">
/* ============================================================
 * 颜色 token —— 浅色（默认）
 *
 * 所有前景色对最坏背景 ≥4.5:1（WCAG AA）。改动前请复算。
 * 每行注释里的比值即实测结果。
 * ============================================================ */
:root {
  /* 品牌 */
  --recur-primary:        #6366F1;   /* 大色块/装饰    4.47:1 仅大字号可用 */
  --recur-primary-strong: #4F46E5;   /* 文字           6.29:1 */
  --recur-primary-solid:  #4F46E5;   /* 实底按钮       白字在其上 6.29:1 */
  --recur-primary-hover:  #4338CA;
  --recur-primary-soft:   #818CF8;
  --recur-primary-bg:     #EEF2FF;

  /* 文本 */
  --recur-text-1:         #1F2937;   /* 14.68:1 */
  --recur-text-2:         #4B5563;   /*  7.56:1 */
  --recur-text-3:         #5F6673;   /*  5.25:1（原 #9CA3AF 仅 2.31:1） */
  --recur-text-inverse:   #FFFFFF;

  /* 背景 */
  --recur-bg:             #F9FAFB;
  --recur-card:           #FFFFFF;
  --recur-card-soft:      #F3F4F6;
  --recur-divider:        #F3F4F6;

  /* 状态 */
  --recur-success:        #047857;   /* 4.98:1 */
  --recur-warning:        #B45309;   /* 4.56:1 */
  --recur-danger:         #B91C1C;   /* 5.88:1 */

  /* 角标 */
  --recur-trial-bg:       #FEF3C7;
  --recur-trial-text:     #92400E;   /* 6.37:1 */
  --recur-neutral-bg:     #F3F4F6;
  --recur-neutral-text:   #5F6673;
  --recur-danger-bg:      #FEE2E2;

  /* 遮罩与阴影 —— 中性色，非品牌色晕 */
  --recur-mask:           rgba(31, 41, 55, 0.4);
  --recur-scrim:          rgba(249, 250, 251, 0.92);
  --recur-shadow-tab:     0 2rpx 8rpx rgba(17, 24, 39, 0.06);
  --recur-shadow-fab:     0 8rpx 24rpx rgba(17, 24, 39, 0.18);
  --recur-shadow-raised:  0 4rpx 16rpx rgba(17, 24, 39, 0.08);

  /* 字母瓷砖 —— 浅底深字，字对底 ≥4.84:1 */
  --tile-indigo-bg:  #E0E7FF;  --tile-indigo-fg:  #4338CA;  /* 6.41:1 */
  --tile-teal-bg:    #CCFBF1;  --tile-teal-fg:    #0F766E;  /* 4.86:1 */
  --tile-amber-bg:   #FEF3C7;  --tile-amber-fg:   #92400E;  /* 6.37:1 */
  --tile-rose-bg:    #FFE4E6;  --tile-rose-fg:    #BE123C;  /* 5.24:1 */
  --tile-violet-bg:  #EDE9FE;  --tile-violet-fg:  #6D28D9;  /* 5.98:1 */
  --tile-emerald-bg: #D1FAE5;  --tile-emerald-fg: #047857;  /* 4.84:1 */
  --tile-sky-bg:     #E0F2FE;  --tile-sky-fg:     #0369A1;  /* 5.17:1 */
  --tile-slate-bg:   #E2E8F0;  --tile-slate-fg:   #334155;  /* 8.40:1 */
}

/* ============================================================
 * 深色 token
 *
 * 三处必须同时定义，缺一会导致某一状态失效：
 *   @media 块        → auto 模式跟随系统
 *   [data-theme]     → 手动切换（必须能覆盖媒体查询）
 * 浅色不需要媒体查询，因为 :root 就是浅色。
 * ============================================================ */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --recur-primary:        #818CF8;
    --recur-primary-strong: #A5B4FC;   /* 文字     8.64:1 */
    --recur-primary-solid:  #5B5BE0;   /* 实底     白字在其上 5.23:1 */
    --recur-primary-hover:  #4F46E5;
    --recur-primary-soft:   #6366F1;
    --recur-primary-bg:     #232A45;

    --recur-text-1:         #F3F4F6;   /* 15.66:1 */
    --recur-text-2:         #C7CDD8;   /* 10.79:1 */
    --recur-text-3:         #8B94A5;   /*  5.02:1（最坏背景） */
    --recur-text-inverse:   #FFFFFF;

    --recur-bg:             #0B0F19;
    --recur-card:           #161B26;
    --recur-card-soft:      #1F2533;
    --recur-divider:        #262D3D;

    --recur-success:        #34D399;   /* 8.96:1 */
    --recur-warning:        #FBBF24;   /* 10.32:1 */
    --recur-danger:         #F87171;   /* 6.23:1 */

    --recur-trial-bg:       #3A2E14;
    --recur-trial-text:     #FCD34D;   /* 9.21:1 */
    --recur-neutral-bg:     #1F2533;
    --recur-neutral-text:   #8B94A5;
    --recur-danger-bg:      #3B1D1D;

    --recur-mask:           rgba(0, 0, 0, 0.6);
    --recur-scrim:          rgba(11, 15, 25, 0.92);
    --recur-shadow-tab:     0 2rpx 8rpx rgba(0, 0, 0, 0.30);
    --recur-shadow-fab:     0 8rpx 24rpx rgba(0, 0, 0, 0.50);
    --recur-shadow-raised:  0 4rpx 16rpx rgba(0, 0, 0, 0.35);

    --tile-indigo-bg:  #252C4A;  --tile-indigo-fg:  #A5B4FC;  /* 6.85:1 */
    --tile-teal-bg:    #12332F;  --tile-teal-fg:    #5EEAD4;  /* 9.22:1 */
    --tile-amber-bg:   #3A2E14;  --tile-amber-fg:   #FCD34D;  /* 9.21:1 */
    --tile-rose-bg:    #3B1D24;  --tile-rose-fg:    #FDA4AF;  /* 8.01:1 */
    --tile-violet-bg:  #2A1F45;  --tile-violet-fg:  #C4B5FD;  /* 8.24:1 */
    --tile-emerald-bg: #123328;  --tile-emerald-fg: #6EE7B7;  /* 9.01:1 */
    --tile-sky-bg:     #0F2A3D;  --tile-sky-fg:     #7DD3FC;  /* 8.88:1 */
    --tile-slate-bg:   #232A36;  --tile-slate-fg:   #CBD5E1;  /* 9.71:1 */
  }
}

:root[data-theme="dark"] {
  --recur-primary:        #818CF8;
  --recur-primary-strong: #A5B4FC;
  --recur-primary-solid:  #5B5BE0;
  --recur-primary-hover:  #4F46E5;
  --recur-primary-soft:   #6366F1;
  --recur-primary-bg:     #232A45;

  --recur-text-1:         #F3F4F6;
  --recur-text-2:         #C7CDD8;
  --recur-text-3:         #8B94A5;
  --recur-text-inverse:   #FFFFFF;

  --recur-bg:             #0B0F19;
  --recur-card:           #161B26;
  --recur-card-soft:      #1F2533;
  --recur-divider:        #262D3D;

  --recur-success:        #34D399;
  --recur-warning:        #FBBF24;
  --recur-danger:         #F87171;

  --recur-trial-bg:       #3A2E14;
  --recur-trial-text:     #FCD34D;
  --recur-neutral-bg:     #1F2533;
  --recur-neutral-text:   #8B94A5;
  --recur-danger-bg:      #3B1D1D;

  --recur-mask:           rgba(0, 0, 0, 0.6);
  --recur-scrim:          rgba(11, 15, 25, 0.92);
  --recur-shadow-tab:     0 2rpx 8rpx rgba(0, 0, 0, 0.30);
  --recur-shadow-fab:     0 8rpx 24rpx rgba(0, 0, 0, 0.50);
  --recur-shadow-raised:  0 4rpx 16rpx rgba(0, 0, 0, 0.35);

  --tile-indigo-bg:  #252C4A;  --tile-indigo-fg:  #A5B4FC;
  --tile-teal-bg:    #12332F;  --tile-teal-fg:    #5EEAD4;
  --tile-amber-bg:   #3A2E14;  --tile-amber-fg:   #FCD34D;
  --tile-rose-bg:    #3B1D24;  --tile-rose-fg:    #FDA4AF;
  --tile-violet-bg:  #2A1F45;  --tile-violet-fg:  #C4B5FD;
  --tile-emerald-bg: #123328;  --tile-emerald-fg: #6EE7B7;
  --tile-sky-bg:     #0F2A3D;  --tile-sky-fg:     #7DD3FC;
  --tile-slate-bg:   #232A36;  --tile-slate-fg:   #CBD5E1;
}

/* ============================================================
 * 全局基础
 * ============================================================ */
page {
  background-color: $recur-bg;
  color: $recur-text-1;
  font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, "PingFang SC",
    "Hiragino Sans GB", "Microsoft YaHei", Arial, sans-serif;
  font-size: $recur-fs-body;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

/* 浏览器自带的表面也属于设计系统 —— 选中高亮、数字字形这些
 * "你没画但会显示"的部分用的是浏览器默认值，它们不属于任何设计系统。 */
::selection {
  background-color: $recur-primary-bg;
  color: $recur-text-1;
}

.summary-value,
.summary-meta-item,
.card-amount,
.card-meta,
.card-when,
.metric-value {
  font-variant-numeric: tabular-nums;
}

::-webkit-scrollbar { display: none; width: 0; height: 0; }

button {
  padding: 0; margin: 0; background: transparent; border: none; line-height: 1;
}
button::after { border: none; }

/* 键盘可达性：仅键盘导航时显示焦点环 */
[role="button"]:focus-visible,
[role="tab"]:focus-visible,
[role="radio"]:focus-visible,
[tabindex]:focus-visible {
  outline: 4rpx solid $recur-primary-strong;
  outline-offset: 2rpx;
  border-radius: $recur-radius-input;
}

/* 尊重系统的减少动效偏好 */
@media (prefers-reduced-motion: reduce) {
  * {
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
}

/* ============================================================
 * 桌面端
 *
 * 把手机宽度应用居中放置在桌面上。重新思考桌面体验，而不是简单缩放：
 *  - 用更大的阴影把列从背景上抬起来，替代几乎看不见的 1px 边框
 *  - body 用稍深的灰做衬底，让白底列有清晰的边界
 *  - tab bar 让 uni-app 默认处理：full-width 贴视口底部
 *    （手机原生样式在桌面上的自然延伸——像 iOS app 在 Safari 里那样）
 *  - FAB / 弹层交给各自页面的 #ifdef H5 块居中对齐到列
 * ============================================================ */
/* #ifdef H5 */
@media screen and (min-width: 768px) {
  :root {
    --recur-app-w: 430px;
  }

  body {
    background-color: #E5E7EB;
  }

  uni-app {
    max-width: var(--recur-app-w);
    margin: 0 auto;
    min-height: 100vh;
    /* 阴影替代边框：往上抬一点，让列与底像分层 */
    box-shadow:
      0 0 0 1px rgba(17, 24, 39, 0.04),
      0 12px 32px -8px rgba(17, 24, 39, 0.08),
      0 24px 64px -16px rgba(17, 24, 39, 0.06);
    border-radius: 0;
  }

  /* Tab bar：与白底列同宽（430px），居中到列位置。
   * 用 transform: translateX(-50%) 居中（基于实际渲染宽度，
   * 不依赖 max-width 是否被填满）。transform 只放在内层 .uni-tabbar，
   * 不动外层 <uni-tabbar>——外层加 transform 会变成内层 fixed 定位
   * 的新 containing block，把 bottom:0 从视口底部改成文档底部。
   *
   * width 显式设 430px（不是只设 max-width）——若 width: auto，
   * shrink-to-fit 让元素远窄于 430px，文字看起来就太小、按钮就显得太空。 */
  .uni-tabbar {
    width: var(--recur-app-w) !important;
    max-width: var(--recur-app-w) !important;
    left: 50% !important;
    right: auto !important;
    transform: translateX(-50%);
  }

  /* Tab bar 顶部分隔线 */
  .uni-tabbar-border {
    background-color: rgba(17, 24, 39, 0.08) !important;
  }
}
/* #endif */
</style>
