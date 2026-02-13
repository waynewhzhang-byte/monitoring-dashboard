# Ubuntu 一键迁移脚本

## 一键生成迁移脚本

在 **Windows 或任意环境** 下执行：

```bash
npm run generate:ubuntu-migration
```

或指定输出路径：

```bash
node scripts/generate-ubuntu-migration.js scripts/migrate-to-ubuntu.sh
```

会生成 `scripts/migrate-to-ubuntu.sh`（或指定路径），该脚本在 **Ubuntu/Debian** 上执行，完成环境安装与项目部署。

## 生成的脚本会做什么

1. **系统检测**：确认 Ubuntu/Debian，非 Ubuntu 会提示是否继续。
2. **安装依赖**：curl、ca-certificates、gnupg、build-essential。
3. **安装 Node.js 20 LTS**：通过 NodeSource（若未安装或版本 &lt; 18）。
4. **安装 PostgreSQL**：postgresql、postgresql-contrib，并启动服务。
5. **安装 Redis**：redis-server，并启动服务。
6. **数据库配置**：若数据库不存在，创建用户与库（可通过环境变量覆盖）。
7. **项目构建**：复制 .env 模板（若无）、npm install、prisma generate、prisma migrate deploy、npm run build。
8. **PM2 启动**：安装 pm2、更新 ecosystem.config.js 的 cwd、启动 Web + 采集服务、pm2 save。

## 在 Ubuntu 上使用

### 1. 将项目拷贝到 Ubuntu

例如拷贝到 `/opt/monitoring-dashboard`：

- 使用 git clone，或
- 在 Windows 打包：`.\scripts\repackage-for-deployment.ps1`，再上传 zip 到 Ubuntu 并解压。

### 2. 生成迁移脚本（在 Windows 上）

```bash
npm run generate:ubuntu-migration
```

将生成的 `scripts/migrate-to-ubuntu.sh` 随项目一起拷贝到 Ubuntu（若用 git，提交该文件即可）。

### 3. 在 Ubuntu 上执行

```bash
cd /opt/monitoring-dashboard   # 或你的项目目录
chmod +x scripts/migrate-to-ubuntu.sh
./scripts/migrate-to-ubuntu.sh
```

或指定项目目录：

```bash
./scripts/migrate-to-ubuntu.sh /opt/monitoring-dashboard
```

### 4. 可选：自定义数据库

在运行脚本前设置环境变量（生产建议设置强密码）：

```bash
export DB_NAME=monitoring_dashboard
export DB_USER=monitoring
export DB_PASS=你的强密码
./scripts/migrate-to-ubuntu.sh
```

### 5. 迁移完成后

- 访问：`http://<服务器IP>:3000`
- 查看进程：`pm2 list`
- 查看日志：`pm2 logs`
- 开机自启：执行 `pm2 startup`，并按提示执行其输出的命令。

## 注意事项

- 脚本需要 **sudo**（安装系统包、创建 PostgreSQL 用户/库）。
- 若已有 `.env`，脚本不会覆盖；若无，会从 `env.example.txt` 或 `.env.example` 复制，并写入 `DATABASE_URL`（若缺失）。
- 部署后请编辑 `.env` 填写 `OPMANAGER_BASE_URL`、`OPMANAGER_API_KEY` 等生产配置。
- 企业版 OpManager 需在 `.env` 中设置：`OPMANAGER_USE_DEVICE_NAME_SUFFIX=true`。
