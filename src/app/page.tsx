export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-cyan-500 to-blue-500 text-transparent bg-clip-text">
          智能监控大屏系统
        </h1>
        <p className="text-xl text-gray-400 mb-8">
          Intelligent Monitoring Dashboard
        </p>
        <div className="flex gap-4 justify-center">
          <a
            href="/dashboard"
            className="px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
          >
            进入大屏
          </a>
          <a
            href="/admin"
            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            管理后台
          </a>
        </div>
        <div className="mt-12 text-sm text-gray-500">
          <p>✅ Phase 1: 项目初始化完成</p>
          <p>📦 Next.js 14 + TypeScript + TailwindCSS</p>
        </div>
      </div>
    </main>
  )
}
