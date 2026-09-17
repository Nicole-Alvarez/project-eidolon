import { createRoot } from 'react-dom/client';
import { ActionEngine } from '../engine/action-engine';
import { models } from '../models/registry';
import { CanvasRenderer } from '../engine/canvas-renderer';
import overlayCss from './overlay.css?inline';
import { OverlayApp } from './overlay-app';
import { prefersReducedMotion, waitForExit } from './overlay-transition';

const hostId = '__eidolon_overlay_host__';
let activeOverlay: OverlayHandle | undefined;

export type OverlayHandle = { dispose(): void; exit(): Promise<void>; cancelExit(): void };

export function mountOverlay(): OverlayHandle {
  if (activeOverlay) {
    activeOverlay.cancelExit();
    return activeOverlay;
  }
  const host = document.createElement('div');
  host.id = hostId;
  const shadow = host.attachShadow({ mode: 'closed' });
  const style = document.createElement('style');
  style.textContent = overlayCss;
  const mount = document.createElement('div');
  shadow.append(style, mount);
  document.documentElement.append(host);

  const root = createRoot(mount);
  let exiting = false;

  const handle: OverlayHandle = {
    dispose() {
      root.unmount();
      host.remove();
      if (activeOverlay === handle) activeOverlay = undefined;
    },
    cancelExit() {
      if (!exiting) return;
      exiting = false;
      mount.querySelector('.overlay-root')?.classList.remove('is-exiting');
    },
    async exit() {
      if (exiting) return;
      const overlay = mount.querySelector('.overlay-root');
      const shape = mount.querySelector('.shape-canvas, .canvas-fallback');
      if (!overlay || !shape || prefersReducedMotion()) {
        handle.dispose();
        return;
      }
      exiting = true;
      overlay.classList.add('is-exiting');
      await waitForExit(shape);
      if (!exiting) {
        overlay.classList.remove('is-exiting');
        return;
      }
      handle.dispose();
    },
  };

  root.render(<OverlayApp onCanvasReady={(canvas) => startAnimation(canvas)} />);
  activeOverlay = handle;
  return handle;
}

function startAnimation(canvas: HTMLCanvasElement): () => void {
  const renderer = new CanvasRenderer(canvas);
  let engine = new ActionEngine(models.blob);
  void chrome.storage.local.get('eidolon.canvasOverlay.model').then((stored) => {
    const id = stored['eidolon.canvasOverlay.model'];
    if (id === 'blob') engine = new ActionEngine(models.blob);
    if (id === 'shapes') engine = new ActionEngine(models.shapes);
  });
  let frame = 0;
  const render = (time: number) => {
    renderer.draw(engine.tick(time));
    frame = window.requestAnimationFrame(render);
  };
  const resize = () => renderer.resize();
  const selectModel = (event: Event) => {
    const id = (event as CustomEvent<'blob' | 'shapes'>).detail;
    if (id === 'blob' || id === 'shapes') engine = new ActionEngine(models[id]);
  };
  window.addEventListener('resize', resize);
  window.addEventListener('eidolon:model', selectModel);
  frame = window.requestAnimationFrame(render);
  return () => {
    window.cancelAnimationFrame(frame);
    window.removeEventListener('resize', resize);
    window.removeEventListener('eidolon:model', selectModel);
    renderer.dispose();
  };
}

const readyFlag = '__eidolon_content_ready__';
if (!(globalThis as Record<string, unknown>)[readyFlag]) {
  (globalThis as Record<string, unknown>)[readyFlag] = true;
  chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
    if (!isMessage(message)) return;
    if (message.type === 'overlay/ping') {
      sendResponse({ ready: true });
      return;
    }
    if (message.type === 'overlay/status') {
      sendResponse({ visible: Boolean(activeOverlay) });
      return;
    }
    if (message.type === 'overlay/show') mountOverlay();
    if (message.type === 'overlay/hide') void activeOverlay?.exit();
  });
}

function isMessage(value: unknown): value is { type: 'overlay/show' | 'overlay/hide' | 'overlay/ping' | 'overlay/status' } {
  return typeof value === 'object' && value !== null && 'type' in value &&
    ((value as { type: unknown }).type === 'overlay/show' || (value as { type: unknown }).type === 'overlay/hide' || (value as { type: unknown }).type === 'overlay/ping' || (value as { type: unknown }).type === 'overlay/status');
}
