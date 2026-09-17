import { useEffect, useState } from 'react';

type ErrorState = { raw: string; desired: boolean };

export function PopupApp() {
  const [tabId, setTabId] = useState<number>();
  const [resolved, setResolved] = useState(false);
  const [visible, setVisible] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ErrorState>();

  useEffect(() => {
    let active = true;
    void findTargetTab().then(async (tab) => {
      if (!active) return;
      setTabId(tab?.id);
      setResolved(true);
      if (tab?.id === undefined) return;
      try {
        const response = await chrome.runtime.sendMessage({ type: 'overlay/status', tabId: tab.id });
        if (active && response?.ok) setVisible(Boolean(response.visible));
      } catch {
        if (active) setVisible(false);
      }
    });
    return () => { active = false; };
  }, []);

  async function apply(desired: boolean) {
    if (tabId === undefined || pending) return;
    setPending(true);
    setVisible(desired);
    let response: { ok?: boolean; error?: unknown } | undefined;
    try {
      response = await chrome.runtime.sendMessage({ type: desired ? 'overlay/show' : 'overlay/hide', tabId });
    } catch (thrown) {
      response = { ok: false, error: thrown instanceof Error ? thrown.message : undefined };
    }
    setPending(false);
    if (response?.ok) {
      setError(undefined);
      return;
    }
    setVisible(!desired);
    setError({ raw: typeof response?.error === 'string' ? response.error : 'The request could not be completed.', desired });
  }

  const disabled = !resolved || tabId === undefined;
  const stateText = !resolved ? 'Checking this tab…' : tabId === undefined ? 'Open an http or https page to control the overlay' : pending ? 'Applying…' : visible ? 'Visible on this tab' : 'Hidden on this tab';

  return <main className="popup">
    <header className="popup__header">
      <span className="popup__mark" aria-hidden="true">
        <svg viewBox="0 0 32 32">
          <defs>
            <linearGradient id="eidolon-mark" x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
              <stop stopColor="#9263ff" />
              <stop offset="1" stopColor="#36cffa" />
            </linearGradient>
          </defs>
          <path fill="url(#eidolon-mark)" d="M17.4 3.4c5.3 1 9.6 5.1 10.4 10.4.9 6.2-3.5 12-9.6 13.4-5.1 1.2-10.7-.9-13.4-5.4C1.6 17.2 3 11.1 7.5 7.6c2.6-2.1 6.3-4.7 9.9-4.2Z" />
        </svg>
      </span>
      <div>
        <h1 className="popup__title">Eidolon</h1>
        <p className="popup__tagline">Canvas morph engine for any page</p>
      </div>
    </header>

    <section className="card">
      <div className="switch-row">
        <div>
          <span className="switch-row__label" id="eidolon-overlay-label">Eidolon overlay</span>
          <span className="switch-row__state" role="status">{stateText}</span>
        </div>
        <button type="button" role="switch" className="switch" aria-checked={visible} aria-busy={pending} aria-labelledby="eidolon-overlay-label" disabled={disabled} onClick={() => void apply(!visible)}>
          <span className="switch__thumb" aria-hidden="true" />
        </button>
      </div>
    </section>

    {error && <section className="error-card" role="alert">
      <span className="error-card__icon" aria-hidden="true">
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M10 3.2 2.6 16.2h14.8L10 3.2Z" strokeLinejoin="round" />
          <path d="M10 8v3.4" strokeLinecap="round" />
          <circle cx="10" cy="14" r=".9" fill="currentColor" stroke="none" />
        </svg>
      </span>
      <div className="error-card__body">
        <strong className="error-card__title">{errorCopy(error.raw).title}</strong>
        <p className="error-card__recovery">{errorCopy(error.raw).recovery}</p>
        <p className="error-card__detail">{error.raw}</p>
      </div>
      <button type="button" className="error-card__retry" onClick={() => void apply(error.desired)}>Retry</button>
    </section>}
  </main>;
}

function errorCopy(raw: string): { title: string; recovery: string } {
  if (/receiving end does not exist|did not become ready/i.test(raw)) {
    return { title: 'This page can’t run the overlay', recovery: 'Switch to a regular http or https page and try again.' };
  }
  if (/not configured/i.test(raw)) {
    return { title: 'The extension isn’t set up correctly', recovery: 'Reload the extension from chrome://extensions and try again.' };
  }
  return { title: 'The overlay didn’t respond', recovery: 'Try again in a moment.' };
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
