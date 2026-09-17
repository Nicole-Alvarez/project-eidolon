# Overlay Intro/Outro Motion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bloom the shape in with staggered controls when the overlay turns on, and play a matched exit before unmounting when it turns off.

**Architecture:** The bloom animates the shape (`.shape-canvas` / `.canvas-fallback`) around its own center — not `.morph-stage` — so the 96px control gutter cannot pull the shape toward the stage's center. Controls fade/rise in on a short stagger behind it. Hide adds `.is-exiting` to `.overlay-root`, then a content-side coordinator waits for the shape's `animationend` (with a timeout fallback) before unmounting; a show during the exit cancels it.

**Tech Stack:** TypeScript, React, CSS keyframes, Chrome MV3 messaging, Vitest, Playwright. Design workflow: vendored Impeccable v4.1.1.

**Spec:** Impeccable craft-floor ("one authored moment", exponential ease-out, bounded effects) plus this session's choices (bloom + staggered controls, guard repeats).

## Global Constraints

- Respect `prefers-reduced-motion` in both CSS and JS.
- Do not replay the intro for a repeat show while visible.
- Do not commit, branch, create a worktree, or open a PR.

---

### Task 1: Transition helper

**Files:** `src/content/overlay-transition.ts`, `src/content/overlay-transition.test.ts`

- [x] `introDurationMs`, `outroDurationMs`, `outroFallbackMs` constants.
- [x] `prefersReducedMotion()` reads `matchMedia('(prefers-reduced-motion: reduce)')`.
- [x] `waitForExit(element, fallbackMs)` resolves on the element's `animationend` or a timeout.
- [x] Tests: animationend path, timeout path (fake timers), reduced-motion read.

### Task 2: Motion CSS

**Files:** `src/content/overlay.css`

- [x] `eidolon-shape-enter` (scale .3→1, opacity 0→1, blur 14→0, 480ms expo-out) on the canvas/fallback with center origin.
- [x] `eidolon-control-enter` (fade + translateY -6→0, 300ms) with 140/185/230ms delays for `⌘`/`◇`/`⤢`.
- [x] `.overlay-root.is-exiting` shape exit (scale 1→.7, opacity→0, blur 0→10, 240ms) and control fade-out (160ms).
- [x] `prefers-reduced-motion` disables every enter/exit animation.

### Task 3: Content lifecycle

**Files:** `src/content/index.tsx`

- [x] `OverlayHandle` gains `exit()` and `cancelExit()`.
- [x] `exit()` adds `.is-exiting`, awaits the shape's exit, then disposes unless cancelled; reduced-motion disposes immediately.
- [x] `cancelExit()` clears the exit flag and class so an in-flight `exit()` skips disposal.
- [x] `mountOverlay()` reuses the existing overlay and cancels any exit (no remount/replay); `overlay/hide` calls `exit()`.

### Task 4: Verify

- [x] `npm test && npm run typecheck && npm run lint && npm run build && npm run test:e2e`.
- [x] Aligned the switch's accessible name drift (`Eidolon overlay`) across popup tests and e2e.
- [x] No commit.
