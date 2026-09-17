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

  it('waits for the asynchronously loaded content receiver before showing the shape', async () => {
    const sendToTab = vi.fn()
      .mockRejectedValueOnce(new Error('Could not establish connection. Receiving end does not exist.'))
      .mockResolvedValue(undefined);
    const injectIntoTab = vi.fn(async () => undefined);
    const wait = vi.fn(async () => undefined);

    await routePopupMessage({ type: 'overlay/show', tabId: 17 }, { sendToTab, injectIntoTab, wait });

    expect(sendToTab).toHaveBeenNthCalledWith(1, 17, { type: 'overlay/ping' });
    expect(sendToTab).toHaveBeenNthCalledWith(2, 17, { type: 'overlay/ping' });
    expect(sendToTab).toHaveBeenLastCalledWith(17, { type: 'overlay/show' });
    expect(wait).toHaveBeenCalledOnce();
  });

  it('reports the overlay as visible when the tab answers the status probe', async () => {
    const sendToTab = vi.fn(async () => ({ visible: true }));
    const injectIntoTab = vi.fn(async () => undefined);
    const result = await routePopupMessage({ type: 'overlay/status', tabId: 17 }, { sendToTab, injectIntoTab });
    expect(sendToTab).toHaveBeenCalledWith(17, { type: 'overlay/status' });
    expect(result).toEqual({ visible: true });
  });

  it('treats a tab without the content receiver as hidden', async () => {
    const sendToTab = vi.fn(async () => {
      throw new Error('Could not establish connection. Receiving end does not exist.');
    });
    const injectIntoTab = vi.fn(async () => undefined);
    const result = await routePopupMessage({ type: 'overlay/status', tabId: 17 }, { sendToTab, injectIntoTab });
    expect(result).toEqual({ visible: false });
  });
});
