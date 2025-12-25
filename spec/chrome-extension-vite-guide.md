# Chrome Extension Setup Specification

## Project Analysis

### Current State

The project `com.woofmanager.ai.identification.extension` is a Vite + TypeScript template project with the following characteristics:

**Location**: `/com.woofmanager.ai.identification.extension/`

**Technology Stack**:

- TypeScript 5.9.3
- Vite (^6.0.0) - Standard Vite for reliable HMR with CRXJS
- Target: ES2022

**Current Functionality**: A simple counter app that demonstrates Vite + TypeScript integration.

---

## Goal

Convert this project into a functional Chrome extension for the "Easy Extension" template - a content identification tool that runs background tasks and uses WASM with OPFS.

---

## Architecture Requirements

### Extension Type (Based on Official Chrome Extension Documentation)

This extension will use a **multi-component architecture**:

| Component                     | Purpose                                      | Location          |
| ----------------------------- | -------------------------------------------- | ----------------- |
| **Popup**                     | Quick access UI when clicking extension icon | `src/popup/`      |
| **Background Service Worker** | Background tasks for content identification  | `src/background/` |
| **Content Script**            | Injected into web pages for content access   | `src/contents/`   |
| **Options Page**              | Settings and configuration with HashRouter   | `src/options/`    |

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
    "vite": "^6.0.0"
  }
}
```

**Key Packages**:

- `@crxjs/vite-plugin` - Chrome extension Vite plugin with HMR support
- `@types/chrome` - TypeScript type definitions for Chrome Extension APIs
- `react` / `react-dom` - UI framework for popup and options pages
- `react-router-dom` v6 - Hash routing for options page navigation
- `tailwindcss` - Utility-first CSS framework for all UI components
- `@vitejs/plugin-react` - React support for Vite
- `sharp` - High-performance Node.js image processing (build-time only)
- `tsx` - TypeScript execute (tsx) for running build scripts
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
│   │   │   ├── index.ts     # Content script entry (TypeScript)
│   │   │   └── style.css    # TailwindCSS styles
│   │   └── another-content/ # Example of additional content script
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
├── src/assets/              # Static assets (used by generate-icons.ts)
│   └── logo.png             # Source logo (single high-res file)
│
└── dist/                    # Build output (managed by CRXJS)
    └── (Structure managed automatically by Vite/CRXJS)
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
  "references": [{ "path": "./tsconfig.node.json" }]
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
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'prettier', // Must be last to override other configs
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  plugins: ['@typescript-eslint', 'react', 'react-hooks'],
  settings: {
    react: {
      version: 'detect',
    },
  },
  rules: {
    'react/react-in-jsx-scope': 'off', // Not needed in React 17+
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      },
    ],
    '@typescript-eslint/no-explicit-any': 'warn',
    'react/prop-types': 'off', // Using TypeScript for prop validation
  },
  ignorePatterns: ['dist', 'node_modules', '*.config.js', '*.config.ts'],
};
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

---

### Phase 5: TailwindCSS Configuration

**File**: `tailwind.config.js`

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/popup/**/*.{js,ts,jsx,tsx,html}',
    './src/options/**/*.{js,ts,jsx,tsx,html}',
    './src/contents/**/*.{js,ts,jsx,tsx,css,html}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

**File**: `postcss.config.js`

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

---

### Phase 6: Vite Configuration (vite.config.ts)

Create `vite.config.ts` with Chrome extension support.

**Key changes**:

- Removed `vite-plugin-sharp-resize`. Icons are now generated via pre-build script to prevent CRXJS manifest validation errors (race condition).
- Removed manual `rollupOptions` (handled by CRXJS).

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import manifest from './src/manifest';

export default defineConfig(({ mode }) => {
  const isDevelopment = mode === 'development';

  return {
    plugins: [react(), crx({ manifest })],
    build: {
      // Source maps: development = true, production = false
      sourcemap: isDevelopment,
      // Minify: development = false, production = true
      minify: isDevelopment ? false : 'esbuild',
      // Don't emit declaration files (.d.ts)
      // Empty outDir before build (for clean builds)
      emptyOutDir: true,
    },
    // Development server configuration
    server: {
      hmr: isDevelopment,
    },
  };
});
```

**Configuration Summary**:

| Setting            | Development (`npm run dev`) | Production (`npm run build`) |
| ------------------ | --------------------------- | ---------------------------- |
| Watch Mode         | ✅ Yes                      | ❌ No                        |
| Source Maps        | ✅ Generated                | ❌ Removed                   |
| Minification       | ❌ No                       | ✅ Yes (esbuild)             |
| Content Script HMR | ✅ Auto-handled by CRXJS    | ❌ Disabled                  |

---

### Phase 7: Build Scripts

Update `package.json` scripts. Note the addition of `npm run generate-icons` before build/dev to ensure icons exist for manifest validation.

```json
{
  "scripts": {
    "dev": "npm run generate-icons && vite build --watch --mode development",
    "build": "npm run generate-icons && vite build --mode production",
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

---

### Phase 8: TypeScript Manifest (manifest.ts)

Create a **type-safe TypeScript manifest** file.

**Crucial Change**: When using `@crxjs/vite-plugin`, the manifest should point to **source files** (TypeScript, HTML), not the built JS files.

**File**: `src/manifest.ts`

```typescript
// Chrome Extension Manifest (TypeScript)
// Uses global chrome types from @types/chrome

const manifest: Chrome.Manifest.WebExtensionManifest = {
  manifest_version: 3,
  name: 'Easy Extension',
  version: '1.0.0',
  description: 'AI-powered content identification tool using WASM',

  icons: {
    '16': 'logo/icon16.png',
    '32': 'logo/icon32.png',
    '48': 'logo/icon48.png',
    '128': 'logo/icon128.png',
  },

  action: {
    default_popup: 'src/popup/index.html', // Points to source HTML
    default_icon: {
      '16': 'logo/icon16.png',
      '32': 'logo/icon32.png',
      '48': 'logo/icon48.png',
      '128': 'logo/icon128.png',
    },
  },

  background: {
    service_worker: 'src/background/index.ts', // Points to source TS
    type: 'module',
  },

  content_scripts: [
    {
      matches: ['<all_urls>'],
      js: ['src/contents/default-content/index.ts'], // Points to source TS
      css: ['src/contents/default-content/style.css'],
      run_at: 'document_idle',
    },
  ],

  options_page: 'src/options/default-page/index.html', // Points to source HTML

  permissions: ['activeTab', 'storage', 'scripting', 'tabs'],

  host_permissions: ['<all_urls>'],
};

export default manifest;
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
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Easy Extension</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./main.tsx"></script>
  </body>
</html>
```

---

### Phase 10: Chrome Extension Icon Requirements

**Icon Generation Strategy**:

**Method**: Use a custom build script that runs **before** Vite starts. This ensures icons are present in `public/logo` so CRXJS doesn't fail manifest validation.

**File**: `scripts/generate-icons.ts`

```typescript
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

const ICON_SIZES = [16, 32, 48, 128];
const SOURCE = path.resolve(__dirname, '../src/assets/logo.png');
// Output to public/logo. Vite will automatically copy these to dist/logo
const OUTPUT_DIR = path.resolve(__dirname, '../public/logo');

async function generateIcons() {
  await fs.promises.mkdir(OUTPUT_DIR, { recursive: true });
  await Promise.all(
    ICON_SIZES.map(size =>
      sharp(SOURCE)
        .resize(size, size, { fit: 'cover', position: 'center' })
        .png()
        .toFile(path.join(OUTPUT_DIR, `icon${size}.png`))
    )
  );
  console.log('✅ Icons generated successfully in public/logo');
}

generateIcons().catch(console.error);
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

---

### Phase 12: OPFS Integration

Create a wrapper for Origin Private File System in `src/shared/storage.ts` using functional programming patterns:

```typescript
// OPFS utilities for WASM/AI model storage
// Functional programming approach with pure functions and composition

export type FilePath = string;
export interface OPFSFile {
  name: string;
  data: ArrayBuffer;
  lastModified: number;
}
export interface OPFSDirectory {
  name: string;
  entries: OPFSEntry[];
}
export type OPFSEntry = OPFSFile | OPFSDirectory;
export interface FileSystemError {
  code: 'NOT_FOUND' | 'PERMISSION_DENIED' | 'QUOTA_EXCEEDED' | 'UNKNOWN';
  message: string;
}

export type Result<T, E = FileSystemError> =
  | { success: true; data: T }
  | { success: false; error: E };

// ... (Rest of the standard OPFS implementation, ensuring ES2022 compatibility)
// Core functions: getRootDir, splitPath, navigateToDirectory, getFileHandle
// Exported functions: writeFile, readFile, deleteFile, fileExists, listDirectory
// Helper functions: pipe, compose, withRetry
```
