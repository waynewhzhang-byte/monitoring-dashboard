import React, { useCallback, useState, useEffect } from 'react';
import ReactFlow, {
    Node,
    Edge,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    addEdge,
    Connection,
    MiniMap,
    Panel
} from 'reactflow';
import 'reactflow/dist/style.css';

interface TopologyEditorProps {
    initialNodes?: Node[];
    initialEdges?: Edge[];
    onSave?: (nodes: Node[], edges: Edge[]) => void;
    editable?: boolean;
}

export const TopologyEditor: React.FC<TopologyEditorProps> = ({
    initialNodes = [],
    initialEdges = [],
    onSave,
    editable = true
}) => {
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
    const [selectedNodeType, setSelectedNodeType] = useState('router');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setNodes(initialNodes);
        setEdges(initialEdges);
    }, [initialNodes, initialEdges, setNodes, setEdges]);

    // 处理连接
    const onConnect = useCallback(
        (params: Connection) => {
            setEdges((eds) => addEdge({
                ...params,
                type: 'smoothstep',
                animated: true,
                style: { stroke: '#06b6d4', strokeWidth: 2 }
            }, eds));
        },
        [setEdges]
    );

    // 添加新节点
    const addNode = useCallback(() => {
        const newNode: Node = {
            id: `node-${Date.now()}`,
            type: 'default',
            position: {
                x: Math.random() * 500,
                y: Math.random() * 500
            },
            data: {
                label: `${selectedNodeType}-${nodes.length + 1}`,
                type: selectedNodeType,
                icon: getIconForType(selectedNodeType)
            },
            style: {
                background: getColorForType(selectedNodeType),
                color: 'white',
                border: '2px solid #06b6d4',
                borderRadius: '8px',
                padding: '10px',
                fontSize: '12px',
                fontWeight: 'bold'
            }
        };

        setNodes((nds) => [...nds, newNode]);
    }, [nodes.length, selectedNodeType, setNodes]);

    // 删除选中的节点
    const deleteSelectedNodes = useCallback(() => {
        setNodes((nds) => nds.filter((node) => !node.selected));
        setEdges((eds) => eds.filter((edge) => {
            const sourceExists = nodes.some((n) => n.id === edge.source && !n.selected);
            const targetExists = nodes.some((n) => n.id === edge.target && !n.selected);
            return sourceExists && targetExists;
        }));
    }, [nodes, setEdges, setNodes]);

    // 保存拓扑
    const handleSave = async () => {
        if (!onSave) return;

        setIsSaving(true);
        try {
            await onSave(nodes, edges);
        } finally {
            setIsSaving(false);
        }
    };

    // 自动布局
    const autoLayout = useCallback(() => {
        const layoutNodes = nodes.map((node, index) => {
            const row = Math.floor(index / 5);
            const col = index % 5;
            return {
                ...node,
                position: {
                    x: col * 200 + 100,
                    y: row * 150 + 100
                }
            };
        });
        setNodes(layoutNodes);
    }, [nodes, setNodes]);

    return (
        <div className="h-full w-full bg-slate-900 relative">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={editable ? onNodesChange : undefined}
                onEdgesChange={editable ? onEdgesChange : undefined}
                onConnect={editable ? onConnect : undefined}
                fitView
                attributionPosition="bottom-left"
            >
                <Background color="#1e293b" gap={16} />
                <Controls />
                <MiniMap
                    nodeColor="#06b6d4"
                    maskColor="rgba(0, 0, 0, 0.5)"
                />

                {editable && (
                    <Panel position="top-left" className="bg-slate-800 rounded-lg p-4 shadow-lg border border-slate-700">
                        <div className="space-y-3">
                            <div>
                                <label className="text-white text-sm font-medium block mb-2">
                                    节点类型
                                </label>
                                <select
                                    value={selectedNodeType}
                                    onChange={(e) => setSelectedNodeType(e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-700 text-white rounded border border-slate-600 text-sm"
                                >
                                    <option value="router">路由器</option>
                                    <option value="switch">交换机</option>
                                    <option value="server">服务器</option>
                                    <option value="firewall">防火墙</option>
                                    <option value="cloud">云服务</option>
                                </select>
                            </div>

                            <div className="flex flex-col gap-2">
                                <button
                                    onClick={addNode}
                                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded text-sm font-medium transition-colors"
                                >
                                    + 添加节点
                                </button>

                                <button
                                    onClick={deleteSelectedNodes}
                                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium transition-colors"
                                >
                                    删除选中
                                </button>

                                <button
                                    onClick={autoLayout}
                                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm font-medium transition-colors"
                                >
                                    自动布局
                                </button>

                                {onSave && (
                                    <button
                                        onClick={handleSave}
                                        disabled={isSaving}
                                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium transition-colors disabled:opacity-50"
                                    >
                                        {isSaving ? '保存中...' : '💾 保存拓扑'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </Panel>
                )}

                <Panel position="top-right" className="bg-slate-800 rounded-lg p-3 shadow-lg border border-slate-700">
                    <div className="text-white text-sm space-y-1">
                        <div><strong>节点:</strong> {nodes.length}</div>
                        <div><strong>连接:</strong> {edges.length}</div>
                    </div>
                </Panel>
            </ReactFlow>
        </div>
    );
};

// 辅助函数
function getIconForType(type: string): string {
    const icons: Record<string, string> = {
        router: '🔀',
        switch: '🔁',
        server: '🖥️',
        firewall: '🛡️',
        cloud: '☁️'
    };
    return icons[type] || '📦';
}

function getColorForType(type: string): string {
    const colors: Record<string, string> = {
        router: '#3b82f6',
        switch: '#10b981',
        server: '#f59e0b',
        firewall: '#ef4444',
        cloud: '#8b5cf6'
    };
    return colors[type] || '#06b6d4';
}
