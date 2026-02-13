# 拓扑视图消失问题 - 修复补丁

## 修复说明

本补丁解决了业务拓扑视图"加载后快速消失"的问题，通过以下改进：

1. ✅ 优化 useEffect 依赖，避免重复请求
2. ✅ 使用 AbortController 取消过期请求
3. ✅ 添加初始化状态管理
4. ✅ 改进竞态条件处理

## 修改文件

- `src/components/topology/HierarchicalTopologyViewer.tsx`

## 关键修改点

### 1. 新增状态和 Ref

```typescript
// 新增：初始化标志
const [initialized, setInitialized] = useState(false);

// 新增：AbortController 用于取消请求
const abortControllerRef = useRef<AbortController | null>(null);

// 新增：稳定的 viewName ref
const stableViewNameRef = useRef<string>('');
```

### 2. 修改 localStorage 加载逻辑（只运行一次）

```typescript
// 【修改】仅在挂载时加载 localStorage，避免触发多次请求
useEffect(() => {
  const savedViewName = localStorage.getItem('dashboard-topology-view') || '';
  stableViewNameRef.current = savedViewName;
  setCurrentViewName(savedViewName);
  setEditingViewName(savedViewName);

  if (onViewChange) {
    onViewChange(savedViewName);
  }

  // 延迟初始化，确保状态稳定
  const timer = setTimeout(() => {
    setInitialized(true);
  }, 50);

  return () => clearTimeout(timer);
}, []); // 空依赖数组，只运行一次
```

### 3. 在 fetchTopology 中添加请求取消逻辑

```typescript
const fetchTopology = useCallback(async () => {
  // 取消上一个未完成的请求
  if (abortControllerRef.current) {
    abortControllerRef.current.abort();
  }

  // 创建新的 AbortController
  const controller = new AbortController();
  abortControllerRef.current = controller;

  const myId = ++fetchIdRef.current;
  let requestedBvName = currentViewName || propViewName || '';

  // 锁定请求开始时的 bvName
  const expectedBvName = requestedBvName;

  // ... 省略中间代码

  try {
    const response = await fetch(
      `/api/topology?bvName=${encodeURIComponent(requestedBvName)}`,
      { signal: controller.signal } // 添加 signal
    );

    // ... 省略响应处理

  } catch (error: any) {
    // 处理请求被取消
    if (error.name === 'AbortError') {
      console.log(`[ToplogyViewer] Request ${myId} aborted`);
      return;
    }
    console.error('[ToplogyViewer] Failed to fetch topology:', error);
  } finally {
    if (myId === fetchIdRef.current) setLoading(false);
  }
}, [currentViewName, propViewName, isVisible]);
```

### 4. 简化主 useEffect 依赖

```typescript
// 【修改】简化依赖，只在初始化完成和可见性变化时运行
useEffect(() => {
  // 等待初始化完成
  if (!initialized || !isVisible) {
    return;
  }

  setLoading(true);
  setHasChanges(false);
  fetchTopology();

  const interval = setInterval(() => {
    if (isVisible) {
      fetchTopology();
    }
  }, 30000);

  return () => {
    clearInterval(interval);
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    // 清理时取消未完成的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };
}, [initialized, isVisible, currentViewName, propViewName]);
// 保留 currentViewName 和 propViewName 依赖，但因为 initialized 延迟，避免了首次双重请求
```

### 5. 改进响应验证逻辑

```typescript
// 在 fetchTopology 中，响应返回后的验证
const data = await response.json();

// 检查1: 是否是最新请求
if (myId !== fetchIdRef.current) {
  console.warn(`[ToplogyViewer] Ignoring stale response ${myId} (current: ${fetchIdRef.current})`);
  return;
}

// 检查2: 请求期间 viewName 是否变化（比较请求开始时锁定的值）
const currentBvName = currentViewName || propViewName || '';
if (expectedBvName !== currentBvName) {
  console.warn(
    `[ToplogyViewer] ViewName changed during request. ` +
    `Requested: "${expectedBvName}", Current: "${currentBvName}". Ignoring response.`
  );
  return;
}

// 检查3: 对于特定业务视图，如果返回空数据，不覆盖现有图
if (expectedBvName !== '' && data.nodes?.length === 0 && data.edges?.length === 0) {
  console.warn(`[ToplogyViewer] Empty data for view "${expectedBvName}". Not clearing graph.`);
  setNoTopologyData(true);
  if (myId === fetchIdRef.current) setLoading(false);
  return;
}
```

## 完整修改差异

见下方的完整修复后的代码段。

## 测试步骤

1. **刷新页面测试**：
   - 打开 `/dashboard`
   - 刷新页面（F5 或 Ctrl+R）
   - 验证：拓扑图正常加载且不消失
   - 检查 Console 日志：应只有 1 个 Fetch 日志

2. **Tab 切换测试**：
   - 切换到 Tab 1 或 Tab 2
   - 等待 5 秒
   - 切换回 Tab 0
   - 验证：拓扑图正常显示

3. **业务视图切换测试**：
   - 左上角点击"修改"按钮
   - 输入不同的业务视图名称（如 "出口业务"）
   - 点击"保存"
   - 验证：拓扑图切换正确

4. **网络延迟模拟**：
   - 打开 DevTools → Network → Throttling → Fast 3G
   - 刷新页面
   - 验证：拓扑图在慢速网络下也不会消失

## 回滚方案

如果修复后出现新问题，可以通过 Git 回滚：

```bash
git checkout HEAD -- src/components/topology/HierarchicalTopologyViewer.tsx
```

或者从备份恢复（建议修改前备份）：

```bash
cp src/components/topology/HierarchicalTopologyViewer.tsx.backup src/components/topology/HierarchicalTopologyViewer.tsx
```

## 后续优化建议

1. **数据缓存**：使用 React Query 或 SWR 缓存拓扑数据，避免重复请求
2. **状态提升**：将 viewName 状态提升到 Dashboard Page，统一管理
3. **性能监控**：添加性能追踪，记录请求耗时和重复请求次数
4. **错误重试**：添加自动重试机制，处理网络抖动

---

**修复版本**: v1.0.0
**修复时间**: 2026-01-29
**验证状态**: ⏳ 待测试
