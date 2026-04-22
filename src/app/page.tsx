'use client';

import dynamic from 'next/dynamic';

const ReactFlowTopologyViewer = dynamic(
  () =>
    import('@/components/topology/ReactFlowTopologyViewer').then((m) => ({
      default: m.ReactFlowTopologyViewer,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[50dvh] w-full items-center justify-center text-slate-500 text-sm">
        加载拓扑…
      </div>
    ),
  }
);

/**
 * 业务视图仅客户端渲染，避免 React Flow 与 SSR 的 hydration 不一致。
 */
export default function Home() {
  return (
    <div className="h-dvh w-screen min-h-0 overflow-hidden bg-[#0a0e1a]">
      <ReactFlowTopologyViewer isVisible />
    </div>
  );
}
