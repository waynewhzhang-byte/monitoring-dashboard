# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Enterprise network monitoring dashboard integrating ManageEngine OpManager API for real-time device monitoring, alarm management, and network topology visualization. Built with Next.js 14 (mixed Pages Router + App Router), TypeScript, PostgreSQL, Redis, and Socket.io.

## Commands

```bash
# Development
npm run dev              # Next.js dev + 数据采集器（拓扑等）同一进程树启动
npm run dev:next         # 仅 Next.js（不调采集器）
npm run build            # Production build (standalone output + static copy)
npm run start            # Start production (Next.js server + collector)
npm run collector        # Start data collector only (connects to real OpManager)
npm run mock-collector   # Start mock collector (no OpManager needed)
npm run lint             # ESLint
npm run type-check       # tsc --noEmit

# Database (Prisma + PostgreSQL)
npm run db:generate      # Generate Prisma Client
npm run db:push          # Push schema to DB (no migration files)
npm run db:migrate       # Create and apply migration
npm run db:seed          # Seed data
npm run db:studio        # Prisma Studio GUI

# Testing (Jest + jsdom)
npm run test                              # Run all tests
npm run test -- path/to/file.test.ts      # Single test file
npm run test -- --testNamePattern="name"  # Filter by test name
npm run test:watch                        # Watch mode
npm run test:coverage                     # Coverage report

# Formatting
npm run format           # Prettier write
npm run format:check     # Prettier check

# Diagnostics (for production/integration debugging)
npm run diagnose:display       # Full dashboard display diagnosis
npm run verify:data-flow       # End-to-end: OpManager → DB → API
npm run verify:opmanager-apis  # Verify all OpManager API endpoints
npm run check:all              # Check all sync statuses
```

## Architecture

### Data Flow

```
OpManager REST API → Collectors (setInterval) → PostgreSQL + Redis → API Routes → Socket.io → React (Zustand)
```

### Hybrid Routing

The app uses **both** Next.js routing systems simultaneously:
- **Pages Router** (`src/pages/`): All existing API routes (`src/pages/api/`) and page views (`dashboards/`, `topology/`)
- **App Router** (`src/app/`): Newer features — admin panel (`app/admin/`), new dashboard views (`app/dashboard/`), newer API routes (`app/api/`)

API routes exist in both routers. The Pages Router routes under `src/pages/api/` are the primary API.

### Collector System

The collector (`src/services/collector/start.ts`) runs as a **separate long-lived process** alongside the Next.js server. It uses `setInterval` (not node-cron) with overlap guards:
- **Automatic (scheduled)**: metrics, alarms, topology/business-views, interface traffic
- **Manual only**: device sync and interface sync — triggered via `/api/devices/sync`, `/api/interfaces/sync`, or admin panel buttons

Intervals are configured via environment variables (see `src/lib/env.ts`). Defaults: metrics 1200s, alarms 120s, topology 1200s.

Each topology sync logs: `[TopologyCollector] OpManager getBVDetails("<name>") → deviceProperties=N, linkProperties=M` (plus a sample node/link when counts are non-zero). **`BusinessViewConfig.name` must match OpManager `bvName` exactly** (e.g. `TEST1`, `TEST2`). To upsert those two rows: `npm run bv:ensure-TEST1-TEST2`. To confirm OPM returns data **without writing the DB**: `npm run verify:opm-topology`. After `POST /api/topology/sync`, the JSON includes **`opm`** (`responded`, `devicePropertiesCount`, `linkPropertiesCount`, optional `error`) alongside **`nodes`/`edges`** written to Prisma.

### Two TypeScript Configs

- `tsconfig.json` — Next.js app compilation
- `tsconfig.node.json` — extends tsconfig.json with `CommonJS` module for scripts and collector. Uses `ts-node -r tsconfig-paths/register --project tsconfig.node.json` to run

### Environment Validation

All env vars are validated at startup using Zod in `src/lib/env.ts`. Required: `DATABASE_URL`, `OPMANAGER_BASE_URL`, `OPMANAGER_API_KEY`. Redis is optional. Import as `import { env } from '@/lib/env'`.

### Real-time Communication

Socket.io WebSocket (not SSE). Server broadcasts collector updates; clients subscribe via Zustand store. Redis Adapter supports multi-instance scaling.

### Key Singletons

- `src/lib/prisma.ts` — Prisma Client singleton
- `src/lib/redis.ts` — ioredis singleton (graceful degradation if Redis unavailable)
- `src/lib/logger.ts` — Winston logger

## Code Conventions

### Imports

Use path alias `@/` mapping to `src/`: `import { env } from '@/lib/env'`

Group order: React/Node → third-party → internal (`@/`) → relative

### Naming

- Files: `kebab-case.ts`, components: `PascalCase.tsx`
- Functions/vars: `camelCase`, constants: `UPPER_SNAKE_CASE`
- Types/interfaces: `PascalCase`
- DB fields: `snake_case` via Prisma `@map`

### Components

Named exports preferred over default exports. Pattern: container components fetch data (Zustand/hooks), presentational components receive props.

### Database

- Always use `select` to fetch only needed fields
- Use `skipDuplicates: true` in `createMany`
- `opmanagerId` (String, unique) links internal records to OpManager entities
- `isMonitored` flag on Device and Interface controls what gets collected/displayed
- `tags` field (String[]) on Device for grouping/filtering

### Error Handling

Use `logger.error()` with context. In collectors, catch errors per-item to avoid aborting entire collection runs.

### Styling

Tailwind CSS with custom theme tokens (`primary`, `bg-dark`, `card-bg`). Use `clsx` or `tailwind-merge` for conditional classes. shadcn/ui components in `src/components/ui/`.

### State Management

Zustand stores in `src/stores/`. Dashboard state: `useDashboardStore.ts`.

## Key Extension Points

### Adding a Widget Type

1. Define type in `src/types/dashboard-config.ts`
2. Create component in `src/components/widgets/`
3. Register in `src/components/dashboard-builder/WidgetRenderer.tsx`
4. Add data fetching in `src/hooks/useWidgetData.ts`

### Adding a Collector

1. Create `src/services/collector/xxx.ts`
2. Wire it into `src/services/collector/start.ts` with interval + overlap guard
3. Consider Redis cache invalidation if applicable

### OpManager API Integration

`src/services/opmanager/client.ts` wraps all OpManager REST calls. Response structures are inconsistent — `data-mapper.ts` normalizes them to internal types. When debugging: `npm run verify:opmanager-apis`.

## Testing

Tests live in `src/**/__tests__/` directories. Jest config: `ts-jest` preset, `jsdom` environment, `@/` path alias mapped. CSS modules mocked via `identity-obj-proxy`.

## Build

`next.config.js` uses `output: 'standalone'` for deployment. Build script also runs `scripts/copy-standalone-static.js` to copy static assets into the standalone output.
