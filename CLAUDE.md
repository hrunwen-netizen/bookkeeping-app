# 记账 App (Jizhang)

## 项目简介

一款个人财务管理桌面应用，帮助用户记录日常支出（人民币），支持两级分类，提供月度统计图表。所有数据存储在本地，无需联网。

- **目标平台**：Windows + Mac
- **技术栈**：Tauri + React + TypeScript + Rust + SQLite + Ant Design
- **打包工具**：Vite + Tauri CLI

---

## 🔴 用户规则（必须遵守）

用户是非技术人员，无法提供技术决策。在整个项目开发过程中，AI **必须**遵循以下规则：

1. **禁止自作主张**：遇到任何需要做出技术选择的情况，AI 不能替用户决定
2. **必须列方案**：列出 2-3 个可行方案，用通俗语言解释
3. **必须说优劣**：每个方案都要说明优点和缺点（用非技术语言）
4. **必须给建议**：给出明确推荐并说明推荐理由
5. **必须等确认**：等待用户明确选择后再继续执行

### 技术决策标准模板

```
这里有 X 个选项：

选项 1：[名称] — [一句话大白话解释]
  ✅ 优点：...
  ❌ 缺点：...

选项 2：[名称] — [一句话大白话解释]
  ✅ 优点：...
  ❌ 缺点：...

我推荐选项 X，因为[简单理由]。你觉得选哪个？
```

---

## 技术栈详情

| 层级 | 技术 | 用途 |
|------|------|------|
| 桌面框架 | Tauri 2 | 轻量级桌面 App 框架，使用系统自带 WebView |
| 后端 | Rust | 高性能系统级语言，处理数据库和文件操作 |
| UI 框架 | React 18 + TypeScript | 构建用户界面 |
| UI 组件库 | Ant Design 5 | 提供美观的中文界面组件 |
| 图表库 | Recharts | 饼图、折线图 |
| 数据库 | rusqlite (SQLite) | 本地数据存储，编译进应用无需额外安装 |
| 日期处理 | dayjs / chrono | 前端/后端日期处理 |
| 构建工具 | Vite 5 + Tauri CLI | 快速开发和桌面打包 |

---

## 项目结构

```
记账app/
├── CLAUDE.md                # 项目说明书（本文件）
├── package.json             # 项目依赖配置
├── tsconfig.json            # TypeScript 配置
├── vite.config.ts           # Vite 构建配置
├── src-tauri/               # Tauri 后端（Rust）
│   ├── Cargo.toml           # Rust 依赖配置
│   ├── tauri.conf.json      # Tauri 应用配置
│   ├── capabilities/        # 权限配置
│   └── src/
│       ├── main.rs          # Rust 入口
│       ├── lib.rs           # Tauri 命令注册
│       └── database.rs      # 数据库操作层 (rusqlite)
└── src/
    └── renderer/
        ├── index.html       # HTML 入口
        ├── main.tsx         # React 入口
        ├── App.tsx          # 根组件
        ├── App.css          # 全局样式
        ├── env.d.ts         # 类型声明
        ├── data/
        │   └── categories.ts # 支出分类数据
        └── components/
            ├── Layout.tsx        # 应用布局框架
            ├── AddExpense.tsx    # 「记一笔」页面
            ├── ExpenseList.tsx   # 支出列表页面
            ├── MonthlyReport.tsx # 月度统计图表
            └── Settings.tsx      # 设置页面
```

---

## 开发约定

- **语言**：所有用户界面文本使用中文
- **金额**：人民币（元），保留两位小数（如 12.50）
- **日期格式**：YYYY-MM-DD（如 2026-07-15）
- **数据存储**：SQLite 数据库文件存储在用户数据目录（`app.getPath('userData')`）
- **分类数据**：存放在 `src/data/categories.ts`，方便修改
- **安全**：渲染进程不直接访问 Node.js API，通过 preload 桥接

---

## 常用命令

```bash
# 启动开发模式（热更新）
npm run dev

# 构建生产版本
npm run build

# 打包为桌面安装程序
npm run dist
```

---

## 支出分类设计

10 个一级大类，每个大类下约 7 个二级小类。详见 `src/data/categories.ts`。

---

## 数据库设计

### expenses 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER PRIMARY KEY | 自增 ID |
| amount | REAL | 金额（元） |
| category_l1 | TEXT | 一级分类 |
| category_l2 | TEXT | 二级分类 |
| date | TEXT | 日期 YYYY-MM-DD |
| note | TEXT | 备注（可选） |
| created_at | TEXT | 创建时间戳 |
