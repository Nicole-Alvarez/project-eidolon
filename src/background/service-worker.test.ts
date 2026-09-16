import { describe, expect, it, vi } from 'vitest';
import { routePopupMessage } from './service-worker';

describe('routePopupMessage', () => {
  it('sends a show request only to the selected tab', async () => {
    const sendToTab = vi.fn(async () => undefined);
    const injectIntoTab = vi.fn(async () => undefined);
    await routePopupMessage({ type: 'overlay/show', tabId: 17 }, { sendToTab, injectIntoTab });
    expect(injectIntoTab).toHaveBeenCalledWith(17);
    expect(sendToTab).toHaveBeenCalledWith(17, { type: 'overlay/show' });
  });
});
