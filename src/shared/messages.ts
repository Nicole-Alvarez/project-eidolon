export type ExtensionMessage =
  | { type: 'overlay/show'; tabId: number }
  | { type: 'overlay/hide'; tabId: number }
  | { type: 'overlay/status'; tabId: number };

export function assertExtensionMessage(value: unknown): ExtensionMessage {
  if (!isRecord(value) || typeof value.type !== 'string') {
    throw new Error('Unsupported extension message');
  }

  if (value.type === 'overlay/show' || value.type === 'overlay/hide' || value.type === 'overlay/status') {
    if (hasOnlyKeys(value, ['type', 'tabId']) && Number.isInteger(value.tabId)) {
      return value as ExtensionMessage;
    }
  }

  throw new Error('Unsupported extension message');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, keys: string[]): boolean {
  return Object.keys(value).every((key) => keys.includes(key));
}
