import { assertExtensionMessage, type ExtensionMessage } from '../shared/messages';

type RouterDependencies = {
  sendToTab(tabId: number, message: unknown): Promise<unknown>;
  injectIntoTab(tabId: number): Promise<void>;
  wait?(milliseconds: number): Promise<void>;
};

export type RouteResult = { visible?: boolean };

export async function routePopupMessage(message: ExtensionMessage, dependencies: RouterDependencies): Promise<RouteResult> {
  if (message.type === 'overlay/status') {
    try {
      const response = await dependencies.sendToTab(message.tabId, { type: 'overlay/status' });
      return { visible: isVisible(response) };
    } catch {
      return { visible: false };
    }
  }
  if (message.type === 'overlay/show' || message.type === 'overlay/hide') {
    if (message.type === 'overlay/show') {
      await dependencies.injectIntoTab(message.tabId);
      await waitForContentReceiver(message.tabId, dependencies);
    }
    await dependencies.sendToTab(message.tabId, { type: message.type });
  }
  return {};
}

function isVisible(response: unknown): boolean {
  return typeof response === 'object' && response !== null && (response as { visible?: unknown }).visible === true;
}

async function waitForContentReceiver(tabId: number, dependencies: RouterDependencies): Promise<void> {
  const wait = dependencies.wait ?? ((milliseconds: number) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds)));
  let lastError: unknown;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      await dependencies.sendToTab(tabId, { type: 'overlay/ping' });
      return;
    } catch (error) {
      lastError = error;
      await wait(25);
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Overlay content script did not become ready');
}

if (typeof chrome !== 'undefined') {
  chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
    void (async () => {
      try {
        const parsed = assertExtensionMessage(message);
        const result = await routePopupMessage(parsed, {
          sendToTab: (tabId, payload) => chrome.tabs.sendMessage(tabId, payload),
          injectIntoTab: async (tabId) => {
            const script = chrome.runtime.getManifest().content_scripts?.[0]?.js?.[0];
            if (!script) throw new Error('Overlay content script is not configured');
            await chrome.scripting.executeScript({ target: { tabId }, files: [script] });
          },
        });
        sendResponse({ ok: true, ...result });
      } catch (error) {
        sendResponse({ ok: false, error: error instanceof Error ? error.message : 'Request failed' });
      }
    })();
    return true;
  });
}
