'use client';

import React, { useEffect, useState } from 'react';

const PREFIX_BV = 'bv:';
const PREFIX_TAG = 'tag:';

interface BusinessViewOption {
  name: string;
  displayName: string;
}

interface DeviceTagSelectorProps {
  selectedTag: string;
  onTagChange: (tag: string) => void;
  defaultLabel?: string;
}

export const DeviceTagSelector: React.FC<DeviceTagSelectorProps> = ({
  selectedTag,
  onTagChange,
  defaultLabel = '全部',
}) => {
  const [businessViews, setBusinessViews] = useState<BusinessViewOption[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOptions = async () => {
      let views: BusinessViewOption[] = [];
      try {
        // 优先使用大屏专用接口（仅返回 isActive: true 的视图）
        const viewsRes = await fetch('/api/dashboard/business-views', { cache: 'no-store' });
        const viewsData = await viewsRes.json();
        if (viewsRes.ok && Array.isArray(viewsData?.views)) {
          views = viewsData.views;
        } else {
          views = [];
        }
        // 若未返回任何业务视图，回退到管理端接口（与「业务视图分组」左侧面板同源）
        if (views.length === 0) {
          const adminRes = await fetch('/api/admin/views', { cache: 'no-store' });
          const adminList = await adminRes.json();
          if (adminRes.ok && Array.isArray(adminList)) {
            views = adminList
              .filter((v: { isActive?: boolean }) => v.isActive !== false)
              .map((v: { name: string; displayName?: string | null }) => ({
                name: v.name,
                displayName: v.displayName ?? v.name,
              }));
          }
        }
        setBusinessViews(views);
      } catch (error) {
        console.error('Failed to fetch business views:', error);
        // 失败时尝试仅拉取管理端视图
        try {
          const adminRes = await fetch('/api/admin/views', { cache: 'no-store' });
          const adminList = await adminRes.json();
          if (adminRes.ok && Array.isArray(adminList)) {
            views = adminList
              .filter((v: { isActive?: boolean }) => v.isActive !== false)
              .map((v: { name: string; displayName?: string | null }) => ({
                name: v.name,
                displayName: v.displayName ?? v.name,
              }));
            setBusinessViews(views);
          }
        } catch (fallbackError) {
          console.error('Fallback fetch admin/views failed:', fallbackError);
        }
      }

      try {
        const tagsRes = await fetch('/api/devices/tags', { cache: 'no-store' });
        const tagsData = await tagsRes.json();
        setTags(tagsRes.ok && Array.isArray(tagsData?.tags) ? tagsData.tags : []);
      } catch (error) {
        console.error('Failed to fetch device tags:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOptions();
  }, []);

  const hasOptions = businessViews.length > 0 || tags.length > 0;

  if (loading) {
    return (
      <div className="relative z-[100]">
        <select
          disabled
          className="bg-slate-900/80 border border-white/10 rounded px-2 py-1 text-[9px] font-bold text-slate-600 uppercase tracking-wider cursor-not-allowed"
        >
          <option>加载中...</option>
        </select>
      </div>
    );
  }

  return (
    <div className="relative z-[100]">
      <select
        value={selectedTag}
        onChange={(e) => onTagChange(e.target.value)}
        className="bg-slate-900/80 border border-white/10 rounded px-2 py-1 text-[9px] font-bold text-cyan-400 uppercase tracking-wider focus:outline-none focus:border-cyan-500/50 transition-all hover:border-cyan-500/30"
      >
        <option value="" className="bg-slate-900">
          {defaultLabel}
        </option>
        {businessViews.length > 0 && (
          <optgroup label="业务视图" className="bg-slate-900">
            {businessViews.map((v) => (
              <option key={v.name} value={`${PREFIX_BV}${v.name}`} className="bg-slate-900">
                {v.displayName || v.name}
              </option>
            ))}
          </optgroup>
        )}
        {tags.length > 0 && (
          <optgroup label="标签" className="bg-slate-900">
            {tags.map((tag) => (
              <option key={tag} value={`${PREFIX_TAG}${tag}`} className="bg-slate-900">
                {tag}
              </option>
            ))}
          </optgroup>
        )}
        {!hasOptions && (
          <option disabled className="bg-slate-900 text-slate-500">
            （暂无可选业务视图或标签）
          </option>
        )}
      </select>
    </div>
  );
};

/** 判断当前选中是否为业务视图（value 以 bv: 开头） */
export function isBusinessViewSelected(selectedTag: string): boolean {
  return selectedTag.startsWith(PREFIX_BV);
}

/** 从选中值解析业务视图名称，非 bv: 时返回 undefined */
export function getSelectedBusinessViewName(selectedTag: string): string | undefined {
  if (!selectedTag.startsWith(PREFIX_BV)) return undefined;
  return selectedTag.slice(PREFIX_BV.length) || undefined;
}

/** 从选中值解析标签，非 tag: 时返回 undefined */
export function getSelectedTag(selectedTag: string): string | undefined {
  if (!selectedTag.startsWith(PREFIX_TAG)) return undefined;
  return selectedTag.slice(PREFIX_TAG.length) || undefined;
}
