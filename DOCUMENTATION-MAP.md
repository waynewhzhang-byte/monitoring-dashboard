# 📚 文档导航地图

> 快速找到你需要的文档

---

## 🗺️ 文档全景图

```
                    监控大屏系统文档体系
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
    🚀 快速开始        🔧 配置指南         📖 技术文档
        │                   │                   │
        │                   │                   │
┌───────┴──────┐    ┌──────┴──────┐    ┌──────┴──────┐
│              │    │              │    │              │
│ 快速启动清单 │    │ 必需vs可选   │    │   开发指南   │
│  (15分钟)    │    │ 配置对照表   │    │  (CLAUDE.md) │
│              │    │              │    │              │
└──────┬───────┘    └──────┬───────┘    └──────┬───────┘
       │                   │                   │
       │            ┌──────┴──────┐            │
       │            │              │            │
       │            │ 完整配置指南 │            │
       │            │  (详细版)    │            │
       │            │              │            │
       │            └──────┬───────┘            │
       │                   │                   │
       └───────────────────┼───────────────────┘
                           │
                    ┌──────┴──────┐
                    │              │
                    │ 数据流架构图 │
                    │ (可视化理解) │
                    │              │
                    └──────┬───────┘
                           │
            ┌──────────────┼──────────────┐
            │              │              │
     ┌──────┴──────┐ ┌────┴─────┐ ┌─────┴──────┐
     │   标签指南   │ │验证工具  │ │  脚本说明  │
     │  (可选功能)  │ │文档      │ │  (诊断)    │
     └──────────────┘ └──────────┘ └────────────┘
```

---

## 📋 按使用场景选择文档

### 🎯 场景 1: 首次部署（我是新手）

**推荐阅读顺序**：

1. **[QUICK-START-CHECKLIST.md](./QUICK-START-CHECKLIST.md)** ⚡ (15-30分钟)
   - 最快上线路径
   - 分步操作指南
   - 配置检查清单

2. **[REQUIRED-VS-OPTIONAL.md](./REQUIRED-VS-OPTIONAL.md)** 🎯 (5分钟)
   - **必读！** 搞清楚哪些是必需的
   - 避免在可选配置上浪费时间
   - 常见疑问快速解答

3. **[COMPLETE-SETUP-GUIDE.md](./COMPLETE-SETUP-GUIDE.md)** 📘 (参考)
   - 遇到问题时查阅
   - 详细配置步骤
   - 故障排查指南

**关键点**：
- ✅ 先让系统跑起来
- ✅ Business View 是必需的（拓扑显示的核心）
- ❌ 标签不是必需的（可选的增强功能）

---

### 🔍 场景 2: 故障排查（系统出问题了）

**推荐步骤**：

1. **⭐ 大屏无数据时首先运行**：
   ```bash
   npm run diagnose:display
   ```
   - **[DASHBOARD-DISPLAY-DIAGNOSIS.md](./DASHBOARD-DISPLAY-DIAGNOSIS.md)**
   - 自动检查所有关键环节
   - 7 大常见问题和解决方案
   - 典型场景示例

2. **运行验证脚本**：
   ```bash
   npm run verify:data-flow
   ```

3. **查看诊断文档**：
   - **[scripts/VERIFY-DATA-FLOW-README.md](./scripts/VERIFY-DATA-FLOW-README.md)**
   - 测试结果解读
   - 常见问题修复

4. **查看完整指南**：
   - **[COMPLETE-SETUP-GUIDE.md](./COMPLETE-SETUP-GUIDE.md)** 第 7 节
   - 常见问题与解决方案

5. **查看架构图**：
   - **[DATA-FLOW-DIAGRAM.md](./DATA-FLOW-DIAGRAM.md)** 第 5 节
   - 故障排查决策树

**快速诊断命令**：
```bash
npm run diagnose:display      # ⭐ 大屏无数据时首选
npm run verify:data-flow      # 验证完整数据流
npm run check:all             # 检查所有数据
npm run diagnose:production   # 完整诊断
npm run verify:opmanager-apis # 验证 OpManager 连接
```

---

### 🎨 场景 3: 理解系统架构（我想深入了解）

**推荐阅读**：

1. **[DATA-FLOW-DIAGRAM.md](./DATA-FLOW-DIAGRAM.md)** 🎨
   - 完整数据流可视化
   - 6 个架构图
   - Business View 关联关系
   - 时序图和决策树

2. **[COMPLETE-SETUP-GUIDE.md](./COMPLETE-SETUP-GUIDE.md)** 第 1 节
   - 数据流概览
   - 6 个阶段详解

3. **[CLAUDE.md](./CLAUDE.md)** 开发指南
   - 技术栈说明
   - 核心架构
   - 目录结构

**关键理解**：
- OpManager → Collector → Database → API → Frontend
- Business View 是连接 OpManager 和拓扑的桥梁
- 采集器分为自动和手动两种

---

### 🏷️ 场景 4: 添加标签（想要分组管理）

**相关文档**：

1. **[TAGS-GUIDE.md](./TAGS-GUIDE.md)** 🏷️
   - 标签是否必需？（不需要）
   - 标签的作用
   - 如何添加标签
   - 最佳实践

2. **[REQUIRED-VS-OPTIONAL.md](./REQUIRED-VS-OPTIONAL.md)** Q1
   - 标签 vs Business View 对比

**记住**：
- ❌ 标签不是必需的
- ✅ 标签是可选的增强功能
- 💡 适合大型网络（50+ 台设备）

---

### 🔧 场景 5: 开发和维护（我是开发者）

**推荐文档**：

1. **[CLAUDE.md](./CLAUDE.md)** 开发指南
   - 常用命令速查
   - 开发规范
   - API 路由规范
   - 组件设计原则

2. **[DATA-FLOW-DIAGRAM.md](./DATA-FLOW-DIAGRAM.md)**
   - 数据流架构
   - 核心概念理解

3. **项目内部文档**：
   - [prisma/schema.prisma](./prisma/schema.prisma) - 数据库设计
   - [src/config/dashboards/](./src/config/dashboards/) - 大屏配置
   - [src/services/collector/](./src/services/collector/) - 采集器实现

---

### 📊 场景 6: 生产部署（准备上线）

**部署检查清单**：

1. **[QUICK-START-CHECKLIST.md](./QUICK-START-CHECKLIST.md)** 验证步骤
   - 所有检查项都要完成

2. **[COMPLETE-SETUP-GUIDE.md](./COMPLETE-SETUP-GUIDE.md)** 第 8 节
   - 配置检查清单
   - 所有 ✅ 必须完成

3. **运行验证**：
   ```bash
   npm run verify:data-flow
   ```
   - 期望通过率 100%

4. **设置监控**：
   - 参考 [COMPLETE-SETUP-GUIDE.md](./COMPLETE-SETUP-GUIDE.md) 第 9 节
   - 定期健康检查

---

## 📖 文档详细说明

### 核心文档（必读）

| 文档 | 用途 | 适用人群 | 阅读时长 |
|------|------|---------|---------|
| **[QUICK-START-CHECKLIST.md](./QUICK-START-CHECKLIST.md)** | 快速上线指南 | 所有人 | 15 分钟 |
| **[REQUIRED-VS-OPTIONAL.md](./REQUIRED-VS-OPTIONAL.md)** | 配置优先级 | 所有人 | 5 分钟 |
| **[COMPLETE-SETUP-GUIDE.md](./COMPLETE-SETUP-GUIDE.md)** | 完整配置参考 | 管理员 | 30 分钟 |
| **[DATA-FLOW-DIAGRAM.md](./DATA-FLOW-DIAGRAM.md)** | 架构可视化 | 开发者 | 20 分钟 |

### 专题文档（按需阅读）

| 文档 | 用途 | 适用场景 | 阅读时长 |
|------|------|---------|---------|
| **[TAGS-GUIDE.md](./TAGS-GUIDE.md)** | 标签使用说明 | 需要分组管理时 | 10 分钟 |
| **[CLAUDE.md](./CLAUDE.md)** | 开发指南 | 代码开发 | 15 分钟 |
| **[scripts/VERIFY-DATA-FLOW-README.md](./scripts/VERIFY-DATA-FLOW-README.md)** | 验证工具说明 | 故障排查 | 10 分钟 |
| **[scripts/QUICK-VERIFY-GUIDE.md](./scripts/QUICK-VERIFY-GUIDE.md)** | 快速验证 | 日常检查 | 5 分钟 |

### 参考文档（深入学习）

| 文档 | 用途 | 适用人群 |
|------|------|---------|
| [README.md](./README.md) | 项目简介 | 所有人 |
| [prisma/schema.prisma](./prisma/schema.prisma) | 数据库设计 | 开发者 |
| [architecture-design.md](./architecture-design.md) | 系统架构 | 架构师 |
| [project-structure.md](./project-structure.md) | 项目结构 | 开发者 |

---

## 🔍 按问题查找文档

### ❓ 配置相关问题

| 问题 | 查看文档 | 章节 |
|------|---------|------|
| 标签必须配置吗？ | [TAGS-GUIDE.md](./TAGS-GUIDE.md) | 开头 |
| Business View 是什么？ | [REQUIRED-VS-OPTIONAL.md](./REQUIRED-VS-OPTIONAL.md) | Q2 |
| 哪些是必需配置？ | [REQUIRED-VS-OPTIONAL.md](./REQUIRED-VS-OPTIONAL.md) | 对比表 |
| 如何配置 Business View？ | [COMPLETE-SETUP-GUIDE.md](./COMPLETE-SETUP-GUIDE.md) | 步骤 2 |
| 设备如何同步？ | [COMPLETE-SETUP-GUIDE.md](./COMPLETE-SETUP-GUIDE.md) | 步骤 3 |

### 🐛 故障排查问题

| 问题 | 查看文档 | 章节 |
|------|---------|------|
| OpManager 连接失败 | [COMPLETE-SETUP-GUIDE.md](./COMPLETE-SETUP-GUIDE.md) | Q1 |
| 大屏无数据 | [COMPLETE-SETUP-GUIDE.md](./COMPLETE-SETUP-GUIDE.md) | Q3 |
| 拓扑图为空 | [COMPLETE-SETUP-GUIDE.md](./COMPLETE-SETUP-GUIDE.md) | Q2 |
| 数据不更新 | [DATA-FLOW-DIAGRAM.md](./DATA-FLOW-DIAGRAM.md) | 决策树 |
| 如何诊断问题？ | [scripts/VERIFY-DATA-FLOW-README.md](./scripts/VERIFY-DATA-FLOW-README.md) | 全文 |

### 🎨 功能使用问题

| 问题 | 查看文档 | 章节 |
|------|---------|------|
| 如何添加标签？ | [TAGS-GUIDE.md](./TAGS-GUIDE.md) | 第 4 节 |
| 如何自定义大屏？ | [COMPLETE-SETUP-GUIDE.md](./COMPLETE-SETUP-GUIDE.md) | 步骤 6.4 |
| 如何查看拓扑？ | [COMPLETE-SETUP-GUIDE.md](./COMPLETE-SETUP-GUIDE.md) | 步骤 6 |
| 采集器如何工作？ | [DATA-FLOW-DIAGRAM.md](./DATA-FLOW-DIAGRAM.md) | 第 2 节 |

### 🔧 开发相关问题

| 问题 | 查看文档 | 章节 |
|------|---------|------|
| 常用命令有哪些？ | [CLAUDE.md](./CLAUDE.md) | 第 2 节 |
| 数据库结构？ | [prisma/schema.prisma](./prisma/schema.prisma) | 全文 |
| API 如何设计？ | [CLAUDE.md](./CLAUDE.md) | API 规范 |
| 如何添加 Widget？ | [CLAUDE.md](./CLAUDE.md) | 常见任务 |

---

## 🎯 快速参考卡

### 最常用的 3 个命令

```bash
npm run verify:data-flow     # 验证完整数据流
npm run check:all            # 检查所有数据
npm run diagnose:production  # 完整诊断
```

### 最重要的 3 个配置

1. **环境变量 (.env)** - DATABASE_URL, OPMANAGER_BASE_URL, OPMANAGER_API_KEY
2. **Business View** - 在 `/admin/topology` 配置
3. **设备同步** - 在 `/admin/devices` 手动触发

### 最常见的 3 个问题

1. **拓扑图为空？** → 检查 Business View 是否配置并激活
2. **大屏无数据？** → 运行 `npm run verify:data-flow` 诊断
3. **标签必须配吗？** → 不需要，是可选功能

---

## 📱 快速导航

### 按文档类型

- **🚀 快速开始**: [QUICK-START-CHECKLIST.md](./QUICK-START-CHECKLIST.md)
- **📘 完整指南**: [COMPLETE-SETUP-GUIDE.md](./COMPLETE-SETUP-GUIDE.md)
- **🎨 架构图**: [DATA-FLOW-DIAGRAM.md](./DATA-FLOW-DIAGRAM.md)
- **🏷️ 标签指南**: [TAGS-GUIDE.md](./TAGS-GUIDE.md)
- **🔧 开发指南**: [CLAUDE.md](./CLAUDE.md)
- **✅ 配置对照**: [REQUIRED-VS-OPTIONAL.md](./REQUIRED-VS-OPTIONAL.md)

### 按文件位置

```
/                               # 项目根目录
├── README.md                  # 项目简介
├── QUICK-START-CHECKLIST.md   # 快速启动
├── REQUIRED-VS-OPTIONAL.md    # 配置对照
├── COMPLETE-SETUP-GUIDE.md    # 完整指南
├── DATA-FLOW-DIAGRAM.md       # 架构图
├── TAGS-GUIDE.md              # 标签指南
├── CLAUDE.md                  # 开发指南
├── DOCUMENTATION-MAP.md       # 本文档
│
└── scripts/                   # 工具脚本文档
    ├── VERIFY-DATA-FLOW-README.md
    ├── QUICK-VERIFY-GUIDE.md
    └── README.md
```

---

## 💡 使用建议

### 第一次阅读

1. 从 **QUICK-START-CHECKLIST.md** 开始
2. 遇到疑问查 **REQUIRED-VS-OPTIONAL.md**
3. 需要详细步骤看 **COMPLETE-SETUP-GUIDE.md**

### 日常使用

1. 故障排查用 `npm run verify:data-flow`
2. 配置参考查 **COMPLETE-SETUP-GUIDE.md**
3. 命令速查看 **CLAUDE.md**

### 深入学习

1. 理解架构看 **DATA-FLOW-DIAGRAM.md**
2. 开发规范看 **CLAUDE.md**
3. 数据库设计看 **prisma/schema.prisma**

---

**提示**：建议收藏本文档，作为文档导航的入口！📌
