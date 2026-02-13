# 环境变量文件使用指南

## 📋 当前项目中的环境变量文件

| 文件名 | 作用 | 提交到 Git | 谁使用 |
|--------|------|-----------|--------|
| **`.env.example`** | 配置模板 | ✅ 是 | 新开发者参考 |
| **`.env.local`** | 本地开发配置 | ❌ 否 | **你当前使用** |
| **`.env`** | ⚠️ 冗余配置 | ❌ 否 | ⚠️ 不推荐使用 |
| **`.env.production.example`** | 生产环境模板 | ✅ 是 | 部署时参考 |

## 🎯 Next.js 环境变量加载优先级

Next.js 会按以下顺序加载环境变量（**后面的覆盖前面的**）：

```
1. .env                          (最低优先级，所有环境)
2. .env.development / .env.production  (取决于 NODE_ENV)
3. .env.local                    (最高优先级，本地覆盖)
```

**实际运行时**:
- **开发环境** (`npm run dev`): `.env` → `.env.development` → `.env.local`
- **生产环境** (`npm start`): `.env` → `.env.production` → `.env.local`

## ✅ 推荐的最佳实践

### 当前项目应该使用：

```
✅ .env.local          → 本地开发配置（你在用的）
✅ .env.example        → 配置模板（提交到 Git）
✅ .env.production.example → 生产环境模板（提交到 Git）
❌ .env                → 删除此文件（避免混淆）
```

### 为什么这样做？

| 文件 | 原因 |
|------|------|
| **`.env.local`** | ✅ 存储你的真实配置（密码、API Key）<br>✅ 不会被提交到 Git<br>✅ 优先级最高，覆盖其他配置 |
| **`.env.example`** | ✅ 供团队成员参考<br>✅ 不包含真实密码<br>✅ 提交到 Git |
| **`.env`** | ❌ 与 `.env.local` 功能重复<br>❌ 容易造成混淆<br>❌ 建议删除 |

## 🚀 具体使用方法

### 1️⃣ 新开发者加入项目

```bash
# 1. 克隆项目
git clone <repo-url>
cd monitoring-dashboard

# 2. 复制示例配置
cp .env.example .env.local

# 3. 修改 .env.local，填入真实配置
# 编辑 DATABASE_URL, OPMANAGER_API_KEY 等

# 4. 启动项目
npm install
npm run dev
```

### 2️⃣ 日常开发

```bash
# 只需修改 .env.local
vim .env.local

# 重启项目生效
npm run dev
```

### 3️⃣ 部署到生产环境

```bash
# 1. 参考生产环境模板
cat .env.production.example

# 2. 在生产服务器创建配置
# 方式 A: 创建 .env.production
cp .env.production.example .env.production
vim .env.production  # 填入生产配置

# 方式 B: 使用环境变量（推荐）
export DATABASE_URL="postgresql://..."
export OPMANAGER_API_KEY="..."

# 3. 构建和启动
npm run build
npm start
```

## 🔧 当前项目问题和解决方案

### ⚠️ 问题：项目中同时存在 `.env` 和 `.env.local`

这会导致：
- ❌ 配置混乱，不知道用哪个
- ❌ `.env` 可能覆盖 `.env.local` 的某些值
- ❌ 团队协作时容易出错

### ✅ 解决方案：删除 `.env`，统一使用 `.env.local`

```bash
# 1. 备份当前配置（如果需要）
cp .env .env.backup

# 2. 删除 .env
rm .env

# 3. 确保 .env.local 包含所有必需配置
# 参考 .env.example 检查

# 4. 验证配置
npm run dev
```

## 📝 文件内容对比

### `.env.example` (示例配置，提交到 Git)

```bash
# 数据库（示例值）
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"

# Redis（示例值）
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=

# OpManager（占位符）
OPMANAGER_BASE_URL=https://opmanager.example.com
OPMANAGER_API_KEY=your-api-key-here
```

### `.env.local` (真实配置，**不提交**到 Git)

```bash
# 数据库（真实值）
DATABASE_URL="postgresql://postgres:zww0625wh@localhost:5432/monitoring-dashboard"

# Redis（真实值）
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=

# OpManager（真实值）
OPMANAGER_BASE_URL=https://ithelp.whrank.com:44443
OPMANAGER_API_KEY=c42c8409f97eb4e8fe49ec6a9463bce9
```

## 🎯 快速决策指南

**Q: 我现在应该用哪个文件？**
> A: **`.env.local`** （本地开发）

**Q: 我应该修改哪个文件？**
> A: **`.env.local`** （日常开发）<br>
>    **`.env.example`** （更新配置模板时）

**Q: 哪些文件提交到 Git？**
> A: **`.env.example`** ✅<br>
>    **`.env.production.example`** ✅<br>
>    **`.env.local`** ❌<br>
>    **`.env`** ❌

**Q: `.env` 文件应该删除吗？**
> A: **是的**，避免与 `.env.local` 混淆

**Q: 如何验证当前使用的配置？**
> A: 运行以下命令查看加载的环境变量
> ```bash
> node -e "require('dotenv').config({ path: '.env.local' }); console.log(process.env.DATABASE_URL)"
> ```

## 🔍 调试环境变量

### 查看当前加载的配置

```typescript
// 在任意 .ts 文件中
console.log('DATABASE_URL:', process.env.DATABASE_URL);
console.log('REDIS_URL:', process.env.REDIS_URL);
console.log('NODE_ENV:', process.env.NODE_ENV);
```

### 查看 Next.js 加载的环境变量

```bash
# 开发环境
npm run dev
# 查看终端输出的 dotenv 加载信息

# 例如：
# [dotenv@17.2.3] injecting env (20) from .env.local
# [dotenv@17.2.3] injecting env (1) from .env
```

## ⚡ 立即行动

### 推荐操作（清理配置）

```bash
# 1. 备份 .env（如果有重要配置）
cp .env .env.backup.$(date +%Y%m%d)

# 2. 删除 .env
rm .env

# 3. 确保 .env.local 完整
cat .env.local

# 4. 验证项目运行
npm run dev

# 5. 成功后删除备份
rm .env.backup.*
```

### 最终文件结构

```
monitoring-dashboard/
├── .env.example              ✅ (Git tracked)
├── .env.production.example   ✅ (Git tracked)
├── .env.local                ✅ (本地使用，Git ignored)
└── .gitignore               (包含 .env* 规则)
```

## 📚 总结

| 文件 | 用途 | Git | 优先级 |
|------|------|-----|--------|
| `.env.example` | 配置模板 | ✅ 提交 | - |
| `.env.local` | **本地开发** | ❌ 忽略 | ⭐⭐⭐ 最高 |
| `.env.development` | 开发环境 | ❌ 忽略 | ⭐⭐ |
| `.env.production` | 生产环境 | ❌ 忽略 | ⭐⭐ |
| `.env` | ⚠️ 不推荐 | ❌ 忽略 | ⭐ |

**核心原则**：
- ✅ 使用 `.env.local` 存储本地配置
- ✅ 使用 `.env.example` 作为模板
- ✅ 不要提交真实密码到 Git
- ✅ 删除 `.env` 避免混淆

---

**更新日期**: 2026-02-04
