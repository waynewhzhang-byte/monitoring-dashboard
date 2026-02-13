# 业务拓扑视图"加载后快速消失"问题诊断报告

## 问题描述

在 `/dashboard` 路由的全局视图（Tab 0）中，业务拓扑视图在页面刷新时可以短暂加载，但随后快速消失。

## 根本原因分析

### 1. **多重 useEffect 触发导致的请求竞态**

#### 问题代码位置：
- `src/components/topology/HierarchicalTopologyViewer.tsx:858-880`
- `src/components/topology/HierarchicalTopologyViewer.tsx:911-919`

#### 问题详情：

```typescript
// Effect 1: 监听 viewName 变化并获取拓扑数据
useEffect(() => {
  if (!isVisible) return;
  setLoading(true);
  fetchTopology();

  const interval = setInterval(() => {
    if (isVisible) fetchTopology();
  }, 30000);

  return () => clearInterval(interval);
}, [fetchTopology, currentViewName, propViewName, isVisible]);

// Effect 2: 从 localStorage 加载 viewName
useEffect(() => {
  const savedViewName = localStorage.getItem('dashboard-topology-view') || '';
  setCurrentViewName(savedViewName);  // 触发 Effect 1 重新运行！
  setEditingViewName(savedViewName);
  if (onViewChange) onViewChange(savedViewName);
}, [onViewChange]);
```

**竞态时序**：
1. 组件挂载，`currentViewName` 初始化（从 localStorage 读取或空字符串）
2. Effect 1 运行 → 发起**请求 A**（使用初始 viewName）
3. Effect 2 运行 → 更新 `currentViewName`
4. `currentViewName` 变化 → Effect 1 再次运行 → 发起**请求 B**（使用新 viewName）
5. 如果请求 A 和 B 的返回顺序错乱：
   - 请求 B 先返回 → 渲染正确的图
   - 请求 A 后返回 → **覆盖正确的图**，导致消失或显示错误数据

### 2. **bvNameRef 竞态保护不完善**

#### 问题代码位置：
- `src/components/topology/HierarchicalTopologyViewer.tsx:51-58`
- `src/components/topology/HierarchicalTopologyViewer.tsx:153-156`

#### 当前保护逻辑：

```typescript
// 定义当前应显示的 bvName
const bvNameRef = useRef<string>('');
bvNameRef.current =
  currentViewName ||
  propViewName ||
  (typeof window !== 'undefined' ? (localStorage.getItem('dashboard-topology-view') || '').trim() : '');

// 响应检查
if (requestedBvName !== bvNameRef.current) {
  console.warn(`Ignoring response for view '${requestedBvName}' (current: '${bvNameRef.current}')`);
  return;
}
```

**问题**：
- `bvNameRef.current` 在每次渲染时都会更新
- 如果在请求期间 `currentViewName` 发生变化，`bvNameRef.current` 也会变化
- 这导致正确的请求响应被错误地忽略

### 3. **fetchTopology 依赖项导致的无限循环风险**

#### 问题代码位置：
- `src/components/topology/HierarchicalTopologyViewer.tsx:118-488`

#### 问题详情：

```typescript
const fetchTopology = useCallback(async () => {
  // ... 获取数据逻辑
}, [currentViewName, propViewName, isVisible]);

useEffect(() => {
  // ...
  fetchTopology();
  // ...
}, [fetchTopology, currentViewName, propViewName, isVisible]);
```

**问题**：
- `fetchTopology` 依赖 `currentViewName`, `propViewName`, `isVisible`
- Effect 依赖 `fetchTopology` + 相同的变量
- 这种**重复依赖**会导致：
  1. `currentViewName` 变化
  2. `fetchTopology` 重新创建
  3. Effect 检测到 `fetchTopology` 变化
  4. 再次运行 Effect
  5. 可能触发额外的请求

### 4. **空数据处理逻辑导致的状态不一致**

#### 问题代码位置：
- `src/components/topology/HierarchicalTopologyViewer.tsx:161-167`
- `src/components/topology/HierarchicalTopologyViewer.tsx:1114-1148`

#### 问题详情：

```typescript
// 如果请求特定视图但返回空数据
if (requestedBvName !== '' && data.nodes.length === 0 && data.edges.length === 0) {
  setNoTopologyData(true);  // 设置空态标记
  if (myId === fetchIdRef.current) setLoading(false);
  return;  // 不更新图，保留旧数据
}

// 有数据时清除空态标记
if (noTopologyData) setNoTopologyData(false);
```

**场景**：
1. 用户刷新页面，localStorage 中保存了视图名 "出口业务"
2. 首次请求 → 数据库中有该视图的拓扑数据 → 渲染成功
3. 第二次请求（由 Effect 2 触发）→ 返回相同数据 → 但由于竞态，`noTopologyData` 状态可能不同步
4. 如果某个请求返回空数据（网络问题、数据库暂时无数据等），会设置 `noTopologyData=true`
5. 后续即使有数据的请求返回，UI 可能已经显示"暂无数据"提示

### 5. **Tab 切换时的 isVisible 变化**

#### 问题代码位置：
- `src/app/dashboard/page.tsx:234`
- `src/components/topology/HierarchicalTopologyViewer.tsx:858-880`

#### 问题详情：

```typescript
// Dashboard Page
<div style={{ display: activeTab === 0 ? 'flex' : 'none' }}>
  <HierarchicalTopologyViewer isVisible={activeTab === 0} />
</div>
```

**场景**：
1. 用户切换到其他 Tab → `isVisible` 变为 false
2. Effect 1 的清理函数运行 → 清除定时器
3. 用户切换回 Tab 0 → `isVisible` 变为 true
4. Effect 1 重新运行 → 发起新请求
5. 如果之前有未完成的请求，可能产生竞态

## 影响范围

### 触发条件：
1. ✅ **页面刷新**（最常见）
2. ✅ **Tab 切换**（从其他 Tab 切回全局视图）
3. ✅ **业务视图名称变更**
4. ✅ **网络延迟导致请求返回顺序错乱**

### 用户体验影响：
- 🔴 **严重**: 拓扑图加载后立即消失，用户无法查看
- 🟡 **中等**: 拓扑图闪烁，短暂显示后被覆盖
- 🟢 **轻微**: 多次请求浪费带宽，但最终显示正确

## 验证方法

### 1. 浏览器控制台日志检查

打开浏览器开发者工具（F12），查看 Console 日志：

```
[ToplogyViewer] Fetch 1 complete. Nodes: 15, Edges: 20
[ToplogyViewer] Fetch 2 complete. Nodes: 0, Edges: 0
[ToplogyViewer] Ignoring stale response 1 (current: 2)
```

**异常信号**：
- 多个 Fetch 日志在短时间内出现
- Nodes 数量从有到无
- "Ignoring stale response" 警告频繁出现

### 2. Network 面板检查

查看 Network → Fetch/XHR：

- 看是否有多个 `/api/topology?bvName=...` 请求
- 检查请求时间戳和响应顺序
- 确认是否存在响应重叠

### 3. React DevTools 检查

查看组件状态：
- `loading` 状态变化
- `currentViewName` 是否稳定
- `noTopologyData` 是否正确

## 解决方案

### 方案 1：优化 useEffect 依赖（推荐）

**目标**：避免 Effect 2 触发 Effect 1 重新运行

```typescript
// 使用 ref 存储 viewName，避免触发 useEffect
const viewNameRef = useRef<string>('');

useEffect(() => {
  // 只在挂载时从 localStorage 加载一次
  const savedViewName = localStorage.getItem('dashboard-topology-view') || '';
  viewNameRef.current = savedViewName;
  setCurrentViewName(savedViewName);
  setEditingViewName(savedViewName);
}, []); // 空依赖，只运行一次

useEffect(() => {
  if (!isVisible) return;
  setLoading(true);
  fetchTopology();

  const interval = setInterval(() => {
    if (isVisible) fetchTopology();
  }, 30000);

  return () => clearInterval(interval);
}, [isVisible]); // 移除 fetchTopology 依赖
```

### 方案 2：使用 AbortController 取消过期请求

**目标**：主动取消过期的 HTTP 请求

```typescript
const abortControllerRef = useRef<AbortController | null>(null);

const fetchTopology = useCallback(async () => {
  // 取消上一个请求
  if (abortControllerRef.current) {
    abortControllerRef.current.abort();
  }

  // 创建新的 AbortController
  const controller = new AbortController();
  abortControllerRef.current = controller;

  try {
    const response = await fetch(`/api/topology?bvName=...`, {
      signal: controller.signal
    });
    // ... 处理响应
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('Request aborted');
      return;
    }
    // ... 处理其他错误
  }
}, [currentViewName, propViewName]);
```

### 方案 3：延迟加载优化

**目标**：避免组件挂载时的多次请求

```typescript
const [initialized, setInitialized] = useState(false);

useEffect(() => {
  // 等待 localStorage 加载完成后再初始化
  const savedViewName = localStorage.getItem('dashboard-topology-view') || '';
  setCurrentViewName(savedViewName);
  setEditingViewName(savedViewName);

  // 延迟初始化，确保状态稳定
  const timer = setTimeout(() => {
    setInitialized(true);
  }, 100);

  return () => clearTimeout(timer);
}, []);

useEffect(() => {
  if (!initialized || !isVisible) return;

  fetchTopology();
  const interval = setInterval(() => {
    if (isVisible) fetchTopology();
  }, 30000);

  return () => clearInterval(interval);
}, [initialized, isVisible, currentViewName]);
```

### 方案 4：改进 bvNameRef 逻辑（配合方案 1-3）

**目标**：更准确地判断响应是否过期

```typescript
const fetchTopology = useCallback(async () => {
  const myId = ++fetchIdRef.current;
  const requestedBvName = currentViewName || propViewName || '';
  const requestStartTime = Date.now();

  // 在请求开始时锁定 bvName
  const expectedBvName = requestedBvName;

  try {
    const response = await fetch(`/api/topology?bvName=${encodeURIComponent(requestedBvName)}`);
    const data = await response.json();

    // 检查1: 是否是最新请求
    if (myId !== fetchIdRef.current) {
      console.warn(`[ToplogyViewer] Ignoring stale response ${myId} (current: ${fetchIdRef.current})`);
      return;
    }

    // 检查2: 请求期间 viewName 是否变化（使用请求开始时的值）
    const currentBvName = currentViewName || propViewName || '';
    if (expectedBvName !== currentBvName) {
      console.warn(`[ToplogyViewer] ViewName changed during request: ${expectedBvName} → ${currentBvName}`);
      return;
    }

    // 应用数据
    // ...
  } catch (error) {
    console.error('[ToplogyViewer] Failed to fetch topology:', error);
  }
}, [currentViewName, propViewName]);
```

## 推荐修复策略

### 短期修复（P0 - 立即实施）：
1. ✅ **方案 1**: 优化 useEffect 依赖，避免重复触发
2. ✅ **方案 2**: 使用 AbortController 取消过期请求

### 中期优化（P1 - 本周完成）：
3. ✅ **方案 3**: 添加初始化延迟，确保状态稳定
4. ✅ **方案 4**: 改进响应验证逻辑

### 长期改进（P2 - 考虑）：
5. 🔄 使用 React Query 或 SWR 管理数据获取和缓存
6. 🔄 将 viewName 状态提升到父组件，避免 localStorage 多次读取
7. 🔄 添加更详细的日志和错误追踪

## 测试验证清单

修复后需要验证：
- [ ] 刷新页面后，拓扑图正常显示且不消失
- [ ] Tab 切换后，拓扑图正常显示
- [ ] 修改业务视图名称后，拓扑图正确更新
- [ ] Console 日志中无 "Ignoring stale response" 警告
- [ ] Network 面板中无重复的拓扑请求
- [ ] 页面性能无明显下降

## 相关文件

- 📄 `src/components/topology/HierarchicalTopologyViewer.tsx` (主要修复)
- 📄 `src/app/dashboard/page.tsx` (次要调整)
- 📄 `src/app/api/topology/route.ts` (无需修改)

---

**报告生成时间**: 2026-01-29
**优先级**: 🔴 P0 (严重影响用户体验)
**预计修复时间**: 2-4 小时
