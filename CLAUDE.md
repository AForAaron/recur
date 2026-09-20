# Recur — 项目约定

> 本文件是本项目的**局部约定**，与全局 `~/.claude/CLAUDE.md` 叠加生效。
> 冲突时以本文件为准（更具体者优先）。

## 项目身份

- **名称**：Recur（订阅/续费追踪器）
- **技术栈**：uni-app + Vue 3 + Vite + TypeScript + uView Plus + Pinia
- **跨端目标**：H5（当前主用）/ 微信小程序 / iOS / Android（一码多端）
- **工作目录**：`/Users/aaron/AAA/Agent/Object_value/recur`

## 设计决策优先级

本项目 UI/前端设计决策的参考顺序：

1. **impeccable**（本项目已安装，见下节）
2. 项目内的 `DESIGN.md` / `PRODUCT.md`（待创建）
3. 全局内置 skill（`artifact-design`、`dataviz`、`artifact-diagramming`）

**说明**：后三者是 Claude Code harness 的内置 skill，编译在二进制里，**无法删除**。因此"让 impeccable 优先"只能靠本文件声明优先级来实现，不能靠移除它们。

当 impeccable 与内置设计 skill 的建议冲突时：
- 采用 impeccable 的判断
- 在回复中简要说明采用了哪一方、为什么
- 如果内置 skill 的建议确实更优（例如 `dataviz` 对图表有更具体的规范），可以采纳，但需显式说明理由

## impeccable 使用约定

### 安装位置

全部落在**项目内**，无全局污染：

| 内容 | 路径 |
|---|---|
| Skill | `.claude/skills/impeccable/` |
| Agents | `.claude/agents/impeccable-*.md` |
| Rust 引擎 | `.impeccable/bin/0.1.5/impeccable` |
| 版本 | skill v4.3.1 / engine 0.1.5 |

### 关键约定：必须带 IMPECCABLE_HOME

引擎默认会尝试写 `~/.impeccable/bin/`（全局路径）。本项目强制它落在项目内，
**所有调用必须带 `IMPECCABLE_HOME` 环境变量**，否则会失败或污染全局：

```bash
cd /Users/aaron/AAA/Agent/Object_value/recur
IMPECCABLE_HOME="$PWD/.impeccable" ./.claude/skills/impeccable/scripts/impeccable <command>
```

常用命令：

```bash
# 加载项目上下文（每个 session 跑一次）
IMPECCABLE_HOME="$PWD/.impeccable" ./.claude/skills/impeccable/scripts/impeccable context

# 机械检测（改完 UI 后跑一次，输出 JSON）
IMPECCABLE_HOME="$PWD/.impeccable" ./.claude/skills/impeccable/scripts/impeccable detect --json src/

# 引擎自检
IMPECCABLE_HOME="$PWD/.impeccable" ./.claude/skills/impeccable/scripts/impeccable engine-probe
```

### 不要安装 hook

本项目**有意不装 impeccable 的 hook**（即不创建 `.claude/settings.json`）。

原因：hook 绑在 `PostToolUse`（Edit|Write，5 秒超时）和 `Stop`（30 秒超时）上，
会让每次编辑和每轮对话结束都产生额外等待。当前选择手动调用。

如需启用，从安装包解出 `.claude/settings.json` 即可（包内只含 hooks，不含 permissions）。

### 工作流

impeccable 的推荐流程是：

1. `/impeccable init` → 与用户一起创建 `PRODUCT.md`（记录产品真相：受众、目的、约束、语气）
2. `reference/new-work.md` → 处理视觉决策
3. 改完 UI 后跑 `detect` 做机械检查

**当前状态**：`PRODUCT.md` 和 `DESIGN.md` 均未创建。

## 设计语言（现行）

这些是已固化的决策，改动前需与用户确认：

| 项 | 值 |
|---|---|
| 品牌主色 | `#6366F1`（indigo-500）——**仅用于大色块**（FAB、装饰渐变） |
| 主色·文字版 | `#4F46E5`（indigo-600，6.29:1）——所有文字与小字号按钮底 |
| 页面底色 | `#F9FAFB` |
| 卡片 | `#FFFFFF`，圆角 `20rpx` |
| 风格 | 无边框、无阴影，靠间距 + 底色分层（参考 Linear / Apple Health / Notion） |
| 字号 | 正文 `28rpx` / 辅助 `24rpx` / 极小 `22rpx` |
| 触摸目标 | `$recur-tap-min` = `88rpx`（44px） |

设计 token 定义在 `src/uni.scss`。

### 对比度纪律（2026-09-20 审计后建立）

所有前景色必须满足 **WCAG AA 4.5:1**（以最坏背景为准，即 `$recur-card-soft` `#F3F4F6`）。
新增或修改颜色时，用下面的脚本复核：

```bash
python3 -c "
def lum(h):
    h=h.lstrip('#'); r,g,b=(int(h[i:i+2],16)/255 for i in (0,2,4))
    f=lambda c: c/12.92 if c<=0.03928 else ((c+0.055)/1.055)**2.4
    return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b)
def cr(a,b):
    l1,l2=lum(a),lum(b); hi,lo=max(l1,l2),min(l1,l2)
    return (hi+0.05)/(lo+0.05)
print(f'{cr(\"#5F6673\",\"#F3F4F6\"):.2f}:1')
"
```

**两条硬规则**：

1. **`$recur-primary` 不得用作文字颜色**——它在白底上只有 4.47:1，不达 AA。文字场景一律用 `$recur-primary-strong`。
2. **不得用 `opacity` 降低文字对比度**——半透明会稀释对比度且难以核算。需要弱化时，改用更浅的实色 token。

### 已知未解决

- **深色模式未实现**：`AppSettings.theme` 声明了 `auto | light | dark`，设置页有切换 UI，但**没有任何 CSS 实现**。用户切换后无视觉变化——这是误导性 UI，待实现或移除入口。
- **`stats.vue` 的 `transition: height`**（`bar-fill`）：会触发 layout thrash，检测器报为 P3。改用 `transform: scaleY()` 或 `grid-template-rows`。

## 数据模型约定

- **币种**：10 种（CNY/USD/EUR/GBP/JPY/HKD/AUD/SGD/THB/MYR），汇率可在设置页编辑
- **RMB 折算**：所有跨币种聚合统一折算到 CNY；展示时原币种为主、RMB 为次
- **试用分离**：`is_trial=true` 的订阅在数据/列表/提醒/统计四层完全独立，不污染正式订阅统计
- **试用结束后行为**：`trial_converts_to='manual'`（用户已固化：提醒手动决定）
- **累计已付**：MVP 用简化公式 `floor((今天-start_date)/cycle_days+1) × amount`；阶段 2 升级为 BillingRecord 精确版

## 用户数据

用户的私人订阅模板定义在 `src/data/templates.ts` 的 `USER_TEMPLATES` 数组。

**修改该数组后，用户需要在设置页点「升级订阅数据」按钮**，变更才会写进 localStorage。

## Git 注意事项

`.impeccable/`（13MB，含二进制）和 `.claude/` 已加入 `.gitignore`。
如需版本控制这些配置，请单独处理，不要直接提交二进制。
