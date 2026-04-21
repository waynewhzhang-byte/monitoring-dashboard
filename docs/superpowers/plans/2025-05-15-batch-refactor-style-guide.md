# Batch Refactor: Style Guide Alignment

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor `src/` directory to align with strict style guides: remove redundant default exports, standardize quotes to single, ensure semicolon consistency, and reduce `any` usage in `src/services/` and `src/lib/`.

**Architecture:** Surgical refactoring of files in logical batches. Prioritizing `src/services/`, `src/lib/`, and `src/components/`.

**Tech Stack:** TypeScript, Next.js.

---

### Task 1: Refactor `any` in `src/lib/` and `src/services/`

**Files:**
- Modify: `src/lib/redis.ts`
- Modify: `src/services/collector/metric.ts`
- Modify: `src/services/collector/device.ts`
- Modify: `src/services/opmanager/client.ts`
- Modify: `src/services/opmanager/data-collector.ts`
- Modify: `src/services/collector/topology.ts`
- Modify: `src/services/mock/opmanager-mock-data.ts`

- [ ] **Step 1: Replace `any` with `unknown` or specific types in `src/lib/redis.ts`**
- [ ] **Step 2: Replace `any` with `unknown` or specific types in `src/services/collector/metric.ts`**
- [ ] **Step 3: Replace `any` with `unknown` or specific types in `src/services/collector/device.ts`**
- [ ] **Step 4: Replace `any` with `unknown` or specific types in `src/services/opmanager/client.ts`**
- [ ] **Step 5: Replace `any` with `unknown` or specific types in `src/services/opmanager/data-collector.ts`**
- [ ] **Step 6: Replace `any` with `unknown` or specific types in `src/services/collector/topology.ts`**
- [ ] **Step 7: Replace `any` with `unknown` or specific types in `src/services/mock/opmanager-mock-data.ts`**
- [ ] **Step 8: Verify compilation**
Run: `npm run type-check`
- [ ] **Step 9: Commit**

### Task 2: Fix Quotes and Semicolons in `src/lib/` and `src/services/`

**Files:**
- All files in `src/lib/` and `src/services/`

- [ ] **Step 1: Standardize quotes to single and add missing semicolons**
- [ ] **Step 2: Verify with lint**
Run: `npm run lint`
- [ ] **Step 3: Commit**

### Task 3: Remove Redundant Default Exports in `src/components/`

**Files:**
- Modify: `src/components/topology/custom/CustomEdge.tsx`
- Modify: `src/components/topology/edges/FlowEdge.tsx`
- Modify: `src/components/topology/custom/CustomNode.tsx`

- [ ] **Step 1: Change `export default memo(CustomEdge)` to named export in `src/components/topology/custom/CustomEdge.tsx`**
- [ ] **Step 2: Change `export default memo(FlowEdge)` to named export in `src/components/topology/edges/FlowEdge.tsx`**
- [ ] **Step 3: Change `export default memo(CustomNode)` to named export in `src/components/topology/custom/CustomNode.tsx`**
- [ ] **Step 4: Update imports in other files that use these default exports**
- [ ] **Step 5: Verify compilation**
Run: `npm run type-check`
- [ ] **Step 6: Commit**

### Task 4: Fix Quotes and Semicolons in `src/components/`

**Files:**
- All files in `src/components/`

- [ ] **Step 1: Standardize quotes to single and add missing semicolons**
- [ ] **Step 2: Verify with lint**
Run: `npm run lint`
- [ ] **Step 3: Commit**

---
