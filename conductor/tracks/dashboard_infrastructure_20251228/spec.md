# Track Spec: Implement Enhanced Custom Dashboard Infrastructure

## Overview
This track focuses on building a robust, flexible infrastructure for creating and managing custom dashboards. It transitions the current static dashboard rendering into a dynamic, state-driven system with persistence capabilities.

## Objectives
- Implement a centralized DashboardStore using Zustand for layout management.
- Develop a persistence layer (API + Database) for dashboard configurations.
- Create an "Edit Mode" for the dashboard with drag-and-drop and resizing capabilities.
- Standardize the Widget Registry to simplify adding new widget types.

## Technical Details

### 1. Data Schema (Zod)
Define a formal schema for DashboardConfig, WidgetConfig, and LayoutConfig in src/types/dashboard-config.ts.
- DashboardConfig: Contains metadata (name, id), theme, and a list of widgets.
- WidgetConfig: Type, title, data source, and layout parameters (x, y, w, h).

### 2. Dashboard Store (Zustand)
Create src/stores/useDashboardStore.ts:
- State: ctiveDashboard, isEditing, unsavedChanges.
- Actions: updateLayout, ddWidget, emoveWidget, saveDashboard, loadDashboard.

### 3. Persistence Layer
- **API:** POST /api/dashboards (save), GET /api/dashboards/[id] (load).
- **Prisma Schema:** Add a Dashboard model to schema.prisma.

### 4. Interactive Layout
- Integrate eact-grid-layout for the frontend "Edit Mode".
- Replace CSS Grid logic in DashboardRenderer with the layout library when editable is true.

## Success Criteria
- Users can enter "Edit Mode" on a dashboard.
- Users can move and resize widgets in Edit Mode.
- Changes to the layout can be saved to the database and persist across sessions.
- A new widget can be added to the registry with minimal code changes.
