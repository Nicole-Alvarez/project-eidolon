export type OverlayPosition = { x: number; y: number };

export type PositionStorage = {
  get(key: string): Promise<Record<string, unknown>>;
  set(values: Record<string, unknown>): Promise<void>;
};

const positionKey = 'eidolon.canvasOverlay.position';
const sizeKey = 'eidolon.canvasOverlay.size';
const resizeKey = 'eidolon.canvasOverlay.resize';
export const defaultOverlaySize = 300;
export const minOverlaySize = 180;
export const maxOverlaySize = 640;

export async function loadOverlayPosition(storage: PositionStorage): Promise<OverlayPosition | undefined> {
  const value = (await storage.get(positionKey))[positionKey];
  if (!isPosition(value)) return undefined;
  return value;
}

export async function saveOverlayPosition(storage: PositionStorage, position: OverlayPosition): Promise<void> {
  await storage.set({ [positionKey]: position });
}

export async function loadOverlaySize(storage: PositionStorage): Promise<number | undefined> {
  const value = (await storage.get(sizeKey))[sizeKey];
  return typeof value === 'number' && Number.isFinite(value)
    ? clamp(roundSize(value), minOverlaySize, maxOverlaySize)
    : undefined;
}

export async function saveOverlaySize(storage: PositionStorage, size: number): Promise<void> {
  await storage.set({ [sizeKey]: clamp(roundSize(size), minOverlaySize, maxOverlaySize) });
}

export function clampOverlaySize(size: number): number {
  return clamp(roundSize(size), minOverlaySize, maxOverlaySize);
}

export async function loadOverlayResize(storage: PositionStorage): Promise<boolean | undefined> {
  const value = (await storage.get(resizeKey))[resizeKey];
  return typeof value === 'boolean' ? value : undefined;
}

export async function saveOverlayResize(storage: PositionStorage, active: boolean): Promise<void> {
  await storage.set({ [resizeKey]: active });
}

export function extensionPositionStorage(): PositionStorage {
  return {
    get: async (key) => chrome.storage.local.get(key),
    set: async (values) => { await chrome.storage.local.set(values); },
  };
}

function roundSize(size: number): number {
  return Math.max(1, Math.round(size));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function isPosition(value: unknown): value is OverlayPosition {
  return typeof value === 'object' && value !== null &&
    Number.isFinite((value as OverlayPosition).x) && Number.isFinite((value as OverlayPosition).y);
}
