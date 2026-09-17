import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PopupApp } from './popup-app';

type Message = { type: string; tabId?: number };

let sendMessage: ReturnType<typeof vi.fn>;
let query: ReturnType<typeof vi.fn>;

beforeEach(() => {
  sendMessage = vi.fn(async () => ({ ok: true }));
  query = vi.fn(async () => [{ id: 5, url: 'https://example.com' }]);
  vi.stubGlobal('chrome', { tabs: { query }, runtime: { sendMessage } });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('PopupApp', () => {
  it('reflects the real overlay state and toggles it off', async () => {
    sendMessage.mockImplementation(async (message: Message) => (message.type === 'overlay/status' ? { ok: true, visible: true } : { ok: true }));

    render(<PopupApp />);
    const toggle = await screen.findByRole('switch', { name: 'Eidolon overlay' });
    await waitFor(() => expect(toggle).toHaveAttribute('aria-checked', 'true'));
    expect(screen.getByRole('status')).toHaveTextContent('Visible on this tab');

    fireEvent.click(toggle);
    await waitFor(() => expect(sendMessage).toHaveBeenCalledWith({ type: 'overlay/hide', tabId: 5 }));
    await waitFor(() => expect(toggle).toHaveAttribute('aria-checked', 'false'));
  });

  it('reverts the switch and shows an error card when the request fails', async () => {
    sendMessage.mockImplementation(async (message: Message) => (message.type === 'overlay/status' ? { ok: true, visible: false } : { ok: false, error: 'Could not establish connection. Receiving end does not exist.' }));

    render(<PopupApp />);
    const toggle = await screen.findByRole('switch', { name: 'Eidolon overlay' });
    await waitFor(() => expect(toggle).toHaveAttribute('aria-checked', 'false'));

    fireEvent.click(toggle);

    const alert = await screen.findByRole('alert');
    await waitFor(() => expect(toggle).toHaveAttribute('aria-checked', 'false'));
    expect(alert).toHaveTextContent('This page can’t run the overlay');
    expect(alert).toHaveTextContent('Receiving end does not exist');
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('retries the failed action from the error card', async () => {
    let failNext = true;
    sendMessage.mockImplementation(async (message: Message) => {
      if (message.type === 'overlay/status') return { ok: true, visible: false };
      if (failNext) {
        failNext = false;
        return { ok: false, error: 'The request could not be completed.' };
      }
      return { ok: true };
    });

    render(<PopupApp />);
    const toggle = await screen.findByRole('switch', { name: 'Eidolon overlay' });
    fireEvent.click(toggle);
    await screen.findByRole('alert');

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    await waitFor(() => expect(toggle).toHaveAttribute('aria-checked', 'true'));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('disables the switch when no web page is open', async () => {
    query.mockResolvedValue([{ id: 6, url: 'chrome://extensions' }]);

    render(<PopupApp />);
    const toggle = await screen.findByRole('switch', { name: 'Eidolon overlay' });

    expect(toggle).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('Open an http or https page');
    expect(sendMessage).not.toHaveBeenCalled();
  });
});
