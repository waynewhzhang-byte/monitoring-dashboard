/**
 * PM2 进程管理配置文件
 * 用于 Ubuntu / 银河麒麟等 Linux 生产环境管理监控系统服务
 *
 * ⚠️  重要说明：
 *   - 所有路径使用相对路径，确保跨环境兼容性
 *   - 环境变量从 .env 文件读取，无硬编码配置
 *   - 日志文件保存在项目 logs 目录
 *
 * 使用方法：
 *   pm2 start ecosystem.config.js                     # 启动所有服务
 *   pm2 start ecosystem.config.js --only monitoring-web      # 只启动 Web 服务
 *   pm2 start ecosystem.config.js --only monitoring-collector # 只启动采集服务
 *   pm2 stop all                                      # 停止所有服务
 *   pm2 restart all                                   # 重启所有服务
 *   pm2 restart all --update-env                      # 重启并更新环境变量
 *   pm2 logs                                          # 查看所有日志
 *   pm2 monit                                         # 监控面板
 *   pm2 save                                          # 保存当前进程列表
 *   pm2 startup                                       # 生成开机自启命令
 */

module.exports = {
  apps: [
    {
      name: 'monitoring-web',
      script: 'npm',
      args: 'run start:server',
      cwd: './',  // 项目根目录（相对路径，确保跨环境兼容）
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        // 注意: PORT 和 HOSTNAME 会从 .env 文件读取
        // 这里定义的是默认值，.env 中的配置会覆盖这里的值
        PORT: process.env.PORT || 3000,
        HOSTNAME: process.env.HOSTNAME || '0.0.0.0',
      },
      error_file: './logs/pm2-web-error.log',
      out_file: './logs/pm2-web-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      watch: false,  // 生产环境关闭文件监听
      max_memory_restart: '1G',
    },
    {
      name: 'monitoring-collector',
      script: 'npm',
      args: 'run collector',
      cwd: './',  // 项目根目录（相对路径，确保跨环境兼容）
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        USE_MOCK_DATA: 'false',  // 生产环境使用真实 OpManager API
        // 注意: 以下采集周期会从 .env 文件读取
        // 这里定义的是默认值，.env 中的配置会覆盖这里的值
        COLLECT_METRICS_INTERVAL: process.env.COLLECT_METRICS_INTERVAL || '60',   // 指标采集周期（秒）
        COLLECT_ALARMS_INTERVAL: process.env.COLLECT_ALARMS_INTERVAL || '30',     // 告警同步周期（秒）
        SYNC_TOPOLOGY_INTERVAL: process.env.SYNC_TOPOLOGY_INTERVAL || '300',      // 业务视图/拓扑同步周期（秒）
      },
      error_file: './logs/pm2-collector-error.log',
      out_file: './logs/pm2-collector-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      watch: false,  // 生产环境关闭文件监听
      max_memory_restart: '512M',
    },
  ],
};
