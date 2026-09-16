import { DemoConnection } from '../ai/demo-connection';
import { OpenAIApiKeyConnection } from '../ai/openai-api-key-connection';
import { bunnyFairy } from '../characters/bunny-fairy';
import { assertExtensionMessage, type ExtensionMessage } from '../shared/messages';
import { getOpenAIApiKey, removeOpenAIApiKey, saveOpenAIApiKey } from './settings';

type RouterDependencies = {
  sendToTab(tabId: number, message: unknown): Promise<void>;
  injectIntoTab(tabId: number): Promise<void>;
};

export async function routePopupMessage(message: ExtensionMessage, dependencies: RouterDependencies): Promise<void> {
  if (message.type === 'overlay/show' || message.type === 'overlay/hide') {
    if (message.type === 'overlay/show') await dependencies.injectIntoTab(message.tabId);
    await dependencies.sendToTab(message.tabId, { type: message.type });
    return;
  }
  const apiKey = await getOpenAIApiKey();
  const connection = apiKey
    ? new OpenAIApiKeyConnection(async () => apiKey)
    : new DemoConnection();
  const response = await connection.generateActionResponse({ prompt: message.prompt, character: bunnyFairy });
  await dependencies.sendToTab(message.tabId, { type: 'overlay/run', response });
}

if (typeof chrome !== 'undefined') {
  chrome.runtime.onInstalled.addListener(() => {
    void chrome.storage.local.set({ 'eidolon.enabled': true });
  });

  chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
    void (async () => {
      try {
        if (isSettingsMessage(message)) {
          if (message.type === 'settings/save-api-key') await saveOpenAIApiKey(message.key);
          else if (message.type === 'settings/disconnect') await removeOpenAIApiKey();
          else sendResponse(await getOpenAIApiKey().then((key) => ({ isConfigured: Boolean(key) })));
          if (message.type !== 'settings/get-status') sendResponse({ ok: true });
          return;
        }
        const parsed = assertExtensionMessage(message);
        await routePopupMessage(parsed, {
          sendToTab: (tabId, payload) => chrome.tabs.sendMessage(tabId, payload),
          injectIntoTab: async (tabId) => {
            const script = chrome.runtime.getManifest().content_scripts?.[0]?.js?.[0];
            if (!script) throw new Error('Overlay content script is not configured');
            await chrome.scripting.executeScript({ target: { tabId }, files: [script] });
          },
        });
        sendResponse({ ok: true });
      } catch (error) {
        sendResponse({ ok: false, error: error instanceof Error ? error.message : 'Request failed' });
      }
    })();
    return true;
  });
}

function isSettingsMessage(value: unknown): value is { type: 'settings/save-api-key'; key: string } | { type: 'settings/disconnect' } | { type: 'settings/get-status' } {
  return typeof value === 'object' && value !== null && 'type' in value &&
    ((value as { type: unknown }).type === 'settings/disconnect' || (value as { type: unknown }).type === 'settings/get-status' ||
      ((value as { type: unknown }).type === 'settings/save-api-key' && typeof (value as { key?: unknown }).key === 'string'));
}
