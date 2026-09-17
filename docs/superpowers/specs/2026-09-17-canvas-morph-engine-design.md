# Canvas Morph Engine Extension Design

## Purpose

Replace the Live2D character extension with a self-contained, transparent Canvas 2D animation engine. The first visual model is an abstract, layered gradient shape that gently moves and smoothly morphs between predefined visual actions. The engine is reusable: future models are descriptions of elements and target states, not renderer-specific code.

## Scope

This release contains no AI provider, API key storage, account connection, prompt input, or network request. AI is explicitly disabled. While disabled, the extension autonomously selects only project-owned actions from its built-in registry. A future secure provider may request a registered action ID through a validated boundary, but cannot create graphics, code, or arbitrary actions.

The prior Live2D runtime, character catalog/assets, API-key connection code, provider flow, and provider-facing action contract leave the active build. The replacement has no model-runtime dependency.

## Overlay and interaction

The content script mounts a closed-shadow-DOM, transparent overlay on ordinary web pages. The overlay's stage is initially lower-right, remains draggable, and restores its saved position from extension storage. It does not intercept clicks outside its own bounds.

The stage contains a Canvas 2D model and one adjacent Key icon. The icon is the only in-overlay menu action. It has an accessible hover/focus tooltip, labelled “AI settings”, and opens a compact panel that communicates: AI is disabled, autonomous motion is active, and a secure connection will come later. The extension popup is reduced to Show Shape and Hide Shape controls.

## Renderer contract

The Canvas renderer owns a `requestAnimationFrame` loop and a transparent canvas. It accepts a visual state composed of stable-ID elements:

- groups and layers;
- circles, rectangles, lines, text, particles, and closed paths;
- common interpolable properties: position, scale, rotation, opacity, dimensions, stroke, fill/color, and path control points.

Its public boundary is renderer-agnostic so a later SVG, WebGL, or WebGPU backend can implement the same state-rendering interface. The Canvas renderer is the sole initial backend.

## Action and state contract

The central registry owns the only valid action IDs: `idle`, `think`, `listen`, `search`, `happy`, `sleep`, and `reset`. Each action resolves to a target visual state. `reset` targets the baseline idle composition.

The initial model is an ordinary scene definition, not a renderer exception. It includes stable elements for an organic gradient body, inner highlight, orbit strokes, subtle face marks, and small floating particles. Each state changes the existing elements' contours, palette, movement, and particle placement. Idle includes low-amplitude breathing and drift.

The engine exposes `requestAction(actionId)`. It validates the ID against the registry before creating a transition. Unknown IDs have no visual effect and return a clear rejected result. This is the only future provider entry point.

## Morphing and autonomous behavior

A transition snapshots the current rendered values, interpolates that snapshot toward the requested target state, and therefore remains interruption-safe: another valid request never jumps back to a previous start or end state. Matching stable IDs interpolate their compatible properties. New elements softly enter; removed elements fade out. Default transition options define duration and easing, with per-action overrides where a distinct effect is useful.

With AI disabled, an autonomous scheduler waits a calm randomized interval, chooses a non-repeating valid action, plays it, and returns to idle. The scheduler is injected/configurable for deterministic tests. Rendering remains independent of this scheduling and of any future network latency.

## Failure behavior and persistence

If Canvas 2D cannot be created, the overlay presents a concise static fallback message. No provider request is issued, and no secret is collected or stored. Position persistence failures fall back to the lower-right default without preventing rendering.

## Implementation boundaries

New focused modules separate element/state types, the action registry, interpolation/morphing, the animation engine, Canvas drawing, the initial blob-scene definitions, and overlay UI. The content script is only responsible for mounting/unmounting, stage placement, and message wiring; it does not own animation logic.

## Verification

Unit tests will verify action validation, compatible-property interpolation, path/control-point interpolation, element entry/exit, and mid-transition interruption from current frame values. Engine tests will cover deterministic autonomous selection and reset-to-idle behavior. UI tests will cover accessible tooltip/menu behavior and drag-position persistence. A browser-level test will verify Show Shape mounts a transparent lower-right overlay, movement persists, and Hide Shape removes it. Build, typecheck, lint, and all tests must pass before completion.
