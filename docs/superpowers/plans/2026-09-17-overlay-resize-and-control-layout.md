# Overlay Resize and Control Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the user resize the floating overlay shape and reorganize the overlay controls: menu actions move to the top of the control column, and the model selector becomes a right-side vertical column that opens under its own button.

**Architecture:** The canvas renders a 300×300 unit scene, so resizing is a uniform display scale applied in the renderer's transform; a guarded `ResizeObserver` keeps the backing store and scale in sync with CSS size changes. The React overlay owns a persisted square size (default 300, min 180, max 640) with a bottom-right corner grip, mirroring the existing drag/persistence pattern. Control CSS repositions the key and model columns and turns the model dialog into a vertical, right-aligned list.

**Tech Stack:** TypeScript, React, Canvas 2D, Chrome extension storage, Vitest.

**Spec:** Approved bounded design in this conversation.

## Global Constraints

- Preserve Canvas 2D renderer, transparent draggable overlay, and autonomous idle-only motion.
- Keep resizing square and proportional; min 180, max 640, default 300.
- Keep the `⌘` AI-settings button style and behavior; only its placement changes (to the top).
- Do not commit, branch, create a worktree, or open a PR.

---

### Task 1: Scale the renderer with canvas size

**Files:**
- Modify: `src/engine/canvas-renderer.ts`, `src/engine/canvas-renderer.test.ts`

- [x] Derive `sceneScale = width / 300` in `resize()` and apply `pixelRatio * sceneScale` in `draw()`'s transform so the whole scene scales proportionally.
- [x] Observe canvas CSS size via a guarded `ResizeObserver` (skip when unavailable) and `disconnect()` in `dispose()`.
- [x] Unit tests assert the transform uses the scene scale (e.g., 600-wide canvas → scale 2).

### Task 2: Persist overlay size

**Files:**
- Modify: `src/content/overlay-position.ts`, `src/content/overlay-position.test.ts`

- [x] Add `eidolon.canvasOverlay.size` with `loadOverlaySize`/`saveOverlaySize`, `clampOverlaySize`, and `default/min/max` constants.
- [x] Tests cover size round-trip and clamping of out-of-range stored values.

### Task 3: Rebuild the overlay layout and add the resize grip

**Files:**
- Modify: `src/content/overlay-app.tsx`, `src/content/overlay.css`, `src/content/overlay-app.test.tsx`, `src/test/setup.ts`
- Create: `docs/superpowers/plans/2026-09-17-overlay-resize-and-control-layout.md`

- [x] Drive stage and canvas size from `size` state (`stage = size + 96` right gutter); clamp position against the current stage size on move/load.
- [x] Restore the menu actions to a single stacked column (`⌘` above `◇`, both `right: 6px`) at the top of the stage.
- [x] Open the model dialog to the right of the model button, on the button's own level, as a vertical single column (`.model-dialog { left: 44px; flex-direction: column }`).
- [x] Add a bottom-right `.resize-handle` grip with pointer-capture drag that clamps size, re-clamps position, and persists on release.
- [x] Add jsdom `PointerEvent`/pointer-capture polyfills to the test setup so pointer interactions are testable.
- [x] Tests: menu opens; model dialog lists Blob/Shapes as a right-side column; corner-grip drag reflects the new stage size.

### Task 4: Verify the extension

- [x] Run `npm test && npm run typecheck && npm run lint && npm run build`.
- [x] Run `npm run test:e2e -- tests/e2e/overlay.spec.ts`.
- [x] Record only the resulting evidence; do not create a commit.