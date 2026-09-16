# AI-Controlled Live2D Extension MVP — Design

## Goal

Build a Chrome Manifest V3 extension that renders a transparent, draggable
Live2D overlay above permitted web pages. A structured AI response is parsed,
validated, and dispatched to a character runtime without giving the AI access
to Live2D internals.

## Scope

The MVP delivers one bundled character, **Bunny Fairy**, from the supplied
`TTspoon_Bunny_Fairy.zip` archive, and demonstrates this flow:

```text
Action source (demo or OpenAI API-key provider)
  -> structured response parser
  -> action validator
  -> character action adapter
  -> Live2D runtime overlay
```

It does not provide account OAuth, Codex-account authentication, cloud asset
storage, a database, a desktop-wide overlay, facial tracking, authored Live2D
motions, a marketplace, or a full character editor.

## Product Shape

### Extension surfaces

- **Page overlay:** The content script mounts an extension-owned Shadow DOM
  host in the active page. Its full-screen container is pointer-transparent;
  only the avatar and its small controls accept input. The canvas and its
  surrounding layout are transparent, making the model appear to float above
  the page.
- **Popup:** A compact settings surface controls enablement, per-site
  visibility, character selection, provider selection, and API-key entry. It
  never re-displays a stored secret.
- **Service worker:** Owns persisted settings, provider calls, and messages
  between the popup and page overlay. Page scripts never receive API keys.

The overlay is deliberately in-page rather than a browser popup or side panel:
it can be transparent and positioned freely over the current website. It is
not an always-on-top operating-system window; that future capability requires
an optional native companion application.

### Bootstrap architecture

The empty workspace becomes a Vite + React + TypeScript Chrome extension,
built with a Manifest V3-aware Vite integration. Source is split by the
extension boundary and domain responsibility rather than placing runtime logic
inside UI components.

```text
src/
  background/        MV3 service worker and message handlers
  content/           overlay bootstrap, Shadow DOM host, and page UI
  popup/             extension popup settings UI
  ai/                connection interfaces and response producers
  actions/           response parser, validation, and dispatch types
  characters/        manifest registry and Bunny Fairy action mapping
  runtime/           CharacterRuntime and Live2DRuntime adapters
  shared/            messages, storage schemas, and safe utilities
public/characters/   portable bundled character directories
```

## Character and Asset Design

### Portable character directory

The initial asset is copied without modification into:

```text
public/characters/bunny-fairy/
  character.json
  model/bunny_vts.model3.json
  model/bunny_vts.moc3
  model/bunny_vts.physics3.json
  model/bunny_vts.cdi3.json
  model/bunny_vts.1024/texture_00.png
  model/bunny_vts.1024/texture_01.png
  expressions/*.exp3.json
```

`character.json` is application metadata, not a replacement model format. It
references the original Cubism `.model3.json`, lists supported public actions,
and maps each to an expression or a named procedural animation. The import
workflow validates that a ZIP can materialize this same portable layout—one
`.model3.json`, its referenced `.moc3` and textures, and only safe relative
paths—then stores its files and metadata in extension-local IndexedDB. It must
reject path traversal, missing references, duplicate character IDs, unsupported
file types, and archives that exceed an explicit size limit.

### Bunny Fairy action catalog

The supplied archive is a Cubism 3 model with physics, two textures, and 15
separate `.exp3.json` expression files. Its `.model3.json` has no motion
groups, so the initial mapping is intentionally honest:

- `idle`: periodic `ParamBreath` plus gentle angle/hair movement.
- `speak`: drives `ParamMouthOpenY` while the browser's speech synthesis reads
  a validated short response; falls back to mouth movement plus on-screen text
  if speech synthesis is unavailable.
- `wave`: a procedural `ParamAngleZ`/arm gesture, labelled procedural rather
  than a Cubism motion.
- Expression-backed actions: `angry`, `blush`, `sad`, `what`, `knife`,
  `hammer`, `beer`, `shotgun`, `ipad`, `no1_flag`, `ttvava`, `ungo`,
  `bunny_suit`, `fox_ear`, and `turn_180`.
- `fox_ear_color`: a named procedural parameter change (`Param10`), because
  the supplied package exposes its color control as a model parameter rather
  than a second expression file.

Character actions are capability-based. A future character can expose a
different catalog; unsupported actions are rejected before reaching the model.

### Live2D runtime

`Live2DRuntime` is responsible only for loading a Cubism model and applying
named expressions or parameter tracks. `CharacterRuntime` owns public action
mapping, action cancellation, state, and errors. The selected web renderer is
PixiJS with `pixi-live2d-display`'s Cubism 4 bundle, which supports Cubism 3
models through the Cubism 4-compatible runtime. The licensed Cubism Core is a
separately acquired, pinned local build input; it is never hot-linked. Setup
must document the license requirement and fail with a clear developer error if
the Core has not been supplied.

The supplied model and the Cubism SDK have separate rights. The implementation
does not imply redistribution rights for either. Before publishing, the owner
must confirm model redistribution permission and complete any applicable
Live2D publication licensing.

## AI and Action Design

### Provider boundary

```ts
interface AIConnection {
  readonly kind: 'demo' | 'openai-api-key' | 'openai-account' | 'codex-account';
  generateActionResponse(request: ActionRequest): Promise<unknown>;
}
```

- `DemoConnection` is a deterministic local action producer for tests and
  first-run use. It is visibly labelled **Demo**, never presented as AI.
- `OpenAIApiKeyConnection` is the real integration point. Its fetch runs only
  in the service worker. The API key is saved locally through Chrome extension
  storage, never put in content-script messages, UI state, logs, errors, test
  fixtures, source, or URLs.
- `OpenAIAccountConnection` and `CodexAccountConnection` are unavailable
  placeholders that return an explicit `notConfigured` result. No pretend OAuth
  or account-auth screen is included.

For a real provider, the service worker asks for a machine-readable response
with a reply and action array. Model identity is a non-secret user setting;
the default is documented and configurable. Provider/network failures preserve
the current character pose and return a user-safe error.

### Strict action contract

The parser accepts only a complete JSON object matching this shape:

```json
{
  "reply": "I can help with that!",
  "actions": [
    { "action": "speak", "parameters": { "text": "I can help with that!" } },
    { "action": "blush", "parameters": {} }
  ]
}
```

Validation is closed by default:

- reject malformed JSON, extra top-level fields, unknown actions, invalid
  parameter shapes, non-string speech, overly long text, and action batches
  over the configured limit;
- validate against the selected character's catalog, not a global set;
- use only object data and typed parameter tracks—never evaluate generated
  JavaScript or let a provider name a parameter ID/file/URL;
- execute sequentially with a bounded duration; cancelling an overlay removes
  timers and restores idle state;
- show a concise failure status without echoing provider responses or secrets.

## Character Import

The initial Bunny Fairy directory is bundled. The popup also exposes a local
ZIP import flow, independent of AI configuration:

```text
User selects ZIP
  -> inspect archive in extension memory
  -> validate Cubism references and safe paths
  -> normalize into character directory metadata
  -> persist the approved asset payload and registry entry locally
  -> make the character available to the overlay
```

Because Chrome extensions cannot write arbitrary repository directories at
runtime, imported models are stored in extension-local IndexedDB. The portable
ZIP is retained with its registry metadata for export; bundled development
assets remain under `public/characters`. Import is intentionally limited to
local files—no cloud storage or database service.

## Error Handling and Security

- Require `activeTab` and narrowly scoped scripting capability for overlay
  activation; avoid blanket host permissions where practical.
- Use extension-owned assets via `chrome.runtime.getURL()` and a restrictive
  `web_accessible_resources` rule. Do not trust page DOM or page messages.
- Keep content scripts in their isolated world and validate every service
  worker message by discriminated type and sender tab.
- Treat model archives and AI output as untrusted input. Do not execute,
  import, or render arbitrary code from either.
- API-key storage is local-only. Deleting/disconnecting a provider removes the
  key and resets its connection state. Runtime logs contain event categories,
  never credential or prompt/response contents.
- Respect Content Security Policy; bundle all executable runtime code and do
  not use `eval`, remote scripts, or unpinned runtime URLs.

## Testing and Verification

- Unit tests cover the parser, validator, Bunny Fairy catalog, action mapping,
  import path/reference validation, message validation, and provider-secret
  redaction.
- Component tests cover popup state and overlay controls with a mocked
  `CharacterRuntime`.
- A browser test loads the unpacked extension, enables the overlay on a local
  fixture page, asserts transparent host/canvas behavior, drags the avatar,
  sends a demo action, and confirms a supported expression is dispatched.
- A manual smoke test loads Bunny Fairy with the pinned Cubism Core and checks
  that each listed expression/action does not produce console errors.
- Required checks: targeted tests, full test suite, typecheck, lint,
  production extension build, and `git diff --check` if Git is initialized.

## Non-Goals and Deferred Work

- OS-level transparent/always-on-top windows and a native bridge.
- OAuth for OpenAI/ChatGPT/Codex accounts.
- Remote character hosting, sync, marketplace, analytics, telemetry, or
  server-side persistence.
- Facial tracking, microphones, audio recording, or custom TTS voices.
- Re-rigging, conversion, or editing of Cubism assets.
- Claims that procedural actions are authored Live2D motions.
