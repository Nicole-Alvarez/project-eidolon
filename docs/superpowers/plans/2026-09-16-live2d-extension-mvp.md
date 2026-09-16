# AI-Controlled Live2D Extension MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Chrome Manifest V3 extension that displays Bunny Fairy as a transparent page overlay and executes only validated structured AI actions through a character runtime.

**Architecture:** The extension uses a background service worker for settings, provider calls, and validated messages; a popup for explicit user controls; and an active-tab content-script overlay for rendering. AI connections generate untrusted JSON, the action layer validates it against the selected character catalog, and the character runtime maps public actions to Cubism expressions or procedural parameter tracks without exposing model internals to the provider.

**Tech Stack:** Node 21, npm, Vite, React, TypeScript (strict), `@crxjs/vite-plugin`, Chrome Manifest V3, Vitest, Testing Library, Playwright, PixiJS, `pixi-live2d-display`, `fflate`, browser IndexedDB, Chrome extension APIs.

**Spec:** `docs/superpowers/specs/2026-09-16-live2d-extension-mvp-design.md`

## Global Constraints

- Work only in the current workspace; leave changes uncommitted and do not create a branch or worktree.
- The deliverable targets Chrome/Chromium Manifest V3, not Firefox, a desktop application, Unity, or a 3D runtime.
- The avatar is a transparent, draggable in-page overlay, not an operating-system-level always-on-top window.
- Treat both ZIP assets and AI output as untrusted. Never execute generated code or let them select arbitrary files, URLs, or Cubism parameter IDs.
- Keep API keys local to Chrome extension storage and the service worker. Never emit them to page scripts, UI state, source, URLs, tests, or logs.
- Use the provided Bunny Fairy `.moc3`, `.model3.json`, physics, textures, and `.exp3.json` files unchanged; do not claim procedural gestures are authored motions.
- Do not download, hot-link, or accept Live2D Cubism SDK licensing on the user’s behalf. Load a user-supplied, pinned Core build only from `src/vendor/live2dcubismcore.min.js`.
- Keep account and Codex providers visibly unavailable; do not create simulated OAuth/account authentication.
- Verification requires targeted tests, full tests, typecheck, lint, production build, and `git diff --check` only if the workspace becomes a Git repository.

---

## Planned File Structure

```text
package.json                              scripts and exact dependency versions
vite.config.ts                            CRX/Vite manifest and extension entries
tsconfig.json                             strict TS compiler configuration
vitest.config.ts                          unit/component test environment
playwright.config.ts                      extension E2E configuration
src/background/service-worker.ts          validated message router and provider boundary
src/background/settings.ts                secret-safe settings persistence
src/actions/contract.ts                   JSON response types, parsing, validation
src/actions/contract.test.ts              parser/validator tests
src/ai/connection.ts                      provider interfaces and safe result types
src/ai/demo-connection.ts                 deterministic labelled demo producer
src/ai/openai-api-key-connection.ts       service-worker-only OpenAI fetch implementation
src/ai/*.test.ts                          provider and redaction tests
src/characters/types.ts                   portable character/action types
src/characters/bunny-fairy.ts             Bunny Fairy catalog and mappings
src/characters/registry.ts                bundled and imported character lookup
src/characters/*.test.ts                  catalog and registry tests
src/runtime/types.ts                      CharacterRuntime and Live2DRuntime contracts
src/runtime/character-runtime.ts          sequential action executor and idle recovery
src/runtime/pixi-live2d-runtime.ts        Cubism/Pixi renderer adapter and explicit Core gate
src/runtime/*.test.ts                     adapter-mock/action executor tests
src/content/index.tsx                     Shadow DOM overlay bootstrap and message receiver
src/content/overlay-app.tsx               transparent draggable avatar interface
src/content/overlay.css                   isolated transparent overlay styles
src/popup/index.html                      popup entry document
src/popup/index.tsx                       popup bootstrap
src/popup/popup-app.tsx                   toggle, provider, import, and action controls
src/shared/messages.ts                    discriminated extension message schemas
src/shared/storage.ts                     storage keys and JSON validation helpers
src/import/validate-archive.ts            safe Cubism ZIP inspection and normalization
src/import/import-character.ts            IndexedDB persistence and portable export metadata
src/import/*.test.ts                      archive safety and reference validation tests
src/vendor/.gitkeep                       documented placement for licensed Cubism Core
public/characters/bunny-fairy/...         supplied model files plus app character.json
tests/e2e/overlay.spec.ts                 unpacked-extension overlay E2E test
tests/fixtures/host-page.html             local page used by the E2E test
README.md                                 developer setup, Core prerequisite, loading instructions
```

### Task 1: Bootstrap the Chrome extension and test toolchain

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `vitest.config.ts`, `playwright.config.ts`, `.gitignore`, `README.md`, `src/background/service-worker.ts`, `src/popup/index.html`, `src/popup/index.tsx`, `src/popup/popup-app.tsx`, `src/shared/messages.ts`, `src/shared/messages.test.ts`

**Interfaces:**
- Produces: `ExtensionMessage` as a discriminated union and `assertExtensionMessage(value: unknown): ExtensionMessage`.
- Produces: Manifest V3 entries for background worker, popup, and active-tab overlay injection.

- [ ] **Step 1: Create a failing schema test.**

```ts
import { assertExtensionMessage } from './messages';

it('rejects a message with an unknown type', () => {
  expect(() => assertExtensionMessage({ type: 'execute-anything' })).toThrow(
    'Unsupported extension message',
  );
});
```

- [ ] **Step 2: Run the test to verify the initial failure.**

Run: `npm test -- src/shared/messages.test.ts`

Expected: FAIL because the project and `assertExtensionMessage` do not exist.

- [ ] **Step 3: Create the minimal extension/tooling configuration and message schema.**

```ts
export type ExtensionMessage =
  | { type: 'overlay/show'; tabId: number }
  | { type: 'overlay/hide'; tabId: number }
  | { type: 'action/run-demo'; tabId: number; prompt: string };

export function assertExtensionMessage(value: unknown): ExtensionMessage {
  if (!value || typeof value !== 'object' || !('type' in value)) {
    throw new Error('Unsupported extension message');
  }
  const message = value as { type?: unknown };
  if (!['overlay/show', 'overlay/hide', 'action/run-demo'].includes(String(message.type))) {
    throw new Error('Unsupported extension message');
  }
  return value as ExtensionMessage;
}
```

Configure the CRX manifest with `manifest_version: 3`, `action.default_popup`, `background.service_worker`, permissions `activeTab`, `scripting`, and `storage`, and no `host_permissions`. Configure `web_accessible_resources` only for the renderer and model asset paths. Add scripts `dev`, `build`, `test`, `test:watch`, `typecheck`, `lint`, and `test:e2e`.

- [ ] **Step 4: Install the declared dependencies and verify the test passes.**

Run: `npm install && npm test -- src/shared/messages.test.ts`

Expected: PASS.

- [ ] **Step 5: Verify the skeleton compiles.**

Run: `npm run typecheck && npm run build`

Expected: both commands exit 0 and `dist/` contains an unpackable MV3 build.

- [ ] **Step 6: Leave changes uncommitted.**

Do not run `git commit`; project policy requires user-reviewable working-tree changes.

### Task 2: Implement the closed action contract

**Files:**
- Create: `src/actions/contract.ts`, `src/actions/contract.test.ts`

**Interfaces:**
- Consumes: `CharacterDefinition` from `src/characters/types.ts` (introduced in Task 3).
- Produces: `parseActionResponse(input: unknown): ParsedActionResponse` and `validateActions(response: ParsedActionResponse, character: CharacterDefinition): ValidatedAction[]`.

- [ ] **Step 1: Write failing parser/validator tests.**

```ts
it('rejects an unknown character action before it reaches the runtime', () => {
  const response = parseActionResponse({ reply: 'Hi', actions: [{ action: 'delete', parameters: {} }] });
  expect(() => validateActions(response, bunnyFairy)).toThrow('Unsupported character action: delete');
});

it('accepts a bounded speech action', () => {
  const response = parseActionResponse({ reply: 'Hi', actions: [{ action: 'speak', parameters: { text: 'Hi' } }] });
  expect(validateActions(response, bunnyFairy)).toEqual([{ action: 'speak', parameters: { text: 'Hi' } }]);
});
```

- [ ] **Step 2: Run tests to verify failure.**

Run: `npm test -- src/actions/contract.test.ts`

Expected: FAIL because the parser and catalog are absent.

- [ ] **Step 3: Implement strict parsing and capability validation.**

```ts
export type ParsedActionResponse = {
  reply: string;
  actions: Array<{ action: string; parameters: Record<string, unknown> }>;
};

export function parseActionResponse(input: unknown): ParsedActionResponse {
  const value = typeof input === 'string' ? JSON.parse(input) : input;
  if (!isPlainObject(value) || !hasOnlyKeys(value, ['reply', 'actions']) ||
      typeof value.reply !== 'string' || value.reply.length > 280 || !Array.isArray(value.actions) ||
      value.actions.length > 3) throw new Error('Invalid action response');
  return { reply: value.reply, actions: value.actions.map(parseAction) };
}
```

`parseAction` must require a plain-object parameter map. `validateActions` must only accept actions declared by the active character, require `text` only for `speak`, cap it at 280 characters, reject extra parameters, and return immutable validated data.

- [ ] **Step 4: Run the focused test file.**

Run: `npm test -- src/actions/contract.test.ts`

Expected: PASS, including malformed JSON, extra field, batch-limit, and invalid-parameter cases.

- [ ] **Step 5: Leave changes uncommitted.**

Do not commit.

### Task 3: Define the portable character registry and Bunny Fairy mapping

**Files:**
- Create: `src/characters/types.ts`, `src/characters/bunny-fairy.ts`, `src/characters/registry.ts`, `src/characters/bunny-fairy.test.ts`, `public/characters/bunny-fairy/character.json`
- Copy: supplied files from `TTspoon_Bunny_Fairy.zip` into `public/characters/bunny-fairy/model/` and `public/characters/bunny-fairy/expressions/`

**Interfaces:**
- Produces: `CharacterDefinition`, `CharacterActionDefinition`, `getCharacter(id: string): CharacterDefinition | undefined`, and exported `bunnyFairy`.
- Consumed by: Tasks 2, 4, 5, 6, 7, and 9.

- [ ] **Step 1: Write failing catalog tests.**

```ts
it('maps Bunny Fairy public actions without exposing raw model parameter IDs', () => {
  expect(bunnyFairy.actions.blush).toMatchObject({ kind: 'expression', file: 'expressions/Blush.exp3.json' });
  expect(bunnyFairy.actions.wave).toMatchObject({ kind: 'procedural', name: 'wave' });
  expect(bunnyFairy.actions).not.toHaveProperty('ParamMouthOpenY');
});
```

- [ ] **Step 2: Run the tests to verify failure.**

Run: `npm test -- src/characters/bunny-fairy.test.ts`

Expected: FAIL because the registry is absent.

- [ ] **Step 3: Implement the character definition and copy the assets unchanged.**

```ts
export type CharacterActionDefinition =
  | { kind: 'expression'; file: string }
  | { kind: 'procedural'; name: 'idle' | 'wave' | 'speak' | 'fox-ear-color' };

export type CharacterDefinition = {
  id: string;
  name: string;
  modelPath: string;
  actions: Readonly<Record<string, CharacterActionDefinition>>;
};
```

Map the 15 provided expression files to their safe names. Map `idle`, `wave`, and `speak` to named procedural programs. Map `fox_ear_color` only to the named `fox-ear-color` program. Keep `ParamBreath`, `ParamMouthOpenY`, `ParamAngleZ`, and `Param10` private inside the renderer adapter; they do not appear in action response schema or `character.json`.

- [ ] **Step 4: Run mapping and parser tests.**

Run: `npm test -- src/characters/bunny-fairy.test.ts src/actions/contract.test.ts`

Expected: PASS.

- [ ] **Step 5: Leave changes uncommitted.**

Do not commit.

### Task 4: Add provider connections and secret-safe settings

**Files:**
- Create: `src/ai/connection.ts`, `src/ai/demo-connection.ts`, `src/ai/openai-api-key-connection.ts`, `src/ai/connection.test.ts`, `src/background/settings.ts`, `src/background/settings.test.ts`

**Interfaces:**
- Consumes: `ParsedActionResponse` from Task 2.
- Produces: `AIConnection.generateActionResponse(request: ActionRequest): Promise<unknown>`, `ConnectionKind`, `saveOpenAIApiKey(key: string): Promise<void>`, `removeOpenAIApiKey(): Promise<void>`, and `getSafeConnectionSettings(): Promise<SafeConnectionSettings>`.

- [ ] **Step 1: Write failing safety tests.**

```ts
it('does not return the API key in safe settings', async () => {
  await saveOpenAIApiKey('sk-test-secret');
  await expect(getSafeConnectionSettings()).resolves.toEqual({ kind: 'openai-api-key', isConfigured: true });
});

it('marks the deterministic provider as demo', async () => {
  await expect(new DemoConnection().generateActionResponse({ prompt: 'say hi', character: bunnyFairy }))
    .resolves.toMatchObject({ reply: expect.any(String), actions: expect.any(Array) });
});
```

- [ ] **Step 2: Run tests to verify failure.**

Run: `npm test -- src/ai/connection.test.ts src/background/settings.test.ts`

Expected: FAIL because providers and storage functions are absent.

- [ ] **Step 3: Implement connections and storage boundaries.**

```ts
export interface AIConnection {
  readonly kind: 'demo' | 'openai-api-key' | 'openai-account' | 'codex-account';
  generateActionResponse(request: ActionRequest): Promise<unknown>;
}

export type SafeConnectionSettings = {
  kind: AIConnection['kind'];
  isConfigured: boolean;
};
```

Store the key under a private storage key in `chrome.storage.local`, trim and reject an empty input, and expose only `isConfigured` to UI callers. Implement the demo connection as a deterministic prompt-to-allowed-action selector. Implement API-key fetch in the service worker with the key read immediately before the request; never include it in thrown error messages. Use a strict request body asking for the Task 2 JSON contract, parse its JSON response through Task 2, and normalize `fetch` errors to `Provider request failed`. Account/Codex selections return `{ code: 'notConfigured' }` and never navigate to an authentication page.

- [ ] **Step 4: Run focused tests.**

Run: `npm test -- src/ai/connection.test.ts src/background/settings.test.ts`

Expected: PASS, including redaction and unsupported-provider cases.

- [ ] **Step 5: Leave changes uncommitted.**

Do not commit.

### Task 5: Build the runtime contracts and sequential character executor

**Files:**
- Create: `src/runtime/types.ts`, `src/runtime/character-runtime.ts`, `src/runtime/character-runtime.test.ts`

**Interfaces:**
- Consumes: `ValidatedAction` from Task 2 and `CharacterDefinition` from Task 3.
- Produces: `CharacterRuntime.load(character)`, `CharacterRuntime.execute(actions)`, `CharacterRuntime.enterIdle()`, and `CharacterRuntime.dispose()`.

- [ ] **Step 1: Write failing order/cancellation tests.**

```ts
it('executes validated actions serially and restores idle after completion', async () => {
  const runtime = createRuntimeSpy();
  const character = new CharacterRuntime(runtime);
  await character.execute([{ action: 'blush', parameters: {} }, { action: 'speak', parameters: { text: 'Hi' } }]);
  expect(runtime.events).toEqual(['expression:Blush.exp3.json', 'speak:Hi', 'idle']);
});
```

- [ ] **Step 2: Run test to verify failure.**

Run: `npm test -- src/runtime/character-runtime.test.ts`

Expected: FAIL because `CharacterRuntime` is absent.

- [ ] **Step 3: Implement narrow runtime contracts.**

```ts
export interface Live2DRuntime {
  load(modelUrl: string): Promise<void>;
  applyExpression(file: string): Promise<void>;
  runProcedural(name: 'idle' | 'wave' | 'speak' | 'fox-ear-color', parameters: Record<string, unknown>): Promise<void>;
  dispose(): void;
}
```

`CharacterRuntime` resolves actions using the active character map, calls the corresponding runtime method sequentially, aborts the prior queue when a new request starts, clears timers/audio on disposal, and always attempts idle after a completed non-idle queue. It accepts only `ValidatedAction[]`; no provider data reaches this layer.

- [ ] **Step 4: Run focused tests.**

Run: `npm test -- src/runtime/character-runtime.test.ts`

Expected: PASS, including queue replacement, unsupported state, and disposal.

- [ ] **Step 5: Leave changes uncommitted.**

Do not commit.

### Task 6: Implement the Pixi/Live2D adapter with an explicit Cubism Core gate

**Files:**
- Create: `src/runtime/pixi-live2d-runtime.ts`, `src/runtime/pixi-live2d-runtime.test.ts`, `src/vendor/.gitkeep`, `src/vendor/README.md`

**Interfaces:**
- Implements: `Live2DRuntime` from Task 5.
- Consumed by: content overlay bootstrap in Task 7.

- [ ] **Step 1: Write failing adapter tests around the Core gate.**

```ts
it('reports a setup error when the local Cubism Core is unavailable', async () => {
  await expect(new PixiLive2DRuntime(canvas).load('/characters/bunny-fairy/model/bunny_vts.model3.json'))
    .rejects.toThrow('Cubism Core is not installed');
});
```

- [ ] **Step 2: Run the test to verify failure.**

Run: `npm test -- src/runtime/pixi-live2d-runtime.test.ts`

Expected: FAIL because the adapter is absent.

- [ ] **Step 3: Implement the adapter and documented license boundary.**

```ts
if (!globalThis.Live2DCubismCore) {
  throw new Error('Cubism Core is not installed. Add the licensed Core build to src/vendor/live2dcubismcore.min.js.');
}
```

Create the Pixi application with an alpha canvas and `backgroundAlpha: 0`, load the model using an extension URL, and scale/center it to the overlay bounds. Implement expression lookup, idle breathing/hair sway, procedural angle-Z wave, mouth-open animation tied to `speechSynthesis`, and a bounded fox-ear-colour parameter change. Use a testable injected renderer facade so Vitest never needs WebGL or a licensed Core. `src/vendor/README.md` must state the exact filename, local-only bundling requirement, and that the developer must obtain it after accepting Live2D terms.

- [ ] **Step 4: Run focused tests.**

Run: `npm test -- src/runtime/pixi-live2d-runtime.test.ts src/runtime/character-runtime.test.ts`

Expected: PASS, including the missing-Core message and public-action-only mapping.

- [ ] **Step 5: Leave changes uncommitted.**

Do not commit.

### Task 7: Mount a transparent, draggable, accessible page overlay

**Files:**
- Create: `src/content/index.tsx`, `src/content/overlay-app.tsx`, `src/content/overlay.css`, `src/content/overlay-app.test.tsx`

**Interfaces:**
- Consumes: `CharacterRuntime`, `PixiLive2DRuntime`, `ExtensionMessage`.
- Produces: `mountOverlay(): OverlayHandle` and `OverlayHandle.dispose(): void`.

- [ ] **Step 1: Write a failing overlay interaction test.**

```tsx
it('keeps the page surface click-through while the avatar drag handle is interactive', () => {
  render(<OverlayApp runtime={runtime} />);
  expect(screen.getByTestId('overlay-root')).toHaveStyle({ pointerEvents: 'none', background: 'transparent' });
  expect(screen.getByRole('button', { name: 'Move avatar' })).toHaveStyle({ pointerEvents: 'auto' });
});
```

- [ ] **Step 2: Run the test to verify failure.**

Run: `npm test -- src/content/overlay-app.test.tsx`

Expected: FAIL because the overlay component is absent.

- [ ] **Step 3: Implement the Shadow DOM overlay.**

```ts
const host = document.createElement('div');
host.id = '__eidolon_overlay_host__';
const shadow = host.attachShadow({ mode: 'closed' });
document.documentElement.append(host);
```

Attach styles to the closed Shadow DOM, use a `position: fixed; inset: 0; pointer-events: none; background: transparent` root, and put the draggable avatar panel in a `pointer-events: auto` child. Persist only normalized viewport-relative `x`/`y` coordinates, clamp them after resize, provide an accessible “Move avatar” button and “Hide avatar” button, and use pointer capture during dragging. Dispose old overlays before mounting a replacement.

- [ ] **Step 4: Run focused UI/runtime tests.**

Run: `npm test -- src/content/overlay-app.test.tsx src/runtime/pixi-live2d-runtime.test.ts`

Expected: PASS.

- [ ] **Step 5: Leave changes uncommitted.**

Do not commit.

### Task 8: Wire popup controls, service worker routing, and demo execution

**Files:**
- Modify: `src/background/service-worker.ts`, `src/popup/popup-app.tsx`, `src/shared/messages.ts`
- Create: `src/background/service-worker.test.ts`, `src/popup/popup-app.test.tsx`

**Interfaces:**
- Consumes: Tasks 2–7.
- Produces: popup actions `Show avatar`, `Hide avatar`, `Run demo`, `Save API key`, and `Disconnect`.

- [ ] **Step 1: Write failing worker and popup tests.**

```ts
it('injects the overlay only for the user-selected active tab', async () => {
  await routeMessage({ type: 'overlay/show', tabId: 17 }, senderForTab(17));
  expect(executeScript).toHaveBeenCalledWith(expect.objectContaining({ target: { tabId: 17 } }));
});

it('never renders a stored key value in the popup', async () => {
  render(<PopupApp />);
  expect(await screen.findByLabelText('OpenAI API key')).toHaveValue('');
});
```

- [ ] **Step 2: Run tests to verify failure.**

Run: `npm test -- src/background/service-worker.test.ts src/popup/popup-app.test.tsx`

Expected: FAIL because routing and UI controls are absent.

- [ ] **Step 3: Implement sender-checked routing and explicit controls.**

```ts
if (message.type === 'overlay/show' && sender.tab?.id !== message.tabId) {
  throw new Error('Sender tab does not match requested tab');
}
```

Use `chrome.scripting.executeScript` only after an explicit popup action and only for the selected active tab. Send demo/provider action results through the background to the injected overlay; parse and validate them before forwarding. Disable unavailable account/Codex provider choices with explanatory copy. API-key entry is an empty password field; after save it becomes a `Configured` status with a `Disconnect` button. Do not log request payloads, model output, or key material.

- [ ] **Step 4: Run focused tests.**

Run: `npm test -- src/background/service-worker.test.ts src/popup/popup-app.test.tsx`

Expected: PASS, including sender mismatch, unavailable provider, and key-redaction paths.

- [ ] **Step 5: Leave changes uncommitted.**

Do not commit.

### Task 9: Add independent local character ZIP import

**Files:**
- Create: `src/import/validate-archive.ts`, `src/import/import-character.ts`, `src/import/validate-archive.test.ts`, `src/import/import-character.test.ts`
- Modify: `src/characters/registry.ts`, `src/popup/popup-app.tsx`

**Interfaces:**
- Produces: `validateCharacterArchive(bytes: Uint8Array): Promise<ImportedCharacter>` and `importCharacter(file: File): Promise<CharacterDefinition>`.
- Consumes: `CharacterDefinition` and registry interface from Task 3.

- [ ] **Step 1: Write failing import validation tests.**

```ts
it('rejects a ZIP that traverses outside its character directory', async () => {
  await expect(validateCharacterArchive(zipWith({ '../escape.moc3': bytes }))).rejects.toThrow('Unsafe archive path');
});

it('rejects a model JSON that references a missing texture', async () => {
  await expect(validateCharacterArchive(zipWithModel({ Textures: ['missing.png'] }))).rejects.toThrow('Missing model reference: missing.png');
});
```

- [ ] **Step 2: Run tests to verify failure.**

Run: `npm test -- src/import/validate-archive.test.ts src/import/import-character.test.ts`

Expected: FAIL because the import layer is absent.

- [ ] **Step 3: Implement in-memory archive inspection and IndexedDB persistence.**

```ts
const allowedExtensions = new Set(['.model3.json', '.moc3', '.physics3.json', '.cdi3.json', '.exp3.json', '.png']);
if (path.startsWith('/') || path.split('/').includes('..') || !allowedExtensions.has(extensionFor(path))) {
  throw new Error('Unsafe archive path');
}
```

Use `fflate` to inspect the local file in memory, cap compressed and expanded byte counts, require exactly one `.model3.json`, parse only JSON, resolve its referenced files relative to its directory, and synthesize a `character.json`-equivalent registry record. Persist data/metadata to IndexedDB, reject duplicate IDs, and update the registry only after persistence succeeds. Keep import independent from AI provider state.

- [ ] **Step 4: Run focused tests.**

Run: `npm test -- src/import/validate-archive.test.ts src/import/import-character.test.ts src/characters/bunny-fairy.test.ts`

Expected: PASS, including accepted Bunny Fairy-shaped archive and size/reference failures.

- [ ] **Step 5: Leave changes uncommitted.**

Do not commit.

### Task 10: Add extension end-to-end verification and developer documentation

**Files:**
- Create: `tests/e2e/overlay.spec.ts`, `tests/fixtures/host-page.html`
- Modify: `README.md`, `playwright.config.ts`

**Interfaces:**
- Consumes: built extension and all preceding public interfaces.
- Produces: repeatable unpacked-extension test flow and exact installation instructions.

- [ ] **Step 1: Write the failing E2E flow.**

```ts
test('shows a transparent avatar overlay and dispatches a demo action', async ({ context, page }) => {
  await page.goto(fixtureUrl);
  await openExtensionPopup(context);
  await page.getByRole('button', { name: 'Show avatar' }).click();
  await expect(page.locator('#__eidolon_overlay_host__')).toBeAttached();
  await expect(page.locator('[data-testid="overlay-root"]')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
});
```

- [ ] **Step 2: Run it to verify the initial failure.**

Run: `npm run build && npm run test:e2e -- tests/e2e/overlay.spec.ts`

Expected: FAIL until extension loading and overlay behavior are wired.

- [ ] **Step 3: Configure the persistent Chrome extension test context and complete documentation.**

```ts
export default defineConfig({
  use: { headless: false },
  testDir: 'tests/e2e',
});
```

Launch Chromium with `--disable-extensions-except=<absolute dist path>` and `--load-extension=<absolute dist path>`, use the generated extension ID to open the popup, and test the page overlay against the local fixture. In `README.md`, document prerequisites, `npm install`, how to obtain and place the licensed Cubism Core, `npm run dev`, `npm run build`, loading `dist/` unpacked in Chrome, the supplied Bunny Fairy rights caveat, and the difference between demo and real API-key connections.

- [ ] **Step 4: Run the complete verification suite.**

Run: `npm test && npm run typecheck && npm run lint && npm run build && npm run test:e2e`

Expected: all checks pass. If the Cubism Core is absent, unit/E2E tests use the renderer facade and the README clearly documents the manual real-model smoke test as blocked by that external prerequisite.

- [ ] **Step 5: Run whitespace verification when available and leave changes uncommitted.**

Run: `git rev-parse --is-inside-work-tree >/dev/null 2>&1 && git diff --check || true`

Expected: no whitespace errors in a Git workspace; no failure in this currently non-Git workspace. Do not commit.

## Plan Self-Review

- **Spec coverage:** Tasks 1, 7, and 8 implement the extension surfaces and transparent overlay. Tasks 2, 4, 5, and 8 implement the AI-to-action pipeline and provider boundary. Tasks 3 and 6 implement the Bunny Fairy character and Live2D abstraction. Task 9 implements independent local import. Task 10 covers browser verification and operational documentation. The native desktop overlay, account OAuth, cloud storage, motion authoring, and tracking remain explicitly deferred.
- **External prerequisite:** A licensed Cubism Core file is not supplied with the model archive. Task 6 makes its absence an explicit setup failure rather than silently substituting a mock for the real renderer.
- **Type consistency:** `ValidatedAction` is the only action input to `CharacterRuntime`; `Live2DRuntime` only receives catalog-resolved expression files or named procedural actions; `ExtensionMessage` only crosses extension boundaries after validation.
- **Placeholder scan:** No incomplete implementation markers are present. Each task has a concrete test, command, interface, and expected result.
