import { createRoot } from 'react-dom/client';
import overlayCss from './overlay.css?inline';
import { OverlayApp } from './overlay-app';
import { PixiLive2DRuntime } from '../runtime/pixi-live2d-runtime';
import { CharacterRuntime } from '../runtime/character-runtime';
import { bunnyFairy } from '../characters/bunny-fairy';
import { validateActions, type ParsedActionResponse } from '../actions/contract';

const hostId = '__eidolon_overlay_host__';
let activeOverlay: OverlayHandle | undefined;

export type OverlayHandle = { dispose(): void; run(response: ParsedActionResponse): Promise<void> };

export function mountOverlay(): OverlayHandle {
  activeOverlay?.dispose();
  const host = document.createElement('div');
  host.id = hostId;
  const shadow = host.attachShadow({ mode: 'closed' });
  const style = document.createElement('style');
  style.textContent = overlayCss;
  const mount = document.createElement('div');
  shadow.append(style, mount);
  document.documentElement.append(host);

  let characterRuntime: CharacterRuntime | undefined;
  const root = createRoot(mount);
  const render = (status: string) => root.render(<OverlayApp status={status} onHide={() => activeOverlay?.dispose()} />);
  render('Loading Bunny Fairy…');

  queueMicrotask(async () => {
    const canvas = shadow.querySelector('canvas');
    if (!(canvas instanceof HTMLCanvasElement)) return;
    try {
      const runtime = new PixiLive2DRuntime(canvas);
      characterRuntime = new CharacterRuntime(runtime);
      await characterRuntime.load({ ...bunnyFairy, modelPath: chrome.runtime.getURL(bunnyFairy.modelPath) });
      render('Ready');
    } catch (error) {
      render(error instanceof Error ? error.message : 'Character runtime could not start');
    }
  });

  const handle: OverlayHandle = {
    dispose() {
      characterRuntime?.dispose();
      root.unmount();
      host.remove();
      if (activeOverlay === handle) activeOverlay = undefined;
    },
    async run(response) {
      if (!characterRuntime) throw new Error('Character runtime is not ready');
      await characterRuntime.execute(validateActions(response, bunnyFairy));
    },
  };
  activeOverlay = handle;
  return handle;
}

const readyFlag = '__eidolon_content_ready__';
if (!(globalThis as Record<string, unknown>)[readyFlag]) {
  (globalThis as Record<string, unknown>)[readyFlag] = true;
  chrome.runtime.onMessage.addListener((message: unknown) => {
    if (!isMessage(message)) return;
    if (message.type === 'overlay/show') mountOverlay();
    if (message.type === 'overlay/hide') activeOverlay?.dispose();
    if (message.type === 'overlay/run') void activeOverlay?.run(message.response);
  });
}

function isMessage(value: unknown): value is { type: 'overlay/show' | 'overlay/hide' } | { type: 'overlay/run'; response: ParsedActionResponse } {
  return typeof value === 'object' && value !== null && 'type' in value &&
    ((value as { type: unknown }).type === 'overlay/show' || (value as { type: unknown }).type === 'overlay/hide' || (value as { type: unknown }).type === 'overlay/run');
}
