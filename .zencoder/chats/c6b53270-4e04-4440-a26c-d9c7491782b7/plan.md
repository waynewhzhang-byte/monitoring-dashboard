# Spec and build

## Agent Instructions

Ask the user questions when anything is unclear or needs their input. This includes:

- Ambiguous or incomplete requirements
- Technical decisions that affect architecture or user experience
- Trade-offs that require business context

Do not make assumptions on important decisions — get clarification first.

---

## Workflow Steps

### [x] Step: Technical Specification

Assess the task's difficulty, as underestimating it leads to poor outcomes.

- easy: Straightforward implementation, trivial bug fix or feature
- medium: Moderate complexity, some edge cases or caveats to consider
- hard: Complex logic, many caveats, architectural considerations, or high-risk changes

Create a technical specification for the task that is appropriate for the complexity level:

- Review the existing codebase architecture and identify reusable components.
- Define the implementation approach based on established patterns in the project.
- Identify all source code files that will be created or modified.
- Define any necessary data model, API, or interface changes.
- Describe verification steps using the project's test and lint commands.

Save the output to `/Users/Zhuanz/monitoring-dashboard/.zencoder/chats/c6b53270-4e04-4440-a26c-d9c7491782b7/spec.md` with:

- Technical context (language, dependencies)
- Implementation approach
- Source code structure changes
- Data model / API / interface changes
- Verification approach

If the task is complex enough, create a detailed implementation plan based on `/Users/Zhuanz/monitoring-dashboard/.zencoder/chats/c6b53270-4e04-4440-a26c-d9c7491782b7/spec.md`:

- Break down the work into concrete tasks (incrementable, testable milestones)
- Each task should reference relevant contracts and include verification steps
- Replace the Implementation step below with the planned tasks

Rule of thumb for step size: each step should represent a coherent unit of work (e.g., implement a component, add an API endpoint, write tests for a module). Avoid steps that are too granular (single function).

Save to `/Users/Zhuanz/monitoring-dashboard/.zencoder/chats/c6b53270-4e04-4440-a26c-d9c7491782b7/plan.md`. If the feature is trivial and doesn't warrant this breakdown, keep the Implementation step below as is.

**Stop here.** Present the specification (and plan, if created) to the user and wait for their confirmation before proceeding.

---

### [ ] Step: Implementation

#### Phase 1: Frontend Deletion & Cleanup
1. [x] **Delete Unrelated Pages**:
    - Remove `src/pages/alarms/`, `src/pages/devices/`, `src/pages/dashboards/`.
    - Remove `src/app/admin/devices/`, `src/app/admin/interfaces/`, `src/app/admin/page.tsx`.
    - Verification: `npm run build` (will likely fail due to imports, which is expected).
2. [x] **Prune Dashboard & Components**:
    - Simplify `src/app/dashboard/page.tsx` to focus on `ReactFlowTopologyViewer`.
    - Remove unrelated widgets from `src/components/dashboard/` and `src/components/domain/`.
    - Update `src/components/layout/MainLayout.tsx` and `src/app/admin/layout.tsx` navigation.
    - Verification: `npm run lint` and check for missing component errors.

#### Phase 2: Backend Pruning & Refactoring
3. [x] **Cleanup Services & Collectors**:
    - Remove `src/services/alarm/` and `src/services/analytics/`.
    - Delete `src/services/collector/alarm.ts`, `interface.ts`, `interface-traffic.ts`.
    - Verification: Ensure `src/services/collector/start.ts` no longer imports these.
4. [x] **Update Collector Logic**:
    - Refactor `src/services/collector/start.ts` to only run topology and refined metric/device sync.
    - Update `MetricCollector` (`src/services/collector/metric.ts`) to only target devices found in `TopologyNode` table.
    - Verification: Run `npm run collector` and check logs for focused sync.

#### Phase 3: API Route Cleanup
5. [x] **Prune API Routes**:
    - Remove non-topology routes from `src/pages/api/` and `src/app/api/`.
    - Keep essential routes: `/api/topology/*`, `/api/admin/views`, `/api/admin/business-views`, `/api/health`, `/api/data-source`.
    - Verification: `npm run type-check` to ensure no broken API references.

#### Phase 4: Final Verification & Polish
6. [ ] **Final Build & Lint**:
    - Run `npm run build` and `npm run lint`.
    - Fix any remaining type errors or broken references.
7. [ ] **Manual Functional Test**:
    - Verify Business Topology sync and display works end-to-end.
    - Verification: Dashboard shows nodes/edges with status and traffic.

