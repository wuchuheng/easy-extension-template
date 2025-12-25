# Chrome Extension Setup Specification

## Project Analysis

### Current State
The project `com.woofmanager.ai.identification.extension` is a Vite + TypeScript template project with the following characteristics:

**Location**: `/com.woofmanager.ai.identification.extension/`

**Technology Stack**:
- TypeScript 5.9.3
- Vite (rolldown-vite 7.2.5) - A bundler using Rolldown instead of Rollup
- Target: ES2022


**Current Functionality**: A simple counter app that demonstrates Vite + TypeScript integration.

---

## Goal

Convert this project into a functional Chrome extension for the "WoofManager AI Identification" system - a content identification tool that runs background tasks and uses WASM with OPFS.

---

## Architecture Requirements

### Extension Type (Based on Official Chrome Extension Documentation)

This extension will use a **multi-component architecture**:

| Component | Purpose | Location |
|-----------|---------|----------|
| **Popup** | Quick access UI when clicking extension icon | `src/popup/` |
| **Background Service Worker** | Background tasks for content identification | `src/background/` |
| **Content Script** | Injected into web pages for content access | `src/contents/` |
| **Options Page** | Settings and configuration with HashRouter | `src/options/` |

### Primary Function
Identify content on web pages using background tasks with WASM-based AI processing.

---

## Implementation Plan

### Phase 1: Dependencies Installation

Install required npm packages:

```json
{
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.26.0"
  },
  "devDependencies": {
    "@crxjs/vite-plugin": "^2.0.0",
    "@types/chrome": "^0.0.268",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@types/ws": "^8.5.10",
    "@vitejs/plugin-react": "^4.3.1",
    "autoprefixer": "^10.4.20",
    "eslint": "^9.0.0",
    "eslint-config-prettier": "^9.1.0",
    "eslint-plugin-react": "^7.35.0",
    "eslint-plugin-react-hooks": "^4.6.2",
    "postcss": "^8.4.45",
    "prettier": "^3.3.0",
    "sharp": "^0.33.0",
    "tailwindcss": "^3.4.10",
    "tsx": "^4.19.0",
    "typescript": "~5.9.3",
    "typescript-eslint": "^8.0.0",
    "vite": "npm:rolldown-vite@7.2.5",
    "vite-plugin-sharp-resize": "^1.0.0",
    "ws": "^8.18.0"
  }
}
```

**Key Packages**:
- `@crxjs/vite-plugin` - Chrome extension Vite plugin with HMR support
- `@types/chrome` - TypeScript type definitions for Chrome Extension APIs
- `@types/ws` - TypeScript type definitions for WebSocket
- `react` / `react-dom` - UI framework for popup and options pages
- `react-router-dom` v6 - Hash routing for options page navigation
- `tailwindcss` - Utility-first CSS framework for all UI components
- `@vitejs/plugin-react` - React support for Vite
- `sharp` - High-performance Node.js image processing (build-time only)
- `vite-plugin-sharp-resize` - Vite plugin to resize images during build
- `ws` - WebSocket server for content script auto-reload
- `eslint` - JavaScript/TypeScript linting
- `typescript-eslint` - TypeScript parser for ESLint
- `prettier` - Code formatter
- `eslint-config-prettier` - Disable ESLint rules that conflict with Prettier
- `eslint-plugin-react` - React specific linting rules
- `eslint-plugin-react-hooks` - React Hooks linting rules

---

### Phase 2: Project Structure Reorganization

Restructure the source files for Chrome extension architecture:

```
com.woofmanager.ai.identification.extension/
├── .editorconfig            # Editor configuration (UTF-8, LF line endings)
├── .eslintrc.cjs            # ESLint configuration
├── .prettierrc              # Prettier configuration
├── .prettierignore          # Prettier ignore patterns
├── vite.config.ts           # Vite configuration
├── tailwind.config.js       # TailwindCSS configuration
├── postcss.config.js        # PostCSS configuration
├── package.json
├── tsconfig.json
│
├── .vscode/                 # VS Code settings
│   ├── settings.json        # Workspace settings
│   └── extensions.json      # Recommended extensions
│
├── plugins/                 # Custom Vite plugins
│   └── vite-content-reload.ts # Content script auto-reload plugin
│
├── scripts/                 # Build scripts
│   └── generate-icons.ts    # Icon generation script
│
├── src/
│   ├── manifest.ts          # Chrome manifest with full types
│   │
│   ├── popup/               # Extension popup UI (React + TailwindCSS)
│   │   ├── index.html
│   │   ├── main.tsx         # React entry point
│   │   ├── App.tsx          # React components
│   │   └── style.css        # TailwindCSS styles
│   │
│   ├── background/          # Background service worker
│   │   └── index.ts         # Background task logic
│   │
│   ├── contents/            # Content scripts (multiple, injects into web pages)
│   │   ├── default-content/ # Default content script
│   │   │   ├── index.html   # Optional HTML UI for injected content
│   │   │   ├── index.ts     # Content script entry
│   │   │   └── style.css    # TailwindCSS styles
│   │   └── another-content/ # Example of additional content script
│   │       ├── index.html
│   │       ├── index.ts
│   │       └── style.css
│   │
│   ├── options/             # Options pages (multiple, React + TailwindCSS + HashRouter)
│   │   ├── default-page/    # Default options page (entry point)
│   │   │   ├── index.html
│   │   │   ├── main.tsx     # React entry point with HashRouter
│   │   │   ├── App.tsx      # Root component with Routes
│   │   │   ├── pages/       # Route components
│   │   │   │   ├── Settings.tsx
│   │   │   │   ├── About.tsx
│   │   │   │   └── Help.tsx
│   │   │   └── style.css    # TailwindCSS styles
│   │   └── another-page/    # Example of additional options page
│   │       ├── index.html
│   │       ├── main.tsx
│   │       ├── App.tsx
│   │       └── style.css
│   │
│   ├── shared/              # Shared utilities and types
│   │   ├── types.ts         # TypeScript types
│   │   ├── utils.ts         # Utility functions
│   │   └── storage.ts       # Storage utilities (OPFS wrapper)
│   │
│   └── assets/              # WASM files
│       └── wasm/
│           └── model.wasm   # AI model WASM file
│
├── src/assets/                  # Static assets
│   └── logo.png             # Source logo (single high-res file)
│
└── dist/                    # Build output (load in chrome://extensions/)
    ├── manifest.json        # Built from manifest.ts
    ├── popup/               # Popup page files
    │   ├── index.html
    │   ├── index.js
    │   ├── index.css
    │   └── assets/          # Popup-specific assets
    ├── options/             # Multiple options pages
    │   ├── default-page/    # Default options page (entry point)
    │   │   ├── index.html
    │   │   ├── index.js
    │   │   ├── index.css
    │   │   └── assets/
    │   └── another-page/    # Additional options page
    │       ├── index.html
    │       ├── index.js
    │       ├── index.css
    │       └── assets/
    ├── background.js        # Background service worker
    ├── contents/            # Multiple content scripts
    │   ├── default-content/
    │   │   ├── index.js
    │   │   ├── index.html   # Optional
    │   │   └── style.css
    │   └── another-content/ # Additional content script
    │       ├── index.js
    │       ├── index.html
    │       └── style.css
    └── logo/                # Generated icons
        ├── icon16.png
        ├── icon32.png
        ├── icon48.png
        └── icon128.png
```

---

### Phase 3: TypeScript Configuration Updates

Update `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["chrome", "vite/client"],
    "jsx": "react-jsx",
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src/**/*"],
  "references": [
    { "path": "./tsconfig.node.json" }
  ]
}
```

Create `tsconfig.node.json` for Node config files:

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts", "plugins/**/*.ts"]
}
```

---

### Phase 4: ESLint and Prettier Configuration

**Code Quality Requirements**:
- Character encoding: **UTF-8** for all source files
- End of line: **LF (Linux style)** for all source files
- Code formatting: Prettier with consistent style
- Linting: ESLint with TypeScript and React support

**File**: `.eslintrc.cjs`

```javascript
module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
    node: true
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'prettier' // Must be last to override other configs
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true
    }
  },
  plugins: [
    '@typescript-eslint',
    'react',
    'react-hooks'
  ],
  settings: {
    react: {
      version: 'detect'
    }
  },
  rules: {
    'react/react-in-jsx-scope': 'off', // Not needed in React 17+
    '@typescript-eslint/no-unused-vars': ['warn', {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_'
    }],
    '@typescript-eslint/no-explicit-any': 'warn',
    'react/prop-types': 'off' // Using TypeScript for prop validation
  },
  ignorePatterns: [
    'dist',
    'node_modules',
    '*.config.js',
    '*.config.ts'
  ]
}
```

**File**: `.prettierrc`

```json
{
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "semi": true,
  "singleQuote": true,
  "quoteProps": "as-needed",
  "jsxSingleQuote": false,
  "trailingComma": "es5",
  "bracketSpacing": true,
  "bracketSameLine": false,
  "arrowParens": "avoid",
  "endOfLine": "lf",
  "encoding": "utf-8"
}
```

**File**: `.prettierignore`

```
dist
node_modules
package-lock.json
*.log
coverage
.vscode
.idea
*.min.js
*.min.css
```

**File**: `.editorconfig`

```ini
root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
trim_trailing_whitespace = true

[*.{js,jsx,ts,tsx,json,css,scss,md}]
indent_style = space
indent_size = 2

[*.{html,vue}]
indent_style = space
indent_size = 2

[*.md]
trim_trailing_whitespace = false
```

**VS Code Settings** (`.vscode/settings.json`):

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "files.encoding": "utf8",
  "files.eol": "\n"
}
```

**VS Code Extensions** (`.vscode/extensions.json`):

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "dsznajder.es7-react-js-snippets",
    "ms-vscode.vscode-typescript-next"
  ]
}
```

**Recommended Extensions**:
- `dbaeumer.vscode-eslint` - ESLint integration
- `esbenp.prettier-vscode` - Prettier formatter
- `bradlc.vscode-tailwindcss` - TailwindCSS IntelliSense
- `dsznajder.es7-react-js-snippets` - React/JavaScript snippets
- `ms-vscode.vscode-typescript-next` - TypeScript support ( Nightly)

---

### Phase 5: TailwindCSS Configuration

**File**: `tailwind.config.js`

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/popup/**/*.{js,ts,jsx,tsx,html}',
    './src/options/**/*.{js,ts,jsx,tsx,html}',
    './src/contents/**/*.{js,ts,jsx,tsx,css,html}'
  ],
  theme: {
    extend: {}
  },
  plugins: []
}
```

**File**: `postcss.config.js`

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {}
  }
}
```

---

### Phase 6: Vite Configuration (vite.config.ts)

Create `vite.config.ts` with Chrome extension support, icon generation, and mode-specific configurations:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import { vitePluginSharpResize } from 'vite-plugin-sharp-resize'
import manifest from './src/manifest'

export default defineConfig(({ mode }) => {
  const isDevelopment = mode === 'development'

  return {
    plugins: [
      react(),
      crx({ manifest }),
      // Generate icons only during build
      !isDevelopment && vitePluginSharpResize({
        inputDir: 'src/assets',
        outputDir: 'dist/logo',
        patterns: [
          {
            input: 'logo.png',
            output: [
              { name: 'icon16.png', width: 16, height: 16 },
              { name: 'icon32.png', width: 32, height: 32 },
              { name: 'icon48.png', width: 48, height: 48 },
              { name: 'icon128.png', width: 128, height: 128 }
            ]
          }
        ]
      })
    ],
    build: {
      // Source maps: development = true, production = false
      sourcemap: isDevelopment,
      // Minify: development = false, production = true
      minify: isDevelopment ? false : 'esbuild',
      rollupOptions: {
        input: {
          // Popup page
          'popup/index': 'src/popup/index.html',
          // Options pages (supports multiple)
          'options/default-page/index': 'src/options/default-page/index.html',
          // Add more options pages here as needed
          // 'options/another-page/index': 'src/options/another-page/index.html'
          background: 'src/background/index.ts',
          // Multiple content scripts
          'contents/default-content/index': 'src/contents/default-content/index.ts',
          // Add more content scripts here as needed
          // 'contents/another-content/index': 'src/contents/another-content/index.ts'
        },
        output: {
          entryFileNames: (chunkInfo) => {
            // Preserve directory structure for popup, options, and contents
            if (chunkInfo.name.includes('popup/') ||
                chunkInfo.name.includes('options/') ||
                chunkInfo.name.includes('contents/')) {
              return chunkInfo.name + '.js'
            }
            return '[name].js'
          },
          chunkFileNames: (chunkInfo) => {
            // Preserve directory structure for chunks
            if (chunkInfo.name.includes('popup/') ||
                chunkInfo.name.includes('options/') ||
                chunkInfo.name.includes('contents/')) {
              return chunkInfo.name + '.js'
            }
            return '[name].js'
          },
          assetFileNames: (assetInfo) => {
            // Preserve directory structure for assets (HTML, CSS, etc.)
            const name = assetInfo.name || ''
            if (name.includes('popup/') || name.includes('options/') || name.includes('contents/')) {
              return name
            }
            return '[name].[ext]'
          }
        },
        // Don't emit declaration files (.d.ts)
        treeshake: true
      },
      // Empty outDir before build (for clean builds)
      emptyOutDir: true
    },
    // Development server configuration
    server: {
      hmr: isDevelopment
    }
  }
})
```

**Configuration Summary**:

| Setting | Development (`npm run dev`) | Production (`npm run build`) |
|---------|---------------------------|------------------------------|
| Watch Mode | ✅ Yes | ❌ No |
| Source Maps | ✅ Generated to `dist/` | ❌ Removed |
| Minification | ❌ No | ✅ Yes (esbuild) |
| Declaration Files (.d.ts) | ❌ Not emitted | ❌ Not emitted |
| Tree Shaking | ✅ Enabled | ✅ Enabled |
| Icon Generation | ❌ Skipped | ✅ Generated |
| Content Script Auto-Reload | ✅ Enabled | ❌ Disabled |

---

### Phase 7: Build Scripts

Update `package.json` scripts:

```json
{
  "scripts": {
    "dev": "vite build --watch --mode development",
    "build": "vite build --mode production",
    "generate-icons": "tsx scripts/generate-icons.ts",
    "preview": "vite preview",
    "type-check": "tsc --noEmit",
    "lint": "eslint . --ext .js,.jsx,.ts,.tsx",
    "lint:fix": "eslint . --ext .js,.jsx,.ts,.tsx --fix",
    "format": "prettier --write \"**/*.{js,jsx,ts,tsx,json,css,scss,md}\"",
    "format:check": "prettier --check \"**/*.{js,jsx,ts,tsx,json,css,scss,md}\""
  }
}
```

**Note**: Icon generation is handled by `vite-plugin-sharp-resize` during production build, so the `generate-icons` script is only needed if you want to generate icons separately.

**Available Commands**:

| Command | Description | Source Maps | Minify |
|---------|-------------|-------------|--------|
| `npm run dev` | Watch mode for development (friendly debugging) | ✅ Yes | ❌ No |
| `npm run build` | Production build (optimized, smaller) | ❌ No | ✅ Yes |
| `npm run lint` | Check code for linting errors | - | - |
| `npm run lint:fix` | Auto-fix linting errors | - | - |
| `npm run format` | Format all source files with Prettier | - | - |
| `npm run format:check` | Check if files are formatted | - | - |
| `npm run type-check` | Type check without emitting files | - | - |

**Development vs Production**:

```bash
# Development: Watch mode, source maps, no minification
npm run dev

# Production: Single build, no source maps, minified code
npm run build
```

---

### Phase 8: TypeScript Manifest (manifest.json.ts)

Create a **type-safe TypeScript manifest** file instead of plain JSON.

**File**: `src/manifest.ts`

**Key Characteristics**:
- Full TypeScript type checking using `chrome.Manifest` type
- References official Chrome Extension types (`@types/chrome`)
- Built by Vite into `dist/manifest.json`
- Supports imports for dynamic values (version from package.json, etc.)

**Required manifest.json.ts Structure**:

```typescript
// Chrome Extension Manifest (TypeScript)
// Uses global chrome types from @types/chrome

const manifest: Chrome.Manifest.WebExtensionManifest = {
  // ============================================================================
  // manifest_version
  // Specifies the version of the manifest file format.
  // Documentation: https://developer.chrome.com/docs/extensions/reference/manifest/manifest-version
  // ============================================================================
  manifest_version: 3,

  // ============================================================================
  // Basic Extension Information
  // Documentation: https://developer.chrome.com/docs/extensions/reference/manifest#name
  // ============================================================================
  name: 'WoofManager AI Identification',
  version: '1.0.0',
  description: 'AI-powered content identification tool using WASM',

  // ============================================================================
  // icons
  // Icons for the extension in various sizes.
  // Documentation: https://developer.chrome.com/docs/extensions/develop/ui/icons
  // Sizes: 16x16 (favicon), 32x32 (Windows), 48x48 (extension page), 128x128 (web store)
  // ============================================================================
  icons: {
    '16': 'logo/icon16.png',
    '32': 'logo/icon32.png',
    '48': 'logo/icon48.png',
    '128': 'logo/icon128.png'
  },

  // ============================================================================
  // action (formerly browser_action)
  // Controls the extension's icon in the browser toolbar.
  // Documentation: https://developer.chrome.com/docs/extensions/reference/api/action
  // Documentation: https://developer.chrome.com/docs/extensions/develop/ui/add-popup
  // Popup size: 25x25 to 800x600 pixels
  // ============================================================================
  action: {
    default_popup: 'popup/index.html',
    default_icon: {
      '16': 'logo/icon16.png',
      '32': 'logo/icon32.png',
      '48': 'logo/icon48.png',
      '128': 'logo/icon128.png'
    }
  },

  // ============================================================================
  // background (service worker)
  // Event-driven background script that runs in the extension context.
  // Documentation: https://developer.chrome.com/docs/extensions/reference/manifest/background
  // Service workers replace persistent background pages from Manifest V2.
  // They are event-driven and can be terminated when not in use.
  // ============================================================================
  background: {
    service_worker: 'background.js',
    type: 'module'
  },

  // ============================================================================
  // content_scripts
  // JavaScript and CSS files that are injected into web pages.
  // Documentation: https://developer.chrome.com/docs/extensions/mv3/content_scripts
  // Documentation: https://developer.chrome.com/docs/extensions/reference/manifest#content_scripts
  //
  // IMPORTANT: Content Script Auto-Reload (Development Only)
  // ============================================================
  // This extension includes a custom Vite plugin for content script auto-reload.
  // See Phase 13: Content Script Auto-Reload Plugin for details.
  //
  // How it works:
  // 1. Content scripts connect directly to WebSocket server (ws://localhost:24678)
  // 2. When content scripts change, Vite broadcasts reload signal
  // 3. Each content script shows notification and auto-refreshes its page
  // 4. No manual refresh needed during development!
  //
  // Benefits:
  // - No background service worker needed
  // - Real-time updates via WebSocket
  // - Visual countdown notification before refresh
  // - Multi-project friendly (dynamic port allocation)
  // ============================================================================
  content_scripts: [
    {
      matches: ['<all_urls>'],
      js: ['contents/default-content/index.js'],
      css: ['contents/default-content/style.css'],
      run_at: 'document_idle'
    },
    // Add more content scripts as needed
    // {
    //   matches: ['https://example.com/*'],
    //   js: ['contents/another-content/index.js'],
    //   css: ['contents/another-content/style.css'],
    //   run_at: 'document_idle'
    // }
  ],

  // ============================================================================
  // options_page
  // A page that allows users to customize extension settings.
  // Documentation: https://developer.chrome.com/docs/extensions/develop/ui/options-page
  // Can use options_ui for embedded settings or options_page for full tab.
  // ============================================================================
  options_page: 'options/default-page/index.html',

  // ============================================================================
  // permissions
  // Permissions and API access the extension needs.
  // Documentation: https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions
  // Reference: https://developer.chrome.com/docs/extensions/reference/permissions-list
  //
  // Common permissions:
  // - activeTab: Access to the current tab when user clicks extension icon
  // - storage: Chrome storage API for persisting data
  // - scripting: Dynamic script injection into pages
  // - tabs: Access to tab information (URL, title, etc.)
  // ============================================================================
  permissions: [
    'activeTab',      // https://developer.chrome.com/docs/extensions/reference/api/activeTab
    'storage',        // https://developer.chrome.com/docs/extensions/reference/api/storage
    'scripting',      // https://developer.chrome.com/docs/extensions/reference/api/scripting
    'tabs'            // https://developer.chrome.com/docs/extensions/reference/api/tabs
  ],

  // ============================================================================
  // host_permissions
  // Permissions for accessing specific websites or URL patterns.
  // Documentation: https://developer.chrome.com/docs/extensions/mv3/declare_permissions#host_permissions
  // Use <all_urls> to access all websites, or specific patterns like:
  // - "https://*.google.com/*" - All Google subdomains
  // - "https://example.com/*" - Specific domain
  // ============================================================================
  host_permissions: ['<all_urls>']
}

export default manifest
```

---

### Phase 9: React Component Structure

**Popup Entry** (`src/popup/main.tsx`):
```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './style.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

**Popup HTML** (`src/popup/index.html`):
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WoofManager</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="./main.tsx"></script>
</body>
</html>
```

---

### Phase 10: Chrome Extension Icon Requirements

Based on [official Chrome Extension documentation](https://developer.chrome.com/docs/extensions/develop/ui/configure-icons):

| Size | Use Case | Required |
|------|----------|----------|
| **16x16** | Favicon on extension pages and context menu icon | Optional |
| **32x32** | Windows computers often require this size | Optional |
| **48x48** | Extension management page | Recommended |
| **128x128** | Installation and Chrome Web Store | **Required** |

**Icon Generation Strategy**:

**Primary Method (Recommended)**: Use `vite-plugin-sharp-resize` during Vite build
- Icons are automatically generated during production build
- No separate script needed
- Configured in `vite.config.ts`

**Alternative Method**: Custom build script (if vite-plugin-sharp-resize is not suitable)
- Use the custom script at `scripts/generate-icons.ts`
- Run manually with `npm run generate-icons`
- Useful for testing or if you need to generate icons outside of build process

**Alternative: Custom Build Script**

If `vite-plugin-sharp-resize` is not suitable, create a custom build script:

**File**: `scripts/generate-icons.ts`

```typescript
import sharp from 'sharp'
import path from 'path'
import fs from 'fs'

const ICON_SIZES = [16, 32, 48, 128]
const SOURCE = path.resolve(__dirname, '../public/logo.png')
const OUTPUT_DIR = path.resolve(__dirname, '../dist/logo')

async function generateIcons() {
  // Ensure output directory exists
  await fs.promises.mkdir(OUTPUT_DIR, { recursive: true })

  // Generate each size
  await Promise.all(
    ICON_SIZES.map(size =>
      sharp(SOURCE)
        .resize(size, size, { fit: 'cover', position: 'center' })
        .png()
        .toFile(path.join(OUTPUT_DIR, `icon${size}.png`))
    )
  )

  console.log('✅ Icons generated successfully')
}

generateIcons().catch(console.error)
```

Add to `package.json`:
```json
{
  "scripts": {
    "generate-icons": "tsx scripts/generate-icons.ts",
    "build": "npm run generate-icons && vite build"
  }
}
```

---

### Phase 11: React Router HashRouter Setup (Options Pages)

Install `react-router-dom` v6:
```bash
npm install react-router-dom@6
```

**Options Entry with HashRouter** (`src/options/default-page/main.tsx`):

```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import './style.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
)
```

**Options App with Routes** (`src/options/default-page/App.tsx`):

```typescript
import { Routes, Route, Link, useLocation } from 'react-router-dom'
import Settings from './pages/Settings'
import About from './pages/About'
import Help from './pages/Help'

export default function App() {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex space-x-8">
            <NavLink to="/settings">Settings</NavLink>
            <NavLink to="/about">About</NavLink>
            <NavLink to="/help">Help</NavLink>
          </div>
        </div>
      </nav>

      {/* Routes */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<Settings />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/about" element={<About />} />
          <Route path="/help" element={<Help />} />
        </Routes>
      </main>
    </div>
  )
}

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  const location = useLocation()
  const isActive = location.pathname === to || (to !== '/' && location.pathname.startsWith(to))

  return (
    <Link
      to={to}
      className={`py-4 px-2 border-b-2 font-medium transition-colors ${
        isActive
          ? 'border-blue-500 text-blue-600'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
      }`}
    >
      {children}
    </Link>
  )
}
```

**Sample Page Component** (`src/options/default-page/pages/Settings.tsx`):

```typescript
export default function Settings() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">General Settings</h2>
        {/* Settings form */}
      </div>
    </div>
  )
}
```

**Why HashRouter?**

| Router Type | Description | Use Case |
|-------------|-------------|----------|
| **BrowserRouter** | Uses HTML5 history API | Requires server configuration |
| **HashRouter** | Uses URL hash (e.g., `#/settings`) | Works without server configuration |

For Chrome Extensions, **HashRouter is required** because:
1. Extension pages are served from `chrome-extension://` protocol
2. No server-side routing configuration is possible
3. Hash-based routing works perfectly in isolated extension context

---

### Phase 12: OPFS Integration

Create a wrapper for Origin Private File System in `src/shared/storage.ts` using functional programming patterns:

```typescript
// OPFS utilities for WASM/AI model storage
// Functional programming approach with pure functions and composition

// ============================================================================
// Types
// ============================================================================

export type FilePath = string

export interface OPFSFile {
  name: string
  data: ArrayBuffer
  lastModified: number
}

export interface OPFSDirectory {
  name: string
  entries: OPFSEntry[]
}

export type OPFSEntry = OPFSFile | OPFSDirectory

export interface FileSystemError {
  code: 'NOT_FOUND' | 'PERMISSION_DENIED' | 'QUOTA_EXCEEDED' | 'UNKNOWN'
  message: string
}

// ============================================================================
// Result Type (Either-like pattern for error handling)
// ============================================================================

export type Result<T, E = FileSystemError> =
  | { success: true; data: T }
  | { success: false; error: E }

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Get the root OPFS directory handle
 */
const getRootDir = async (): Promise<FileSystemDirectoryHandle> => {
  return navigator.storage.getDirectory()
}

/**
 * Split a file path into directory parts and filename
 * @example splitPath('wasm/models/ai.wasm') => ['wasm', 'models'], 'ai.wasm'
 */
const splitPath = (path: FilePath): [string[], string] => {
  const parts = path.split('/').filter(Boolean)
  if (parts.length === 0) return [[], '']
  const fileName = parts[parts.length - 1]
  const dirParts = parts.slice(0, -1)
  return [dirParts, fileName]
}

/**
 * Navigate to a directory by path parts, creating directories if needed
 */
const navigateToDirectory = async (
  root: FileSystemDirectoryHandle,
  dirParts: string[],
  create: boolean = false
): Promise<Result<FileSystemDirectoryHandle>> => {
  try {
    let dir = root
    for (const part of dirParts) {
      dir = await dir.getDirectoryHandle(part, { create })
    }
    return { success: true, data: dir }
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Directory not found: ${dirParts.join('/')}`
      }
    }
  }
}

/**
 * Get a file handle at the given path
 */
const getFileHandle = async (
  root: FileSystemDirectoryHandle,
  path: FilePath,
  create: boolean = false
): Promise<Result<FileSystemFileHandle>> => {
  const [dirParts, fileName] = splitPath(path)

  const dirResult = await navigateToDirectory(root, dirParts, create)
  if (!dirResult.success) {
    return { success: false, error: dirResult.error }
  }

  try {
    const file = await dirResult.data.getFileHandle(fileName, { create })
    return { success: true, data: file }
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `File not found: ${path}`
      }
    }
  }
}

/**
 * Write data to a file at the given path
 */
export const writeFile = async (
  path: FilePath,
  data: ArrayBuffer
): Promise<Result<void>> => {
  const root = await getRootDir()
  const fileResult = await getFileHandle(root, path, true)

  if (!fileResult.success) {
    return { success: false, error: fileResult.error }
  }

  try {
    const writable = await fileResult.data.createWritable()
    await writable.write(data)
    await writable.close()
    return { success: true, data: undefined }
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'UNKNOWN',
        message: `Failed to write file: ${path}`
      }
    }
  }
}

/**
 * Read data from a file at the given path
 */
export const readFile = async (
  path: FilePath
): Promise<Result<ArrayBuffer>> => {
  const root = await getRootDir()
  const fileResult = await getFileHandle(root, path, false)

  if (!fileResult.success) {
    return { success: false, error: fileResult.error }
  }

  try {
    const fileData = await fileResult.data.getFile()
    return { success: true, data: await fileData.arrayBuffer() }
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'UNKNOWN',
        message: `Failed to read file: ${path}`
      }
    }
  }
}

/**
 * Delete a file at the given path
 */
export const deleteFile = async (
  path: FilePath
): Promise<Result<void>> => {
  const root = await getRootDir()
  const [dirParts, fileName] = splitPath(path)

  const dirResult = await navigateToDirectory(root, dirParts, false)
  if (!dirResult.success) {
    return { success: false, error: dirResult.error }
  }

  try {
    await dirResult.data.removeEntry(fileName)
    return { success: true, data: undefined }
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Failed to delete file: ${path}`
      }
    }
  }
}

/**
 * Check if a file exists at the given path
 */
export const fileExists = async (path: FilePath): Promise<boolean> => {
  const result = await readFile(path)
  return result.success
}

/**
 * List all entries in a directory
 */
export const listDirectory = async (
  dirPath: FilePath = ''
): Promise<Result<string[]>> => {
  const root = await getRootDir()
  const [dirParts] = splitPath(dirPath)

  const dirResult = await navigateToDirectory(root, dirParts, false)
  if (!dirResult.success) {
    return { success: false, error: dirResult.error }
  }

  try {
    const entries: string[] = []
    for await (const entry of dirResult.data.values()) {
      entries.push(entry.name)
    }
    return { success: true, data: entries }
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'UNKNOWN',
        message: `Failed to list directory: ${dirPath}`
      }
    }
  }
}

/**
 * Get file metadata
 */
export const getFileMetadata = async (
  path: FilePath
): Promise<Result<{ size: number; type: string; lastModified: number }>> => {
  const root = await getRootDir()
  const fileResult = await getFileHandle(root, path, false)

  if (!fileResult.success) {
    return { success: false, error: fileResult.error }
  }

  try {
    const file = await fileResult.data.getFile()
    return {
      success: true,
      data: {
        size: file.size,
        type: file.type,
        lastModified: file.lastModified
      }
    }
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'UNKNOWN',
        message: `Failed to get file metadata: ${path}`
      }
    }
  }
}

// ============================================================================
// Utility Functions (functional composition)
// ============================================================================

/**
 * Pipe functions together (left-to-right composition)
 * @example pipe(data, fn1, fn2, fn3)
 */
export const pipe = <T>(value: T, ...fns: Array<(arg: T) => T>): T => {
  return fns.reduce((acc, fn) => fn(acc), value)
}

/**
 * Compose functions (right-to-left composition)
 * @example compose(fn3, fn2, fn1)(data)
 */
export const compose = <T>(...fns: Array<(arg: T) => T>) => {
  return (value: T): T => fns.reduceRight((acc, fn) => fn(acc), value)
}

/**
 * Async pipe for async functions
 */
export const pipeAsync = async <T>(
  value: T,
  ...fns: Array<(arg: T) => Promise<T> | T>
): Promise<T> => {
  let result = value
  for (const fn of fns) {
    result = await fn(result)
  }
  return result
}

// ============================================================================
// Higher-Order Functions
// ============================================================================

/**
 * Retry a function with exponential backoff
 */
export const withRetry = <T extends (...args: any[]) => Promise<Result<any>>>(
  fn: T,
  maxRetries: number = 3,
  baseDelay: number = 100
): T => {
  return (async (...args: Parameters<T>) => {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const result = await fn(...args)
      if (result.success) return result

      // Don't retry on certain errors
      if (result.error.code === 'NOT_FOUND' || result.error.code === 'PERMISSION_DENIED') {
        return result
      }

      // Exponential backoff
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, baseDelay * Math.pow(2, attempt)))
      }
    }
    return fn(...args)
  }) as T
}

/**
 * Wrap a function with error logging
 */
export const withLogging = <T extends (...args: any[]) => Promise<Result<any>>>(
  fn: T,
  label: string
): T => {
  return (async (...args: Parameters<T>) => {
    console.log(`[OPFS] ${label} called with:`, args)
    const result = await fn(...args)
    if (!result.success) {
      console.error(`[OPFS] ${label} failed:`, result.error)
    } else {
      console.log(`[OPFS] ${label} succeeded`)
    }
    return result
  }) as T
}

// ============================================================================
// Convenience Functions using composition
// ============================================================================

/**
 * Write file with retry and logging
 */
export const writeFileSafe = withRetry(
  withLogging(writeFile, 'writeFileSafe')
)

/**
 * Read file with retry and logging
 */
export const readFileSafe = withRetry(
  withLogging(readFile, 'readFileSafe')
)

/**
 * Initialize a WASM module from OPFS
 * @returns WebAssembly.Instance or null
 */
export const loadWASM = async (
  path: FilePath,
  imports: WebAssembly.Imports = {}
): Promise<Result<WebAssembly.Instance>> => {
  const readResult = await readFile(path)
  if (!readResult.success) {
    return { success: false, error: readResult.error }
  }

  try {
    const module = await WebAssembly.instantiate(readResult.data, imports)
    return { success: true, data: module.instance }
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'UNKNOWN',
        message: `Failed to load WASM module: ${path}`
      }
    }
  }
}

// ============================================================================
// Constants
// ============================================================================

export const OPFSPaths = {
  WASM_DIR: 'wasm',
  MODELS_DIR: 'wasm/models',
  CACHE_DIR: 'cache',
  CONFIG_DIR: 'config'
} as const

export type OPFSPath = typeof OPFSPaths[keyof typeof OPFSPaths]
```

**Usage Examples**:

```typescript
// Write a file
const writeResult = await writeFile('wasm/model.wasm', wasmBuffer)
if (!writeResult.success) {
  console.error(writeResult.error.message)
}

// Read a file
const readResult = await readFile('wasm/model.wasm')
if (readResult.success) {
  const data = readResult.data
}

// Load WASM module
const wasmResult = await loadWASM('wasm/ai-model.wasm', { env: {} })
if (wasmResult.success) {
  const instance = wasmResult.data
}

// Using safe version with retry and logging
const safeReadResult = await readFileSafe('wasm/model.wasm')

// List directory contents
const listResult = await listDirectory('wasm')
if (listResult.success) {
  console.log(listResult.data) // ['model.wasm', 'helper.wasm']
}

// Check if file exists
const exists = await fileExists('wasm/model.wasm') // true/false
```

---

### Phase 13: Content Script Auto-Reload Plugin (Development Only)

**Problem**: Content scripts don't support HMR because they run in an isolated world within web pages. When content scripts change, developers must manually refresh each web page to see updates.

**Solution**: Create a custom Vite plugin that automatically refreshes web pages when content scripts are rebuilt during development.

**Architecture**:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Development Flow (WebSocket)                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. Developer saves content script                                         │
│         ↓                                                                   │
│  2. Vite rebuilds content script                                           │
│         ↓                                                                   │
│  3. Custom plugin detects change (handleHotUpdate hook)                     │
│         ↓                                                                   │
│  4. Plugin broadcasts reload signal via WebSocket                          │
│         ↓                                                                   │
│  5. All content scripts receive message directly via WebSocket             │
│         ↓                                                                   │
│  6. Each content script shows notification and refreshes its page          │
│         ↓                                                                   │
│  7. Page auto-refreshes after countdown (configurable, default: 3s)       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**WebSocket Communication Flow (Simplified)**:

```
┌─────────────────────────┐
│   Vite Dev Server       │
│   (WebSocket Server)    │
│   ws://localhost:24678  │
└───────────┬─────────────┘
            │
            │ WebSocket (broadcast)
            │
    ┌───────┴──────────────────────────────────┐
    │                                          │
    ▼                                          ▼
┌─────────────────┐                   ┌─────────────────┐
│ Content Script  │                   │ Content Script  │
│ in Tab 1        │                   │ in Tab 2        │
│                 │                   │                 │
│ • Connects to WS │                   │ • Connects to WS │
│ • Shows notif.   │                   │ • Shows notif.   │
│ • Reloads page  │                   │ • Reloads page  │
└─────────────────┘                   └─────────────────┘
```

**No background service worker needed!**

**File 1: Vite Plugin** (`plugins/vite-content-reload.ts`)

```typescript
// plugins/vite-content-reload.ts
import type { Plugin, ViteDevServer } from 'vite'
import { WebSocketServer, WebSocket } from 'ws'

/**
 * Custom Vite plugin for content script auto-reload using WebSocket.
 *
 * How it works:
 * 1. Creates a WebSocket server during development
 * 2. Injects WebSocket client code into content scripts
 * 3. Content scripts connect directly to the WebSocket server
 * 4. When content scripts change, broadcasts reload signal to all connected clients
 * 5. Each content script shows notification and refreshes its own page
 *
 * NO background service worker needed!
 *
 * Reference: https://github.com/isaurssaurav/hot-reload-extension-vite-plugin
 * Reference: https://www.npmjs.com/package/vite-plugin-extension-reloader
 */
export interface ContentScriptReloadOptions {
  /** Starting WebSocket port (default: 24678) */
  port?: number
  /** WebSocket path (default: '/vite-content-reload') */
  path?: string
  /** Countdown in seconds before reload (default: 3) */
  countdown?: number
  /** Enable cancel button (default: true) */
  enableCancel?: boolean
}

/**
 * Bind a WebSocket server directly to an available port.
 * This approach eliminates race conditions by binding immediately
 * when an available port is found, rather than checking then binding.
 *
 * @param startPort - Starting port number (will increment if in use)
 * @param createServer - Function that creates a server and attempts to bind
 * @returns Object with the bound port and server
 *
 * @example
 * const { port, server } = await bindWebSocketServer(24678, (port) => {
 *   return new WebSocketServer({ port })
 * })
 *
 * Note: The ws library's WebSocketServer throws EADDRINUSE error
 * synchronously when the port is in use. We catch this error and
 * try the next port immediately.
 */
async function bindWebSocketServer<T>(
  startPort: number,
  createServer: (port: number) => T
): Promise<{ port: number; server: T }> {
  let port = startPort
  let maxAttempts = 100 // Prevent infinite loop

  while (maxAttempts > 0) {
    try {
      // Attempt to create and bind the server directly
      // WebSocketServer throws synchronously if port is in use
      const server = createServer(port)

      // Successfully bound to port
      console.log(`[Content Reload] WebSocket server bound to port: ${port}`)
      return { port, server }
    } catch (error) {
      // Port is in use, try next port
      const errorCode = (error as any)?.code
      if (errorCode === 'EADDRINUSE') {
        console.log(`[Content Reload] Port ${port} in use, trying ${port + 1}...`)
        port++
        maxAttempts--
      } else {
        // Different error, rethrow
        throw error
      }
    }
  }

  throw new Error(`Could not bind WebSocket server to any port starting from ${startPort}`)
}

export function contentScriptReloadPlugin(options: ContentScriptReloadOptions = {}): Plugin {
  const {
    port = 24678,
    path: wsPath = '/vite-content-reload',
    countdown = 3,
    enableCancel = true
  } = options

  let isDev = false
  let wsServer: WebSocketServer | null = null
  let actualPort: number | null = null

  return {
    name: 'vite-content-script-reload',

    config(config, { command }) {
      isDev = command === 'serve'
    },

    /**
     * Configure the Vite dev server to include our WebSocket server.
     */
    async configureServer(server: ViteDevServer) {
      if (!isDev) return

      // Bind WebSocket server directly to an available port
      // This eliminates race conditions by binding immediately
      const result = await bindWebSocketServer(port, (portNum) => {
        return new WebSocketServer({ port: portNum, path: wsPath })
      })

      actualPort = result.port
      wsServer = result.server

      // Handle new WebSocket connections (from content scripts)
      wsServer.on('connection', (ws: WebSocket) => {
        console.log('[Content Reload] Content script connected')
      })

      console.log(`[Content Reload] WebSocket server listening on ws://localhost:${actualPort}${wsPath}`)
    },

    // Inject WebSocket client into content scripts
    transform(code, id) {
      if (!isDev) return null

      // Only inject into content scripts
      if (!id.includes('/contents/')) return null

      // Inject WebSocket client code with the actual port
      const wsClientCode = getWebSocketClientCode({ port: actualPort || port, path: wsPath, countdown, enableCancel })
      return {
        code: code + '\n\n' + wsClientCode,
        map: null // Preserve source maps
      }
    },

    // Detect content script changes and broadcast via WebSocket
    async handleHotUpdate({ file, modules }) {
      if (!isDev) return

      // Check if any content script was rebuilt
      const hasContentScriptChange = modules.some(m =>
        m.id?.includes('/contents/')
      )

      if (hasContentScriptChange) {
        console.log('[Content Reload] Content script changed, broadcasting reload...')

        // Broadcast reload signal to all connected content scripts
        broadcastReload({ countdown })
      }
    },

    // Close WebSocket server on build close
    closeBundle() {
      if (wsServer) {
        wsServer.close()
        wsServer = null
      }
    }
  }

  /**
   * Broadcast reload signal to all connected WebSocket clients.
   */
  function broadcastReload(options: { countdown: number }) {
    if (!wsServer) return

    const message = JSON.stringify({
      type: 'reload',
      countdown: options.countdown
    })

    wsServer.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message)
      }
    })
  }
}

/**
 * Get the WebSocket client code to inject into content scripts.
 * This code runs in the content script context and:
 * 1. Connects to the WebSocket server
 * 2. Listens for reload signals
 * 3. Shows notification and refreshes the page
 */
interface WebSocketClientOptions {
  port: number
  path: string
  countdown: number
  enableCancel: boolean
}

function getWebSocketClientCode(options: WebSocketClientOptions): string {
  const { port, path: wsPath, countdown, enableCancel } = options

  return `
// ============================================================================
// Content Script Auto-Reload - WebSocket Client (Development Only)
// ============================================================================
;(function() {
  const wsUrl = 'ws://localhost:${port}${wsPath}'
  let ws: WebSocket | null = null
  let reconnectTimeout: number | null = null
  let reloadTimeout: number | null = null
  let countdownInterval: number | null = null

  // Connect to WebSocket server
  function connect() {
    ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      console.log('[Content Reload] Connected to Vite dev server')
      // Clear reconnect timeout on successful connection
      if (reconnectTimeout !== null) {
        clearTimeout(reconnectTimeout)
        reconnectTimeout = null
      }
    }

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)

        if (message.type === 'reload') {
          console.log('[Content Reload] Reload signal received')
          scheduleReload(message.countdown || ${countdown})
        }
      } catch (error) {
        console.error('[Content Reload] Failed to parse message:', error)
      }
    }

    ws.onclose = () => {
      console.log('[Content Reload] Disconnected, reconnecting in 1s...')
      reconnectTimeout = setTimeout(connect, 1000) as unknown as number
    }

    ws.onerror = (error) => {
      console.error('[Content Reload] WebSocket error:', error)
    }
  }

  function scheduleReload(countdownSeconds: number) {
    // Clear any existing timeout
    if (reloadTimeout !== null) {
      clearTimeout(reloadTimeout)
      reloadTimeout = null
    }
    if (countdownInterval !== null) {
      clearInterval(countdownInterval)
      countdownInterval = null
    }

    // Show notification at bottom right
    showReloadNotification(countdownSeconds)

    // Start countdown
    let secondsLeft = countdownSeconds
    countdownInterval = setInterval(() => {
      secondsLeft--
      updateReloadNotification(secondsLeft)

      if (secondsLeft <= 0) {
        clearInterval(countdownInterval!)
        countdownInterval = null
      }
    }, 1000) as unknown as number

    // Reload after countdown
    reloadTimeout = setTimeout(() => {
      location.reload()
    }, countdownSeconds * 1000) as unknown as number
  }

  function showReloadNotification(countdownSeconds: number) {
    // Create or update notification element at bottom right
    let notification = document.getElementById('__vite-content-reload__')

    if (!notification) {
      notification = document.createElement('div')
      notification.id = '__vite-content-reload__'
      notification.style.cssText = \`
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 16px 20px;
        border-radius: 12px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        font-weight: 500;
        box-shadow: 0 10px 40px rgba(102, 126, 234, 0.3);
        z-index: 999999;
        animation: slideInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      \`

      // Add animation styles
      const style = document.createElement('style')
      style.id = '__vite-content-reload-styles__'
      style.textContent = \`
        @keyframes slideInUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes slideOutDown {
          from { transform: translateY(0); opacity: 1; }
          to { transform: translateY(100%); opacity: 0; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .vite-reload-spinner { animation: spin 1s linear infinite; }
      \`
      document.head.appendChild(style)
    }

    const cancelBtn = ${enableCancel} ? \`
      <button onclick="window.clearViteReload()" style="
        background: rgba(255,255,255,0.2);
        border: 1px solid rgba(255,255,255,0.3);
        color: white;
        border-radius: 6px;
        padding: 6px 12px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 500;
        margin-left: 12px;
        transition: background 0.2s;
      " onmouseover="this.style.background='rgba(255,255,255,0.3)'"
         onmouseout="this.style.background='rgba(255,255,255,0.2)'">
        Cancel
      </button>
    \` : ''

    notification.innerHTML = \`
      <div style="display: flex; align-items: center; gap: 14px;">
        <svg class="vite-reload-spinner" width="22" height="22" viewBox="0 0 22 22" fill="none">
          <circle cx="11" cy="11" r="9" stroke="currentColor" stroke-width="2" opacity="0.3"/>
          <path d="M11 2a9 9 0 0 1 9 9" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <div>
          <div style="font-weight: 600; font-size: 14px;">Content script updated</div>
          <div style="opacity: 0.9; font-size: 13px; margin-top: 2px;">
            Reloading in <span id="__vite-countdown__" style="font-weight: 600;">${countdownSeconds}</span>s...
          </div>
        </div>
        ${cancelBtn}
      </div>
    \`

    document.body.appendChild(notification)
  }

  function updateReloadNotification(secondsLeft: number) {
    const countdown = document.getElementById('__vite-countdown__')
    if (countdown) {
      countdown.textContent = secondsLeft.toString()
    }
  }

  // Expose cancel function globally
  window.clearViteReload = function() {
    if (reloadTimeout !== null) {
      clearTimeout(reloadTimeout)
      reloadTimeout = null
    }
    if (countdownInterval !== null) {
      clearInterval(countdownInterval)
      countdownInterval = null
    }

    const notification = document.getElementById('__vite-content-reload__')
    if (notification) {
      notification.style.animation = 'slideOutDown 0.3s ease-out forwards'
      setTimeout(() => notification.remove(), 300)
    }
  }

  // Start connection
  connect()
})()
  `.trim()
}
```

**No background service worker code needed!**

**Update Vite Config** (`vite.config.ts`):

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import { contentScriptReloadPlugin } from './plugins/vite-content-reload'
import { vitePluginSharpResize } from 'vite-plugin-sharp-resize'
import manifest from './src/manifest'

export default defineConfig(({ mode }) => {
  const isDevelopment = mode === 'development'

  return {
    plugins: [
      react(),
      crx({ manifest }),
      // Content script auto-reload (development only)
      isDevelopment && contentScriptReloadPlugin(),
      // Generate icons only during build
      !isDevelopment && vitePluginSharpResize({
        inputDir: 'public',
        outputDir: 'dist/logo',
        patterns: [
          {
            input: 'logo.png',
            output: [
              { name: 'icon16.png', width: 16, height: 16 },
              { name: 'icon32.png', width: 32, height: 32 },
              { name: 'icon48.png', width: 48, height: 48 },
              { name: 'icon128.png', width: 128, height: 128 }
            ]
          }
        ]
      })
    ].filter(Boolean),
    build: {
      // Source maps: development = true, production = false
      sourcemap: isDevelopment,
      // Minify: development = false, production = true
      minify: isDevelopment ? false : 'esbuild',
      rollupOptions: {
        input: {
          // Popup page
          'popup/index': 'src/popup/index.html',
          // Options pages (supports multiple)
          'options/default-page/index': 'src/options/default-page/index.html',
          background: 'src/background/index.ts',
          // Multiple content scripts
          'contents/default-content/index': 'src/contents/default-content/index.ts'
        },
        output: {
          entryFileNames: (chunkInfo) => {
            if (chunkInfo.name.includes('popup/') ||
                chunkInfo.name.includes('options/') ||
                chunkInfo.name.includes('contents/')) {
              return chunkInfo.name + '.js'
            }
            return '[name].js'
          },
          chunkFileNames: (chunkInfo) => {
            if (chunkInfo.name.includes('popup/') ||
                chunkInfo.name.includes('options/') ||
                chunkInfo.name.includes('contents/')) {
              return chunkInfo.name + '.js'
            }
            return '[name].js'
          },
          assetFileNames: (assetInfo) => {
            const name = assetInfo.name || ''
            if (name.includes('popup/') || name.includes('options/') || name.includes('contents/')) {
              return name
            }
            return '[name].[ext]'
          }
        },
        treeshake: true
      },
      emptyOutDir: true
    },
    server: {
      hmr: isDevelopment
    }
  }
})
```

**Features**:

| Feature | Description |
|---------|-------------|
| **Dynamic port allocation** | Auto-finds available port starting from 24678, increments if in use |
| **Multi-project friendly** | No conflicts when developing multiple Chrome extensions simultaneously |
| **Direct WebSocket** | Content scripts connect directly to Vite WebSocket server |
| **No background worker** | Simpler architecture, no intermediate forwarding |
| **Auto-reconnect** | WebSocket auto-reconnects if connection is lost |
| **Visual notification** | Shows countdown notification at bottom right corner |
| **Cancellable** | Users can cancel the reload if needed |
| **Countdown timer** | Configurable countdown (default: 3 seconds) |
| **Zero production impact** | Plugin is completely disabled in production builds |

**Configuration** (optional):

```typescript
// Customize the plugin behavior
contentScriptReloadPlugin({
  port: 24678,           // Starting port (will increment if in use)
  path: '/vite-content-reload',  // WebSocket path
  countdown: 5,           // Countdown in seconds (default: 3)
  enableCancel: true      // Show cancel button (default: true)
})
```

**Port Allocation Logic (Race Condition Free)**:

```
1. Attempt to bind WebSocket server directly to port 24678
2. If EADDRINUSE error (port in use), increment to 24679 and retry
3. Continue until successful bind (max 100 attempts)
4. Return the bound port and server

Benefits:
- No race condition (binds immediately when port is found)
- No additional dependencies
- Atomic operation (check + bind in one step)
```

**Why This Approach?**

The "bind directly with retry" approach eliminates the race condition that exists when:
1. Checking if a port is available (creating temp server)
2. Then creating the WebSocket server on that port

Between steps 1 and 2, another process could grab the port. By binding directly, we ensure the port is ours the moment we find it.

**Console Output Example**:
```
[Content Reload] WebSocket server bound to port: 24678
[Content Reload] WebSocket server listening on ws://localhost:24678/vite-content-reload
```

Or if port is in use:
```
[Content Reload] Port 24678 in use, trying 24679...
[Content Reload] WebSocket server bound to port: 24679
[Content Reload] WebSocket server listening on ws://localhost:24679/vite-content-reload
```

**WebSocket Message Protocol (Simplified)**:

```typescript
// Server → Client (from Vite to Content Scripts)
type WebSocketMessage =
  | { type: 'reload'; countdown: number }
```

**Extending the Protocol**:

The WebSocket protocol is designed to be extensible. You can add new message types as needed:

```typescript
// Example: Add more message types
type WebSocketMessage =
  | { type: 'reload'; countdown: number }
  | { type: 'ping' }                              // Heartbeat
  | { type: 'broadcast'; message: string }        // Custom messages
  | { type: 'config'; data: Record<string, unknown> } // Send config to scripts
```

**Server-side (Vite Plugin)** - Sending messages:
```typescript
// Broadcast reload signal
wsServer.clients.forEach((client) => {
  if (client.readyState === WebSocket.OPEN) {
    client.send(JSON.stringify({ type: 'reload', countdown: 3 }))
  }
})

// Send custom message
client.send(JSON.stringify({ type: 'broadcast', message: 'Hello from Vite!' }))
```

**Client-side (Content Script)** - Receiving messages:
```typescript
ws.onmessage = (event) => {
  const message = JSON.parse(event.data)

  switch (message.type) {
    case 'reload':
      scheduleReload(message.countdown)
      break
    case 'ping':
      // Handle ping
      break
    case 'broadcast':
      console.log(message.message)
      break
    default:
      console.warn('Unknown message type:', message.type)
  }
}
```

**References**:
- [hot-reload-extension-vite-plugin](https://github.com/isaurssaurav/hot-reload-extension-vite-plugin)
- [vite-plugin-extension-reloader](https://www.npmjs.com/package/vite-plugin-extension-reloader)
- [Real Vite-React HMR in Chrome Extension Content Scripts](https://dev.to/jacksteamdev/real-vite-react-hmr-in-chrome-extension-content-scripts-40di)
- [Hot Reloading for Chrome Extensions with Vite](https://medium.com/@saurssaurav33/chrome-extension-development-with-the-hot-reload-vite-plugin-8074a3d6589e)

---

### Phase 14: Chrome Extension Development Workflow

1. **Development** (`npm run dev`):
   ```bash
   npm run dev
   ```
   - **Watch mode** enabled - rebuilds on file changes
   - **Source maps** generated to `dist/` for debugging
   - **No minification** - readable code for debugging
   - Load `dist/` folder as unpacked extension in `chrome://extensions/`
   - Enable "Developer mode"
   - HMR will update extension on file changes
   - Extension auto-reloads in Chrome when files change

2. **Production Build** (`npm run build`):
   ```bash
   npm run build
   ```
   - **No source maps** - reduces bundle size
   - **Minified code** - esbuild minification for smaller bundles
   - **No .d.ts files** - reduces build output
   - **Tree shaking** enabled - removes dead code
   - **Icons generated** from `src/assets/logo.png` to `dist/logo/`
   - Package `dist/` folder as ZIP for Chrome Web Store

3. **Testing**:
   - Test popup by clicking extension icon
   - Test content script on various web pages
   - Test background tasks via Chrome DevTools
   - Test options page navigation (HashRouter)
   - Verify all icon sizes are generated correctly

**Build Output Comparison**:

| File Type | Development | Production |
|-----------|-------------|------------|
| JavaScript files | Unminified + `.map` files | Minified, no maps |
| Bundle size | Larger (dev friendly) | Smaller (optimized) |
| Icons | Skipped | Generated |
| Declaration files | Not emitted | Not emitted |

---

## Permissions Summary

| Permission | Purpose |
|------------|---------|
| `activeTab` | Access current tab content |
| `storage` | Chrome storage for settings |
| `scripting` | Dynamic script injection |
| `tabs` | Tab manipulation and info |
| `<all_urls>` | Content script runs on all pages |

---

## SharedArrayBuffer Considerations

To use `SharedArrayBuffer` with WASM:

1. **For Extension Pages** (popup, options, background):
   - Works by default in extension context
   - No special headers needed

2. **For Content Scripts** (injected into web pages):
   - Inherits the host page's security context
   - Requires COOP/COEP headers on the host page
   - Alternative: Use `postMessage` to communicate with background worker for WASM processing

**Recommended Architecture**:
```
Web Page → Content Script → Message → Background Worker (WASM)
```

---

## UI Technology Stack Summary

| Component | Framework | Styling | Routing |
|-----------|-----------|---------|---------|
| Popup | React | TailwindCSS | None |
| Options Page | React | TailwindCSS | React Router (HashRouter) |
| Content Script | Vanilla/React | TailwindCSS | None |
| Background | TypeScript (no UI) | N/A | N/A |

---

## File Locations for Reference

| File/Directory | Path |
|----------------|------|
| Extension Root | `/com.woofmanager.ai.identification.extension/` |
| ESLint Config | `/com.woofmanager.ai.identification.extension/.eslintrc.cjs` |
| Prettier Config | `/com.woofmanager.ai.identification.extension/.prettierrc` |
| Prettier Ignore | `/com.woofmanager.ai.identification.extension/.prettierignore` |
| Editor Config | `/com.woofmanager.ai.identification.extension/.editorconfig` |
| Manifest (TS) | `/com.woofmanager.ai.identification.extension/src/manifest.ts` |
| Vite Config | `/com.woofmanager.ai.identification.extension/vite.config.ts` |
| Tailwind Config | `/com.woofmanager.ai.identification.extension/tailwind.config.js` |
| PostCSS Config | `/com.woofmanager.ai.identification.extension/postcss.config.js` |
| Package | `/com.woofmanager.ai.identification.extension/package.json` |
| TypeScript Config | `/com.woofmanager.ai.identification.extension/tsconfig.json` |
| Icon Generator | `/com.woofmanager.ai.identification.extension/scripts/generate-icons.ts` |
| Source Logo | `/com.woofmanager.ai.identification.extension/src/assets/logo.png` |
| Popup Source | `/com.woofmanager.ai.identification.extension/src/popup/` |
| Background Source | `/com.woofmanager.ai.identification.extension/src/background/` |
| Content Scripts | `/com.woofmanager.ai.identification.extension/src/contents/` |
| Default Content | `/com.woofmanager.ai.identification.extension/src/contents/default-content/` |
| Options Pages | `/com.woofmanager.ai.identification.extension/src/options/` |
| Default Options Page | `/com.woofmanager.ai.identification.extension/src/options/default-page/` |
| Shared Utilities | `/com.woofmanager.ai.identification.extension/src/shared/` |
| Assets/WASM | `/com.woofmanager.ai.identification.extension/src/assets/` |
| Build Output | `/com.woofmanager.ai.identification.extension/dist/` |
| Popup Output | `/com.woofmanager.ai.identification.extension/dist/popup/` |
| Options Output | `/com.woofmanager.ai.identification.extension/dist/options/` |
| Generated Icons | `/com.woofmanager.ai.identification.extension/dist/logo/` |

---

## Implementation Checklist

- [ ] Install dependencies (React, React Router, TailwindCSS, @crxjs/vite-plugin, @types/chrome, sharp, ESLint, Prettier)
- [ ] Create `src/manifest.ts` with full TypeScript types
- [ ] Create `vite.config.ts` with CRX plugin, icon generation, and mode-specific configs
- [ ] Create `tailwind.config.js` and `postcss.config.js`
- [ ] Update `tsconfig.json` for React and Chrome types
- [ ] Set up ESLint (`.eslintrc.cjs`) with TypeScript and React rules
- [ ] Set up Prettier (`.prettierrc`, `.prettierignore`) with UTF-8 and LF settings
- [ ] Set up `.editorconfig` for UTF-8 encoding and LF line endings
- [ ] Set up VS Code workspace settings (`.vscode/settings.json`, `.vscode/extensions.json`)
- [ ] Place source logo at `src/assets/logo.png` (minimum 512x512)
- [ ] Create directory structure (popup, background, contents, options, shared, assets)
- [ ] Set up React + TailwindCSS for popup (outputs to `dist/popup/index.{html,js,css}`)
- [ ] Set up React + TailwindCSS + HashRouter for default options page (`src/options/default-page/`)
- [ ] Configure Vite to support multiple content scripts and options pages
- [ ] Set up default content script (`src/contents/default-content/`) with TailwindCSS
- [ ] Set up background service worker
- [ ] Create OPFS storage utilities
- [ ] Update build scripts in package.json (dev with watch+source maps, build minified)
- [ ] Test extension loading in chrome://extensions/
- [ ] Verify popup outputs to `dist/popup/index.{html,js,css}`
- [ ] Verify options outputs to `dist/options/default-page/index.{html,js,css}`
- [ ] Verify icons are generated in correct sizes (production build only)
- [ ] Run `npm run lint` to check for code issues
- [ ] Run `npm run format` to ensure consistent code style

---

## References

- [Chrome Extension Icon Requirements](https://developer.chrome.com/docs/extensions/develop/ui/configure-icons)
- [React Router Documentation](https://reactrouter.com/)
- [Sharp Image Processing Library](https://sharp.pixelplumbing.com/)
- [vite-plugin-sharp-resize](https://github.com/ec965/vite-plugin-sharp-resize/)
- [@crxjs/vite-plugin](https://www.npmjs.com/package/@crxjs/vite-plugin)
