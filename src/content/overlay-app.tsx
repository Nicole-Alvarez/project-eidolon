import { useRef, useState, type RefObject } from 'react';

type OverlayAppProps = {
  onHide(): void;
  status: string;
  canvasRef?: RefObject<HTMLCanvasElement>;
};

export function OverlayApp({ onHide, status, canvasRef }: OverlayAppProps) {
  const [position, setPosition] = useState({ x: 24, y: 24 });
  const dragOrigin = useRef<{ x: number; y: number; left: number; top: number }>();

  function startDrag(event: React.PointerEvent<HTMLButtonElement>) {
    dragOrigin.current = { x: event.clientX, y: event.clientY, left: position.x, top: position.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveDrag(event: React.PointerEvent<HTMLButtonElement>) {
    const origin = dragOrigin.current;
    if (!origin) return;
    setPosition({
      x: Math.max(0, Math.min(window.innerWidth - 80, origin.left + event.clientX - origin.x)),
      y: Math.max(0, Math.min(window.innerHeight - 80, origin.top + event.clientY - origin.y)),
    });
  }

  return (
    <div data-testid="overlay-root" className="overlay-root" style={{ pointerEvents: 'none', background: 'transparent' }}>
      <section className="avatar-panel" style={{ transform: `translate(${position.x}px, ${position.y}px)` }} aria-label="Eidolon avatar">
        <button className="drag-handle" style={{ pointerEvents: 'auto' }} aria-label="Move avatar" onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={() => { dragOrigin.current = undefined; }}>
          ⠿
        </button>
        <button className="hide-button" style={{ pointerEvents: 'auto' }} aria-label="Hide avatar" onClick={onHide}>×</button>
        <canvas ref={canvasRef} className="avatar-canvas" aria-label="Bunny Fairy character" />
        <p className="avatar-status" role="status">{status}</p>
      </section>
    </div>
  );
}
