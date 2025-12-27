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
});
