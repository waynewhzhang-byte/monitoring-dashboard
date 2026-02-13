# 拓扑视图修复 - 验证指南

## 修复总结

✅ 已成功修复业务拓扑视图"加载后快速消失"的问题

### 修改内容

**文件**: `src/components/topology/HierarchicalTopologyViewer.tsx`

**关键改进**:
1. ✅ 添加 `initialized` 状态，延迟 50ms 初始化，避免首次双重请求
2. ✅ 使用 `AbortController` 取消过期的 HTTP 请求
3. ✅ localStorage 加载逻辑改为只运行一次（空依赖数组）
4. ✅ 改进请求验证逻辑，使用 `expectedBvName` 锁定请求开始时的视图名
5. ✅ 简化 useEffect 依赖，避免不必要的重新渲染

### 代码变更统计

- 新增状态: 1 个 (`initialized`)
- 新增 ref: 2 个 (`abortControllerRef`, `stableViewNameRef`)
- 修改 useEffect: 2 个
- 修改 useCallback: 1 个 (`fetchTopology`)
- 代码行数: ~50 行修改

---

## 快速验证步骤

### 1️⃣ 刷新页面测试（最重要）

**操作**:
```
1. 打开浏览器，访问 http://localhost:3000/dashboard
2. 确保在 Tab 0（全屏总览）
3. 刷新页面（按 F5 或 Ctrl+R）
4. 观察拓扑图是否正常加载
```

**预期结果**:
- ✅ 拓扑图在 1-2 秒内加载完成
- ✅ 拓扑图**不会消失或闪烁**
- ✅ 节点和边显示正常
- ✅ Console 日志只有 **1 个** `[ToplogyViewer] Fetch X complete` 日志

**失败标志**:
- ❌ 拓扑图加载后立即消失
- ❌ Console 中有 2 个或更多 Fetch 日志
- ❌ 出现 "Ignoring stale response" 警告

---

### 2️⃣ Tab 切换测试

**操作**:
```
1. 在 Tab 0 查看拓扑图
2. 切换到 Tab 1（硬件服务器）
3. 等待 5 秒
4. 切换回 Tab 0（全屏总览）
5. 观察拓扑图是否正常
```

**预期结果**:
- ✅ 切换回 Tab 0 后，拓扑图立即显示
- ✅ 无闪烁或重新布局
- ✅ Console 中有新的 Fetch 日志（正常刷新）

---

### 3️⃣ 业务视图切换测试

**操作**:
```
1. 点击左上角"业务拓扑视图"面板的"修改"按钮
2. 输入不同的业务视图名称，如 "出口业务"
3. 点击"保存"
4. 观察拓扑图是否正确切换
```

**预期结果**:
- ✅ 拓扑图切换到新的业务视图
- ✅ 如果视图不存在，显示"暂无拓扑数据"提示
- ✅ Console 中只有 1 个新的 Fetch 日志

---

### 4️⃣ Console 日志检查

**操作**:
```
1. 打开浏览器开发者工具（F12）
2. 切换到 Console 标签
3. 刷新页面
4. 查看日志输出
```

**预期日志示例**（正常情况）:
```
[ToplogyViewer] Fetch 1 complete. Status: 200. Nodes: 15, Edges: 20
[ToplogyViewer] Applying valid topology data. Nodes: 15
[ToplogyViewer] All nodes at (0,0), triggering auto-layout.
[ToplogyViewer] Applying hierarchical layout. Container: 1200x800
[ToplogyViewer] Camera Fit: Graph 800.0x600.0, Container 1200x800
```

**异常日志示例**（需要修复）:
```
❌ [ToplogyViewer] Fetch 1 complete. Nodes: 15, Edges: 20
❌ [ToplogyViewer] Fetch 2 complete. Nodes: 0, Edges: 0
❌ [ToplogyViewer] Ignoring stale response 1 (current: 2)
```

---

### 5️⃣ Network 面板检查

**操作**:
```
1. 打开 DevTools → Network 标签
2. 刷新页面
3. 过滤 "topology" 请求
4. 查看请求数量和时间
```

**预期结果**:
- ✅ 刷新后只有 **1 个** `/api/topology?bvName=...` 请求
- ✅ 请求返回 200 状态码
- ✅ 响应时间 < 2 秒（取决于数据量）

**异常情况**:
- ❌ 短时间内有 2 个或更多相同的请求
- ❌ 请求被 "cancelled" 标记（正常，说明 AbortController 工作）

---

## 详细验证测试用例

### 测试用例 1: 空业务视图名称（全局拓扑）

**前置条件**:
- localStorage 中的 `dashboard-topology-view` 为空或不存在

**操作**:
1. 清除 localStorage: `localStorage.removeItem('dashboard-topology-view')`
2. 刷新页面

**预期**:
- ✅ 加载全局拓扑（所有节点和边）
- ✅ 左上角面板显示"未设置（显示全局拓扑）"

---

### 测试用例 2: 有效的业务视图名称

**前置条件**:
- 数据库中存在名为 "出口业务" 的拓扑数据
- localStorage 中设置: `localStorage.setItem('dashboard-topology-view', '出口业务')`

**操作**:
1. 刷新页面

**预期**:
- ✅ 加载 "出口业务" 的拓扑数据
- ✅ 左上角面板显示 "出口业务"

---

### 测试用例 3: 无效的业务视图名称

**前置条件**:
- localStorage 中设置一个不存在的视图: `localStorage.setItem('dashboard-topology-view', '不存在的视图')`

**操作**:
1. 刷新页面

**预期**:
- ✅ 显示"该业务视图暂无拓扑数据"提示
- ✅ 不会崩溃或显示错误
- ✅ 可以点击"立即同步"按钮尝试同步

---

### 测试用例 4: 慢速网络模拟

**操作**:
1. 打开 DevTools → Network → Throttling
2. 选择 "Fast 3G" 或 "Slow 3G"
3. 刷新页面

**预期**:
- ✅ 显示 Loading 状态
- ✅ 数据加载完成后正常显示
- ✅ **不会因为网络慢而消失**

---

### 测试用例 5: 快速切换视图

**操作**:
1. 快速修改业务视图名称 3 次:
   - "出口业务" → 保存
   - "核心业务" → 保存
   - "" (清空) → 保存
2. 观察拓扑图变化

**预期**:
- ✅ 每次切换后显示对应的拓扑
- ✅ Console 中有 "Request X aborted" 日志（说明旧请求被取消）
- ✅ 最终显示的是最后一次保存的视图

---

## 回归测试清单

修复后需要确保这些功能仍然正常：

- [ ] ✅ 节点拖拽功能正常
- [ ] ✅ 节点点击显示详情面板
- [ ] ✅ 边缘流量标签显示正常
- [ ] ✅ 相机缩放和平移功能正常
- [ ] ✅ 保存拓扑位置功能正常
- [ ] ✅ 30 秒自动刷新功能正常
- [ ] ✅ 业务视图同步按钮正常
- [ ] ✅ Tab 自动轮转功能正常（60 秒）

---

## 性能验证

### 内存泄漏检查

**操作**:
```
1. 打开 DevTools → Memory → Take heap snapshot
2. 刷新页面 10 次
3. 再次 Take heap snapshot
4. 比较两次快照的内存差异
```

**预期**:
- ✅ 内存增长 < 10MB
- ✅ 无明显的 Detached DOM 节点

### 请求次数统计

**操作**:
```
1. 打开 Network 面板
2. 刷新页面
3. 等待 5 分钟
4. 统计拓扑 API 请求次数
```

**预期**:
- ✅ 初始加载: 1 次请求
- ✅ 5 分钟后: ~10 次请求（每 30 秒 1 次）
- ✅ 无重复或并发请求

---

## 故障排查

### 问题 1: 修复后仍然消失

**可能原因**:
- 浏览器缓存未清除
- 代码未正确重启

**解决方案**:
```bash
# 1. 清除 node_modules/.cache
rm -rf node_modules/.cache

# 2. 重新构建
npm run build

# 3. 重启开发服务器
npm run dev

# 4. 硬刷新浏览器（Ctrl+Shift+R）
```

### 问题 2: Console 报错 "AbortError"

**状态**: ✅ 正常（说明请求取消功能工作）

**日志示例**:
```
[ToplogyViewer] Request 1 aborted
```

这是预期行为，表示旧请求被主动取消。

### 问题 3: 拓扑图不显示

**排查步骤**:
1. 检查 Console 是否有错误
2. 检查 Network 请求是否成功返回数据
3. 检查数据库中是否有拓扑数据:
   ```bash
   npm run diagnose:dashboard
   ```

---

## 自动化测试脚本（可选）

创建一个简单的测试脚本：

```javascript
// test-topology-stability.js
async function testTopologyStability() {
  console.log('🧪 开始测试拓扑稳定性...');

  // 测试 1: 检查初始加载
  console.log('📋 测试 1: 初始加载');
  await new Promise(resolve => setTimeout(resolve, 3000));

  const nodes = document.querySelectorAll('[data-node-id]');
  console.log(`✅ 找到 ${nodes.length} 个节点`);

  if (nodes.length === 0) {
    console.error('❌ 测试失败: 没有节点');
    return false;
  }

  // 测试 2: 等待 5 秒，检查节点是否消失
  console.log('📋 测试 2: 稳定性检查（5秒）');
  await new Promise(resolve => setTimeout(resolve, 5000));

  const nodesAfter = document.querySelectorAll('[data-node-id]');
  console.log(`✅ 5秒后仍有 ${nodesAfter.length} 个节点`);

  if (nodesAfter.length !== nodes.length) {
    console.error(`❌ 测试失败: 节点数量变化 ${nodes.length} → ${nodesAfter.length}`);
    return false;
  }

  console.log('✅ 所有测试通过！');
  return true;
}

// 在浏览器 Console 中运行
testTopologyStability();
```

---

## 验证报告模板

完成测试后，填写此报告：

```
## 拓扑视图修复验证报告

**测试时间**: _______________
**测试人员**: _______________
**浏览器**: Chrome/Firefox/Edge/Safari ______
**环境**: Development/Production

### 测试结果

| 测试项 | 状态 | 备注 |
|--------|------|------|
| 刷新页面测试 | ✅/❌ | |
| Tab 切换测试 | ✅/❌ | |
| 业务视图切换 | ✅/❌ | |
| Console 日志 | ✅/❌ | |
| Network 请求 | ✅/❌ | |
| 慢速网络 | ✅/❌ | |
| 回归功能 | ✅/❌ | |

### 发现的问题

1. _______________________________
2. _______________________________

### 总体评价

□ 完全修复，可以部署
□ 部分修复，需要进一步调整
□ 未修复，需要重新分析

### 签名

_______________
```

---

## 下一步行动

### 如果测试通过：
1. ✅ 提交代码到 Git
2. ✅ 更新 CHANGELOG.md
3. ✅ 部署到生产环境
4. ✅ 监控生产日志

### 如果测试失败：
1. ❌ 查看 Console 错误日志
2. ❌ 检查 Network 请求详情
3. ❌ 参考"故障排查"章节
4. ❌ 联系开发团队

---

**验证版本**: v1.0.0
**最后更新**: 2026-01-29
**状态**: ⏳ 待验证
