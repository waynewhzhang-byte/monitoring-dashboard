import React, { useEffect, useState } from 'react';
import { Layers, ChevronDown } from 'lucide-react';

interface ViewSelectorProps {
  currentView: string;
  onViewChange: (view: string) => void;
}

interface ViewItem {
  name: string;
  displayName: string;
}

export const ViewSelector: React.FC<ViewSelectorProps> = ({ currentView, onViewChange }) => {
  const [views, setViews] = useState<ViewItem[]>([]);

  useEffect(() => {
    // Fetch views from BusinessViewConfig (manually maintained in /admin)
    const fetchViews = async () => {
      try {
        const response = await fetch('/api/topology/views');
        if (response.ok) {
          const data = await response.json();
          // The API returns { views: [{ name, displayName }] }
          const viewItems: ViewItem[] = data.views || [];
          // Add empty option for "Global View" at the beginning
          setViews([{ name: '', displayName: '全网总览' }, ...viewItems]);
        } else {
          // Fallback: empty array (no views configured)
          setViews([{ name: '', displayName: '全网总览' }]);
        }
      } catch (e) {
        console.error("Failed to fetch views", e);
        // Fallback: empty array (no views configured)
        setViews([{ name: '', displayName: '全网总览' }]);
      }
    };
    fetchViews();
  }, []);

  // Find current view display name
  const currentDisplayName = views.find(v => v.name === currentView)?.displayName || '全网总览';

  return (
    <div className="relative group">
      <button className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg border border-slate-700 transition-all">
        <Layers className="w-4 h-4 text-cyan-400" />
        <span className="text-sm font-medium text-slate-200">{currentDisplayName}</span>
        <ChevronDown className="w-4 h-4 text-slate-500 group-hover:rotate-180 transition-transform" />
      </button>

      <div className="absolute top-full left-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all z-50 overflow-hidden">
        {views.map((view) => (
          <button
            key={view.name}
            onClick={() => onViewChange(view.name)}
            className={`w-full text-left px-4 py-3 text-sm hover:bg-slate-700 transition-colors ${currentView === view.name ? 'text-cyan-400 bg-slate-700/50' : 'text-slate-400'
              }`}
          >
            {view.displayName}
          </button>
        ))}
      </div>
    </div>
  );
};
