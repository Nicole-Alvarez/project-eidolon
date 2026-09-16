import { useEffect, useState } from 'react';
import { importCharacter } from '../import/import-character';

export function PopupApp() {
  const [tabId, setTabId] = useState<number>();
  const [prompt, setPrompt] = useState('wave hello');
  const [apiKey, setApiKey] = useState('');
  const [configured, setConfigured] = useState(false);
  const [status, setStatus] = useState('Demo mode');

  useEffect(() => {
    void findTargetTab().then((tab) => setTabId(tab?.id));
    void chrome.runtime.sendMessage({ type: 'settings/get-status' }).then((result) => setConfigured(Boolean(result?.isConfigured)));
  }, []);

  async function send(type: 'overlay/show' | 'overlay/hide' | 'action/run-demo') {
    if (!tabId) return;
    const result = await chrome.runtime.sendMessage(type === 'action/run-demo' ? { type, tabId, prompt } : { type, tabId });
    setStatus(result?.ok ? (type === 'action/run-demo' ? (configured ? 'AI action sent' : 'Demo action sent') : 'Overlay updated') : (typeof result?.error === 'string' ? result.error : 'Request failed'));
  }

  async function saveKey() {
    const result = await chrome.runtime.sendMessage({ type: 'settings/save-api-key', key: apiKey });
    if (result?.ok) { setApiKey(''); setConfigured(true); setStatus('OpenAI API key configured'); }
  }

  async function disconnect() {
    await chrome.runtime.sendMessage({ type: 'settings/disconnect' });
    setConfigured(false); setStatus('Demo mode');
  }

  async function importArchive(file: File | undefined) {
    if (!file) return;
    try {
      const character = await importCharacter(file);
      setStatus(`Imported ${character.name}. It is stored locally for future character selection.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Character import failed');
    }
  }

  return <main className="popup-app">
    <h1>Eidolon</h1>
    <p>Bunny Fairy · transparent page overlay</p>
    <div><button disabled={!tabId} onClick={() => void send('overlay/show')}>Show avatar</button><button disabled={!tabId} onClick={() => void send('overlay/hide')}>Hide avatar</button></div>
    <label>Demo prompt<input value={prompt} maxLength={280} onChange={(event) => setPrompt(event.target.value)} /></label>
    <button disabled={!tabId} onClick={() => void send('action/run-demo')}>Run demo action</button>
    <label>Import Live2D ZIP<input type="file" accept=".zip,application/zip" onChange={(event) => void importArchive(event.target.files?.[0])} /></label>
    <hr />
    <h2>OpenAI API key</h2>
    {configured ? <button onClick={() => void disconnect()}>Disconnect</button> : <><label>OpenAI API key<input aria-label="OpenAI API key" type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} /></label><button onClick={() => void saveKey()} disabled={!apiKey.trim()}>Save key</button></>}
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
