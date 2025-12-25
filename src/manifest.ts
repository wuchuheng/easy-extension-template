// Chrome Extension Manifest (TypeScript)
// Uses global chrome types from @types/chrome

const manifest: Chrome.Manifest.WebExtensionManifest = {
  manifest_version: 3,
  name: 'WoofManager AI Identification',
  version: '1.0.0',
  description: 'AI-powered content identification tool using WASM',

  icons: {
    '16': 'logo/icon16.png',
    '32': 'logo/icon32.png',
    '48': 'logo/icon48.png',
    '128': 'logo/icon128.png'
  },

  action: {
    default_popup: 'src/popup/index.html',
    default_icon: {
      '16': 'logo/icon16.png',
      '32': 'logo/icon32.png',
      '48': 'logo/icon48.png',
      '128': 'logo/icon128.png'
    }
  },

  background: {
    service_worker: 'src/background/index.ts',
    type: 'module'
  },

  content_scripts: [
    {
      matches: ['<all_urls>'],
      js: ['src/contents/default-content/index.tsx'],
      run_at: 'document_idle'
    }
  ],

  options_page: 'src/options/default-page/index.html',

  permissions: [
    'activeTab',
    'storage',
    'scripting',
    'tabs'
  ],

  host_permissions: ['<all_urls>']
}

export default manifest
