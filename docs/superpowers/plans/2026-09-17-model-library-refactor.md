# Model Library Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add selectable Blob and Shapes Canvas models, each with one self-morphing `idle` action.

**Architecture:** Replace the global action catalog with per-model definitions under `src/models/`. Each model owns its scene variants and an idle-only action; the engine loops those variants while the overlay's Key menu selects a model and persists that choice.

**Tech Stack:** TypeScript, React, Canvas 2D, Chrome extension storage, Vitest, Playwright.

**Spec:** Approved bounded design in this conversation.

## Global Constraints

- Preserve Canvas 2D renderer and transparent draggable overlay.
- Expose only `idle` from each model; internal idle variants are not public actions.
- Keep AI disabled and make no network request.
- Do not commit, branch, create a worktree, or open a PR.

---

### Task 1: Create the model-library contract

**Files:**
- Create: `src/models/types.ts`, `src/models/registry.ts`, `src/models/blob/{scene.ts,actions.ts,index.ts}`, `src/models/shapes/{scene.ts,actions.ts,index.ts}`
- Modify: `src/engine/types.ts`, `src/engine/action-engine.ts`
- Test: `src/models/registry.test.ts`, `src/engine/action-engine.test.ts`

- [ ] Write tests proving the registry contains exactly `blob` and `shapes`, and each exports only `idle` with two or more target visual states.
- [ ] Run the tests and confirm they fail because the model modules do not exist.
- [ ] Define `ModelDefinition { id, name, idle: { states, transition } }`; move the current organic scene variants into Blob and add geometric circle/block/diamond variants to Shapes.
- [ ] Change `ActionEngine` to accept a `ModelDefinition`, loop its idle variants, and remove the global `think`, `listen`, `search`, `happy`, `sleep`, and `reset` action path.
- [ ] Run model and engine tests; expect PASS.

### Task 2: Add persisted model selection to the overlay

**Files:**
- Create: `src/content/model-selection.ts`, `src/content/model-selection.test.ts`
- Modify: `src/content/overlay-app.tsx`, `src/content/overlay-position.ts`, `src/content/index.tsx`, `src/content/overlay-app.test.tsx`, `src/content/overlay.css`

- [ ] Write tests for Blob as the default, round-tripping a selected Shapes ID through extension storage, and selecting Shapes from the Key menu.
- [ ] Run the tests and confirm selection support is absent.
- [ ] Add a model storage key and `load/save` functions; retain the existing overlay-position key unchanged.
- [ ] Add accessible Blob and Shapes buttons beneath a **Model** menu label. Selection persists, remounts/replaces the engine's model definition, and immediately starts its idle loop.
- [ ] Run overlay and persistence tests; expect PASS.

### Task 3: Retire the old global catalog and verify the extension

**Files:**
- Delete: `src/engine/action-registry.ts`, `src/engine/action-registry.test.ts`, `src/engine/blob-scenes.ts`
- Modify: `tests/e2e/overlay.spec.ts`, `README.md`

- [ ] Update tests and documentation to describe Model selection and idle-only autonomous morphing; remove references to the old public action list.
- [ ] Build the extension, then update the browser test to show the overlay and assert the Key menu exposes Blob and Shapes.
- [ ] Run `npm test && npm run typecheck && npm run lint && npm run build && npm run test:e2e -- tests/e2e/overlay.spec.ts`.
- [ ] Record only the resulting evidence; do not create a commit.
