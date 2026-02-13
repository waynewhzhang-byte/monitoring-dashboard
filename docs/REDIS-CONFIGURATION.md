# Redis 配置和优化指南

## 📊 Redis 在系统中的作用

### 1. API 响应缓存 (性能优化)
- 缓存设备列表、统计数据等高频查询结果
- TTL: 30-60 秒
- 减轻数据库压力 50%+

### 2. 告警去重 (核心功能)
- 5 分钟窗口内同设备+同类型告警去重
- **没有 Redis 会导致重复告警**

### 3. 实时推送 (WebSocket)
- Socket.io Redis Adapter（多实例支持）
- 采集器 → 前端实时数据推送

## 🚀 快速开始

### Windows (Docker 推荐)

```bash
# 启动 Redis
docker run -d --name redis -p 6379:6379 redis:alpine

# 验证连接
npm run check:redis
```

### Linux

```bash
# 安装
sudo apt install redis-server    # Ubuntu
sudo yum install redis            # CentOS

# 启动
sudo systemctl start redis
sudo systemctl enable redis

# 验证
npm run check:redis
```

## ⚙️ 环境变量配置

```bash
# .env 或 .env.local
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=  # 可选
```

## 🔧 生产环境优化

### Docker 部署（推荐配置）

```bash
docker run -d --name redis \
  -p 6379:6379 \
  redis:alpine \
  --maxmemory 512mb \
  --maxmemory-policy allkeys-lru \
  --requirepass your-password
```

### redis.conf 优化

```conf
# 内存限制
maxmemory 512mb
maxmemory-policy allkeys-lru

# 密码保护
requirepass your-strong-password

# 禁用持久化（缓存场景，性能优先）
save ""
appendonly no

# 连接数
maxclients 10000
```

## 📊 监控和诊断

### 诊断命令

```bash
# Redis 健康检查
npm run check:redis

# HTTP API 检查
curl http://localhost:3000/api/health/redis

# Redis CLI
redis-cli ping
redis-cli info
redis-cli keys "*"
```

### 性能基准

监控系统典型性能指标：
- **读写延迟**: < 5ms
- **吞吐量**: > 10,000 ops/s
- **内存使用**: < 100MB（取决于缓存数据量）

## 🔍 故障排查

### 无法连接

```bash
# 检查 Redis 是否运行
docker ps | grep redis
systemctl status redis

# 测试连接
redis-cli ping

# 查看日志
docker logs redis
```

### 内存不足

```bash
# 查看内存使用
redis-cli info memory

# 清理缓存
redis-cli FLUSHDB

# 调整内存限制
redis-cli config set maxmemory 1gb
```

### 告警重复

原因：Redis 未运行，告警去重失效

解决：
```bash
docker start redis
npm run check:redis
```

## 💡 最佳实践

| 环境 | Redis配置 | 说明 |
|------|----------|------|
| 开发 | Docker, 256MB, 无密码 | 快速启动 |
| 测试 | Docker, 512MB, 有密码 | 接近生产 |
| 生产 | 服务器, 1GB+, 强密码 | 高性能 |

**核心要点**：
- ✅ 使用 Docker 快速部署
- ✅ 生产环境设置密码
- ✅ 合理配置内存限制
- ✅ 禁用持久化（缓存场景）
- ✅ 定期运行 `npm run check:redis`

## 🆘 常见问题

**Q: Redis 是否必需？**
A: 建议保留。没有 Redis 会导致：告警重复、API 响应慢、实时推送失效。

**Q: Redis 占用多少内存？**
A: 通常 < 100MB，取决于缓存的数据量。

**Q: 如何清理缓存？**
A: `redis-cli FLUSHDB` 或重启 Redis。

**Q: 如何监控 Redis？**
A: 使用 `npm run check:redis` 或访问 `/api/health/redis`。

## 📚 相关文档

- [完整配置指南](../COMPLETE-SETUP-GUIDE.md)
- [生产环境部署](../PRODUCTION-SETUP-COMPLETE.md)
- [故障排查](../DIAGNOSIS-GUIDE.md)
