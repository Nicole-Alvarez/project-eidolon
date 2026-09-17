export type OverlayPosition = { x: number; y: number };

export type PositionStorage = {
  get(key: string): Promise<Record<string, unknown>>;
  set(values: Record<string, unknown>): Promise<void>;
};

const positionKey = 'eidolon.canvasOverlay.position';

export async function loadOverlayPosition(storage: PositionStorage): Promise<OverlayPosition | undefined> {
  const value = (await storage.get(positionKey))[positionKey];
  if (!isPosition(value)) return undefined;
  return value;
}

export async function saveOverlayPosition(storage: PositionStorage, position: OverlayPosition): Promise<void> {
  await storage.set({ [positionKey]: position });
}

export function extensionPositionStorage(): PositionStorage {
  return {
    get: async (key) => chrome.storage.local.get(key),
    set: async (values) => { await chrome.storage.local.set(values); },
  };
}

function isPosition(value: unknown): value is OverlayPosition {
  return typeof value === 'object' && value !== null &&
    Number.isFinite((value as OverlayPosition).x) && Number.isFinite((value as OverlayPosition).y);
}
