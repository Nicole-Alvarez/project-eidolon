# Resize From All Corners Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the overlay be resized from any corner: when the resize tool is active, show a grip on all four corners of the shape and hold the opposite corner fixed while dragging.

**Architecture:** Reuse the persisted `resize` flag and the existing diagonal projection on the corner drag. The four grips are positioned on the canvas corners (inset 2px) — not the stage corners — so the control column in the right gutter is never covered. Each corner records its own drag origin and shifts the stage position so the opposite edge stays anchored.

**Tech Stack:** TypeScript, React, Canvas 2D, Chrome extension storage, Vitest.

**Spec:** Approved bounded design in this conversation (tokenmax budget).

## Global Constraints

- Grips sit on the shape (canvas) corners, clear of the `⌘`/`◇`/`⤢` column.
- Size stays square, proportional, and clamped to 180–640; position stays viewport-clamped.
- Resizing from a left/top corner moves the stage, so release persists both size and position.
- Do not commit, branch, create a worktree, or open a PR.

---

### Task 1: Four corner grips with anchoring

**Files:**
- Modify: `src/content/overlay-app.tsx`, `src/content/overlay.css`, `src/content/overlay-app.test.tsx`

- [x] Render a `.resize-handle` per corner (`nw`, `ne`, `sw`, `se`) when active, each with a distinct accessible name and inline corner position.
- [x] Record `{ startClientX, startClientY, size, position, corner }`; derive the outward delta by diagonal projection (`se (dx+dy)/2`, `nw -(dx+dy)/2`, `ne (dx-dy)/2`, `sw (dy-dx)/2`).
- [x] Hold the opposite corner: shift `x` for left corners and `y` for top corners by `startSize - newSize`, then `clampPosition`.
- [x] Persist size and position on release; style per-corner cursor (`nwse`/`nesw`) and rotated grip glyph.
- [x] Tests: toggle renders 4 grips; bottom-right keeps the top-left fixed; top-left grows size and shifts the stage by the negative delta.

### Task 2: Verify the extension

- [x] Run `npm test && npm run typecheck && npm run lint && npm run build`.
- [x] Run `npm run test:e2e`.
- [x] Record only the resulting evidence; do not create a commit.
