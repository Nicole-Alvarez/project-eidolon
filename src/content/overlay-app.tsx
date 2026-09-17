import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { clampOverlaySize, defaultOverlaySize, extensionPositionStorage, loadOverlayPosition, loadOverlayResize, loadOverlaySize, saveOverlayPosition, saveOverlayResize, saveOverlaySize, type OverlayPosition, type PositionStorage } from './overlay-position';

type OverlayAppProps = {
  onCanvasReady?: (canvas: HTMLCanvasElement) => void | (() => void);
  positionStore?: PositionStorage;
};

type DragOrigin = { clientX: number; clientY: number; position: OverlayPosition; size: number };
type ResizeCorner = 'nw' | 'ne' | 'sw' | 'se';
type ResizeOrigin = { startClientX: number; startClientY: number; size: number; position: OverlayPosition; corner: ResizeCorner };
export const gutterSize = 96;
export const stageSizeOf = (size: number) => size + gutterSize;
const resizeHandleInset = 2;
const resizeHandleSize = 18;

export function OverlayApp({ onCanvasReady, positionStore }: OverlayAppProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const dragOrigin = useRef<DragOrigin>();
  const resizeOrigin = useRef<ResizeOrigin>();
  const [position, setPosition] = useState<OverlayPosition>(() => clampPosition(defaultPosition(), defaultOverlaySize + gutterSize));
  const [size, setSize] = useState(defaultOverlaySize);
  const [menuOpen, setMenuOpen] = useState(false);
  const [modelOpen, setModelOpen] = useState(false);
  const [resizeActive, setResizeActive] = useState(false);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [fallbackMessage, setFallbackMessage] = useState<string>();
  const storage = useMemo(() => positionStore ?? safePositionStorage(), [positionStore]);

  useEffect(() => {
    let active = true;
    void loadOverlaySize(storage).then((saved) => { if (active && saved !== undefined) { setSize(saved); setPosition((current) => clampPosition(current, stageSizeOf(saved))); } });
    void loadOverlayPosition(storage).then((saved) => { if (active && saved) setPosition(clampPosition(saved, stageSizeOf(size))); });
    void loadOverlayResize(storage).then((saved) => { if (active && saved !== undefined) setResizeActive(saved); });
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
    dragOrigin.current = { clientX: event.clientX, clientY: event.clientY, position, size };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveDrag(event: React.PointerEvent<HTMLElement>) {
    const origin = dragOrigin.current;
    if (!origin) return;
    setPosition(clampPosition({ x: origin.position.x + event.clientX - origin.clientX, y: origin.position.y + event.clientY - origin.clientY }, stageSizeOf(origin.size)));
  }

  function endDrag() {
    if (!dragOrigin.current) return;
    dragOrigin.current = undefined;
    void saveOverlayPosition(storage, position);
  }

  function startResize(event: React.PointerEvent<HTMLElement>, corner: ResizeCorner) {
    resizeOrigin.current = { startClientX: event.clientX, startClientY: event.clientY, size, position, corner };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveResize(event: React.PointerEvent<HTMLElement>) {
    const origin = resizeOrigin.current;
    if (!origin) return;
    const dx = event.clientX - origin.startClientX;
    const dy = event.clientY - origin.startClientY;
    const outward = origin.corner === 'se' ? (dx + dy) / 2
      : origin.corner === 'nw' ? -(dx + dy) / 2
      : origin.corner === 'ne' ? (dx - dy) / 2
      : (dy - dx) / 2;
    const newSize = clampOverlaySize(origin.size + outward);
    const shift = origin.size - newSize;
    const x = origin.corner === 'nw' || origin.corner === 'sw' ? origin.position.x + shift : origin.position.x;
    const y = origin.corner === 'nw' || origin.corner === 'ne' ? origin.position.y + shift : origin.position.y;
    setSize(newSize);
    setPosition(clampPosition({ x, y }, stageSizeOf(newSize)));
  }

  function endResize() {
    if (!resizeOrigin.current) return;
    resizeOrigin.current = undefined;
    void saveOverlaySize(storage, size);
    void saveOverlayPosition(storage, position);
  }

  function toggleResize() {
    setResizeActive((active) => {
      void saveOverlayResize(storage, !active);
      return !active;
    });
  }

  return (
    <div data-testid="overlay-root" className="overlay-root" style={{ pointerEvents: 'none', background: 'transparent' }}>
      <section data-testid="overlay-stage" className={`morph-stage${resizeActive ? ' resize-mode' : ''}`} aria-label="Eidolon animated shape" style={{ left: position.x, top: position.y, width: stageSizeOf(size), height: stageSizeOf(size), pointerEvents: 'auto' }} onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag}>
        {fallbackMessage ? <p className="canvas-fallback" role="status">{fallbackMessage}</p> : <canvas ref={canvas} className="shape-canvas" style={{ width: size, height: size }} width="300" height="300" aria-label="Animated shape" />}
        <div className="key-control">
          <button className="key-button" aria-label="AI settings" aria-describedby={tooltipVisible ? 'eidolon-key-tooltip' : undefined} aria-expanded={menuOpen} onMouseEnter={() => setTooltipVisible(true)} onMouseLeave={() => setTooltipVisible(false)} onFocus={() => setTooltipVisible(true)} onBlur={() => setTooltipVisible(false)} onClick={() => setMenuOpen((open) => !open)}>
            <span aria-hidden="true">⌘</span>
          </button>
          {tooltipVisible && <span id="eidolon-key-tooltip" role="tooltip" className="key-tooltip">AI settings</span>}
          {menuOpen && <section className="key-menu" aria-label="AI status"><strong>AI disabled</strong><span>Autonomous motion is active</span><small>Secure connection coming later</small></section>}
        </div>
        <div className="model-control"><button className="key-button" aria-label="Choose model" aria-expanded={modelOpen} onClick={() => setModelOpen((open) => !open)}><span aria-hidden="true">◇</span></button>{modelOpen && <section className="model-dialog" role="dialog" aria-label="Choose model"><button onClick={() => { selectModel('blob'); setModelOpen(false); }}><i className="blob-icon" />Blob</button><button onClick={() => { selectModel('shapes'); setModelOpen(false); }}><i className="shape-icon" />Shapes</button></section>}</div>
        <div className="resize-control"><button className="key-button" aria-label="Resize tool" aria-pressed={resizeActive} onClick={toggleResize}><span aria-hidden="true">⤢</span></button></div>
        {resizeActive && (['nw', 'ne', 'sw', 'se'] as const).map((corner) => (
          <button key={corner} className={`resize-handle ${corner}`} aria-label={`Resize shape from ${cornerLabel(corner)}`} style={cornerPosition(corner, size)} onPointerDown={(event) => startResize(event, corner)} onPointerMove={moveResize} onPointerUp={endResize} onPointerCancel={endResize} />
        ))}
      </section>
    </div>
  );
}

function selectModel(id: 'blob' | 'shapes') {
  window.dispatchEvent(new CustomEvent('eidolon:model', { detail: id }));
  if (typeof chrome !== 'undefined') void chrome.storage.local.set({ 'eidolon.canvasOverlay.model': id });
}

function defaultPosition(): OverlayPosition {
  return clampPosition({ x: window.innerWidth - defaultOverlaySize - gutterSize - 24, y: window.innerHeight - defaultOverlaySize - gutterSize - 24 }, defaultOverlaySize + gutterSize);
}

function clampPosition(position: OverlayPosition, currentStageSize: number): OverlayPosition {
  return {
    x: Math.max(12, Math.min(Math.max(12, window.innerWidth - currentStageSize - 12), position.x)),
    y: Math.max(12, Math.min(Math.max(12, window.innerHeight - currentStageSize - 12), position.y)),
  };
}

function safePositionStorage(): PositionStorage {
  if (typeof chrome !== 'undefined' && chrome.storage?.local) return extensionPositionStorage();
  return { get: async () => ({}), set: async () => undefined };
}

function cornerLabel(corner: ResizeCorner): string {
  return corner === 'nw' ? 'top left' : corner === 'ne' ? 'top right' : corner === 'sw' ? 'bottom left' : 'bottom right';
}

function cornerPosition(corner: ResizeCorner, size: number): CSSProperties {
  const far = size - resizeHandleInset - resizeHandleSize;
  return {
    top: corner === 'nw' || corner === 'ne' ? resizeHandleInset : far,
    left: corner === 'nw' || corner === 'sw' ? resizeHandleInset : far,
  };
}