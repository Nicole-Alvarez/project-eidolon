import type { ConnectionKind } from '../ai/connection';

const apiKeyStorageKey = 'eidolon.openaiApiKey';
const connectionKindStorageKey = 'eidolon.connectionKind';

export type SettingsStore = {
  get(keys: string | string[]): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
  remove(keys: string | string[]): Promise<void>;
};

export type SafeConnectionSettings = {
  kind: ConnectionKind;
  isConfigured: boolean;
};

export async function saveOpenAIApiKey(key: string, store = chromeSettingsStore()): Promise<void> {
  const normalized = key.trim();
  if (!normalized) throw new Error('API key is required');
  await store.set({ [apiKeyStorageKey]: normalized, [connectionKindStorageKey]: 'openai-api-key' });
}

export async function removeOpenAIApiKey(store = chromeSettingsStore()): Promise<void> {
  await store.remove(apiKeyStorageKey);
  await store.set({ [connectionKindStorageKey]: 'demo' });
}

export async function getOpenAIApiKey(store = chromeSettingsStore()): Promise<string | undefined> {
  const values = await store.get(apiKeyStorageKey);
  return typeof values[apiKeyStorageKey] === 'string' ? values[apiKeyStorageKey] : undefined;
}

export async function getSafeConnectionSettings(store = chromeSettingsStore()): Promise<SafeConnectionSettings> {
  const values = await store.get([apiKeyStorageKey, connectionKindStorageKey]);
  const key = values[apiKeyStorageKey];
  const requestedKind = values[connectionKindStorageKey];
  const kind: ConnectionKind = requestedKind === 'openai-api-key' && typeof key === 'string' && key.length > 0
    ? 'openai-api-key'
    : 'demo';
  return { kind, isConfigured: kind === 'openai-api-key' };
}

export function createMemorySettingsStore(): SettingsStore & { clear(): void } {
  const values = new Map<string, unknown>();
  return {
    async get(keys) {
      const requested = typeof keys === 'string' ? [keys] : keys;
      return Object.fromEntries(requested.flatMap((key) => values.has(key) ? [[key, values.get(key)]] : []));
    },
    async set(items) { Object.entries(items).forEach(([key, value]) => values.set(key, value)); },
    async remove(keys) { (typeof keys === 'string' ? [keys] : keys).forEach((key) => values.delete(key)); },
    clear() { values.clear(); },
  };
}

function chromeSettingsStore(): SettingsStore {
  return chrome.storage.local as SettingsStore;
}
