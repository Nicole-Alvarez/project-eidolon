import { useEffect, useState } from 'react';

export function PopupApp() {
  const [tabId, setTabId] = useState<number>();
  const [status, setStatus] = useState('AI disabled · autonomous motion is active');

  useEffect(() => {
    void findTargetTab().then((tab) => setTabId(tab?.id));
  }, []);

  async function send(type: 'overlay/show' | 'overlay/hide') {
    if (!tabId) return;
    const result = await chrome.runtime.sendMessage({ type, tabId });
    setStatus(result?.ok ? (type === 'overlay/show' ? 'Shape shown' : 'Shape hidden') : (typeof result?.error === 'string' ? result.error : 'Request failed'));
  }

  return <main className="popup-app">
    <h1>Eidolon</h1>
    <p>Canvas morph engine · transparent page overlay</p>
    <div><button disabled={!tabId} onClick={() => void send('overlay/show')}>Show shape</button><button disabled={!tabId} onClick={() => void send('overlay/hide')}>Hide shape</button></div>
    <p role="status">{status}</p>
  </main>;
}

async function findTargetTab(): Promise<chrome.tabs.Tab | undefined> {
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (activeTab && isWebTab(activeTab)) return activeTab;
  const tabs = await chrome.tabs.query({ currentWindow: true });
  return tabs.find(isWebTab);
}

function isWebTab(tab: chrome.tabs.Tab): boolean {
  return Boolean(tab.url) && (tab.url!.startsWith('https://') || tab.url!.startsWith('http://'));
}
