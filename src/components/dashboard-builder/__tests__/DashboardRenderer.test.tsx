/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { DashboardRenderer } from '../DashboardRenderer';
import { useDashboardStore } from '../../../stores/useDashboardStore';
import { WidgetType } from '../../../types/dashboard-config';

jest.mock('../../../stores/useDashboardStore');
jest.mock('../WidgetRenderer', () => ({
  WidgetRenderer: () => <div data-testid="widget-renderer" />
}));

jest.mock('react-grid-layout', () => ({
  Responsive: ({ children }: any) => <div data-testid="responsive-grid-layout">{children}</div>,
  WidthProvider: (cmp: any) => cmp,
}));

describe('DashboardRenderer', () => {
  const mockDashboard = {
    id: 'test-db',
    name: 'Test Dashboard',
    layout: { columns: 24, rowHeight: 80, gap: 16 },
    widgets: [
      { id: 'w1', type: WidgetType.STAT_CARD, layout: { col: 1, row: 1, colSpan: 6, rowSpan: 4 } }
    ]
  };

  it('renders from store if config prop is not provided', () => {
    (useDashboardStore as unknown as jest.Mock).mockReturnValue({
      activeDashboard: mockDashboard,
      isEditing: false
    });

    // @ts-ignore - testing optional config integration
    render(<DashboardRenderer />);
    
    expect(screen.getByTestId('widget-renderer')).toBeInTheDocument();
  });

  it('renders from config prop if provided', () => {
    const propConfig = {
      ...mockDashboard,
      name: 'Prop Dashboard'
    };

    (useDashboardStore as unknown as jest.Mock).mockReturnValue({
      activeDashboard: null,
      isEditing: false
    });

    render(<DashboardRenderer config={propConfig} />);
    
    // Check if it renders
    expect(document.querySelector('.dashboard-container')).toBeInTheDocument();
  });

  it('uses ResponsiveGridLayout when in editing mode', () => {
    (useDashboardStore as unknown as jest.Mock).mockReturnValue({
      activeDashboard: mockDashboard,
      isEditing: true
    });

    render(<DashboardRenderer />);
    
    expect(screen.getByTestId('responsive-grid-layout')).toBeInTheDocument();
  });
});
