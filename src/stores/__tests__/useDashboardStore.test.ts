/**
 * @jest-environment jsdom
 */
import { act, renderHook } from '@testing-library/react';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { WidgetType } from '@/types/dashboard-config';

describe('useDashboardStore', () => {
  beforeEach(() => {
    act(() => {
      useDashboardStore.getState().reset();
    });
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useDashboardStore());
    expect(result.current.activeDashboard).toBeNull();
    expect(result.current.isEditing).toBe(false);
    expect(result.current.unsavedChanges).toBe(false);
  });

  it('should set the active dashboard', () => {
    const { result } = renderHook(() => useDashboardStore());
    const mockDashboard = {
      id: 'test-db',
      name: 'Test',
      layout: {},
      widgets: []
    };

    act(() => {
      result.current.setDashboard(mockDashboard as any);
    });

    expect(result.current.activeDashboard).toEqual(mockDashboard);
  });

  it('should toggle editing mode', () => {
    const { result } = renderHook(() => useDashboardStore());

    act(() => {
      result.current.toggleEditing(true);
    });
    expect(result.current.isEditing).toBe(true);

    act(() => {
      result.current.toggleEditing(false);
    });
    expect(result.current.isEditing).toBe(false);
  });

  it('should update widget layout and set unsavedChanges', () => {
    const { result } = renderHook(() => useDashboardStore());
    const mockDashboard = {
      id: 'test-db',
      name: 'Test',
      layout: {},
      widgets: [
        { id: 'w1', type: WidgetType.STAT_CARD, layout: { col: 1, row: 1, colSpan: 1, rowSpan: 1 } }
      ]
    };

    act(() => {
      result.current.setDashboard(mockDashboard as any);
    });

    act(() => {
      result.current.updateWidgetLayout('w1', { col: 2, row: 2, colSpan: 2, rowSpan: 2 });
    });

    expect(result.current.activeDashboard?.widgets[0].layout).toEqual({
      col: 2, row: 2, colSpan: 2, rowSpan: 2
    });
    expect(result.current.unsavedChanges).toBe(true);
  });
});
