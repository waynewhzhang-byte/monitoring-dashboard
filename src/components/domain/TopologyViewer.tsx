import React, { useCallback } from 'react';
import ReactFlow, {
    Node,
    Edge,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    ConnectionLineType,
    MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';

interface TopologyViewerProps {
    initialNodes: Node[];
    initialEdges: Edge[];
}

// Custom node styles based on type
const getNodeStyle = (type: string) => {
    switch (type) {
        case 'ROUTER': return { background: '#3b82f6', color: '#fff' };
        case 'SWITCH': return { background: '#10b981', color: '#fff' };
        case 'SERVER': return { background: '#6366f1', color: '#fff' };
        default: return { background: '#64748b', color: '#fff' };
    }
};

export const TopologyViewer: React.FC<TopologyViewerProps> = ({ initialNodes, initialEdges }) => {
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    return (
        <div className="w-full h-[600px] bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                fitView
            >
                <Background color="#1e293b" gap={16} />
                <Controls className="bg-slate-800 border-slate-700 fill-slate-300" />
            </ReactFlow>
        </div>
    );
};
