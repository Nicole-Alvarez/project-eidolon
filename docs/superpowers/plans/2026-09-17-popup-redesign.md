# Popup Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the extension popup into a classy surface of the existing Eidolon world, replace the Show/Hide buttons with a truthful switch, and render failures as an elegant error card.

**Architecture:** Operate-mode popup inheriting the overlay's indigo/periwinkle world (`#0e1030` ground, `#171a3d` panel, `#4c47ab` accent, `#a7a4ff` periwinkle, `system-ui`). A new `overlay/status` round-trip (popup → background → content script) reports whether the overlay is mounted so the switch reflects the tab's real state; a failed request reverts the switch and surfaces an error card with a mapped headline and recovery.

**Tech Stack:** TypeScript, React, Chrome MV3 messaging/storage, Vite, Vitest, Playwright. Design workflow: vendored Impeccable v4.1.1 at `.agents/skills/impeccable`.

**Spec:** Impeccable shape session in this conversation (tokenmax budget).

## Global Constraints

- Inherit the overlay's visual world; no new identity, no DESIGN.md change.
- Operate mode: restrained color, earned familiarity, fixed rem scale, 150–250ms state motion, no decorative motion.
- Craft floor: authored SVG icons only, one elevation per card, no gradient text, no sub-1px accent borders as callouts, themed browser surfaces.
- Do not commit, branch, create a worktree, or open a PR.

---

### Task 1: Vendor the Impeccable skill

- [x] `cp -R cardinal-designs/.agents/skills/impeccable .agents/skills/impeccable`.
- [x] Exclude `.agents/**` from ESLint so the vendored scripts are not linted as app code.

### Task 2: Truthful switch state plumbing

**Files:** `src/shared/messages.ts`, `src/content/index.tsx`, `src/background/service-worker.ts` (+ tests)

- [x] Add `overlay/status` to `ExtensionMessage` and `assertExtensionMessage`.
- [x] Content script answers `{ visible: Boolean(activeOverlay) }`.
- [x] Background routes `overlay/status`; a tab with no receiver resolves `{ visible: false }`; `routePopupMessage` returns `{ visible }` and the listener merges it into `sendResponse`.
- [x] Tests: status probe accepted; visible result; missing-receiver result.

### Task 3: Popup UI

**Files:** `src/popup/popup-app.tsx`, `src/popup/popup.css` (new), `src/popup/index.tsx`

- [x] Header with authored SVG morph mark (blob gradient) + wordmark + tagline.
- [x] Switch card: `role="switch"`, `aria-checked`, `aria-busy` while pending, disabled when no web tab, live `role="status"` state text.
- [x] On mount, query `overlay/status`; toggle optimistically and revert on failure.
- [x] Error card (`role="alert"`): soft red panel, authored alert glyph, mapped title/recovery, muted raw detail, `Retry` that re-runs the failed action.
- [x] Themed `::selection`, `color-scheme`, focus rings, reduced-motion guard.

### Task 4: Tests

- [x] `src/popup/popup-app.test.tsx`: reflects state, reverts + error card on failure, retry succeeds, disabled with no web tab.
- [x] `tests/e2e/overlay.spec.ts`: drives the switch (unchecked → show → host attached/checked → hide → host gone).

### Task 5: Verify & inspect

- [x] `npm test && npm run typecheck && npm run lint && npm run build && npm run test:e2e`.
- [x] Batched popup captures (off/on/error/disabled) reviewed for craft-floor compliance; ghost-card elevation and error-detail contrast fixed in one batch.
- [x] `detect.mjs` run over popup targets (reported degraded: optional parser deps absent) — no findings; manual craft-floor pass used.
- [x] `.impeccable/` ignored; no commit.
