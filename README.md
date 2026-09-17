# Eidolon Canvas Morph Engine

Eidolon is a Chrome Manifest V3 extension that places a transparent, draggable
Canvas 2D shape above the active webpage. The bundled model is a layered,
gradient blob that gently moves and morphs through its built-in action library.
AI is disabled in this release; the shape autonomously cycles through only
project-owned actions.

## Run locally

1. Use Node 20.19+ or Node 22.12+ (the workspace's Node 21 can build but Vite
   reports it as unsupported).
2. Run `npm install` and `npm run build`.
3. In Chrome, open `chrome://extensions`, enable Developer mode, choose **Load
   unpacked**, and select `dist/`.
4. Open an ordinary web page, select the Eidolon toolbar icon, then select
   **Show shape**. The overlay is transparent outside the shape controls.

Chrome will request access to web pages because Eidolon must be able to inject
the overlay into a page only after you explicitly select **Show shape**. It
does not collect page contents, make network requests, or store credentials.
It stores only the draggable overlay position in browser extension storage.

## Verification

Run `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, and
`npm run test:e2e`.
# project-eidolon
