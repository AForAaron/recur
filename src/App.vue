<script setup lang="ts">
import { onLaunch } from "@dcloudio/uni-app";
import { registerServiceWorker, checkAndNotify } from "@/utils/notify";
import { useSubscriptionsStore } from "@/store/subscriptions";

onLaunch(() => {
  console.log("Recur App Launch");

  // H5 端注册 Service Worker
  registerServiceWorker();

  // 检查并发出提醒（仅 H5 + 用户已授权时生效）
  setTimeout(() => {
    try {
      const store = useSubscriptionsStore();
      checkAndNotify(store.subscriptions);
    } catch (e) {
      console.warn("[Recur] notify check failed", e);
    }
  }, 1500);
});
</script>

<style lang="scss">
page {
  background-color: $recur-bg;
  color: $recur-text-1;
  font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, "PingFang SC",
    "Hiragino Sans GB", "Microsoft YaHei", Arial, sans-serif;
  font-size: $recur-fs-body;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

::-webkit-scrollbar { display: none; width: 0; height: 0; }

button {
  padding: 0; margin: 0; background: transparent; border: none; line-height: 1;
}
button::after { border: none; }

/* 键盘可达性：仅在键盘导航时显示焦点环，鼠标点击不显示。
   配合各页面交互元素上的 role="button" / tabindex="0" 使用。 */
[role="button"]:focus-visible,
[role="tab"]:focus-visible,
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
</style>
