import { create } from 'zustand';
import { DashboardConfig, WidgetLayout } from '../types/dashboard-config';

interface DashboardState {
  activeDashboard: DashboardConfig | null;
  isEditing: boolean;
  unsavedChanges: boolean;

  // Actions
  setDashboard: (dashboard: DashboardConfig) => void;
  toggleEditing: (isEditing: boolean) => void;
  updateWidgetLayout: (widgetId: string, layout: WidgetLayout) => void;
  reset: () => void;
}

const initialState = {
  activeDashboard: null,
  isEditing: false,
  unsavedChanges: false,
};

export const useDashboardStore = create<DashboardState>((set) => ({
  ...initialState,

  setDashboard: (dashboard) => set({ 
    activeDashboard: dashboard,
    unsavedChanges: false 
  }),

  toggleEditing: (isEditing) => set({ isEditing }),

  updateWidgetLayout: (widgetId, layout) => set((state) => {
    if (!state.activeDashboard) return state;

    const updatedWidgets = state.activeDashboard.widgets.map((w) =>
      w.id === widgetId ? { ...w, layout } : w
    );

    return {
      activeDashboard: {
        ...state.activeDashboard,
        widgets: updatedWidgets,
      },
      unsavedChanges: true,
    };
  }),

  reset: () => set(initialState),
}));
