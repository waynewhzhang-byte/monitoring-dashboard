# 数据库迁移脚本使用说明

## 📋 脚本列表

1. **export-database.ps1** - 导出数据库（自定义压缩格式，推荐）
2. **export-database-plain.ps1** - 导出数据库（SQL 文本格式）
3. **import-database.sh** - 在银河麒麟 Linux 上导入数据库

---

## 🪟 Windows PowerShell 使用方法

### 方法 1：在项目根目录运行（推荐）

```powershell
# 切换到项目根目录
cd D:\monitoring-dashboard

# 运行导出脚本
.\scripts\export-database.ps1
```

### 方法 2：在 scripts 目录下运行

```powershell
# 切换到 scripts 目录
cd D:\monitoring-dashboard\scripts

# 运行导出脚本（注意前面的 .\）
.\export-database.ps1
```

### ⚠️ 如果遇到执行策略错误

如果提示 "无法加载文件，因为在此系统上禁止运行脚本"，需要临时允许脚本执行：

```powershell
# 方法 1：临时允许当前会话执行脚本（推荐）
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process

# 然后运行脚本
.\scripts\export-database.ps1

# 方法 2：只允许当前目录的脚本（更安全）
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process
.\scripts\export-database.ps1
```

---

## 🐧 银河麒麟 Linux 使用方法

```bash
# 1. 给脚本添加执行权限
chmod +x scripts/import-database.sh

# 2. 运行导入脚本
./scripts/import-database.sh monitoring-dashboard-db-backup.dump
```

---

## 📝 完整迁移流程

### Windows 端（导出）

```powershell
# 1. 进入项目目录
cd D:\monitoring-dashboard

# 2. 如果遇到执行策略问题，先执行：
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process

# 3. 导出数据库（推荐自定义格式）
.\scripts\export-database.ps1

# 4. 打包项目
.\scripts\pack.ps1

# 5. 上传文件到服务器（使用 scp 或其他工具）
# scp monitoring-dashboard-deploy.zip user@server:/opt/
# scp monitoring-dashboard-db-backup.dump user@server:/opt/
```

### 银河麒麟端（导入）

```bash
# 1. 解压项目
unzip monitoring-dashboard-deploy.zip -d /opt/monitoring-app
cd /opt/monitoring-app

# 2. 配置 .env 文件（设置生产环境的 DATABASE_URL）

# 3. 导入数据库
chmod +x scripts/import-database.sh
./scripts/import-database.sh /opt/monitoring-dashboard-db-backup.dump

# 4. 运行 Prisma 迁移
npx prisma generate
npx prisma migrate deploy
```

---

## ❓ 常见问题

### Q: PowerShell 提示 "无法识别命令"
**A:** 必须使用 `.\` 前缀，例如 `.\export-database.ps1` 而不是 `export-database.ps1`

### Q: 提示 "禁止运行脚本"
**A:** 运行 `Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process` 临时允许脚本执行

### Q: 找不到 pg_dump 命令
**A:** 需要安装 PostgreSQL 客户端工具，下载地址：https://www.postgresql.org/download/windows/

### Q: 找不到 .env 文件
**A:** 确保在项目根目录运行脚本，并且 `.env` 文件存在

---

## 🔗 相关文档

详细迁移指南请参考：`DATABASE-MIGRATION-GUIDE.md`
