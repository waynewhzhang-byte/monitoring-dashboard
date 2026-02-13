# Prisma Schema 同步指南

## 问题描述

当数据库通过 SQL 直接修改后，Prisma schema 可能与数据库实际结构不同步，导致：
- Prisma Client 生成的类型不准确
- 迁移文件与数据库不匹配
- 运行时出现字段不存在的错误

## 解决方案

### 方案 1: 从数据库拉取结构（推荐用于已有数据库）

**适用场景**：数据库已存在，且通过 SQL 直接修改过结构

```bash
# 1. 备份现有 schema
cp prisma/schema.prisma prisma/schema.prisma.backup

# 2. 从数据库拉取结构
npx prisma db pull

# 3. 检查生成的 schema
# 编辑 prisma/schema.prisma，确认字段、类型、关系等是否正确

# 4. 生成 Prisma Client
npm run db:generate
```

**注意事项**：
- ⚠️ `db pull` 会覆盖现有的 `schema.prisma` 文件
- ⚠️ 可能会丢失一些 Prisma 特有的配置（如 `@default`, `@relation` 等）
- ✅ 建议先备份，然后手动检查和调整生成的 schema

### 方案 2: 检查差异并生成迁移

**适用场景**：数据库有少量修改，希望保持迁移历史

```bash
# 1. 检查数据库和 schema 的差异
npx prisma migrate diff \
  --from-schema-datamodel prisma/schema.prisma \
  --to-schema-datasource prisma/schema.prisma \
  --script

# 2. 如果发现差异，创建迁移文件
npx prisma migrate dev --name sync_database_changes --create-only

# 3. 检查生成的迁移文件
# 查看 prisma/migrations/xxx_sync_database_changes/migration.sql

# 4. 应用迁移（如果迁移文件正确）
npx prisma migrate deploy
```

### 方案 3: 手动更新 Schema

**适用场景**：知道具体修改了什么，手动更新更安全

```prisma
// 在 prisma/schema.prisma 中手动添加/修改字段
model Device {
  // ... 现有字段
  newField String?  // 添加新字段
}
```

然后：
```bash
# 1. 创建迁移文件
npx prisma migrate dev --name add_new_field --create-only

# 2. 检查迁移文件（如果数据库已有该字段，迁移文件可能为空）
# 3. 如果迁移文件为空，删除迁移目录，直接生成 Client
npm run db:generate
```

## 使用脚本

### Windows
```powershell
.\scripts\sync-prisma-schema.ps1
```

### Linux/Mac
```bash
# 手动执行相应命令
npx prisma db pull
# 或
npx prisma migrate diff --from-schema-datamodel prisma/schema.prisma --to-schema-datasource prisma/schema.prisma --script
```

## 完整工作流程

### 场景：数据库通过 SQL 添加了新字段

```sql
-- 数据库中的修改
ALTER TABLE "Device" ADD COLUMN "customField" TEXT;
```

**步骤 1: 从数据库拉取结构**
```bash
npx prisma db pull
```

**步骤 2: 检查生成的 schema**
```prisma
model Device {
  // ... 其他字段
  customField String?  // 新字段已自动添加
}
```

**步骤 3: 手动调整（如需要）**
- 添加默认值：`customField String? @default("")`
- 添加索引：`@@index([customField])`
- 添加关系等

**步骤 4: 生成 Prisma Client**
```bash
npm run db:generate
```

**步骤 5: 验证**
```bash
npm run type-check
npm run build
```

## 常见问题

### Q1: `db pull` 后丢失了关系定义

**解决**：手动添加关系定义
```prisma
model Device {
  // ...
  interfaces Interface[]  // 手动添加关系
}
```

### Q2: `db pull` 后类型不准确

**解决**：手动调整类型
```prisma
// 数据库中是 TEXT，但应该是 String[]
tags String[] @default([])  // 手动调整
```

### Q3: 迁移文件与数据库不匹配

**解决**：
```bash
# 1. 标记迁移为已应用（如果数据库已有相应结构）
npx prisma migrate resolve --applied <migration_name>

# 2. 或重置迁移历史（谨慎使用）
npx prisma migrate reset
```

## 最佳实践

1. **优先使用 Prisma 迁移**：避免直接使用 SQL 修改数据库
2. **定期同步**：如果必须使用 SQL，定期运行 `db pull` 同步
3. **备份 schema**：在 `db pull` 前备份现有 schema
4. **代码审查**：检查生成的 schema，确保正确性
5. **测试验证**：同步后运行类型检查和构建验证

## 相关命令

```bash
# 从数据库拉取结构
npx prisma db pull

# 检查差异
npx prisma migrate diff --from-schema-datamodel prisma/schema.prisma --to-schema-datasource prisma/schema.prisma --script

# 创建迁移
npx prisma migrate dev --name <name> --create-only

# 应用迁移
npx prisma migrate deploy

# 查看迁移状态
npx prisma migrate status

# 生成 Prisma Client
npm run db:generate
```

## 注意事项

⚠️ **重要提示**：
- `db pull` 会覆盖现有 schema，务必先备份
- 生成的 schema 可能需要手动调整（关系、默认值、索引等）
- 同步后需要重新生成 Prisma Client
- 建议在开发环境先测试，确认无误后再应用到生产环境
