/**
 * 主题应用
 *
 * 做成模块级函数而非 App.vue 里的 watch，原因：
 * 切换主题是低频动作，但必须"一定生效"。走响应式 watch 会引入
 * 额外的时序假设（watch 是否被正确收集、store 是否已就绪）。
 * 直接调用没有这些假设，且任何地方都能触发。
 *
 * 浅色与深色的具体色值定义在 App.vue 的 CSS 自定义属性里，
 * 这里只负责切换根元素上的 data-theme 属性。
 */

import type { Theme } from "@/types/subscription";

/** 深色时的浏览器 UI 色（地址栏等） */
const DARK_UI_COLOR = "#0B0F19";
/** 浅色时的浏览器 UI 色 */
const LIGHT_UI_COLOR = "#F9FAFB";

function prefersDark(): boolean {
  // #ifdef H5
  return typeof window !== "undefined"
    && window.matchMedia("(prefers-color-scheme: dark)").matches;
  // #endif
  // 小程序端无媒体查询，统一按浅色处理，由用户手动切换
  return false;
}

/**
 * 应用主题。
 *   auto  → 移除 data-theme，交给 @media (prefers-color-scheme)
 *   light → data-theme="light"
 *   dark  → data-theme="dark"
 */
export function applyTheme(theme: Theme): void {
  const isDark = theme === "dark" || (theme === "auto" && prefersDark());

  // #ifdef H5
  const root = document.documentElement;
  if (theme === "auto") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);

  // 同步浏览器地址栏等 UI 色
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", isDark ? DARK_UI_COLOR : LIGHT_UI_COLOR);
  // #endif

  // #ifdef MP-WEIXIN
  // 小程序端 tabBar 颜色需通过 API 设置，无法走 CSS
  uni.setTabBarStyle({
    backgroundColor: isDark ? "#161B26" : "#FFFFFF",
    color: isDark ? "#8B94A5" : "#5F6673",
    selectedColor: isDark ? "#A5B4FC" : "#4F46E5",
    borderStyle: isDark ? "black" : "white",
  });
  // #endif
}

/** 主题选项，供选择器复用 */
export const THEME_OPTIONS: Array<{ value: Theme; label: string }> = [
  { value: "auto",  label: "跟随系统" },
  { value: "light", label: "浅色" },
  { value: "dark",  label: "深色" },
];

/** 当前实际生效的是不是深色（auto 时会解析系统偏好） */
export function isDarkNow(theme: Theme): boolean {
  return theme === "dark" || (theme === "auto" && prefersDark());
}
