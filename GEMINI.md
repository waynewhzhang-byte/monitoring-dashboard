# GEMINI.md - Project Guidelines

## Project Overview
**Smart Monitoring Dashboard** is an enterprise-grade network monitoring platform built with **Next.js 14**, **Prisma**, **Redis**, and **Socket.io**. It integrates with **ManageEngine OpManager** to provide real-time infrastructure health visibility, interactive network topologies, and customizable performance dashboards.

### Core Architecture
- **Frontend:** Next.js (App Router), Tailwind CSS, Framer Motion, React Flow (Topology), Recharts (Charts).
- **Backend:** Next.js API Routes, Socket.io (Real-time updates).
- **Services:** Dedicated Node.js collector service for OpManager data synchronization.
- **Data Persistence:** Prisma ORM with PostgreSQL.
- **Caching & Messaging:** Redis for real-time indicators and Pub/Sub events.

---

## Building and Running

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis 7+
- Docker (optional, for dependencies)

### Development Commands
| Command | Description |
|---------|-------------|
| `npm run dev` | Starts Next.js dev server and the OpManager collector together. |
| `npm run dev:next` | Next.js development server only (no collector). |
| `npm run dev:all` | Same as `npm run dev` (alias). |
| `npm run collector` | Collector only (e.g. when Next is already running via `dev:next`). |
| `npm run db:push` | Pushes the Prisma schema to the database. |
| `npm run db:generate` | Generates the Prisma Client. |
| `npm run db:seed` | Seeds the database with initial data. |
| `npm run lint` | Runs ESLint for code quality checks. |
| `npm run type-check` | Runs TypeScript compiler checks. |

### Diagnostics
The project includes a robust set of diagnostic tools for troubleshooting:
- `npm run diagnose:display`: Full stack diagnosis for dashboard display issues.
- `npm run diagnose:opmanager`: Verifies OpManager API connectivity and data.
- `npm run verify:data-flow`: Validates the complete data flow from OpManager to the UI.

---

## Development Conventions

### Coding Style
- **TypeScript:** Strictly typed. Use `src/types/` for shared interfaces.
- **Framework:** Prefer Next.js App Router for new pages.
- **Styling:** Use Tailwind CSS utility classes.
- **State Management:** Use Zustand for global client-side state.
- **Real-time:** Use the `realtime` service and Socket.io hooks for live updates.

### Git & Commits
Follow the established commit message pattern:
- `feat(scope): Description`
- `fix(scope): Description`
- `chore: Description`
- `conductor(plan): ...` (for track updates)

### Testing
- **Framework:** Jest with React Testing Library.
- **Run Tests:** `npm test`
- **Coverage:** `npm run test:coverage`

---

## Key Files & Directories
- `src/app/`: Next.js App Router pages and API routes.
- `src/services/`: Core business logic (OpManager client, collector, realtime).
- `src/components/`: Reusable React components (dashboard, topology, ui).
- `prisma/schema.prisma`: Definitive database model.
- `conductor/`: Project management, workflow, and metadata.
- `REQUIRED-VS-OPTIONAL.md`: Essential reading for environment setup.

---

## Onboarding
If you are new to the project, start by reading:
1. `REQUIRED-VS-OPTIONAL.md` - For configuration priorities.
2. `COMPLETE-SETUP-GUIDE.md` - For end-to-end integration details.
3. `DATA-FLOW-DIAGRAM.md` - To understand the system architecture visually.
