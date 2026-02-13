/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DashboardToolbar } from '../DashboardToolbar';
import { useDashboardStore } from '@/stores/useDashboardStore';

jest.mock('@/stores/useDashboardStore');

describe('DashboardToolbar', () => {
  const mockStore = {
    isEditing: false,
    unsavedChanges: false,
    toggleEditing: jest.fn(),
    activeDashboard: { id: 'test-db', name: 'Test' },
  };

  beforeEach(() => {
    (useDashboardStore as unknown as jest.Mock).mockReturnValue(mockStore);
  });

  it('renders "Edit" button when not editing', () => {
    render(<DashboardToolbar />);
    expect(screen.getByText('编辑')).toBeInTheDocument();
  });

  it('renders "Save" and "Cancel" when editing', () => {
    (useDashboardStore as unknown as jest.Mock).mockReturnValue({
      ...mockStore,
      isEditing: true
    });
    render(<DashboardToolbar />);
    expect(screen.getByText('保存')).toBeInTheDocument();
    expect(screen.getByText('取消')).toBeInTheDocument();
  });

  it('calls toggleEditing when Edit button is clicked', () => {
    render(<DashboardToolbar />);
    fireEvent.click(screen.getByText('编辑'));
    expect(mockStore.toggleEditing).toHaveBeenCalledWith(true);
  });
});
