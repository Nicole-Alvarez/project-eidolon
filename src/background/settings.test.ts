import { beforeEach, describe, expect, it } from 'vitest';
import { createMemorySettingsStore, getSafeConnectionSettings, saveOpenAIApiKey } from './settings';

describe('settings', () => {
  const store = createMemorySettingsStore();

  beforeEach(() => store.clear());

  it('does not return the API key in safe settings', async () => {
    await saveOpenAIApiKey('sk-test-secret', store);
    await expect(getSafeConnectionSettings(store)).resolves.toEqual({
      kind: 'openai-api-key',
      isConfigured: true,
    });
  });
});
