import { expect, test, chromium } from '@playwright/test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

test('shows the transparent overlay from the unpacked extension popup', async () => {
  const extensionPath = resolve('dist');
  const userDataDir = mkdtempSync(join(tmpdir(), 'eidolon-extension-'));
  const context = await chromium.launchPersistentContext(userDataDir, {
    channel: 'chromium',
    headless: false,
    args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
  });

  try {
    let [worker] = context.serviceWorkers();
    if (!worker) worker = await context.waitForEvent('serviceworker');
    const extensionId = new URL(worker.url()).host;
    const page = await context.newPage();
    page.on('console', (message) => console.log(`PAGE ${message.type()}: ${message.text()}`));
    page.on('pageerror', (error) => console.log(`PAGE ERROR: ${error.message}`));
    await page.goto('https://example.com');
    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${extensionId}/src/popup/index.html`);
    const toggle = popup.getByRole('switch', { name: 'Eidolon overlay' });
    await expect(toggle).toBeEnabled();
    await expect(toggle).toHaveAttribute('aria-checked', 'false');

    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-checked', 'true');
    await expect(popup.getByRole('status')).toHaveText('Visible on this tab');
    await expect(page.locator('#__eidolon_overlay_host__')).toBeAttached();

    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-checked', 'false');
    await expect(page.locator('#__eidolon_overlay_host__')).toHaveCount(0);
  } finally {
    await context.close();
  }
});
