import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/layout/Layout';

interface DashboardTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  primaryColor: string;
  features: string[];
}

/**
 * 大屏选择页面
 * 展示所有可用的大屏模板，用户可以选择进入
 */
export default function DashboardSelector() {
  const router = useRouter();
  const [templates, setTemplates] = useState<DashboardTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/dashboard-configs?metadata=true');
      const result = await response.json();
      if (result.success) {
        setTemplates(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDashboard = (id: string) => {
    router.push(`/dashboards/${id}`);
  };

  if (loading) {
    return (
      <Layout title="大屏选择">
        <div className="flex items-center justify-center h-screen">
          <div className="text-slate-400 text-lg">加载中...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="大屏选择">
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
        <div className="max-w-7xl mx-auto">
          {/* 页面标题 */}
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
              智能监控大屏
            </h1>
            <p className="text-slate-400 text-lg">
              选择一个大屏模板开始监控您的系统
            </p>
          </div>

          {/* 大屏模板网格 */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {templates.map((template) => (
              <DashboardCard
                key={template.id}
                template={template}
                onSelect={() => handleSelectDashboard(template.id)}
              />
            ))}
          </div>

          {/* 说明信息 */}
          <div className="mt-12 p-6 bg-slate-800/50 rounded-lg border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-3">使用说明</h3>
            <ul className="text-slate-400 space-y-2">
              <li>• 选择任意大屏模板进入全屏监控模式</li>
              <li>• 所有大屏支持实时数据更新和WebSocket推送</li>
              <li>• 按 ESC 键或点击返回按钮退出大屏模式</li>
              <li>• 大屏配置基于网格布局，支持响应式显示</li>
            </ul>
          </div>
        </div>
      </div>
    </Layout>
  );
}

/**
 * 大屏卡片组件
 */
interface DashboardCardProps {
  template: DashboardTemplate;
  onSelect: () => void;
}

const DashboardCard: React.FC<DashboardCardProps> = ({ template, onSelect }) => {
  return (
    <div
      onClick={onSelect}
      className="group relative bg-slate-800/50 rounded-xl border border-slate-700 p-6 cursor-pointer
                 hover:bg-slate-800 hover:border-cyan-500 transition-all duration-300
                 hover:shadow-lg hover:shadow-cyan-500/20 hover:-translate-y-1"
      style={{
        borderTopColor: template.primaryColor,
        borderTopWidth: '3px'
      }}
    >
      {/* 图标和标题 */}
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
          style={{ backgroundColor: `${template.primaryColor}20` }}
        >
          <span style={{ color: template.primaryColor }}>
            {getIconEmoji(template.icon)}
          </span>
        </div>
        <div
          className="px-3 py-1 rounded-full text-xs font-medium"
          style={{
            backgroundColor: `${template.primaryColor}20`,
            color: template.primaryColor
          }}
        >
          预设模板
        </div>
      </div>

      {/* 名称 */}
      <h3 className="text-xl font-bold text-white mb-2 group-hover:text-cyan-400 transition-colors">
        {template.name}
      </h3>

      {/* 描述 */}
      <p className="text-slate-400 text-sm mb-4 line-clamp-2">
        {template.description}
      </p>

      {/* 功能特性 */}
      <div className="flex flex-wrap gap-2 mb-4">
        {template.features.slice(0, 3).map((feature, index) => (
          <span
            key={index}
            className="px-2 py-1 bg-slate-700/50 text-slate-300 text-xs rounded"
          >
            {feature}
          </span>
        ))}
        {template.features.length > 3 && (
          <span className="px-2 py-1 bg-slate-700/50 text-slate-300 text-xs rounded">
            +{template.features.length - 3}
          </span>
        )}
      </div>

      {/* 进入按钮 */}
      <button
        className="w-full py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium rounded-lg
                   opacity-0 group-hover:opacity-100 transition-opacity duration-300"
      >
        进入大屏
      </button>
    </div>
  );
};

/**
 * 根据图标名称获取对应的emoji
 */
function getIconEmoji(icon: string): string {
  const iconMap: Record<string, string> = {
    network: '🌐',
    'alert-triangle': '⚠️',
    server: '🖥️',
    'layout-dashboard': '📊'
  };
  return iconMap[icon] || '📌';
}
