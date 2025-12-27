# 🚀 快速启动指南

## 📋 前置条件检查

在开始之前，请确保您的系统已安装：

- ✅ Node.js 18+
- ✅ PostgreSQL 14+
- ✅ Redis 7+
- ✅ Git

## 🔧 环境配置

### 1. 数据库配置

您的数据库已配置：
- **数据库**: `monitoring-dashboard`
- **用户**: `postgres`
- **密码**: `zww0625wh`
- **主机**: `localhost`
- **端口**: `5432`

### 2. 启动 Redis

**方式一：使用 Docker（推荐）**
```bash
docker run -d \
  --name monitoring-redis \
  -p 6379:6379 \
  redis:7-alpine \
  redis-server --appendonly yes
```

**方式二：本地安装**
```bash
# Windows: 从 https://redis.io/download 下载并安装
# 启动 Redis
redis-server
```

验证 Redis 是否启动成功：
```bash
redis-cli ping
# 应该返回: PONG
```

## 📦 项目安装

### Step 1: 安装依赖

```bash
cd D:\monitoring-dashboard
npm install
```

### Step 2: 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env.local

# 编辑 .env.local，填入您的 OpManager 配置
# OPMANAGER_BASE_URL=https://your-opmanager-server.com
# OPMANAGER_API_KEY=your-api-key
```

### Step 3: 初始化数据库

```bash
# 推送数据库结构
npx prisma db push

# 生成 Prisma Client
npx prisma generate

# 插入测试数据
npm run db:seed
```

验证数据库：
```bash
# 打开 Prisma Studio 查看数据
npm run db:studio
# 访问 http://localhost:5555
```

### Step 4: 启动开发服务器

```bash
# 启动 Next.js 开发服务器
npm run dev
```

访问 http://localhost:3000

### Step 5: 启动数据采集服务（可选）

**新开一个终端窗口**：
```bash
cd D:\monitoring-dashboard
npm run collector
```

## ✅ 验证安装

### 检查清单

- [ ] `npm run dev` 启动成功，无报错
- [ ] 访问 http://localhost:3000 可以看到页面
- [ ] `npx prisma studio` 可以查看数据库数据
- [ ] Redis 连接成功（检查日志无 Redis 错误）
- [ ] 数据采集服务启动成功（如果已配置 OpManager）

## 🎯 下一步

### 1. 配置 OpManager 连接

编辑 `.env.local`：
```bash
OPMANAGER_BASE_URL=https://your-opmanager-server.com
OPMANAGER_API_KEY=your-actual-api-key
```

### 2. 测试 OpManager 连接

创建测试脚本 `scripts/test-opmanager.ts`：
```typescript
import { getOpManagerClient } from '../src/services/opmanager/official-client';

async function testOpManager() {
  console.log('🧪 Testing OpManager connection...');

  const client = getOpManagerClient();

  // 健康检查
  const health = await client.healthCheck();
  console.log('Health check:', health);

  // 获取设备列表
  const devices = await client.listDevices();
  console.log(`Found ${devices.devices?.length || 0} devices`);
}

testOpManager().catch(console.error);
```

运行测试：
```bash
npx ts-node scripts/test-opmanager.ts
```

### 3. 开始开发

参考 **DEVELOPMENT-PLAN.md** 中的任务拆分，按照 Phase 顺序开发。

## 🐛 常见问题

### Q1: `npm install` 报错

**解决方案**:
```bash
# 清除缓存
npm cache clean --force

# 删除 node_modules 重新安装
rm -rf node_modules package-lock.json
npm install
```

### Q2: Prisma 连接数据库失败

**检查**:
- PostgreSQL 服务是否启动？
- 数据库 `monitoring-dashboard` 是否存在？
- 用户名密码是否正确？

**创建数据库**（如果不存在）:
```sql
-- 使用 psql 或 pgAdmin 执行
CREATE DATABASE "monitoring-dashboard";
```

### Q3: Redis 连接失败

**检查**:
```bash
# 测试 Redis 连接
redis-cli ping

# 如果失败，启动 Redis
redis-server

# 或使用 Docker
docker start monitoring-redis
```

### Q4: TypeScript 报错

```bash
# 检查类型
npm run type-check

# 重新生成 Prisma Client
npx prisma generate
```

## 📚 参考文档

- [SPEC-PRD.md](./SPEC-PRD.md) - 产品需求文档
- [ARCHITECTURE-SPEC.md](./ARCHITECTURE-SPEC.md) - 架构设计文档
- [DEVELOPMENT-PLAN.md](./DEVELOPMENT-PLAN.md) - 开发计划任务书

## 💡 开发建议

### 推荐的 VS Code 扩展

- ESLint
- Prettier
- Prisma
- TypeScript Error Translator
- Tailwind CSS IntelliSense

### 推荐的开发流程

1. **早晨**: 拉取最新代码，查看任务看板
2. **开发**: 按照任务书完成一个任务
3. **测试**: 确保功能正常，编写测试
4. **提交**: 使用规范的 commit 信息提交代码
5. **晚上**: Code Review，更新任务状态

## 📞 获取帮助

遇到问题？请查看：
1. 项目文档（`*.md` 文件）
2. 代码注释
3. 控制台日志
4. 联系技术负责人

---

**祝您开发顺利！** 🎉
