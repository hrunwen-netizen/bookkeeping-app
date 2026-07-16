# 💰 记账 App  ！！！

一款轻量级个人财务管理桌面应用，支持记录日常支出和收入，提供月度统计图表。所有数据保存在本地，无需联网。

## ✨ 功能

- 📝 **记一笔** — 快速记录支出或收入，支持两级分类
- 📋 **账单明细** — 按月查看、编辑、删除记录
- 📊 **月度统计** — 饼图、柱状图展示收支趋势和分类占比
- 🏷️ **分类管理** — 预设分类 + 自定义分类，支持 emoji 图标
- 🌙 **深色模式** — 支持深色/浅色主题切换
- 📥 **CSV 导出** — 导出当月账单，可用 Excel 打开

## 🖥️ 截图

（使用 `npm run dev` 启动后可自行截图替换此处）

## 🛠️ 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | Tauri 2 + React 18 + TypeScript |
| UI | Ant Design 5 |
| 图表 | Recharts |
| 数据库 | SQLite（sql.js） |
| 构建 | Vite 5 |

## 🚀 快速开始

```bash
# 安装依赖
npm install

# 启动开发模式
npm run dev

# 构建生产版本
npm run build
```

## 📁 项目结构

```
src/renderer/
├── components/          # 页面组件
│   ├── AddExpense.tsx   # 记一笔
│   ├── ExpenseList.tsx  # 账单明细
│   ├── MonthlyReport.tsx # 月度统计
│   ├── CategoryManage.tsx # 分类管理
│   ├── Settings.tsx     # 设置
│   └── Layout.tsx       # 布局框架
├── data/
│   └── categories.ts    # 分类数据
└── database/
    └── index.ts         # 数据库操作
```

## 🔒 数据安全

所有账单数据存储在浏览器本地（localStorage），不会上传到任何服务器。
