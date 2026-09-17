# Canvas Morph Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Live2D extension with a transparent, draggable Canvas 2D blob model that morphs through a predefined autonomous action library.

**Architecture:** A renderer-agnostic scene model supplies stable-ID visual elements to a Canvas backend. An interruption-safe morph controller samples the current frame before targeting a new built-in action. The content overlay owns placement and the one Key settings control; the background worker only shows and hides it.

**Tech Stack:** TypeScript, React 18, Canvas 2D, Chrome Manifest V3, Vite/CRXJS, Vitest, Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-17-canvas-morph-engine-design.md`

## Global Constraints

- Target Chrome/Chromium Manifest V3 only.
- Render on a transparent Canvas 2D surface; do not add a third-party character or graphics runtime.
- AI is disabled: no API keys, account connection, prompt, provider request, or network access.
- Only registry-owned action IDs may reach the engine.
- The overlay starts lower-right, is draggable, persists its position, and passes clicks through outside its bounds.
- Retire the Live2D runtime, Bunny Fairy assets/catalog, importer, and API-provider code from the active build.
- Do not create commits, branches, worktrees, or pull requests.

---

## Planned file structure

| Path | Responsibility |
| --- | --- |
| `src/engine/types.ts` | Renderer-neutral element, state, transition, and action types. |
| `src/engine/interpolate.ts` | Stable-ID matching plus scalar, color, and path interpolation. |
| `src/engine/morph-controller.ts` | Current-frame snapshots and interruptible transition timing. |
| `src/engine/action-registry.ts` | The finite built-in action allowlist and target-state lookup. |
| `src/engine/blob-scenes.ts` | Initial blob-model scene definitions for every action. |
| `src/engine/action-engine.ts` | `requestAction`, idle return, and injectable autonomous scheduler. |
| `src/engine/canvas-renderer.ts` | Canvas sizing and drawing of every supported element type. |
| `src/content/overlay-app.tsx` | Draggable stage, Key menu/tooltip, Canvas lifecycle, position persistence. |
| `src/content/index.tsx` | Shadow-DOM mount, show/hide messages, and engine construction. |
| `src/content/overlay.css` | Transparent lower-right stage and control styling. |
| `src/shared/messages.ts` | Strict Show/Hide-only extension messages. |
| `src/background/service-worker.ts` | Validates and routes Show/Hide after content-script injection. |
| `src/popup/popup-app.tsx` | Show Shape and Hide Shape only. |
| `vite.config.ts`, `package.json` | Canvas-engine extension metadata and removed dependencies/resources. |

### Task 1: Retire the Live2D and provider surface

**Files:**
- Modify: `package.json`, `package-lock.json`, `vite.config.ts`, `README.md`
- Modify: `src/background/service-worker.ts`, `src/shared/messages.ts`, `src/shared/messages.test.ts`, `src/popup/popup-app.tsx`
- Delete: `src/ai/`, `src/actions/`, `src/characters/`, `src/import/`, `src/runtime/`, `src/vendor/`, `public/characters/`, their tests, and `src/background/settings.ts` with its test

**Interfaces:**
- Produces `ExtensionMessage = { type: 'overlay/show' | 'overlay/hide'; tabId: number }`.
- Produces a worker router that injects then forwards only `overlay/show`, and forwards `overlay/hide`.

- [ ] **Step 1: Write the failing message-router tests**

```ts
expect(assertExtensionMessage({ type: 'action/run-demo', tabId: 7, prompt: 'x' })).toThrow();
await expect(routePopupMessage({ type: 'overlay/show', tabId: 7 }, dependencies)).resolves.toBeUndefined();
expect(dependencies.injectIntoTab).toHaveBeenCalledWith(7);
```

- [ ] **Step 2: Run the focused tests and confirm the obsolete action message is still accepted**

Run: `npm test -- src/shared/messages.test.ts src/background/service-worker.test.ts`

Expected: a failing assertion that demonstrates the old action/provider path is still present.

- [ ] **Step 3: Reduce the shared message union and worker router**

```ts
export type ExtensionMessage = { type: 'overlay/show' | 'overlay/hide'; tabId: number };

export async function routePopupMessage(message: ExtensionMessage, deps: RouterDependencies) {
  if (message.type === 'overlay/show') await deps.injectIntoTab(message.tabId);
  await deps.sendToTab(message.tabId, { type: message.type });
}
```

Delete settings-message handling, all provider imports, and `onInstalled` state writes. Keep the asynchronous response/error wrapper and explicit content-script injection.

- [ ] **Step 4: Simplify the popup and manifest**

Keep only `Show shape`, `Hide shape`, the active-web-tab lookup, and one status message in the popup. Rename extension copy to Canvas morph engine terminology. Remove `fflate`, Pixi, and Live2D dependencies; remove character/vendor web-accessible resources; run `npm install` to update the lockfile.

- [ ] **Step 5: Remove obsolete source and assets, then update README setup and privacy text**

Document that this build makes no network requests, stores only overlay position, and has AI disabled. Remove every unused Live2D/provider/import directory and copied Bunny Fairy asset rather than leaving a licensed model in the product tree.

- [ ] **Step 6: Run the focused tests**

Run: `npm test -- src/shared/messages.test.ts src/background/service-worker.test.ts`

Expected: PASS.

### Task 2: Define the renderer-neutral scene and interpolation contract

**Files:**
- Create: `src/engine/types.ts`, `src/engine/interpolate.ts`, `src/engine/interpolate.test.ts`

**Interfaces:**
- Produces `VisualState`, `VisualElement`, `Point`, `TransitionOptions`, and `ActionId`.
- Produces `interpolateState(from: VisualState, to: VisualState, progress: number): VisualState`.

- [ ] **Step 1: Write failing interpolation tests**

```ts
it('interpolates stable path control points and properties', () => {
  expect(interpolateState(stateA, stateB, 0.5).elements[0]).toMatchObject({
    id: 'body', opacity: 0.75, position: { x: 50, y: 40 }, points: [{ x: 5, y: 10 }],
  });
});

it('softly enters destination-only elements and exits source-only elements', () => {
  expect(interpolateState(from, to, 0.5).elements.map(({ id, opacity }) => ({ id, opacity }))).toEqual([
    { id: 'old-orbit', opacity: 0.5 }, { id: 'new-spark', opacity: 0.5 },
  ]);
});
```

- [ ] **Step 2: Run the test and confirm imports are unresolved**

Run: `npm test -- src/engine/interpolate.test.ts`

Expected: FAIL because the engine modules do not exist.

- [ ] **Step 3: Implement the explicit union and interpolation helpers**

Use a discriminated `kind` union for `circle`, `rect`, `line`, `path`, `text`, `particle`, and `group`. Require `id`, `layer`, `opacity`, `position`, `scale`, and `rotation` on elements. For a path, require the same number of `points` in source and target; otherwise retain the source shape until it exits and fade in the target shape. Clamp progress to `[0, 1]`; mix RGBA colors and numbers; match elements only by both `id` and `kind`.

- [ ] **Step 4: Run the focused test**

Run: `npm test -- src/engine/interpolate.test.ts`

Expected: PASS.

### Task 3: Build the action registry, blob scenes, and interruption-safe engine

**Files:**
- Create: `src/engine/action-registry.ts`, `src/engine/blob-scenes.ts`, `src/engine/morph-controller.ts`, `src/engine/action-engine.ts`
- Create: `src/engine/action-registry.test.ts`, `src/engine/morph-controller.test.ts`, `src/engine/action-engine.test.ts`

**Interfaces:**
- Consumes: `VisualState`, `TransitionOptions`, and `interpolateState` from Task 2.
- Produces `builtInActions`, `getAction(actionId)`, `MorphController`, and `ActionEngine.requestAction(actionId): { accepted: boolean }`.

- [ ] **Step 1: Write failing registry and controller tests**

```ts
expect(getAction('paint-a-web-page')).toBeUndefined();
expect(engine.requestAction('paint-a-web-page')).toEqual({ accepted: false });

controller.start(thinking, 100);
const halfway = controller.sample(250);
controller.start(happy, 250);
expect(controller.sample(250)).toEqual(halfway);
```

- [ ] **Step 2: Write the deterministic autonomous-cycle test**

```ts
const engine = new ActionEngine(registry, controller, { random: () => 0, now: () => 1000 });
engine.tick(9000);
expect(engine.currentActionId).toBe('think');
expect(engine.currentActionId).not.toBe('idle');
```

- [ ] **Step 3: Run tests and confirm the missing engine APIs fail**

Run: `npm test -- src/engine/action-registry.test.ts src/engine/morph-controller.test.ts src/engine/action-engine.test.ts`

Expected: FAIL because the registry and engine do not exist.

- [ ] **Step 4: Implement the finite scenes and registry**

Define exactly `idle`, `think`, `listen`, `search`, `happy`, `sleep`, and `reset`; make reset resolve to the idle target. Each scene uses the stable IDs `body`, `highlight`, `left-orbit`, `right-orbit`, `left-eye`, `right-eye`, `spark-a`, and `spark-b`. Vary only supported properties so every action is a real morph of the same reusable model.

- [ ] **Step 5: Implement sampled transitions and autonomous selection**

`MorphController.start(target, timestamp)` must call `sample(timestamp)` first, store that value as its new source, and use the action's duration/easing. `ActionEngine` must reject unknown IDs, select no immediate duplicate, return to idle after a non-idle action settles, and expose injected clock/random/scheduling options for tests.

- [ ] **Step 6: Run the engine suite**

Run: `npm test -- src/engine/action-registry.test.ts src/engine/morph-controller.test.ts src/engine/action-engine.test.ts`

Expected: PASS.

### Task 4: Implement the transparent Canvas 2D backend

**Files:**
- Create: `src/engine/canvas-renderer.ts`, `src/engine/canvas-renderer.test.ts`

**Interfaces:**
- Consumes: `VisualState` from Task 2.
- Produces `CanvasRenderer` with `resize()`, `draw(state)`, and `dispose()`.

- [ ] **Step 1: Write failing Canvas draw tests**

```ts
renderer.draw(stateWithPathAndText);
expect(context.beginPath).toHaveBeenCalled();
expect(context.bezierCurveTo).toHaveBeenCalled();
expect(context.fillText).toHaveBeenCalledWith('AI off', expect.any(Number), expect.any(Number));
```

- [ ] **Step 2: Run the test and confirm the renderer is absent**

Run: `npm test -- src/engine/canvas-renderer.test.ts`

Expected: FAIL because `CanvasRenderer` is not defined.

- [ ] **Step 3: Implement Canvas drawing and device-pixel-ratio sizing**

Clear with `clearRect`, scale for `window.devicePixelRatio`, order by `layer`, apply per-element transforms and opacity, and draw every element type. Draw closed paths from point lists with a smooth quadratic or cubic construction. Use Canvas gradients only when the scene asks for them; keep the canvas alpha-enabled and never paint a stage background.

- [ ] **Step 4: Run the focused backend test**

Run: `npm test -- src/engine/canvas-renderer.test.ts`

Expected: PASS.

### Task 5: Mount the draggable Canvas stage and its single Key menu

**Files:**
- Modify: `src/content/overlay-app.tsx`, `src/content/overlay.css`, `src/content/index.tsx`, `src/content/overlay-app.test.tsx`
- Create: `src/content/overlay-position.ts`, `src/content/overlay-position.test.ts`

**Interfaces:**
- Consumes: `ActionEngine`, `CanvasRenderer`, and the built-in registry from Tasks 3–4.
- Produces `mountOverlay(): { dispose(): void }` and a position store using `chrome.storage.local` key `eidolon.canvasOverlay.position`.

- [ ] **Step 1: Write failing overlay interaction tests**

```tsx
render(<OverlayApp positionStore={store} />);
await user.hover(screen.getByRole('button', { name: 'AI settings' }));
expect(await screen.findByRole('tooltip')).toHaveTextContent('AI settings');
await user.click(screen.getByRole('button', { name: 'AI settings' }));
expect(screen.getByText('AI disabled')).toBeVisible();
```

```ts
await positionStore.save({ x: 812, y: 520 });
await expect(positionStore.load()).resolves.toEqual({ x: 812, y: 520 });
```

- [ ] **Step 2: Run the UI and persistence tests to confirm they fail**

Run: `npm test -- src/content/overlay-app.test.tsx src/content/overlay-position.test.ts`

Expected: FAIL because the Key menu and position store are absent.

- [ ] **Step 3: Replace the avatar panel with the Canvas stage**

Remove the old drag and close controls. Mount a 320px transparent Canvas stage lower-right, then initialize renderer/engine after the canvas ref resolves. Start one animation-frame loop that samples the engine, draws the state, and schedules the next frame; cancel it and dispose the renderer on unmount. If `getContext('2d')` returns `null`, render a short fallback status instead.

- [ ] **Step 4: Add drag persistence and the Key-only menu**

Use pointer capture on the stage, clamp its persisted fixed position to the viewport, and save on pointer-up. Keep pointer events disabled on the root and enabled only for the stage/control. Add a semantic Key button, tooltip, and compact panel with exact copy: `AI disabled`, `Autonomous motion is active`, and `Secure connection coming later`.

- [ ] **Step 5: Replace Live2D mount/run handling in the content entrypoint**

Remove model loading and `overlay/run`. Keep the closed shadow root, idempotent content-script flag, `overlay/show`, `overlay/hide`, and disposal behavior. Do not expose the canvas or engine globally.

- [ ] **Step 6: Run the focused UI suite**

Run: `npm test -- src/content/overlay-app.test.tsx src/content/overlay-position.test.ts`

Expected: PASS.

### Task 6: Update browser-level coverage and user documentation

**Files:**
- Modify: `tests/e2e/overlay.spec.ts`, `README.md`

**Interfaces:**
- Consumes: Show/Hide popup flow from Task 1 and mounted overlay from Task 5.
- Produces a full extension smoke test for the Canvas overlay.

- [ ] **Step 1: Update the end-to-end expectation before implementation verification**

```ts
await popup.getByRole('button', { name: 'Show shape' }).click();
await expect(page.locator('#__eidolon_overlay_host__')).toBeAttached();
const host = page.locator('#__eidolon_overlay_host__');
await expect(host).toHaveCount(1);
await popup.getByRole('button', { name: 'Hide shape' }).click();
await expect(host).toHaveCount(0);
```

Add a page-side shadow-root-independent assertion that a lower-right overlay host receives a saved position after a pointer drag.

- [ ] **Step 2: Build before running E2E**

Run: `npm run build`

Expected: PASS and emits the unpacked extension in `dist/`.

- [ ] **Step 3: Run browser coverage**

Run: `npm run test:e2e -- tests/e2e/overlay.spec.ts`

Expected: PASS.

- [ ] **Step 4: Perform final project verification**

Run: `npm test && npm run typecheck && npm run lint && npm run build && npm run test:e2e -- tests/e2e/overlay.spec.ts`

Expected: every command exits 0. Report any non-fatal toolchain warnings separately from verification results.
