import { 
  WidgetType, 
  DataSourceConfigSchema, 
  WidgetLayoutSchema, 
  WidgetConfigSchema, 
  DashboardLayoutSchema, 
  DashboardThemeSchema, 
  DashboardConfigSchema 
} from '@/types/dashboard-config';

describe('Dashboard Config Schemas', () => {
  describe('DataSourceConfigSchema', () => {
    it('should validate a valid data source config', () => {
      const validConfig = {
        endpoint: '/api/data',
        method: 'GET',
        refreshInterval: 5000,
        realtime: true
      };
      const result = DataSourceConfigSchema.safeParse(validConfig);
      expect(result.success).toBe(true);
    });

    it('should fail if endpoint is missing', () => {
      const invalidConfig = {
        method: 'GET'
      };
      const result = DataSourceConfigSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
    });
  });

  describe('WidgetLayoutSchema', () => {
    it('should validate a valid widget layout', () => {
      const validLayout = {
        col: 1,
        row: 1,
        colSpan: 4,
        rowSpan: 4
      };
      const result = WidgetLayoutSchema.safeParse(validLayout);
      expect(result.success).toBe(true);
    });
  });

  describe('WidgetConfigSchema', () => {
    it('should validate a valid widget config', () => {
      const validWidget = {
        id: 'widget-1',
        type: WidgetType.STAT_CARD,
        title: 'Total Devices',
        layout: {
          col: 1,
          row: 1,
          colSpan: 4,
          rowSpan: 2
        }
      };
      const result = WidgetConfigSchema.safeParse(validWidget);
      expect(result.success).toBe(true);
    });
  });

  describe('DashboardConfigSchema', () => {
    it('should validate a full dashboard config', () => {
      const validDashboard = {
        id: 'dashboard-1',
        name: 'Main Dashboard',
        layout: {
          columns: 24,
          rowHeight: 80,
          gap: 16
        },
        widgets: [
          {
            id: 'widget-1',
            type: WidgetType.STAT_CARD,
            layout: { col: 1, row: 1, colSpan: 6, rowSpan: 4 }
          }
        ]
      };
      const result = DashboardConfigSchema.safeParse(validDashboard);
      expect(result.success).toBe(true);
    });
  });
});
