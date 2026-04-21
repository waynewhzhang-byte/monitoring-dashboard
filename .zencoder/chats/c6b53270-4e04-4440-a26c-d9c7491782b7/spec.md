# Technical Specification - Business Topology Focus Refactoring

## 1. Technical Context
The project is a Next.js 14 application (Hybrid Pages/App router) that integrates with ManageEngine OpManager. It currently monitors devices, interfaces, alarms, and business views. The goal is to strip everything except the **Business Topology Synchronization and Visualization**.

## 2. Implementation Approach

### 2.1 Cleanup Phase (Deletion)
We will remove all files and code paths that are not essential for the business topology feature.

#### Removed Pages & Components:
- **Standalone Pages**: `src/pages/alarms/`, `src/pages/devices/`, `src/pages/dashboards/`.
- **Admin Pages**: `src/app/admin/devices/`, `src/app/admin/interfaces/`, `src/app/admin/page.tsx` (Dashboard overview).
- **Dashboard Widgets**: All widgets in `src/components/dashboard/` except those supporting topology selection.
- **Domain Components**: `AlarmList`, `AlarmRollingList`, `DeviceList`.
- **Legacy Configs**: Unused dashboard configurations in `src/config/dashboards/`.

#### Removed Services & Collectors:
- **Collectors**: `src/services/collector/alarm.ts`, `src/services/collector/interface.ts`, `src/services/collector/interface-traffic.ts`.
- **Services**: `src/services/alarm/`, `src/services/analytics/`.

#### Removed API Routes:
- Most routes in `src/pages/api/alarms/`, `src/pages/api/devices/`, `src/pages/api/interfaces/`, `src/pages/api/metrics/`, `src/pages/api/stats/`, `src/pages/api/traffic/`.

### 2.2 Refactoring Phase (Modification)

#### Core Topology Logic:
- **TopologyCollector**: Keep as the primary data orchestrator.
- **MetricCollector**: Refactor to only collect status/metrics for devices present in `TopologyNode` table.
- **DeviceCollector**: Keep but ensure it only serves to support topology nodes.

#### Main Dashboard (`src/app/dashboard/page.tsx`):
- Simplify the layout to show ONLY the Business Topology view.
- Remove tabs (Overview, Servers, Network).
- Remove sidebar widgets (Donuts, Alarms, etc.).

#### Navigation & Layout:
- Update `MainLayout` and `admin/layout.tsx` to only link to "Topology Management" and "Dashboard".

### 2.3 Data Model Changes
- No immediate schema changes are strictly required, but `Alarm` and `Dashboard` models will be deprecated and can be removed in a follow-up phase.

## 3. Source Code Structure Changes

### Keep:
- `src/services/collector/topology.ts`, `metric.ts`, `device.ts`, `start.ts`.
- `src/app/api/topology/`, `src/pages/api/admin/views.ts`, `src/pages/api/admin/business-views.ts`.
- `src/components/topology/`, `src/components/domain/TopologyViewer.tsx`.
- `src/pages/topology/index.tsx` (Main visualization entry).
- `src/lib/` (Prisma, Redis, Logger, etc.).

### Remove:
- `src/pages/alarms/*`
- `src/pages/devices/*`
- `src/pages/dashboards/*`
- `src/app/admin/devices/*`
- `src/app/admin/interfaces/*`
- `src/services/alarm/*`
- `src/services/analytics/*`
- `src/components/dashboard/*` (except ViewSelector or similar)
- `src/components/widgets/*` (except MultiServerHistoryChart if used in topology details)

## 4. Verification Approach

### 4.1 Automated Checks
- `npm run build`: Ensure no broken imports or missing types.
- `npm run lint`: Ensure no references to deleted components.
- `npm run type-check`: Full TypeScript validation.

### 4.2 Manual Verification
- **Sync**: Run `npm run collector` and verify Business View data is fetched from OpManager.
- **Visualization**: Open `/dashboard` or `/topology` and verify nodes/edges are displayed with correct status/traffic.
- **Navigation**: Verify only topology-related links are available.
