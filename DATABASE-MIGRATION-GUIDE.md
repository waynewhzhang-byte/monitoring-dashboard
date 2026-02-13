# 数据库迁移指南 - Windows → 银河麒麟 Linux

本指南说明如何将 PostgreSQL 数据库从 Windows 开发环境迁移到银河麒麟 Linux 生产环境。

## 📋 前置要求

### Windows 开发环境
- PostgreSQL 客户端工具 (`pg_dump`) 已安装
- 数据库连接信息已配置在 `.env` 文件中
- PowerShell 5.0 或更高版本

### 银河麒麟 Linux 生产环境
- PostgreSQL 服务器已安装并运行
- PostgreSQL 客户端工具 (`psql`, `pg_restore`) 已安装
- 数据库用户具有创建数据库和导入数据的权限

---

## 🔄 迁移步骤

### 第一步：在 Windows 上导出数据库

#### 方法 1：使用自定义格式（推荐，压缩率高，恢复快）

```powershell
# 在项目根目录执行
.\scripts\export-database.ps1
```

这将生成 `monitoring-dashboard-db-backup.dump` 文件（压缩格式）。

#### 方法 2：使用 SQL 格式（可读，但文件较大）

```powershell
# 在项目根目录执行
.\scripts\export-database-plain.ps1
```

这将生成 `monitoring-dashboard-db-backup.sql` 文件（纯文本 SQL）。

**推荐使用方法 1**，因为：
- 文件更小（压缩后）
- 导入速度更快
- 支持并行恢复

---

### 第二步：上传备份文件到银河麒麟服务器

使用 `scp` 或其他文件传输工具：

```bash
# 从 Windows 上传到银河麒麟
scp monitoring-dashboard-db-backup.dump user@galaxy-kylin-server:/path/to/project/
```

或使用 FTP/SFTP 工具（如 FileZilla、WinSCP）。

---

### 第三步：在银河麒麟上导入数据库

#### 1. 确保项目已解压并配置好 `.env`

```bash
# 解压项目（如果还没解压）
unzip monitoring-dashboard-deploy.zip -d monitoring-app
cd monitoring-app

# 检查 .env 文件中的 DATABASE_URL
cat .env | grep DATABASE_URL
```

确保 `DATABASE_URL` 指向生产环境的 PostgreSQL 服务器。

#### 2. 给导入脚本添加执行权限

```bash
chmod +x scripts/import-database.sh
```

#### 3. 执行导入脚本

```bash
# 导入数据库（自动格式检测）
./scripts/import-database.sh monitoring-dashboard-db-backup.dump

# 或导入 SQL 格式
./scripts/import-database.sh monitoring-dashboard-db-backup.sql
```

脚本会自动：
- 读取 `.env` 中的 `DATABASE_URL`
- 测试数据库连接
- 检查目标数据库是否存在（如果存在会询问是否覆盖）
- 创建数据库（如果不存在）
- 导入所有数据

#### 4. 运行 Prisma 迁移（确保架构同步）

```bash
# 生成 Prisma Client
npx prisma generate

# 应用迁移（生产环境）
npx prisma migrate deploy

# 可选：验证数据
npx prisma studio
```

---

## 🔍 故障排查

### 问题 1：Windows 上找不到 `pg_dump`

**解决方案：**
1. 下载并安装 PostgreSQL 客户端工具：
   - 访问：https://www.postgresql.org/download/windows/
   - 下载 "Command Line Tools" 或完整 PostgreSQL 安装包
2. 将 PostgreSQL 的 `bin` 目录添加到系统 PATH 环境变量
3. 重新打开 PowerShell 并重试

### 问题 2：银河麒麟上找不到 `psql` 或 `pg_restore`

**解决方案：**
```bash
# 银河麒麟（基于 CentOS/RHEL）
sudo yum install postgresql -y

# 或基于 Debian/Ubuntu 的系统
sudo apt install postgresql-client -y
```

### 问题 3：导入时提示 "数据库正在使用中"

**解决方案：**
```bash
# 断开所有连接到目标数据库的会话
psql -h localhost -U postgres -d postgres -c "
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE datname='monitoring-dashboard' AND pid <> pg_backend_pid();
"
```

### 问题 4：导入时权限不足

**解决方案：**
确保数据库用户具有以下权限：
```sql
-- 以 postgres 超级用户身份执行
GRANT ALL PRIVILEGES ON DATABASE monitoring_dashboard TO your_user;
ALTER USER your_user CREATEDB;
```

### 问题 5：DATABASE_URL 格式错误

**正确格式：**
```
DATABASE_URL=postgresql://username:password@host:port/database_name
```

**示例：**
```
DATABASE_URL=postgresql://monitoring_user:secure_password@192.168.1.100:5432/monitoring-dashboard
```

---

## 📊 验证迁移

### 1. 检查表数量
```bash
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d monitoring-dashboard -c "
SELECT COUNT(*) as table_count 
FROM information_schema.tables 
WHERE table_schema = 'public';
"
```

### 2. 检查数据记录数
```bash
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d monitoring-dashboard -c "
SELECT 
    'Device' as table_name, COUNT(*) as count FROM \"Device\"
UNION ALL
SELECT 'Interface', COUNT(*) FROM \"Interface\"
UNION ALL
SELECT 'DeviceMetric', COUNT(*) FROM \"DeviceMetric\"
UNION ALL
SELECT 'TrafficMetric', COUNT(*) FROM \"TrafficMetric\"
UNION ALL
SELECT 'Alarm', COUNT(*) FROM \"Alarm\";
"
```

### 3. 使用 Prisma Studio 可视化检查
```bash
npx prisma studio
```
访问 http://localhost:5555 查看所有表和数据。

---

## ⚠️ 注意事项

1. **备份生产数据**：如果生产环境已有数据，导入前请先备份
2. **时区设置**：确保两个环境的时区一致，避免时间戳问题
3. **字符编码**：确保数据库使用 UTF-8 编码
4. **大文件传输**：如果备份文件很大，考虑使用压缩传输或分片上传
5. **网络连接**：确保银河麒麟服务器可以访问 PostgreSQL 服务器（如果不在同一台机器）

---

## 🚀 完整迁移流程示例

```bash
# ===== Windows 开发环境 =====
# 1. 导出数据库
.\scripts\export-database.ps1

# 2. 打包项目
.\scripts\pack.ps1

# 3. 上传文件到服务器
scp monitoring-dashboard-deploy.zip user@server:/opt/
scp monitoring-dashboard-db-backup.dump user@server:/opt/

# ===== 银河麒麟生产环境 =====
# 4. SSH 登录服务器
ssh user@server

# 5. 解压项目
cd /opt
unzip monitoring-dashboard-deploy.zip -d /opt/monitoring-app
cd /opt/monitoring-app

# 6. 配置环境变量
cp .env.example .env
# 编辑 .env，设置生产环境的 DATABASE_URL

# 7. 导入数据库
chmod +x scripts/import-database.sh
./scripts/import-database.sh /opt/monitoring-dashboard-db-backup.dump

# 8. 安装依赖并构建
npm install
npx prisma generate
npm run build

# 9. 启动服务
pm2 start npm --name "monitoring-web" -- start
pm2 start npm --name "monitoring-collector" -- run collector
```

---

## 📞 需要帮助？

如果遇到问题，请检查：
1. 数据库连接是否正常
2. 文件权限是否正确
3. 环境变量是否配置正确
4. PostgreSQL 服务是否运行

查看详细错误日志以获取更多信息。
