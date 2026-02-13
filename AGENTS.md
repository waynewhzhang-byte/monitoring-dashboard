# AGENTS

This file provides guidelines for AI agents working in this repository.

## Build / Lint / Test Commands

```bash
# Development
npm run dev                    # Start development server (http://localhost:3000)
npm run collector              # Start data collector service (separate terminal)

# Build & Type Check
npm run build                  # Build for production
npm run type-check             # Run TypeScript type checking (tsc --noEmit)
npm run lint                   # Run ESLint

# Database
npm run db:generate            # Generate Prisma client
npm run db:push                # Push schema to database
npm run db:migrate             # Run database migrations
npm run db:seed                # Seed database
npm run db:studio              # Open Prisma Studio

# Testing
npm run test                   # Run Jest tests
npm run test:watch             # Run Jest in watch mode
npm run test:coverage          # Run Jest with coverage report

# Formatting
npm run format                 # Format code with Prettier
npm run format:check           # Check formatting (no changes)

# Single Test File
npm run test -- path/to/test-file.test.ts
npm run test -- --testNamePattern="test name"
```

## Code Style Guidelines

### TypeScript

- Strict mode enabled. Never use `any`, `@ts-ignore`, or type assertions to bypass types.
- Always define explicit types for function parameters and return values.
- Use interfaces for object shapes, types for unions/primitives.
- Use `async/await` over raw promises. Use `Promise.all()` for parallel operations.

### Imports

- Use path aliases: `import X from '@/components/X'`
- Group imports: React/Node → Third-party → Internal → Relative
- Avoid default exports for components (named exports preferred).

### Naming Conventions

- Files: `kebab-case.ts` (components: `PascalCase.tsx`)
- Functions/Variables: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- Types/Interfaces: `PascalCase`
- Components: `PascalCase`
- Database fields: `snake_case` (via Prisma `@map`)

### Error Handling

- Never use empty catch blocks: `catch (e) {}` is forbidden.
- Use structured logging with `logger.error()` (winston).
- Always log errors with context before rethrowing or handling.
- Create custom error classes for domain-specific errors.

### Component Patterns

```typescript
// Functional components with explicit props interface
interface Props {
  title: string;
  data: Device[];
  onSelect: (device: Device) => void;
}

export function DeviceList({ title, data, onSelect }: Props) {
  // Component logic
}
```

### Database (Prisma)

- Use soft deletes (`deletedAt`) instead of hard deletes.
- Always use `select` to fetch only needed fields in queries.
- Use `skipDuplicates: true` in `createMany` to avoid errors.
- Prefix non-standard fields with `@map("snake_case")`.

### API Design

- RESTful endpoints: `/api/devices`, `/api/devices/[id]`
- Actions use verbs: `/api/devices/sync`, `/api/alarms/acknowledge`
- Use Zod for request validation.

### Styling

- Tailwind CSS with custom theme colors (`primary`, `bg-dark`, `card-bg`).
- Avoid inline styles; use utility classes.
- Use `clsx` or `tailwind-merge` for conditional classes.

### State Management

- Use Zustand stores: `create<StoreState>((set) => ({ ... }))`
- Keep business logic out of components; put in services/hooks.

## Project Structure

```
src/
├── app/              # Next.js App Router pages
├── pages/            # Next.js Pages Router (legacy)
├── components/       # React components
│   ├── dashboard/    # Dashboard-specific components
│   ├── domain/       # Domain components (devices, alarms, topology)
│   ├── topology/     # Topology visualization
│   ├── widgets/      # Reusable widgets
│   └── ui/           # Base UI components (shadcn/ui)
├── services/         # Business logic layer
│   ├── collector/    # Data collection service
│   ├── opmanager/    # OpManager API client
│   └── broadcast/    # SSE broadcast service
├── lib/              # Utilities and configurations
├── types/            # TypeScript type definitions
├── stores/           # Zustand state stores
├── hooks/            # Custom React hooks
└── config/           # Configuration files
```

## Key Technologies

- Next.js 14, React 18, TypeScript 5
- Tailwind CSS, Zustand, Prisma, PostgreSQL, Redis
- Recharts, React Flow/Sigma.js, Socket.io/SSE
