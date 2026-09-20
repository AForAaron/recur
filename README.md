# Recur · 订阅追踪器

> 一个跨端订阅/续费追踪工具：让你在被自动续费前拿到信息差。

## 当前进度（v0.1.0 · Web MVP）

✅ **已完成**
- 订阅增删改查（含 6 段表单 + 试用开关）
- 三个 Tab：全部 / 正式订阅 / 试用中
- 日均成本 + 月均 + 年均 + 累计已付（简化版）
- 未来 7 天扣费时间轴
- 订阅详情页（关键指标 + 操作）
- 统计页（分类饼图 + 月度柱图 + 试用面板）
- 浏览器通知（Notification API + Service Worker）
- 数据导出 JSON
- PWA manifest（可安装到桌面）

🔜 **下一步（阶段 1-2）**
- CloudBase 接入，多端云同步
- 微信小程序订阅消息
- iOS/Android App 编译（uni-app 一码多端）
- 扣费历史 BillingRecord 表 → 精确累计已付
- 自然语言添加订阅

## 本地运行

```bash
npm install
npm run dev:h5         # 本地 H5，默认 http://localhost:5173
npm run type-check     # 类型检查
npm run build:h5       # 生产构建
```

## 部署

推送到 GitHub 后用 Vercel：
- Build Command: `npm run build:h5`
- Output Directory: `dist/build/h5`
- 已包含 `vercel.json`

## 技术栈

| 层 | 选型 |
|---|---|
| 框架 | uni-app + Vue 3 + Vite + TypeScript |
| UI | uView Plus（仅按需引入） |
| 状态 | Pinia |
| 持久化 | uni.storage (H5 = localStorage) |
| 图表 | 自制 SVG（饼图 + 柱图） |
| 跨端 | 一码多端：H5 / 小程序 / iOS / Android |

## 项目结构

```
src/
├── App.vue              # 全局样式 + SW 注册 + 通知检查
├── main.ts              # Pinia + uview-plus
├── pages.json           # 路由 + tabBar
├── manifest.json        # 跨端清单 + H5 PWA 配置
├── uni.scss             # 设计系统（柔和紫蓝 #6366F1）
├── pages/               # 5 个页面
├── components/          # （预留）
├── store/               # Pinia: subscriptions.ts
├── utils/               # date / billing / storage / id / notify
├── types/               # Subscription / Category / shims
└── static/              # manifest.webmanifest + sw.js + 图标
```

## 设计原则

- **简洁**：无边框、无阴影，全靠间距和底色差分层
- **集中**：单卡承载多字段，label + input 同行
- **柔和**：紫蓝主色 + 中性灰阶，参考 Linear / Apple Health / Notion
- **试用分离**：试用订阅在数据 / 列表 / 提醒 / 统计四层完全独立，不污染正式订阅数据
