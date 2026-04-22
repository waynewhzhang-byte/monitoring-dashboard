'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  BackgroundVariant,
  Controls,
  useNodesState,
  useEdgesState,
  ConnectionMode,
  Panel,
  NodeChange,
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';
import { RefreshCw, Layers, Save, Check } from 'lucide-react';
import { getOptimalHandles, NODE_WIDTH, NODE_HEIGHT } from '@/lib/topology-utils';
import { DeviceNode } from './nodes/DeviceNode';
import type { DeviceNodeData } from './nodes/DeviceNode';
import { FlowEdge } from './edges/FlowEdge';

interface ReactFlowTopologyViewerProps {
  viewName?: string;
  isVisible?: boolean;
  onViewChange?: (viewName: string) => void;
}

const nodeTypes = {
  device: DeviceNode,
  customNode: DeviceNode,
  default: DeviceNode,
};

const edgeTypes = {
  flow: FlowEdge,
};

/**
 * React Flow 网络拓扑查看器 - 简约监控大屏版本
 * 优化: 删除冗余组件，专注于核心拓扑展示
 */
export const ReactFlowTopologyViewer: React.FC<ReactFlowTopologyViewerProps> = ({
  viewName: propViewName = '',
  isVisible = true,
  onViewChange,
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // 业务视图名称状态
  const [currentViewName, setCurrentViewName] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('dashboard-topology-view') || propViewName || '';
    }
    return propViewName || '';
  });
  const [businessViews, setBusinessViews] = useState<Array<{ id: string; name: string; displayName?: string }>>([]);
  const [showViewSelector, setShowViewSelector] = useState(false);
  /** 每个业务视图在会话内最多自动同步一次（DB 尚无拓扑时从 OpManager 拉取） */
  const autoSyncedViewsRef = useRef(new Set<string>());

  // 获取业务视图列表；并纠正 localStorage / 父组件里已不存在于 DB 的视图名
  useEffect(() => {
    const fetchBusinessViews = async () => {
      try {
        const response = await fetch('/api/admin/business-views');
        if (!response.ok) return;

        const views = (await response.json()) as Array<{
          id: string;
          name: string;
          displayName?: string;
        }>;
        setBusinessViews(views);

        if (views.length === 0) return;

        const names = new Set(views.map((v) => v.name));
        const saved =
          typeof window !== 'undefined'
            ? (localStorage.getItem('dashboard-topology-view') || '').trim()
            : '';
        const fromParent = (propViewName || '').trim();
        let next = saved || fromParent;

        if (!next || !names.has(next)) {
          next = views[0].name;
        }

        // 必须始终 setState：首屏 SSR  hydration 后 currentViewName 可能仍是 ''（useState 初始化在服务端走不到 localStorage），
        // 若此处仅在「无效名」分支才 setCurrentViewName，会导致 next 已从 localStorage 解析正确但状态永远为空 → 永远不请求拓扑。
        setCurrentViewName(next);
        if (typeof window !== 'undefined') {
          localStorage.setItem('dashboard-topology-view', next);
        }
        if (next !== fromParent) {
          onViewChange?.(next);
        }
      } catch (error) {
        console.error('Failed to fetch business views:', error);
      }
    };
    fetchBusinessViews();
  }, [onViewChange, propViewName]);

  // Dagre 层次化布局算法
  const getLayoutedElements = useCallback((nodes: Node[], edges: Edge[]) => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({
      rankdir: 'TB',      // 自上而下
      ranksep: 100,       // 层间距
      nodesep: 60,        // 节点间距
    });

    nodes.forEach((node) => {
      dagreGraph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
    });

    edges.forEach((edge) => {
      dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    const layoutedNodes = nodes.map((node) => {
      const nodeWithPosition = dagreGraph.node(node.id);
      return {
        ...node,
        position: {
          x: nodeWithPosition.x - NODE_WIDTH / 2,
          y: nodeWithPosition.y - NODE_HEIGHT / 2,
        },
      };
    });

    return { nodes: layoutedNodes, edges };
  }, []);

  // 获取拓扑数据
  const fetchTopology = useCallback(async () => {
    if (!isVisible) return;

    // 如果没有选中业务视图，不加载数据
    const bvName = currentViewName || propViewName || '';
    if (!bvName) {
      setLoading(false);
      setNodes([]);
      setEdges([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/topology?bvName=${encodeURIComponent(bvName)}`);
      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        console.error('Topology API HTTP', response.status, errText.slice(0, 200));
        setNodes([]);
        setEdges([]);
        return;
      }

      let data = await response.json();
      if (data?.error) {
        console.error('Topology API error payload:', data.error);
        setNodes([]);
        setEdges([]);
        return;
      }

      const emptyTopology =
        Array.isArray(data.nodes) &&
        Array.isArray(data.edges) &&
        data.nodes.length === 0 &&
        data.edges.length === 0;
      if (emptyTopology && !autoSyncedViewsRef.current.has(bvName)) {
        autoSyncedViewsRef.current.add(bvName);
        try {
          const syncRes = await fetch('/api/topology/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bvName }),
          });
          if (syncRes.ok) {
            const r2 = await fetch(`/api/topology?bvName=${encodeURIComponent(bvName)}`);
            if (r2.ok) {
              data = await r2.json();
            }
          } else {
            const msg = await syncRes.text().catch(() => '');
            console.warn('Auto topology sync failed:', syncRes.status, msg.slice(0, 200));
          }
        } catch (e) {
          console.warn('Auto topology sync request failed:', e);
        }
      }

      if (data.nodes && data.edges) {
        const positionMap = new Map<string, { x: number; y: number }>();
        // 转换节点格式，添加固定尺寸
        const formattedNodes: Node<DeviceNodeData>[] = data.nodes.map((node: any) => {
          const pos = node.position || { x: 0, y: 0 };
          positionMap.set(node.id, pos);
          return {
            id: node.id,
            type: 'device',
            position: pos,
            width: NODE_WIDTH,
            height: NODE_HEIGHT,
            data: {
              label: node.data?.label || node.id,
              type: node.data?.type || 'default',
              status: node.data?.status || 'OFFLINE',
              ip: node.data?.ip || '',
              icon: node.data?.icon || '',
              cpu: node.data?.cpu,
              memory: node.data?.memory,
              metadata: node.data?.metadata,
            },
          };
        });

        // 转换边格式 - 智能选择 sourceHandle/targetHandle
        const formattedEdges: Edge[] = data.edges.map((edge: any) => {
          const sourcePos = positionMap.get(edge.source) ?? { x: 0, y: 0 };
          const targetPos = positionMap.get(edge.target) ?? { x: 0, y: 0 };
          const { sourceHandle, targetHandle } = getOptimalHandles(sourcePos, targetPos);
          return {
            id: edge.id,
            source: edge.source,
            target: edge.target,
            sourceHandle,
            targetHandle,
            type: 'flow',
            label: edge.label,
            style: edge.style || {
              stroke: edge.data?.isExternal ? '#f97316' : '#0ea5e9',
              strokeWidth: 1.5,
            },
            data: {
              ...edge.data,
              inTraffic: edge.data?.inTraffic ?? edge.label,
            },
          };
        });

        // 如果节点没有位置信息，应用层次化布局
        const needsLayout = formattedNodes.every(
          (node) => node.position.x === 0 && node.position.y === 0
        );

        if (needsLayout && formattedNodes.length > 0) {
          const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
            formattedNodes,
            formattedEdges
          );
          const layoutPosMap = new Map(layoutedNodes.map((n) => [n.id, n.position]));
          const edgesWithLayoutHandles = layoutedEdges.map((e) => {
            const sourcePos = layoutPosMap.get(e.source) ?? { x: 0, y: 0 };
            const targetPos = layoutPosMap.get(e.target) ?? { x: 0, y: 0 };
            const { sourceHandle, targetHandle } = getOptimalHandles(sourcePos, targetPos);
            return { ...e, sourceHandle, targetHandle };
          });
          setNodes(layoutedNodes);
          setEdges(edgesWithLayoutHandles);
        } else {
          setNodes(formattedNodes);
          setEdges(formattedEdges);
        }
      }
    } catch (error) {
      console.error('Failed to fetch topology:', error);
    } finally {
      setLoading(false);
    }
  }, [currentViewName, propViewName, isVisible, getLayoutedElements, setNodes, setEdges]);

  // 初始化和定时刷新
  useEffect(() => {
    if (isVisible) {
      fetchTopology();
      const interval = setInterval(fetchTopology, 30000);
      return () => clearInterval(interval);
    }
  }, [isVisible, fetchTopology]);

  // 自定义节点变化处理 - 追踪位置变化
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChange(changes);

      // 检查是否有位置变化
      const hasPositionChange = changes.some(
        (change) => change.type === 'position' && (change as any).dragging === false
      );

      if (hasPositionChange) {
        setHasUnsavedChanges(true);
        setSaveSuccess(false);
      }
    },
    [onNodesChange]
  );

  // 保存布局
  const handleSaveLayout = async () => {
    if (!currentViewName) return;

    setSaving(true);
    setSaveSuccess(false);

    try {
      const response = await fetch('/api/topology/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          viewName: currentViewName,
          nodes: nodes.map(node => ({
            id: node.id,
            position: node.position,
          })),
        }),
      });

      if (response.ok) {
        setHasUnsavedChanges(false);
        setSaveSuccess(true);
        // 3秒后隐藏成功提示
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        console.error('保存布局失败');
      }
    } catch (error) {
      console.error('保存布局失败:', error);
    } finally {
      setSaving(false);
    }
  };

  // 同步按钮
  const handleSync = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/topology/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bvName: currentViewName }),
      });
      if (response.ok) {
        await fetchTopology();
        setHasUnsavedChanges(false);
      }
    } catch (error) {
      console.error('同步拓扑失败:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-full relative bg-[#0a0e1a]">
      {/* Loading 状态 */}
      {loading && nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center z-50 bg-slate-950/50">
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
            <span className="text-xs font-mono text-cyan-500 uppercase tracking-widest">
              正在加载网络拓扑...
            </span>
          </div>
        </div>
      )}

      {/* 无业务视图提示 */}
      {!loading && !currentViewName && businessViews.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center z-50">
          <div className="flex flex-col items-center gap-4 text-center">
            <Layers className="w-16 h-16 text-cyan-500/50" />
            <div className="text-cyan-400 font-bold text-lg">未配置业务视图</div>
            <div className="text-slate-400 text-sm max-w-md">
              请在数据库中配置 BusinessViewConfig，或通过 API 维护业务视图名称后同步拓扑
            </div>
          </div>
        </div>
      )}

      {/* 请选择业务视图提示 */}
      {!loading && !currentViewName && businessViews.length > 0 && (
        <div className="absolute inset-0 flex items-center justify-center z-50">
          <div className="flex flex-col items-center gap-4 text-center">
            <Layers className="w-16 h-16 text-cyan-500/50" />
            <div className="text-cyan-400 font-bold text-lg">请选择业务视图</div>
            <div className="text-slate-400 text-sm max-w-md">
              点击顶部标题选择业务视图
            </div>
          </div>
        </div>
      )}

      {/* 已选视图但无拓扑：深色画布 + 0 节点时易被误认为整页未加载（gstack-browse 已证实 API 返回空数组） */}
      {!loading && currentViewName && nodes.length === 0 && edges.length === 0 && (
        <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center px-6">
          <div className="pointer-events-auto max-w-lg rounded-xl border border-cyan-500/25 bg-slate-950/92 px-8 py-6 text-center shadow-2xl backdrop-blur-sm">
            <Layers className="mx-auto mb-3 h-10 w-10 text-cyan-500/60" />
            <p className="text-base font-semibold text-slate-100">
              「
              {businessViews.find((v) => v.name === currentViewName)?.displayName ||
                currentViewName}
              」暂无拓扑节点
            </p>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              当前接口返回空图。请核对 OpManager 中业务视图名称与本系统{' '}
              <span className="font-mono text-cyan-400/90">BusinessViewConfig.name</span>{' '}
              是否完全一致，且该视图在 OPM 中已绘制设备与连线；然后使用右上角「从 OpManager
              同步拓扑」拉取。
            </p>
          </div>
        </div>
      )}

      {/* React Flow */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: 1.2 }}
        minZoom={0.1}
        maxZoom={4}
        connectionMode={ConnectionMode.Loose}
        defaultEdgeOptions={{
          type: 'flow',
          style: { stroke: '#0ea5e9', strokeWidth: 1.5 },
        }}
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={true}
      >
        {/* 背景 - 等轴测风格网格（阿里云风格） */}
        <Background
          variant={BackgroundVariant.Lines}
          color="rgba(148, 163, 184, 0.18)"
          gap={28}
          size={0.8}
          className="opacity-70"
        />

        {/* 控制按钮 - 简化版本 */}
        <Controls
          className="!bg-slate-900/90 !border !border-slate-700/50 rounded-lg shadow-xl"
          showInteractive={false}
          showZoom={true}
          showFitView={true}
        />

        {/* 业务视图分组标签 - 左下角，参考 Aliyun 风格 */}
        {currentViewName && nodes.length > 0 && (
          <Panel position="bottom-left">
            <div
              className="px-3 py-1.5 rounded border border-cyan-500/30 bg-slate-950/80 backdrop-blur-md font-bold text-cyan-400 text-xs uppercase tracking-wider"
              style={{ marginLeft: 16, marginBottom: 16 }}
            >
              {businessViews.find((v) => v.name === currentViewName)?.displayName || currentViewName}
            </div>
          </Panel>
        )}

        {/* 顶部标题栏 - 极简风格 */}
        <Panel position="top-center">
          <div className="bg-slate-900/95 backdrop-blur-md border border-cyan-500/20 rounded-lg px-4 py-2 shadow-2xl">
            <div className="flex items-center gap-3">
              <Layers className="w-4 h-4 text-cyan-400" />

              {showViewSelector ? (
                <select
                  value={currentViewName}
                  onChange={(e) => {
                    const newViewName = e.target.value;
                    setCurrentViewName(newViewName);
                    if (typeof window !== 'undefined') {
                      localStorage.setItem('dashboard-topology-view', newViewName);
                    }
                    if (onViewChange) {
                      onViewChange(newViewName);
                    }
                    setShowViewSelector(false);
                    setTimeout(() => fetchTopology(), 100);
                  }}
                  className="px-3 py-1 bg-slate-800/90 text-white text-sm border border-cyan-500/30 rounded min-w-[200px] focus:outline-none focus:border-cyan-400"
                  autoFocus
                  onBlur={() => setShowViewSelector(false)}
                >
                  {businessViews.length === 0 ? (
                    <option value="">未配置业务视图</option>
                  ) : (
                    businessViews.map((view) => (
                      <option key={view.id} value={view.name}>
                        {view.displayName || view.name}
                      </option>
                    ))
                  )}
                </select>
              ) : (
                <>
                  <div
                    className="text-sm font-semibold text-cyan-400 cursor-pointer hover:text-cyan-300 transition-colors"
                    onClick={() => setShowViewSelector(true)}
                    title="点击选择业务视图"
                  >
                    {currentViewName ? (businessViews.find(v => v.name === currentViewName)?.displayName || currentViewName) : '选择视图'}
                  </div>
                  <div className="h-3 w-px bg-slate-700" />
                  <div className="text-[10px] text-slate-500 font-mono">
                    {nodes.length} 节点 · {edges.length} 连接
                  </div>
                </>
              )}
            </div>
          </div>
        </Panel>

        {/* 右上角操作按钮 */}
        <Panel position="top-right">
          <div className="flex items-center gap-2">
            {/* 保存布局按钮 */}
            <button
              onClick={handleSaveLayout}
              disabled={saving || !hasUnsavedChanges}
              className={`
                p-2 bg-slate-900/95 backdrop-blur-md border rounded-lg transition-all shadow-2xl active:scale-95
                ${saveSuccess
                  ? 'border-green-500/40 text-green-400'
                  : hasUnsavedChanges
                    ? 'border-cyan-500/40 text-cyan-400 hover:text-cyan-300 hover:border-cyan-400/60'
                    : 'border-slate-700/30 text-slate-500 opacity-50 cursor-not-allowed'
                }
              `}
              title={hasUnsavedChanges ? '保存布局' : '无未保存的更改'}
            >
              {saveSuccess ? (
                <Check className="w-4 h-4" />
              ) : (
                <Save className={`w-4 h-4 ${saving ? 'animate-pulse' : ''}`} />
              )}
            </button>

            {/* 同步按钮 */}
            <button
              onClick={handleSync}
              disabled={loading}
              className="p-2 bg-slate-900/95 backdrop-blur-md border border-cyan-500/20 rounded-lg text-cyan-400 hover:text-cyan-300 hover:border-cyan-400/40 transition-all shadow-2xl active:scale-95 disabled:opacity-50"
              title="从 OpManager 同步拓扑"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
};
