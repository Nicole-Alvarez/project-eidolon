# Eidolon Live2D extension

Eidolon is a Chrome Manifest V3 extension that places a transparent, draggable
Live2D character overlay above the active webpage. The initial bundled
character is Bunny Fairy. Demo actions use a deterministic local source;
OpenAI API-key support is isolated in the service worker and never exposes a
saved key to a page script or displays it after saving.

## Run locally

1. Use Node 20.19+ or Node 22.12+ (the workspace's Node 21 can build but Vite
   reports it as unsupported).
2. Run `npm install` and `npm run build`.
3. In Chrome, open `chrome://extensions`, enable Developer mode, choose **Load
   unpacked**, and select `dist/`.
4. Open an ordinary web page, select the Eidolon toolbar icon, then select
   **Show avatar**. The overlay is transparent outside the avatar controls.

Chrome will request access to web pages because Eidolon must be able to inject
the overlay into a page only after you explicitly select **Show avatar**. It
does not collect page contents or send them to the provider.

## Live2D Core prerequisite

The Bunny Fairy archive contains a valid Cubism 3 model, textures, physics,
and expressions. It does not contain the licensed Cubism Core required to
render it. Obtain the Web Core directly from Live2D after accepting its terms,
then place `live2dcubismcore.min.js` in `src/vendor/` and rebuild. Until then,
the overlay appears with an explicit setup message rather than pretending the
model is running.

The model asset and Cubism runtime have separate rights. Confirm that you may
redistribute Bunny Fairy and complete any applicable Live2D publication terms
before release.

## Character import

The popup's **Import Live2D ZIP** control validates a local Cubism archive in
memory, rejects unsafe paths and missing model references, then stores accepted
assets in extension-local IndexedDB. This import path is independent from AI
provider configuration.

## Verification

Run `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, and
`npm run test:e2e`. The browser smoke test intentionally checks overlay
injection only; a real-model smoke test requires the licensed Core.
# project-eidolon
