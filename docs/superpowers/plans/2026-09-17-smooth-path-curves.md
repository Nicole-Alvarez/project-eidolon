# Smooth Closed-Path Curves Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate visible corners/facets in the Blob and Shapes bodies so every round and curve renders smooth at the existing 2048 matched path points.

**Architecture:** Replace the lossy point generators with true curve samplers in `src/shared/geometry.ts`. The Blob body becomes a closed Catmull-Rom spline through its 8 control points; the Shapes circle state becomes a real sampled circle while triangle, square, and hexagon keep their sharp geometric corners. Point counts stay equal across morph targets, so interpolation and the renderer are untouched.

**Tech Stack:** TypeScript, Canvas 2D, Vitest.

**Spec:** Approved bounded design in this conversation.

## Global Constraints

- Preserve the 2048-path-point morphology contract and stable-ID interpolation.
- Only the Circles/round state of Shapes becomes rounded; other polygons stay sharp.
- Keep Canvas 2D renderer, transparent draggable overlay, and autonomous idle-only motion unchanged.
- Do not commit, branch, create a worktree, or open a PR.

---

### Task 1: Add shared curve samplers

**Files:**
- Create: `src/shared/geometry.ts`, `src/shared/geometry.test.ts`

- [x] Add `sampleClosedSpline(targets, count)` — closed Catmull-Rom cubic through the control points, sampled to exactly `count` ordered points without topology change between states.
- [x] Add `sampleCircle(radius, count, center, rotation)` — a true circle sampled to exactly `count` points starting at the current angle convention.
- [x] Unit tests prove exact point counts, spline interpolation through every control point, circle radius/fidelity, and identical topology across shifts.
- [x] Run geometry tests; expect PASS.

### Task 2: Smooth the Blob body

**Files:**
- Modify: `src/models/blob/scene.ts`
- Create: `src/models/blob/scene.test.ts`

- [x] Replace the linear `resample` body pass with `sampleClosedSpline(recipe.body, 2048)` for all six states.
- [x] Add a smoothness regression: every Blob body has 2048 points and a maximum consecutive-point heading change below 2°.
- [x] Run Blob scene tests; expect PASS.

### Task 3: Round only the Shapes circle state

**Files:**
- Modify: `src/models/shapes/scene.ts`, `src/models/shapes/scene.test.ts`

- [x] Replace the 16-side polygon state with `sampleCircle(105, count, { x: 150, y: 150 })`; keep `polygon` for triangle, square, and hexagon.
- [x] Extend scene tests to guard the circle state's smoothness (maximum heading change below 1°) while retaining the 2048-point assertion.
- [x] Run Shapes scene tests; expect PASS.

### Task 4: Verify the extension

- [x] Run `npm test && npm run typecheck && npm run lint && npm run build`.
- [ ] Optionally run `npm run test:e2e -- tests/e2e/overlay.spec.ts`.
- [x] Record only the resulting evidence; do not create a commit.