import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { clampOverlaySize, defaultOverlaySize, extensionPositionStorage, loadOverlayPosition, loadOverlayResize, loadOverlaySize, loadOverlayAI, saveOverlayPosition, saveOverlayResize, saveOverlaySize, saveOverlayAI, type OverlayPosition, type PositionStorage } from './overlay-position';

interface LanguageModel {
  prompt(input: string): Promise<string>;
  promptStreaming(input: string): AsyncIterable<string>;
  destroy(): void;
  clone(options?: { signal?: AbortSignal }): Promise<LanguageModel>;
}

interface LanguageModelCreateOptions {
  expectedInputs?: Array<{ type: 'text' | 'image' | 'audio'; languages?: string[] }>;
  expectedOutputs?: Array<{ type: 'text'; languages?: string[] }>;
  temperature?: number;
  topK?: number;
  signal?: AbortSignal;
  monitor?(monitor: { addEventListener(event: 'downloadprogress', listener: (e: { loaded: number; total?: number }) => void): void }): void;
}

interface LanguageModelAvailabilityOptions {
  expectedInputs?: Array<{ type: 'text' | 'image' | 'audio'; languages?: string[] }>;
  expectedOutputs?: Array<{ type: 'text'; languages?: string[] }>;
}

declare global {
  interface Window {
    LanguageModel?: {
      availability(options?: LanguageModelAvailabilityOptions): Promise<'available' | 'downloadable' | 'downloading' | 'unavailable'>;
      create(options?: LanguageModelCreateOptions): Promise<LanguageModel>;
      params(): Promise<{ defaultTopK: number; maxTopK: number; defaultTemperature: number; maxTemperature: number }>;
    };
  }
}

interface LanguageModelParams {
  defaultTopK: number;
  maxTopK: number;
  defaultTemperature: number;
  maxTemperature: number;
}

interface DetectionResult {
  timestamp: number;
  languages: Record<string, 'available' | 'downloadable' | 'downloading' | 'unavailable' | 'error'>;
  modalities: Record<string, 'available' | 'downloadable' | 'downloading' | 'unavailable' | 'error'>;
  sessionCreation: { success: boolean; durationMs: number; error?: string };
  params: LanguageModelParams | null;
}

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

interface BrowserDetailsLogEntry {
  timestamp: number;
  event: string;
  details: string;
}

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
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiCapability, setAiCapability] = useState<"ready" | "downloading" | "downloadable" | "unavailable" | "checking">("checking");
  const [chatOpen, setChatOpen] = useState(false);
  const [aiSession, setAiSession] = useState<LanguageModel | null>(null);
  const [aiSessionLoading, setAiSessionLoading] = useState(false);
  const [aiMessages, setAiMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [aiInput, setAiInput] = useState("");
  const [aiDownloading, setAiDownloading] = useState(false);
  const [browserDetailsOpen, setBrowserDetailsOpen] = useState(false);
  const [browserDetailsTab, setBrowserDetailsTab] = useState<"info" | "ai" | "logs">("info");
  const [browserDetailsLogs, setBrowserDetailsLogs] = useState<BrowserDetailsLogEntry[]>([]);
  const [detectionResult, setDetectionResult] = useState<DetectionResult | null>(null);
  const [detecting, setDetecting] = useState(false);
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

  useEffect(() => {
    let active = true;
    void loadOverlayAI(storage).then((saved) => { if (active && saved !== undefined) setAiEnabled(saved); });
    return () => { active = false; };
  }, [storage]);

  useEffect(() => {
    let active = true;
    async function checkCapability() {
      if (typeof window.LanguageModel === "undefined") {
        if (active) setAiCapability("unavailable");
        return;
      }
      try {
        const availability = await window.LanguageModel.availability({
          expectedInputs: [{ type: "text", languages: ["en"] }],
          expectedOutputs: [{ type: "text", languages: ["en"] }],
        });
        if (!active) return;
        if (availability === "unavailable") setAiCapability("unavailable");
        else if (availability === "downloading") setAiCapability("downloading");
        else if (availability === "downloadable") setAiCapability("downloadable");
        else setAiCapability("ready");
      } catch {
        if (active) setAiCapability("unavailable");
      }
    }
    checkCapability();
    return () => { active = false; };
  }, []);

  // Re-check capability periodically while downloading or downloadable
  useEffect(() => {
    if (aiCapability !== "downloading" && aiCapability !== "downloadable") return;
    let active = true;
    const interval = setInterval(async () => {
      if (!window.LanguageModel) return;
      try {
        const availability = await window.LanguageModel.availability({
          expectedInputs: [{ type: "text", languages: ["en"] }],
          expectedOutputs: [{ type: "text", languages: ["en"] }],
        });
        if (active) {
          const mapped = availability === "available" ? "ready" : availability;
          setAiCapability(mapped);
        }
      } catch {
        if (active) setAiCapability("unavailable");
      }
    }, 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [aiCapability]);

  // Auto-run detection when AI Status tab is opened
  useEffect(() => {
    if (browserDetailsTab !== "ai" || detecting) return;
    const cached = sessionStorage.getItem(DETECTION_CACHE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.timestamp < CACHE_TTL_MS) {
          setDetectionResult(parsed);
          return;
        }
      } catch {
        // Ignore cache parse errors
      }
    }
    runDetection();
  }, [browserDetailsTab]);

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

  function toggleAI() {
    setAiEnabled((prev) => {
      const next = !prev;
      void saveOverlayAI(storage, next);
      if (!next && aiSession) {
        aiSession.destroy();
        setAiSession(null);
        setAiMessages([]);
      }
      return next;
    });
  }

  async function createAISession() {
    if (aiSession || !window.LanguageModel) return;
    try {
      const availability = await window.LanguageModel.availability({
        expectedInputs: [{ type: "text", languages: ["en"] }],
        expectedOutputs: [{ type: "text", languages: ["en"] }],
      });
      if (availability === "unavailable") {
        setAiCapability("unavailable");
        return;
      }
      if (availability === "downloading") {
        setAiCapability("downloading");
        return;
      }
    } catch {
      setAiCapability("unavailable");
      return;
    }
    setAiSessionLoading(true);
    try {
      const session = await window.LanguageModel.create({
        expectedInputs: [{ type: "text", languages: ["en"] }],
        expectedOutputs: [{ type: "text", languages: ["en"] }],
      });
      setAiSession(session);
      setAiCapability("ready");
    } catch {
      setAiCapability("unavailable");
    } finally {
      setAiSessionLoading(false);
    }
  }

  async function downloadModel() {
    setAiDownloading(true);
    try {
      if (!window.LanguageModel) return;
      const session = await window.LanguageModel.create({
        expectedInputs: [{ type: "text", languages: ["en"] }],
        expectedOutputs: [{ type: "text", languages: ["en"] }],
        monitor(m) {
          m.addEventListener("downloadprogress", (e) => {
            const pct = e.total ? Math.floor((e.loaded / e.total) * 100) : 0;
            console.log(`Model download: ${pct}%`);
          });
        },
      });
      session.destroy();
      setAiCapability("ready");
      setAiEnabled(true);
      void saveOverlayAI(storage, true);
    } catch {
      setAiCapability("unavailable");
    } finally {
      setAiDownloading(false);
    }
  }

  async function sendAIMessage() {
    if (!aiInput.trim() || !aiSession) return;
    const userMsg = aiInput;
    setAiInput("");
    setAiMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    try {
      setAiMessages((prev) => [...prev, { role: "assistant", content: "" }]);
      const stream = aiSession.promptStreaming(userMsg);
      for await (const chunk of stream) {
        setAiMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { role: "assistant", content: next[next.length - 1].content + chunk };
          return next;
        });
      }
    } catch {
      setAiMessages((prev) => prev.slice(0, -1));
    }
  }

  function clearChat() {
    if (aiSession) {
      aiSession.destroy();
      setAiSession(null);
    }
    setAiMessages([]);
    if (aiEnabled && aiCapability === "ready") {
      setTimeout(() => {
        if (window.LanguageModel) {
          window.LanguageModel.create({
            expectedInputs: [{ type: "text", languages: ["en"] }],
            expectedOutputs: [{ type: "text", languages: ["en"] }],
          }).then((s) => setAiSession(s)).catch(() => setAiCapability("unavailable"));
        }
      }, 0);
    }
  }

  function handleAIKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendAIMessage();
    }
  }

  function addBrowserLog(event: string, details: string) {
    setBrowserDetailsLogs((prev) => [...prev, { timestamp: Date.now(), event, details }].slice(-100));
  }

  function collectBrowserDetails() {
    const logs: BrowserDetailsLogEntry[] = [];
    const addLog = (event: string, details: string) => logs.push({ timestamp: Date.now(), event, details });

    addLog("collect", "Starting browser details collection");

    // Browser info
    const chromeVersion = navigator.userAgent.match(/Chrome\/(\d+)/)?.[1] ?? "unknown";
    addLog("browser", `Chrome ${chromeVersion}`);

    // LanguageModel API
    if (typeof window.LanguageModel !== "undefined") {
      addLog("languagemodel", "LanguageModel API exists");

      // Check params for supported languages
      window.LanguageModel.params?.().then((params) => {
        addLog("params", JSON.stringify(params));
      }).catch((e) => addLog("params", `Error: ${e.message}`));

      // Check availability
      window.LanguageModel.availability({
        expectedInputs: [{ type: "text", languages: ["en"] }],
        expectedOutputs: [{ type: "text", languages: ["en"] }],
      }).then((avail) => {
        addLog("availability", avail);
      }).catch((e) => {
        addLog("availability", `error: ${e.message}`);
        addLog("availability", `Error: ${e.message}`);
      });
    } else {
      addLog("languagemodel", "LanguageModel API NOT available");
    }

    // Hardware
    const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    const hardwareConcurrency = navigator.hardwareConcurrency;
    addLog("hardware", `Memory: ${deviceMemory ?? "unknown"} GB, Cores: ${hardwareConcurrency ?? "unknown"}`);

    // Extension info
    let extVersion = "unknown";
    if (typeof chrome !== "undefined" && chrome.runtime?.getManifest) {
      extVersion = chrome.runtime.getManifest().version ?? "unknown";
    }
    addLog("extension", `Version: ${extVersion}`);

    // Storage values
    void (async () => {
      try {
        const stored = await chrome.storage.local.get([
          "eidolon.canvasOverlay.aiEnabled",
          "eidolon.canvasOverlay.model",
          "eidolon.canvasOverlay.size",
          "eidolon.canvasOverlay.position",
          "eidolon.canvasOverlay.resizeActive",
        ]);
        addLog("storage", JSON.stringify(stored));
      } catch (e) {
        addLog("storage", `Error: ${(e as Error).message}`);
      }
    })();

    // Return collected info for display
    setBrowserDetailsLogs((prev) => [...prev, ...logs].slice(-100));
  }

  function refreshAvailability() {
    if (!window.LanguageModel) {
      addBrowserLog("refresh", "LanguageModel API not available");
      return;
    }
    addBrowserLog("refresh", "Checking availability...");
    window.LanguageModel.availability({
      expectedInputs: [{ type: "text", languages: ["en"] }],
      expectedOutputs: [{ type: "text", languages: ["en"] }],
    }).then((avail) => {
      addBrowserLog("refresh", `Availability: ${avail}`);
    }).catch((e) => {
      addBrowserLog("refresh", `Error: ${e.message}`);
    });
  }

  function copyLogsToClipboard() {
    const text = browserDetailsLogs
      .map((l) => `[${new Date(l.timestamp).toISOString()}] ${l.event}: ${l.details}`)
      .join("\n");
    navigator.clipboard.writeText(text).then(() => {
      addBrowserLog("copy", "Logs copied to clipboard");
    }).catch((e) => {
      addBrowserLog("copy", `Failed to copy: ${e.message}`);
    });
  }

  const DETECTION_CACHE_KEY = "eidolon:languagemodel:detection";
  const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 1 day

  async function runDetection() {
    if (detecting || !window.LanguageModel) return;
    setDetecting(true);
    addBrowserLog("detection", "Starting capability detection...");

    const languages = ["en", "es", "fr", "de", "ja"];
    const modalities = ["text", "image", "audio"] as const;

    const langResults: DetectionResult["languages"] = {};
    const modResults: DetectionResult["modalities"] = {};

    // Check languages with stagger
    for (let i = 0; i < languages.length; i++) {
      const lang = languages[i];
      if (i > 0) await new Promise((r) => setTimeout(r, 75));
      try {
        const avail = await window.LanguageModel!.availability({
          expectedInputs: [{ type: "text", languages: [lang] }],
          expectedOutputs: [{ type: "text", languages: [lang] }],
        });
        langResults[lang] = avail;
        addBrowserLog("detection", `Language ${lang}: ${avail}`);
      } catch (e) {
        langResults[lang] = "error";
        addBrowserLog("detection", `Language ${lang}: error - ${(e as Error).message}`);
      }
    }

    // Check modalities with stagger
    for (let i = 0; i < modalities.length; i++) {
      const type = modalities[i];
      if (i > 0) await new Promise((r) => setTimeout(r, 75));
      try {
        const avail = await window.LanguageModel!.availability({
          expectedInputs: [{ type }],
          expectedOutputs: [{ type: "text", languages: ["en"] }],
        });
        modResults[type] = avail;
        addBrowserLog("detection", `Modality ${type}: ${avail}`);
      } catch (e) {
        modResults[type] = "error";
        addBrowserLog("detection", `Modality ${type}: error - ${(e as Error).message}`);
      }
    }

    // Session creation test - only for available languages
    let sessionCreation = { success: false, durationMs: 0, error: undefined as string | undefined };
    const availableLangs = Object.entries(langResults).filter(([, v]) => v === "available").map(([k]) => k);
    if (availableLangs.length > 0) {
      try {
        const start = performance.now();
        const session = await window.LanguageModel!.create({
          expectedInputs: [{ type: "text", languages: [availableLangs[0]] }],
          expectedOutputs: [{ type: "text", languages: [availableLangs[0]] }],
        });
        session.destroy();
        sessionCreation = { success: true, durationMs: performance.now() - start, error: undefined };
        addBrowserLog("detection", `Session created in ${sessionCreation.durationMs.toFixed(0)}ms (lang: ${availableLangs[0]})`);
      } catch (e) {
        sessionCreation = { success: false, durationMs: 0, error: (e as Error).message };
        addBrowserLog("detection", `Session creation failed: ${sessionCreation.error}`);
      }
    } else {
      sessionCreation = { success: false, durationMs: 0, error: "No available languages for session test" };
      addBrowserLog("detection", `Session test skipped: no available languages`);
    }

    // Params
    let params: LanguageModelParams | null = null;
    try {
      params = await window.LanguageModel!.params();
      addBrowserLog("detection", `Params: ${JSON.stringify(params)}`);
    } catch (e) {
      addBrowserLog("detection", `Params error: ${(e as Error).message}`);
    }

    const result: DetectionResult = {
      timestamp: Date.now(),
      languages: langResults,
      modalities: modResults,
      sessionCreation,
      params,
    };

    sessionStorage.setItem(DETECTION_CACHE_KEY, JSON.stringify(result));
    setDetectionResult(result);
    setDetecting(false);
  }

  const menuContent = menuOpen ? (
    <section className="key-menu" aria-label="AI status">
      {aiEnabled ? (
        <>
          <strong>AI enabled</strong>
          {aiCapability === "checking" && <span>Checking model…</span>}
          {aiCapability === "downloading" && <span>Downloading model…</span>}
          {aiCapability === "downloadable" && <span>Model ready to download</span>}
          {aiCapability === "ready" && <span>Model ready</span>}
          {aiCapability === "unavailable" && <span>Model unavailable</span>}
          <button className="menu-action" onClick={toggleAI}>Disable AI</button>
          {aiCapability === "ready" && <button className="menu-action" onClick={async () => { await createAISession(); setChatOpen(true); setMenuOpen(false); }} disabled={aiSessionLoading}>{aiSessionLoading ? "Loading…" : "Prompts"}</button>}
          {(aiCapability === "downloadable" || aiCapability === "unavailable") && <button className="menu-action" onClick={downloadModel} disabled={aiDownloading}>{aiDownloading ? "Downloading…" : "Download model"}</button>}
        </>
      ) : (
        <>
          <strong>AI disabled</strong>
          <span>Autonomous motion is active</span>
          <button className="menu-action" onClick={toggleAI}>Enable AI</button>
          {aiCapability === "checking" && <span>Checking model…</span>}
          {aiCapability === "downloading" && <span>Downloading model…</span>}
          {aiCapability === "downloadable" && <span>Model ready to download</span>}
          {aiCapability === "unavailable" && <span>Model unavailable</span>}
        </>
      )}
    </section>
  ) : null;

  return (
    <div data-testid="overlay-root" className="overlay-root" style={{ pointerEvents: 'none', background: 'transparent' }}>
      <section data-testid="overlay-stage" className={`morph-stage${resizeActive ? ' resize-mode' : ''}`} aria-label="Eidolon animated shape" style={{ left: position.x, top: position.y, width: stageSizeOf(size), height: stageSizeOf(size), pointerEvents: 'auto' }} onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag}>
        {fallbackMessage ? <p className="canvas-fallback" role="status">{fallbackMessage}</p> : <canvas ref={canvas} className="shape-canvas" style={{ width: size, height: size }} width="300" height="300" aria-label="Animated shape" />}
        <div className="key-control">
          <button className="key-button" aria-label="AI settings" aria-describedby={tooltipVisible ? 'eidolon-key-tooltip' : undefined} aria-expanded={menuOpen} onMouseEnter={() => setTooltipVisible(true)} onMouseLeave={() => setTooltipVisible(false)} onFocus={() => setTooltipVisible(true)} onBlur={() => setTooltipVisible(false)} onClick={() => setMenuOpen((open) => !open)}>
            <span aria-hidden="true">⌘</span>
          </button>
          {tooltipVisible && <span id="eidolon-key-tooltip" role="tooltip" className="key-tooltip">AI settings</span>}
          {menuContent}
        </div>
        <div className="model-control"><button className="key-button" aria-label="Choose model" aria-expanded={modelOpen} onClick={() => setModelOpen((open) => !open)}><span aria-hidden="true">◇</span></button>{modelOpen && <section className="model-dialog" role="dialog" aria-label="Choose model"><button onClick={() => { selectModel('blob'); setModelOpen(false); }}><i className="blob-icon" />Blob</button><button onClick={() => { selectModel('shapes'); setModelOpen(false); }}><i className="shape-icon" />Shapes</button></section>}</div>
        <div className="resize-control"><button className="key-button" aria-label="Resize tool" aria-pressed={resizeActive} onClick={toggleResize}><span aria-hidden="true">⤢</span></button></div>
        <div className="browser-details-control">
          <button className="key-button" aria-label="Browser details" aria-expanded={browserDetailsOpen} onClick={() => { collectBrowserDetails(); setBrowserDetailsOpen((open) => !open); }}>
            <span aria-hidden="true">🔍</span>
          </button>
          {browserDetailsOpen && (
            <section className="browser-details-dialog" role="dialog" aria-label="Browser details">
              <header className="browser-details-header">
                <strong>Browser Details</strong>
                <button className="chat-btn" onClick={() => setBrowserDetailsOpen(false)} title="Close" aria-label="Close">✕</button>
              </header>
              <nav className="browser-details-tabs" role="tablist" aria-label="Browser details tabs">
                <button
                  role="tab"
                  className={`browser-details-tab ${browserDetailsTab === "info" ? "active" : ""}`}
                  aria-selected={browserDetailsTab === "info"}
                  aria-controls="browser-details-info"
                  onClick={() => setBrowserDetailsTab("info")}
                >
                  Browser
                </button>
                <button
                  role="tab"
                  className={`browser-details-tab ${browserDetailsTab === "ai" ? "active" : ""}`}
                  aria-selected={browserDetailsTab === "ai"}
                  aria-controls="browser-details-ai"
                  onClick={() => setBrowserDetailsTab("ai")}
                >
                  AI Status
                </button>
                <button
                  role="tab"
                  className={`browser-details-tab ${browserDetailsTab === "logs" ? "active" : ""}`}
                  aria-selected={browserDetailsTab === "logs"}
                  aria-controls="browser-details-logs"
                  onClick={() => setBrowserDetailsTab("logs")}
                >
                  Logs
                </button>
              </nav>
              <div className="browser-details-content" role="tabpanel">
                {browserDetailsTab === "info" && (
                  <div id="browser-details-info">
                    <div className="browser-details-section">
                      <div className="browser-details-section-title">Browser</div>
                      <div className="browser-details-row">
                        <span className="browser-details-row-label">User Agent</span>
                        <span className="browser-details-row-value">{navigator.userAgent}</span>
                      </div>
                      <div className="browser-details-row">
                        <span className="browser-details-row-label">Chrome Version</span>
                        <span className="browser-details-row-value">{navigator.userAgent.match(/Chrome\/(\d+)/)?.[1] ?? "unknown"}</span>
                      </div>
                      <div className="browser-details-row">
                        <span className="browser-details-row-label">Platform</span>
                        <span className="browser-details-row-value">{navigator.platform}</span>
                      </div>
                      <div className="browser-details-row">
                        <span className="browser-details-row-label">Language</span>
                        <span className="browser-details-row-value">{navigator.language}</span>
                      </div>
                      <div className="browser-details-row">
                        <span className="browser-details-row-label">Online</span>
                        <span className="browser-details-row-value">{navigator.onLine ? "Yes" : "No"}</span>
                      </div>
                      <div className="browser-details-row">
                        <span className="browser-details-row-label">Cookies Enabled</span>
                        <span className="browser-details-row-value">{navigator.cookieEnabled ? "Yes" : "No"}</span>
                      </div>
                    </div>
                    <div className="browser-details-section">
                      <div className="browser-details-section-title">Hardware</div>
                      <div className="browser-details-row">
                        <span className="browser-details-row-label">Device Memory</span>
                        <span className="browser-details-row-value">{(navigator as Navigator & { deviceMemory?: number }).deviceMemory ? `${(navigator as Navigator & { deviceMemory?: number }).deviceMemory} GB` : "unknown"}</span>
                      </div>
                      <div className="browser-details-row">
                        <span className="browser-details-row-label">CPU Cores</span>
                        <span className="browser-details-row-value">{navigator.hardwareConcurrency ?? "unknown"}</span>
                      </div>
                      <div className="browser-details-row">
                        <span className="browser-details-row-label">Max Touch Points</span>
                        <span className="browser-details-row-value">{navigator.maxTouchPoints}</span>
                      </div>
                    </div>
                    <div className="browser-details-section">
                      <div className="browser-details-section-title">Extension</div>
                      <div className="browser-details-row">
                        <span className="browser-details-row-label">Manifest Version</span>
                        <span className="browser-details-row-value">{typeof chrome !== "undefined" && chrome.runtime?.getManifest ? chrome.runtime.getManifest().version ?? "unknown" : "N/A"}</span>
                      </div>
                      <div className="browser-details-row">
                        <span className="browser-details-row-label">Extension ID</span>
                        <span className="browser-details-row-value">{typeof chrome !== "undefined" && chrome.runtime?.id ? chrome.runtime.id : "N/A"}</span>
                      </div>
                    </div>
                    <div className="browser-details-btn-row">
                      <button className="browser-details-btn" onClick={collectBrowserDetails}>Refresh</button>
                    </div>
                  </div>
                )}
                {browserDetailsTab === "ai" && (
                  <div id="browser-details-ai">
                    <div className="browser-details-section">
                      <div className="browser-details-section-title">LanguageModel API</div>
                      <div className="browser-details-row">
                        <span className="browser-details-row-label">API Available</span>
                        <span className="browser-details-row-value">{typeof window.LanguageModel !== "undefined" ? "Yes" : "No"}</span>
                      </div>
                      <div className="browser-details-row">
                        <span className="browser-details-row-label">Current Capability</span>
                        <span className="browser-details-row-value">{aiCapability}</span>
                      </div>
                      <div className="browser-details-row">
                        <span className="browser-details-row-label">AI Enabled</span>
                        <span className="browser-details-row-value">{aiEnabled ? "Yes" : "No"}</span>
                      </div>
                      <div className="browser-details-row">
                        <span className="browser-details-row-label">Session Active</span>
                        <span className="browser-details-row-value">{aiSession ? "Yes" : "No"}</span>
                      </div>
                    </div>
                    <div className="browser-details-section">
                      <div className="browser-details-section-title">Model Detection</div>
                      {detecting ? (
                        <div className="ai-chat-loading"><span className="spinner" /><span>Detecting capabilities…</span></div>
                      ) : detectionResult ? (
                        <>
                          <div className="browser-details-subsection">
                            <div className="browser-details-subsection-title">Languages</div>
                            <div className="detection-grid">
                              {Object.entries(detectionResult.languages).map(([lang, status]) => (
                                <span key={lang} className={`detection-badge ${status}`}>
                                  {lang.toUpperCase()} {status === "available" ? "✓" : status === "downloadable" ? "⬇" : status === "downloading" ? "⟳" : "✗"}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="browser-details-subsection">
                            <div className="browser-details-subsection-title">Modalities</div>
                            <div className="detection-grid">
                              {Object.entries(detectionResult.modalities).map(([type, status]) => (
                                <span key={type} className={`detection-badge ${status}`}>
                                  {type} {status === "available" ? "✓" : "✗"}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="browser-details-subsection">
                            <div className="browser-details-subsection-title">Session Creation</div>
                            <div className="browser-details-row">
                              <span className="browser-details-row-label">Success</span>
                              <span className="browser-details-row-value">{detectionResult.sessionCreation.success ? "Yes" : "No"}</span>
                            </div>
                            {detectionResult.sessionCreation.success && (
                              <div className="browser-details-row">
                                <span className="browser-details-row-label">Duration</span>
                                <span className="browser-details-row-value">{detectionResult.sessionCreation.durationMs.toFixed(0)} ms</span>
                              </div>
                            )}
                            {!detectionResult.sessionCreation.success && detectionResult.sessionCreation.error && (
                              <div className="browser-details-row">
                                <span className="browser-details-row-label">Error</span>
                                <span className="browser-details-row-value" style={{color: "#ff7ac4"}}>{detectionResult.sessionCreation.error}</span>
                              </div>
                            )}
                          </div>
                          {detectionResult.params && (
                            <div className="browser-details-subsection">
                              <div className="browser-details-subsection-title">Model Parameters</div>
                              <div className="browser-details-row"><span className="browser-details-row-label">Max Top-K</span><span className="browser-details-row-value">{detectionResult.params.maxTopK}</span></div>
                              <div className="browser-details-row"><span className="browser-details-row-label">Max Temperature</span><span className="browser-details-row-value">{detectionResult.params.maxTemperature}</span></div>
                              <div className="browser-details-row"><span className="browser-details-row-label">Default Top-K</span><span className="browser-details-row-value">{detectionResult.params.defaultTopK}</span></div>
                              <div className="browser-details-row"><span className="browser-details-row-label">Default Temperature</span><span className="browser-details-row-value">{detectionResult.params.defaultTemperature}</span></div>
                            </div>
                          )}
                          <div className="browser-details-btn-row">
                            <button className="browser-details-btn" onClick={runDetection} disabled={detecting}>
                              {detecting ? "Detecting…" : "Re-run Detection"}
                            </button>
                            <button className="browser-details-btn" onClick={() => {
                              sessionStorage.removeItem(DETECTION_CACHE_KEY);
                              setDetectionResult(null);
                              runDetection();
                            }}>
                              Clear Cache & Re-detect
                            </button>
                          </div>
                        </>
                      ) : (
                        <button className="browser-details-btn" onClick={runDetection}>Run Detection</button>
                      )}
                    </div>
                    <div className="browser-details-btn-row">
                      <button className="browser-details-btn" onClick={refreshAvailability} disabled={aiCapability === "downloading" || aiCapability === "checking"}>
                        {aiCapability === "downloading" || aiCapability === "checking" ? "Checking…" : "Refresh Availability"}
                      </button>
                    </div>
                  </div>
                )}
                {browserDetailsTab === "logs" && (
                  <div id="browser-details-logs">
                    <div className="browser-details-section">
                      <div className="browser-details-section-title">Diagnostic Logs (last 100)</div>
                      <div className="browser-details-log">
                        {browserDetailsLogs.length === 0 ? (
                          <div style={{ color: "#7a7a9a", textAlign: "center", padding: "20px" }}>No logs yet. Click "Browser" tab to collect data.</div>
                        ) : (
                          browserDetailsLogs.slice().reverse().map((log, idx) => (
                            <div key={idx} className="browser-details-log-entry">
                              <span className="browser-details-log-time">{new Date(log.timestamp).toLocaleTimeString()}</span>
                              <span className="browser-details-log-event">{log.event}</span>
                              <span className="browser-details-log-details">{log.details}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                    <div className="browser-details-btn-row">
                      <button className="browser-details-btn" onClick={copyLogsToClipboard}>Copy Logs</button>
                      <button className="browser-details-btn" onClick={() => setBrowserDetailsLogs([])}>Clear</button>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
        {resizeActive && (['nw', 'ne', 'sw', 'se'] as const).map((corner) => (
          <button key={corner} className={`resize-handle ${corner}`} aria-label={`Resize shape from ${cornerLabel(corner)}`} style={cornerPosition(corner, size)} onPointerDown={(event) => startResize(event, corner)} onPointerMove={moveResize} onPointerUp={endResize} onPointerCancel={endResize} />
        ))}
        {chatOpen && (
          <section className="ai-chat-panel" role="dialog" aria-label="AI chat" onKeyDown={(e) => e.key === "Escape" && setChatOpen(false)}>
            <header className="ai-chat-header">
              <strong>AI Chat</strong>
              <div>
                <button className="chat-btn" onClick={clearChat} title="Clear chat" aria-label="Clear chat">⟳</button>
                <button className="chat-btn" onClick={() => setChatOpen(false)} title="Close" aria-label="Close chat">✕</button>
              </div>
            </header>
            {aiSessionLoading && !aiSession ? (
              <div className="ai-chat-loading" role="status" aria-live="polite">
                <span className="spinner" aria-hidden="true"></span>
                <span>Creating AI session…</span>
              </div>
            ) : (
              <>
                <div className="ai-chat-messages" role="log" aria-live="polite">
                  {aiMessages.map((msg, idx) => (
                    <div key={idx} className={`ai-chat-message ${msg.role}`}>
                      <span className="ai-chat-role">{msg.role === "user" ? "You" : "AI"}</span>
                      <span className="ai-chat-content">{msg.content}</span>
                    </div>
                  ))}
                </div>
                <form className="ai-chat-input" onSubmit={(e) => { e.preventDefault(); sendAIMessage(); }}>
                  <input
                    type="text"
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    onKeyDown={handleAIKeyDown}
                    placeholder="Ask anything…"
                    disabled={!aiSession}
                    aria-label="Chat input"
                  />
                  <button type="submit" className="chat-btn" disabled={!aiInput.trim() || !aiSession}>Send</button>
                </form>
              </>
            )}
          </section>
        )}
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