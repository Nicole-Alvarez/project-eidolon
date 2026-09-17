# Resize Action Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the always-on overlay resize grip into an opt-in tool controlled by its own action button. When active, the corner grip shows and resizing works; otherwise the tool is hidden.

**Architecture:** Add a persisted `resize` boolean next to the existing overlay `position` and `size` keys. A third action button sits in the control column under the model button (`⌘`, `◇`, then the resize tool); the bottom-right `.resize-handle` only renders while active, and the stage shows a dashed outline so the resizable region is visible.

**Tech Stack:** TypeScript, React, Canvas 2D, Chrome extension storage, Vitest.

**Spec:** Approved bounded design in this conversation (tokenmax budget).

## Global Constraints

- Default state is **off**; the toggle persists across sessions.
- Keep square, proportional resizing (180–640, default 300) and all existing persistence keys unchanged.
- Keep the `⌘` menu limited to AI status; the resize action is a sibling action item, not a menu row.
- Do not commit, branch, create a worktree, or open a PR.

---

### Task 1: Persist the resize tool state

**Files:**
- Modify: `src/content/overlay-position.ts`, `src/content/overlay-position.test.ts`

- [x] Add `eidolon.canvasOverlay.resize` with `loadOverlayResize` / `saveOverlayResize` and boolean validation.
- [x] Tests round-trip on/off and ignore non-boolean stored values.

### Task 2: Action button and grip gating

**Files:**
- Modify: `src/content/overlay-app.tsx`, `src/content/overlay.css`, `src/content/overlay-app.test.tsx`

- [x] Add `resizeActive` state (default `false`); load it on mount with position/size.
- [x] Add a `Resize tool` action button (`aria-pressed`) in the control column under the model button; persist on toggle.
- [x] Render `.resize-handle` only when active; add a `.resize-mode` dashed outline to the stage while active.
- [x] Tests: toggle shows/hides the grip, and the grip still resizes the stage once enabled.

### Task 3: Verify the extension

- [x] Run `npm test && npm run typecheck && npm run lint && npm run build`.
- [x] Run `npm run test:e2e -- tests/e2e/overlay.spec.ts`.
- [x] Record only the resulting evidence; do not create a commit.