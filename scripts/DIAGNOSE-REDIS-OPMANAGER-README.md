# Redis & OpManager 诊断脚本说明

生产环境仅支持 **ts-node** 运行脚本，不支持 tsx。以下脚本均使用 `ts-node` 执行。

## 脚本列表

| 脚本 | 命令 | 说明 |
|------|------|------|
| 快速检查 | `npm run diagnose:redis-opmanager:quick` | 轻量检查，约 15–20 秒（含 10 秒 Redis 监听） |
| 完整诊断 | `npm run diagnose:redis-opmanager` | 全量诊断，含 30 秒 Redis 监听与模拟采集 |

## 运行方式

### 使用 npm（推荐）

```bash
# 快速检查（Redis / OpManager / DB / Pub/Sub 监听 10 秒）
npm run diagnose:redis-opmanager:quick

# 完整诊断（含 Pub/Sub 监听 30 秒、Broadcaster 测试、模拟采集）
npm run diagnose:redis-opmanager
```

### 直接使用 ts-node

```bash
ts-node -r tsconfig-paths/register --project tsconfig.node.json scripts/quick-check-redis-opmanager.ts
ts-node -r tsconfig-paths/register --project tsconfig.node.json scripts/diagnose-redis-opmanager.ts
```

## 环境变量

- 自动加载 `.env.local`、`.env`（先 local 后 env）。
- 依赖：`DATABASE_URL`、`REDIS_URL`、`OPMANAGER_BASE_URL`、`OPMANAGER_API_KEY` 等（与 Collector 相同）。

## 检查内容

1. **Redis**：连接、Pub/Sub、版本  
2. **OpManager API**：设备列表、设备详情、告警列表  
3. **PostgreSQL**：连接、最近指标/告警  
4. **Redis Pub/Sub 监听**：订阅 `events`，验证 Collector 是否推送（需 Collector 运行中）  
5. **完整诊断额外**：Broadcaster 推送、模拟采集流程  

## 常见问题

- **Redis Pub/Sub 无消息**：确认 `pm2 status` 中 `monitoring-collector` 在运行，并查看 `pm2 logs monitoring-collector`。  
- **OpManager 超时**：检查 `OPMANAGER_TIMEOUT`（建议 60000）、网络与 OpManager 服务状态。
