import React, { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { TopologyViewer } from '@/components/domain/TopologyViewer';
import { TopologyEditor } from '@/components/topology/TopologyEditor';
import { RefreshCw, Edit3, Eye } from 'lucide-react';

export default function TopologyPage() {
    const [data, setData] = useState({ nodes: [], edges: [] });
    const [loading, setLoading] = useState(true);
    const [editMode, setEditMode] = useState(false);

    const fetchTopology = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/topology');
            const json = await res.json();
            setData(json);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const handleSave = async (nodes: any[], edges: any[]) => {
        try {
            const res = await fetch('/api/topology/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nodes, edges })
            });

            if (res.ok) {
                alert('拓扑保存成功！');
                await fetchTopology();
            } else {
                alert('保存失败');
            }
        } catch (error) {
            console.error('Failed to save topology:', error);
            alert('保存失败');
        }
    };

    useEffect(() => {
        fetchTopology();
    }, []);

    return (
        <MainLayout>
            <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold">网络拓扑</h1>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setEditMode(!editMode)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
                                editMode
                                    ? 'bg-cyan-600 hover:bg-cyan-700'
                                    : 'bg-slate-800 hover:bg-slate-700'
                            }`}
                        >
                            {editMode ? (
                                <>
                                    <Eye size={16} />
                                    查看模式
                                </>
                            ) : (
                                <>
                                    <Edit3 size={16} />
                                    编辑模式
                                </>
                            )}
                        </button>
                        <button
                            onClick={fetchTopology}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm transition-colors"
                            disabled={loading}
                        >
                            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                            刷新
                        </button>
                    </div>
                </div>

                <div className="flex-1 min-h-0 bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
                    {loading ? (
                        <div className="h-full flex items-center justify-center">
                            <span className="text-slate-500">加载中...</span>
                        </div>
                    ) : editMode ? (
                        <TopologyEditor
                            initialNodes={data.nodes}
                            initialEdges={data.edges}
                            onSave={handleSave}
                            editable={true}
                        />
                    ) : (
                        <TopologyViewer
                            viewName="出口业务"
                        />
                    )}
                </div>
            </div>
        </MainLayout>
    );
}
