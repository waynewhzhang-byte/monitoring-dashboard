import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { useBusinessViewRealtimeUpdates } from '@/hooks/useRealtimeUpdates';
import { getOptimalHandles, NODE_WIDTH, NODE_HEIGHT } from '@/lib/topology-utils';
import ReactFlow, {
    Node,
    Edge,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    ConnectionLineType,
    MarkerType,
    NodeMouseHandler,
    NodeDragHandler,
    BackgroundVariant
} from 'reactflow';
import 'reactflow/dist/style.css';
import { DeviceNode } from '@/components/topology/nodes/DeviceNode';
import CustomEdge from '@/components/topology/custom/CustomEdge';
import { X, Cpu, HardDrive, Activity, Server, Network, Save } from 'lucide-react';

interface TopologyViewerProps {
    viewName?: string;
}

export const TopologyViewer: React.FC<TopologyViewerProps> = ({ viewName }) => {
    const nodeTypes = useMemo(() => ({
        customNode: DeviceNode,
        device: DeviceNode,
        default: DeviceNode,
    }), []);

    const edgeTypes = useMemo(() => ({
        customEdge: CustomEdge,
    }), []);

    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [loading, setLoading] = useState(true);
    const [selectedNode, setSelectedNode] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // 订阅 WebSocket 实时更新 - 当后端同步拓扑时立即刷新
    const { lastUpdate } = useBusinessViewRealtimeUpdates(viewName || null);

    const fetchTopology = useCallback(async () => {
        try {
            // Allow fetching even when viewName is empty (global view)
            const bvName = viewName || '';
            const response = await fetch(`/api/topology?bvName=${encodeURIComponent(bvName)}`);
            const data = await response.json();
            if (data.nodes && data.edges) {
                const positionMap = new Map<string, { x: number; y: number }>();
                const nodesWithTypes = data.nodes.map((n: any) => {
                    const pos = n.position || { x: 0, y: 0 };
                    positionMap.set(n.id, pos);
                    return {
                        id: n.id,
                        type: 'device',
                        position: pos,
                        width: NODE_WIDTH,
                        height: NODE_HEIGHT,
                        data: {
                            label: n.data?.label || n.id,
                            type: n.data?.type || 'default',
                            status: n.data?.status || 'OFFLINE',
                            ip: n.data?.ip || '',
                            ...n.data,
                        },
                    };
                });
                const edgesWithTypes = data.edges.map((e: any) => {
                    const sourcePos = positionMap.get(e.source) ?? { x: 0, y: 0 };
                    const targetPos = positionMap.get(e.target) ?? { x: 0, y: 0 };
                    const { sourceHandle, targetHandle } = getOptimalHandles(sourcePos, targetPos);
                    return {
                        ...e,
                        type: 'customEdge',
                        sourceHandle,
                        targetHandle,
                        animated: e.animated || false,
                    };
                });
                setNodes(nodesWithTypes);
                setEdges(edgesWithTypes);
            } else {
                // Handle empty response (global view with no topology)
                setNodes([]);
                setEdges([]);
            }
        } catch (error) {
            console.error('Failed to fetch topology:', error);
        } finally {
            setLoading(false);
        }
    }, [setNodes, setEdges, viewName]);

    // 初始加载和定时轮询（作为 WebSocket 的备份）
    useEffect(() => {
        setLoading(true); // Reset loading when view changes
        setHasChanges(false); // Reset changes flag when view changes
        fetchTopology();
        const interval = setInterval(fetchTopology, 60000); // 轮询降低到 60s，主要依靠 WebSocket
        return () => {
            clearInterval(interval);
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, [fetchTopology, viewName]);

    // WebSocket 实时更新 - 当收到 topology:updated 事件时立即刷新
    useEffect(() => {
        if (lastUpdate) {
            console.log('🔄 Received topology update via WebSocket, refreshing...');
            fetchTopology();
        }
    }, [lastUpdate, fetchTopology]);

    const onNodeClick: NodeMouseHandler = useCallback((event, node) => {
        setSelectedNode(node);
    }, []);

    // 保存节点位置到服务器
    const saveNodePositions = useCallback(async () => {
        if (!viewName || viewName === '' || nodes.length === 0) {
            return;
        }

        setIsSaving(true);
        try {
            const response = await fetch('/api/topology/update', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    viewName: viewName,
                    nodes: nodes.map(node => ({
                        id: node.id,
                        position: node.position
                    }))
                })
            });

            if (response.ok) {
                setHasChanges(false);
                console.log('Node positions saved successfully');
            } else {
                console.error('Failed to save node positions');
            }
        } catch (error) {
            console.error('Error saving node positions:', error);
        } finally {
            setIsSaving(false);
        }
    }, [nodes, viewName]);

    // 节点拖拽结束时的处理
    const onNodeDragStop: NodeDragHandler = useCallback((event, node) => {
        setHasChanges(true);

        // 延迟保存，避免频繁请求（防抖）
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        saveTimeoutRef.current = setTimeout(() => {
            saveNodePositions();
        }, 1000); // 1秒后自动保存
    }, [saveNodePositions]);

    return (
        <div className="w-full h-full relative overflow-hidden bg-[#0a1929] group">
            {/* Simplified background - matching reference style */}
            <div className="absolute inset-0 bg-[#0a1929]" />

            {/* Minimal grid pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />

            <div className="absolute top-4 right-4 z-[60] flex flex-col gap-2 pointer-events-auto">
                {viewName && viewName !== '' && hasChanges && (
                    <button
                        onClick={saveNodePositions}
                        disabled={isSaving}
                        className="p-2 bg-blue-600/80 backdrop-blur-md border border-blue-400/50 rounded-lg text-white hover:bg-blue-500 transition-all shadow-xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="保存位置"
                    >
                        <Save className={`w-4 h-4 ${isSaving ? 'animate-spin' : ''}`} />
                    </button>
                )}
                <button
                    onClick={() => fetchTopology()}
                    className="p-2 bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-lg text-slate-400 hover:text-blue-400 transition-all shadow-xl active:scale-95"
                    title="刷新拓扑"
                >
                    <Activity className="w-4 h-4" />
                </button>
            </div>

            {loading && nodes.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center z-50 bg-slate-950/50 backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-8 h-8 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
                        <span className="text-xs font-mono text-cyan-500 animate-pulse uppercase tracking-widest">正在初始化网络拓扑...</span>
                    </div>
                </div>
            ) : null}

            <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={onNodeClick}
                onNodeDragStop={onNodeDragStop}
                nodesDraggable={!!viewName && viewName !== ''}
                fitView
                fitViewOptions={{ padding: 20 }}
                connectionLineType={ConnectionLineType.SmoothStep}
                minZoom={0.1}
                maxZoom={1.5}
            >
                <Background color="rgba(148,163,184,0.18)" gap={28} size={0.8} variant={BackgroundVariant.Lines} className="opacity-70" />
                <Controls className="bg-slate-800/80 border-slate-700 fill-slate-300" />
            </ReactFlow>
            {/* ... remaining code ... */}
            {/* ... remaining code ... */}

            {/* Side Panel for Node Details */}
            {selectedNode && (
                <div className="absolute right-4 top-4 bottom-4 w-72 bg-slate-950/90 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl p-6 z-20 flex flex-col space-y-6 animate-in slide-in-from-right duration-300">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                            <div className={`w-2 h-2 rounded-full ${selectedNode.data.status === 'ONLINE' ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{selectedNode.data.status === 'ONLINE' ? '在线' : '离线'}</span>
                        </div>
                        <button onClick={() => setSelectedNode(null)} className="p-1 hover:bg-slate-800 rounded-lg transition-colors">
                            <X className="w-4 h-4 text-slate-500" />
                        </button>
                    </div>

                    <div className="space-y-1">
                        <h3 className="text-xl font-bold text-white leading-tight">{selectedNode.data.label}</h3>
                        <p className="text-xs font-mono text-cyan-500">{selectedNode.data.ip}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800">
                            <div className="flex items-center space-x-2 mb-1">
                                <Cpu className="w-3 h-3 text-blue-400" />
                                <span className="text-[9px] text-slate-500 uppercase font-bold">CPU 使用率</span>
                            </div>
                            <div className="text-lg font-bold text-blue-400">{selectedNode.data.cpu}%</div>
                        </div>
                        <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800">
                            <div className="flex items-center space-x-2 mb-1">
                                <HardDrive className="w-3 h-3 text-purple-400" />
                                <span className="text-[9px] text-slate-500 uppercase font-bold">内存使用率</span>
                            </div>
                            <div className="text-lg font-bold text-purple-400">{selectedNode.data.memory}%</div>
                        </div>
                    </div>

                    <div className="space-y-4 flex-1">
                        <div className="space-y-2">
                            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold flex items-center gap-2">
                                <Activity className="w-3 h-3 text-cyan-500" />
                                设备基本信息
                            </div>
                            <div className="space-y-2 bg-slate-900/30 p-3 rounded-xl border border-slate-800/50">
                                <div className="flex justify-between text-[11px]">
                                    <span className="text-slate-500 flex items-center gap-1"><Server className="w-3 h-3" /> 设备类型</span>
                                    <span className="text-slate-300 font-medium">{selectedNode.data.type}</span>
                                </div>
                                <div className="flex justify-between text-[11px]">
                                    <span className="text-slate-500 flex items-center gap-1"><Network className="w-3 h-3" /> 状态编号</span>
                                    <span className="text-slate-300 font-medium">{selectedNode.data.metadata?.status || '5'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <button className="w-full bg-cyan-600 hover:bg-cyan-500 text-white py-3 rounded-xl text-xs font-bold transition-all shadow-lg shadow-cyan-900/20 uppercase tracking-widest">
                        查看完整监控详情
                    </button>
                </div>
            )}
        </div>
    );
};
