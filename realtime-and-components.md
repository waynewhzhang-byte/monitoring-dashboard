# WebSocket实时推送 & 前端组件实现

## 1. Socket.io实时推送服务

```typescript
// src/services/realtime/socket-server.ts

import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { getRedisClient } from '@/lib/redis';
import { createAdapter } from '@socket.io/redis-adapter';

const redis = getRedisClient();

export class RealtimeServer {
  private io: SocketIOServer | null = null;
  private subscriptions: Map<string, Set<string>> = new Map(); // room -> Set<socketId>

  /**
   * 初始化Socket.io服务器
   */
  initialize(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
      },
      transports: ['websocket', 'polling'],
    });

    // 使用Redis适配器实现多实例支持
    const pubClient = redis.duplicate();
    const subClient = redis.duplicate();
    
    this.io.adapter(createAdapter(pubClient, subClient));

    // 连接处理
    this.io.on('connection', (socket) => {
      console.log(`[WebSocket] Client connected: ${socket.id}`);
      
      this.handleConnection(socket);
    });

    // 启动Redis订阅
    this.startRedisSubscription();

    console.log('[WebSocket] Server initialized');
  }

  /**
   * 处理客户端连接
   */
  private handleConnection(socket: Socket) {
    // 订阅设备更新
    socket.on('subscribe:devices', (deviceIds: string[]) => {
      console.log(`[WebSocket] ${socket.id} subscribing to devices:`, deviceIds);
      deviceIds.forEach(deviceId => {
        socket.join(`device:${deviceId}`);
        this.addSubscription(`device:${deviceId}`, socket.id);
      });
    });

    // 订阅告警
    socket.on('subscribe:alarms', () => {
      console.log(`[WebSocket] ${socket.id} subscribing to alarms`);
      socket.join('alarms');
      this.addSubscription('alarms', socket.id);
    });

    // 订阅拓扑更新
    socket.on('subscribe:topology', () => {
      console.log(`[WebSocket] ${socket.id} subscribing to topology`);
      socket.join('topology');
      this.addSubscription('topology', socket.id);
    });

    // 取消订阅
    socket.on('unsubscribe', (room: string) => {
      console.log(`[WebSocket] ${socket.id} unsubscribing from ${room}`);
      socket.leave(room);
      this.removeSubscription(room, socket.id);
    });

    // 断开连接
    socket.on('disconnect', () => {
      console.log(`[WebSocket] Client disconnected: ${socket.id}`);
      this.cleanupSocket(socket.id);
    });

    // 心跳
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });
  }

  /**
   * Redis订阅 - 监听数据更新
   */
  private startRedisSubscription() {
    const subscriber = redis.duplicate();

    // 订阅设备指标更新
    subscriber.subscribe('metrics:updated', (message) => {
      const data = JSON.parse(message);
      this.broadcastToRoom(`device:${data.deviceId}`, 'metrics:update', data);
    });

    // 订阅告警
    subscriber.subscribe('alarms:new', (message) => {
      const alarm = JSON.parse(message);
      this.broadcastToRoom('alarms', 'alarm:new', alarm);
    });

    // 订阅拓扑变化
    subscriber.subscribe('topology:changed', (message) => {
      const data = JSON.parse(message);
      this.broadcastToRoom('topology', 'topology:update', data);
    });

    console.log('[WebSocket] Redis subscription started');
  }

  /**
   * 推送设备指标更新
   */
  pushDeviceMetrics(deviceId: string, metrics: any) {
    this.broadcastToRoom(`device:${deviceId}`, 'metrics:update', {
      deviceId,
      metrics,
      timestamp: Date.now(),
    });
  }

  /**
   * 推送接口流量更新
   */
  pushInterfaceTraffic(interfaceId: string, traffic: any) {
    this.broadcastToRoom(`interface:${interfaceId}`, 'traffic:update', {
      interfaceId,
      traffic,
      timestamp: Date.now(),
    });
  }

  /**
   * 推送告警
   */
  pushAlarm(alarm: any) {
    this.broadcastToRoom('alarms', 'alarm:new', alarm);
  }

  /**
   * 推送拓扑更新
   */
  pushTopologyUpdate(topology: any) {
    this.broadcastToRoom('topology', 'topology:update', topology);
  }

  /**
   * 向房间广播消息
   */
  private broadcastToRoom(room: string, event: string, data: any) {
    if (!this.io) return;
    
    this.io.to(room).emit(event, data);
    console.log(`[WebSocket] Broadcast to ${room}: ${event}`);
  }

  /**
   * 添加订阅记录
   */
  private addSubscription(room: string, socketId: string) {
    if (!this.subscriptions.has(room)) {
      this.subscriptions.set(room, new Set());
    }
    this.subscriptions.get(room)!.add(socketId);
  }

  /**
   * 移除订阅记录
   */
  private removeSubscription(room: string, socketId: string) {
    const subs = this.subscriptions.get(room);
    if (subs) {
      subs.delete(socketId);
      if (subs.size === 0) {
        this.subscriptions.delete(room);
      }
    }
  }

  /**
   * 清理Socket订阅
   */
  private cleanupSocket(socketId: string) {
    this.subscriptions.forEach((sockets, room) => {
      sockets.delete(socketId);
      if (sockets.size === 0) {
        this.subscriptions.delete(room);
      }
    });
  }

  /**
   * 获取连接统计
   */
  getStats() {
    return {
      connectedClients: this.io?.sockets.sockets.size || 0,
      activeRooms: this.subscriptions.size,
      subscriptions: Array.from(this.subscriptions.entries()).map(([room, sockets]) => ({
        room,
        subscribers: sockets.size,
      })),
    };
  }
}

// 单例
export const realtimeServer = new RealtimeServer();
```

## 2. 前端WebSocket Hook

```typescript
// src/hooks/useWebSocket.ts

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseWebSocketOptions {
  url?: string;
  autoConnect?: boolean;
  reconnection?: boolean;
  reconnectionDelay?: number;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    url = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3000',
    autoConnect = true,
    reconnection = true,
    reconnectionDelay = 1000,
    onConnect,
    onDisconnect,
    onError,
  } = options;

  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<Error | null>(null);

  useEffect(() => {
    if (!autoConnect) return;

    // 创建Socket连接
    socketRef.current = io(url, {
      transports: ['websocket', 'polling'],
      reconnection,
      reconnectionDelay,
    });

    const socket = socketRef.current;

    // 连接事件
    socket.on('connect', () => {
      console.log('[WebSocket] Connected');
      setIsConnected(true);
      setConnectionError(null);
      onConnect?.();
    });

    socket.on('disconnect', () => {
      console.log('[WebSocket] Disconnected');
      setIsConnected(false);
      onDisconnect?.();
    });

    socket.on('connect_error', (error) => {
      console.error('[WebSocket] Connection error:', error);
      setConnectionError(error);
      onError?.(error);
    });

    // 清理
    return () => {
      socket.disconnect();
    };
  }, [url, autoConnect, reconnection, reconnectionDelay]);

  /**
   * 订阅设备更新
   */
  const subscribeToDevices = (deviceIds: string[]) => {
    if (!socketRef.current) return;
    socketRef.current.emit('subscribe:devices', deviceIds);
  };

  /**
   * 订阅告警
   */
  const subscribeToAlarms = () => {
    if (!socketRef.current) return;
    socketRef.current.emit('subscribe:alarms');
  };

  /**
   * 订阅拓扑
   */
  const subscribeToTopology = () => {
    if (!socketRef.current) return;
    socketRef.current.emit('subscribe:topology');
  };

  /**
   * 取消订阅
   */
  const unsubscribe = (room: string) => {
    if (!socketRef.current) return;
    socketRef.current.emit('unsubscribe', room);
  };

  /**
   * 监听事件
   */
  const on = <T = any>(event: string, handler: (data: T) => void) => {
    if (!socketRef.current) return;
    socketRef.current.on(event, handler);
  };

  /**
   * 移除事件监听
   */
  const off = (event: string, handler?: (...args: any[]) => void) => {
    if (!socketRef.current) return;
    socketRef.current.off(event, handler);
  };

  /**
   * 发送事件
   */
  const emit = (event: string, data?: any) => {
    if (!socketRef.current) return;
    socketRef.current.emit(event, data);
  };

  return {
    socket: socketRef.current,
    isConnected,
    connectionError,
    subscribeToDevices,
    subscribeToAlarms,
    subscribeToTopology,
    unsubscribe,
    on,
    off,
    emit,
  };
}
```

## 3. 设备监控面板组件

```typescript
// src/components/dashboard/DevicePanel.tsx

'use client';

import { useEffect, useState } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { Card } from '@/components/ui/Card';
import { MetricsChart } from '@/components/charts/LineChart';
import { motion } from 'framer-motion';

interface Device {
  id: string;
  name: string;
  type: string;
  status: string;
  ipAddress: string;
}

interface DeviceMetrics {
  cpuUsage?: number;
  memoryUsage?: number;
  diskUsage?: number;
  timestamp: Date;
}

interface DevicePanelProps {
  device: Device;
  showChart?: boolean;
}

export function DevicePanel({ device, showChart = true }: DevicePanelProps) {
  const [metrics, setMetrics] = useState<DeviceMetrics | null>(null);
  const [history, setHistory] = useState<DeviceMetrics[]>([]);
  const { isConnected, subscribeToDevices, on } = useWebSocket({
    autoConnect: true,
  });

  useEffect(() => {
    if (!isConnected) return;

    // 订阅设备更新
    subscribeToDevices([device.id]);

    // 监听指标更新
    on<{ deviceId: string; metrics: DeviceMetrics }>('metrics:update', (data) => {
      if (data.deviceId === device.id) {
        setMetrics(data.metrics);
        
        // 更新历史数据（保留最近30个数据点）
        setHistory((prev) => {
          const newHistory = [...prev, data.metrics];
          return newHistory.slice(-30);
        });
      }
    });

    // 初始加载
    fetchInitialMetrics();
  }, [device.id, isConnected]);

  const fetchInitialMetrics = async () => {
    try {
      const response = await fetch(`/api/devices/${device.id}/metrics/latest`);
      const data = await response.json();
      
      if (data.metrics) {
        setMetrics(data.metrics);
      }
      
      if (data.history) {
        setHistory(data.history.slice(-30));
      }
    } catch (error) {
      console.error('Failed to fetch initial metrics:', error);
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      ONLINE: 'text-green-500',
      OFFLINE: 'text-gray-500',
      WARNING: 'text-yellow-500',
      ERROR: 'text-red-500',
    };
    return colors[status as keyof typeof colors] || 'text-gray-500';
  };

  const getMetricColor = (value?: number) => {
    if (!value) return 'text-gray-400';
    if (value >= 90) return 'text-red-500';
    if (value >= 75) return 'text-yellow-500';
    return 'text-green-500';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="p-4 bg-gray-900/50 border-cyan-500/30 backdrop-blur">
        {/* 设备头部 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${getStatusColor(device.status)} animate-pulse`} />
            <div>
              <h3 className="text-lg font-semibold text-white">{device.name}</h3>
              <p className="text-sm text-gray-400">{device.ipAddress}</p>
            </div>
          </div>
          <div className="text-xs text-gray-500 uppercase tracking-wider">
            {device.type}
          </div>
        </div>

        {/* 实时指标 */}
        {metrics && (
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="text-xs text-gray-400 mb-1">CPU</div>
              <div className={`text-2xl font-bold ${getMetricColor(metrics.cpuUsage)}`}>
                {metrics.cpuUsage?.toFixed(1) || '--'}%
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-400 mb-1">内存</div>
              <div className={`text-2xl font-bold ${getMetricColor(metrics.memoryUsage)}`}>
                {metrics.memoryUsage?.toFixed(1) || '--'}%
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-400 mb-1">硬盘</div>
              <div className={`text-2xl font-bold ${getMetricColor(metrics.diskUsage)}`}>
                {metrics.diskUsage?.toFixed(1) || '--'}%
              </div>
            </div>
          </div>
        )}

        {/* 历史图表 */}
        {showChart && history.length > 0 && (
          <div className="h-32">
            <MetricsChart
              data={history}
              dataKey="cpuUsage"
              color="#06b6d4"
              showGrid={false}
              showAxes={false}
            />
          </div>
        )}

        {/* 无数据提示 */}
        {!metrics && (
          <div className="text-center text-gray-500 py-8">
            <div className="animate-pulse">加载中...</div>
          </div>
        )}
      </Card>
    </motion.div>
  );
}
```

## 4. 网络拓扑图组件

```typescript
// src/components/dashboard/NetworkTopology.tsx

'use client';

import { useCallback, useEffect, useState } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  Connection,
  addEdge,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useWebSocket } from '@/hooks/useWebSocket';

interface NetworkTopologyProps {
  editable?: boolean;
  onSave?: (nodes: Node[], edges: Edge[]) => void;
}

export function NetworkTopology({ editable = false, onSave }: NetworkTopologyProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(true);
  
  const { isConnected, subscribeToTopology, on } = useWebSocket({
    autoConnect: true,
  });

  useEffect(() => {
    loadTopology();
  }, []);

  useEffect(() => {
    if (!isConnected) return;

    // 订阅拓扑更新
    subscribeToTopology();

    // 监听拓扑变化
    on('topology:update', (data) => {
      console.log('Topology updated:', data);
      // 更新节点和边
      if (data.nodes) setNodes(data.nodes);
      if (data.edges) setEdges(data.edges);
    });
  }, [isConnected]);

  const loadTopology = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/topology');
      const data = await response.json();
      
      setNodes(data.nodes || []);
      setEdges(data.edges || []);
    } catch (error) {
      console.error('Failed to load topology:', error);
    } finally {
      setLoading(false);
    }
  };

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const handleSave = () => {
    onSave?.(nodes, edges);
  };

  // 自定义节点样式
  const nodeTypes = {
    device: DeviceNode,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-cyan-500 animate-pulse">加载拓扑中...</div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-gray-950">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-left"
      >
        <Background color="#1e293b" gap={16} />
        <Controls className="bg-gray-800 border-cyan-500/30" />
        <MiniMap
          className="bg-gray-800 border-cyan-500/30"
          nodeColor={(node) => {
            switch (node.data?.status) {
              case 'ONLINE': return '#10b981';
              case 'WARNING': return '#f59e0b';
              case 'ERROR': return '#ef4444';
              default: return '#6b7280';
            }
          }}
        />
      </ReactFlow>
      
      {editable && (
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg shadow-lg"
          >
            保存拓扑
          </button>
        </div>
      )}
    </div>
  );
}

// 自定义设备节点
function DeviceNode({ data }: { data: any }) {
  return (
    <div className="px-4 py-2 bg-gray-800 border-2 border-cyan-500/50 rounded-lg shadow-lg">
      <div className="flex items-center space-x-2">
        <div className={`w-3 h-3 rounded-full ${
          data.status === 'ONLINE' ? 'bg-green-500' :
          data.status === 'WARNING' ? 'bg-yellow-500' :
          data.status === 'ERROR' ? 'bg-red-500' :
          'bg-gray-500'
        } animate-pulse`} />
        <div>
          <div className="text-white font-semibold text-sm">{data.label}</div>
          <div className="text-gray-400 text-xs">{data.ip}</div>
        </div>
      </div>
    </div>
  );
}
```

## 5. 告警列表组件

```typescript
// src/components/dashboard/AlarmList.tsx

'use client';

import { useEffect, useState } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface Alarm {
  id: string;
  title: string;
  message: string;
  severity: 'CRITICAL' | 'MAJOR' | 'MINOR' | 'WARNING' | 'INFO';
  deviceName?: string;
  timestamp: string;
}

export function AlarmList({ limit = 10 }: { limit?: number }) {
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [newAlarmCount, setNewAlarmCount] = useState(0);
  
  const { isConnected, subscribeToAlarms, on } = useWebSocket({
    autoConnect: true,
  });

  useEffect(() => {
    loadInitialAlarms();
  }, []);

  useEffect(() => {
    if (!isConnected) return;

    // 订阅告警
    subscribeToAlarms();

    // 监听新告警
    on<Alarm>('alarm:new', (alarm) => {
      console.log('New alarm:', alarm);
      
      setAlarms((prev) => [alarm, ...prev].slice(0, limit));
      setNewAlarmCount((prev) => prev + 1);
      
      // 3秒后重置新告警计数
      setTimeout(() => setNewAlarmCount(0), 3000);
    });
  }, [isConnected, limit]);

  const loadInitialAlarms = async () => {
    try {
      const response = await fetch(`/api/alarms?limit=${limit}`);
      const data = await response.json();
      setAlarms(data.alarms || []);
    } catch (error) {
      console.error('Failed to load alarms:', error);
    }
  };

  const getSeverityConfig = (severity: Alarm['severity']) => {
    const configs = {
      CRITICAL: { color: 'bg-red-500', text: 'text-red-500', label: '严重' },
      MAJOR: { color: 'bg-orange-500', text: 'text-orange-500', label: '重要' },
      MINOR: { color: 'bg-yellow-500', text: 'text-yellow-500', label: '次要' },
      WARNING: { color: 'bg-yellow-400', text: 'text-yellow-400', label: '警告' },
      INFO: { color: 'bg-blue-500', text: 'text-blue-500', label: '信息' },
    };
    return configs[severity];
  };

  return (
    <div className="space-y-2">
      {/* 告警头部 */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">实时告警</h3>
        {newAlarmCount > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="px-3 py-1 bg-red-500 text-white rounded-full text-sm font-bold"
          >
            +{newAlarmCount} 新
          </motion.div>
        )}
      </div>

      {/* 告警列表 */}
      <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
        <AnimatePresence mode="popLayout">
          {alarms.map((alarm, index) => {
            const config = getSeverityConfig(alarm.severity);
            
            return (
              <motion.div
                key={alarm.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.05 }}
                className="p-3 bg-gray-900/70 border-l-4 border-cyan-500/50 rounded-lg backdrop-blur"
                style={{ borderLeftColor: config.color.replace('bg-', '#') }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className={`px-2 py-0.5 ${config.color} text-white text-xs rounded`}>
                        {config.label}
                      </span>
                      {alarm.deviceName && (
                        <span className="text-gray-400 text-xs">{alarm.deviceName}</span>
                      )}
                    </div>
                    <p className="text-white text-sm font-medium mb-1">{alarm.title}</p>
                    <p className="text-gray-400 text-xs">{alarm.message}</p>
                  </div>
                  <div className="text-xs text-gray-500 ml-4">
                    {format(new Date(alarm.timestamp), 'HH:mm:ss', { locale: zhCN })}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* 无告警 */}
      {alarms.length === 0 && (
        <div className="text-center text-gray-500 py-12">
          <div className="text-4xl mb-2">✓</div>
          <div>暂无告警</div>
        </div>
      )}
    </div>
  );
}
```

## 6. 环境变量配置

```bash
# .env.local

# OpManager配置
OPMANAGER_BASE_URL=https://opmanager.example.com
OPMANAGER_API_KEY=your-api-key-here
OPMANAGER_TIMEOUT=10000

# 数据库
DATABASE_URL="postgresql://user:password@localhost:5432/monitoring_dashboard?schema=public"

# Redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=

# WebSocket
NEXT_PUBLIC_WS_URL=http://localhost:3000

# 应用配置
NEXT_PUBLIC_APP_URL=http://localhost:3000
DATA_RETENTION_DAYS=30

# 采集间隔（秒）
COLLECT_METRICS_INTERVAL=60
COLLECT_ALARMS_INTERVAL=30
SYNC_DEVICES_INTERVAL=600

# JWT Secret
JWT_SECRET=your-jwt-secret-here

# 日志级别
LOG_LEVEL=info
```

继续下一部分：大屏页面实现、启动脚本...
