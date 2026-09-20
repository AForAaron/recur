/**
 * 字母瓷砖（monogram tile）
 *
 * 取代 emoji 作为订阅图标。emoji 各有各的色彩、粗细、大小，
 * 放在统一底色上无法形成系统——这是界面"廉价感"的主要来源。
 * 字母瓷砖取名称首字，配一组受控的浅底深字，视觉上高度统一。
 *
 * 配色通过 CSS 变量取值，浅色与深色两套定义在 App.vue。
 * 全部满足 WCAG AA：字母对底色 ≥4.5:1（实测见 App.vue 注释）。
 */

export interface TileColor {
  /** 瓷砖底色（CSS 变量） */
  bg: string;
  /** 字母色（CSS 变量） */
  fg: string;
  /** 语义名，便于调试与文档 */
  name: string;
}

/** 8 组配色。实际色值定义在 App.vue，随主题切换。 */
export const TILE_COLORS: TileColor[] = [
  { name: "indigo",  bg: "var(--tile-indigo-bg)",  fg: "var(--tile-indigo-fg)" },
  { name: "teal",    bg: "var(--tile-teal-bg)",    fg: "var(--tile-teal-fg)" },
  { name: "amber",   bg: "var(--tile-amber-bg)",   fg: "var(--tile-amber-fg)" },
  { name: "rose",    bg: "var(--tile-rose-bg)",    fg: "var(--tile-rose-fg)" },
  { name: "violet",  bg: "var(--tile-violet-bg)",  fg: "var(--tile-violet-fg)" },
  { name: "emerald", bg: "var(--tile-emerald-bg)", fg: "var(--tile-emerald-fg)" },
  { name: "sky",     bg: "var(--tile-sky-bg)",     fg: "var(--tile-sky-fg)" },
  { name: "slate",   bg: "var(--tile-slate-bg)",   fg: "var(--tile-slate-fg)" },
];

/**
 * 取名称的首个有意义字符。
 * 中文取首字，西文取首字母并大写。跳过括号、空格、标点等前导符号。
 */
export function monogramLetter(name: string): string {
  const s = (name || "").trim();
  if (!s) return "?";
  const m = s.match(/[一-龥぀-ヿ]|[A-Za-z0-9]/);
  if (m) return m[0].toUpperCase();
  return s[0].toUpperCase();
}

/**
 * 按名称稳定地选一组配色。
 * 同一名称永远得到同一颜色；用 djb2 变体避免简单取模造成的聚集。
 */
export function monogramColor(name: string): TileColor {
  let h = 5381;
  const s = name || "";
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  }
  return TILE_COLORS[h % TILE_COLORS.length];
}

/** 一次性拿到字母与配色，模板里少算一次 */
export function monogram(name: string): { letter: string; bg: string; fg: string } {
  const c = monogramColor(name);
  return { letter: monogramLetter(name), bg: c.bg, fg: c.fg };
}
