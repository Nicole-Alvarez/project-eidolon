import { useEffect, useMemo, useRef, useState } from 'react';
import { extensionPositionStorage, loadOverlayPosition, saveOverlayPosition, type OverlayPosition, type PositionStorage } from './overlay-position';

type OverlayAppProps = {
  onCanvasReady?: (canvas: HTMLCanvasElement) => void | (() => void);
  positionStore?: PositionStorage;
};

type DragOrigin = { clientX: number; clientY: number; position: OverlayPosition };
const stageSize = 340;

export function OverlayApp({ onCanvasReady, positionStore }: OverlayAppProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const dragOrigin = useRef<DragOrigin>();
  const [position, setPosition] = useState(defaultPosition);
  const [menuOpen, setMenuOpen] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [fallbackMessage, setFallbackMessage] = useState<string>();
  const storage = useMemo(() => positionStore ?? safePositionStorage(), [positionStore]);

  useEffect(() => {
    let active = true;
    void loadOverlayPosition(storage).then((saved) => { if (active && saved) setPosition(clampPosition(saved)); });
    return () => { active = false; };
  }, [storage]);


  useEffect(() => {
    if (!canvas.current || !onCanvasReady) return;
    try {
      return onCanvasReady(canvas.current);
    } catch (error) {
      setFallbackMessage(error instanceof Error ? error.message : 'Canvas 2D is unavailable');
    }
  }, [onCanvasReady]);

  function startDrag(event: React.PointerEvent<HTMLElement>) {
    if (event.target instanceof Element && event.target.closest('button')) return;
    dragOrigin.current = { clientX: event.clientX, clientY: event.clientY, position };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveDrag(event: React.PointerEvent<HTMLElement>) {
    const origin = dragOrigin.current;
    if (!origin) return;
    setPosition(clampPosition({ x: origin.position.x + event.clientX - origin.clientX, y: origin.position.y + event.clientY - origin.clientY }));
  }

  function endDrag() {
    if (!dragOrigin.current) return;
    dragOrigin.current = undefined;
    void saveOverlayPosition(storage, position);
  }

  return (
    <div data-testid="overlay-root" className="overlay-root" style={{ pointerEvents: 'none', background: 'transparent' }}>
      <section data-testid="overlay-stage" className="morph-stage" aria-label="Eidolon animated shape" style={{ left: position.x, top: position.y, pointerEvents: 'auto' }} onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag}>
        {fallbackMessage ? <p className="canvas-fallback" role="status">{fallbackMessage}</p> : <canvas ref={canvas} className="shape-canvas" width="300" height="300" aria-label="Animated shape" />}
        <div className="key-control">
          <button className="key-button" aria-label="AI settings" aria-describedby={tooltipVisible ? 'eidolon-key-tooltip' : undefined} aria-expanded={menuOpen} onMouseEnter={() => setTooltipVisible(true)} onMouseLeave={() => setTooltipVisible(false)} onFocus={() => setTooltipVisible(true)} onBlur={() => setTooltipVisible(false)} onClick={() => setMenuOpen((open) => !open)}>
            <span aria-hidden="true">⌘</span>
          </button>
          {tooltipVisible && <span id="eidolon-key-tooltip" role="tooltip" className="key-tooltip">AI settings</span>}
          {menuOpen && <section className="key-menu" aria-label="AI status"><strong>AI disabled</strong><span>Autonomous motion is active</span><small>Secure connection coming later</small></section>}
        </div>
        <div className="model-control"><button className="key-button" aria-label="Choose model" aria-expanded={modelOpen} onClick={() => setModelOpen((open) => !open)}><span aria-hidden="true">◇</span></button>{modelOpen && <section className="model-dialog" role="dialog" aria-label="Choose model"><button onClick={() => { selectModel('blob'); setModelOpen(false); }}><i className="blob-icon" />Blob</button><button onClick={() => { selectModel('shapes'); setModelOpen(false); }}><i className="shape-icon" />Shapes</button></section>}</div>
      </section>
    </div>
  );
}

function selectModel(id: 'blob' | 'shapes') {
  window.dispatchEvent(new CustomEvent('eidolon:model', { detail: id }));
  if (typeof chrome !== 'undefined') void chrome.storage.local.set({ 'eidolon.canvasOverlay.model': id });
}

function defaultPosition(): OverlayPosition {
  return clampPosition({ x: window.innerWidth - stageSize - 24, y: window.innerHeight - stageSize - 24 });
}

function clampPosition(position: OverlayPosition): OverlayPosition {
  return {
    x: Math.max(12, Math.min(Math.max(12, window.innerWidth - stageSize - 12), position.x)),
    y: Math.max(12, Math.min(Math.max(12, window.innerHeight - stageSize - 12), position.y)),
  };
}

function safePositionStorage(): PositionStorage {
  if (typeof chrome !== 'undefined' && chrome.storage?.local) return extensionPositionStorage();
  return { get: async () => ({}), set: async () => undefined };
}
