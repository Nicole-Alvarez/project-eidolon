import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';

export default defineConfig({
  plugins: [
    crx({
      manifest: {
        manifest_version: 3,
        name: 'Eidolon Live2D',
        version: '0.1.0',
        description: 'A transparent AI-controlled Live2D overlay.',
        action: { default_popup: 'src/popup/index.html' },
        background: { service_worker: 'src/background/service-worker.ts', type: 'module' },
        content_scripts: [{ matches: ['<all_urls>'], js: ['src/content/index.tsx'], run_at: 'document_idle' }],
        permissions: ['activeTab', 'scripting', 'storage'],
        host_permissions: ['<all_urls>'],
        web_accessible_resources: [
          {
            resources: ['characters/*', 'characters/**/*', 'assets/*', 'vendor/*'],
            matches: ['<all_urls>'],
          },
        ],
      },
    }),
  ],
});
