# Content Script Generator Spec

Goal: add a CLI `npm run gen:content-script <name>` that scaffolds a new content script (React + Tailwind + Shadow DOM via `mountAnchoredUI`), registers it in `manifest.ts`, and provides a shared Hello component to confirm creation.

## Deliverables

- Package script: `gen:content-script` pointing to a generator (e.g., `tsx scripts/gen-content-script.ts`).
- Generator script (no code yet) that:
  - Validates the name (kebab/camel allowed, normalized to folder name).
  - Creates `src/contents/<name>/index.tsx` and `src/contents/<name>/style.css` if absent.
  - Appends a content script entry to `src/manifest.ts`:
    ```ts
    {
      matches: ['<all_urls>'],
      js: ['src/contents/<name>/index.tsx'],
      run_at: 'document_idle'
    }
    ```
    (Preserve existing entries; avoid duplicates.)
- Shared component: `src/components/HelloInCSUI.tsx` (single source of truth for the default UI used by generated content scripts).
- Generated `index.tsx` template:

  ```tsx
  import HelloInCSUI from '@/components/HelloInCSUI';
  import styles from './style.css?inline';
  import { mountAnchoredUI } from '../utils/anchor-mounter';

  void mountAnchoredUI({
    anchor: async () => [document.body],
    mountType: { type: 'overlay' },
    component: () => <HelloInCSUI />,
    style: styles,
    hostId: 'extension-content-root',
  });
  ```

- Generated `style.css` template includes Tailwind directives (`@tailwind base; @tailwind components; @tailwind utilities;`) plus optional `:host` reset.

## Generator Behavior (planned)

- Input: `<name>` argument from CLI; exit with usage if missing.
- Normalize the folder name (e.g., `hello-world`); reject unsafe characters.
- If `src/contents/<name>` already exists (index/style present), abort the run with a clear error explaining the folder already exists (no partial work).
- Manifest update:
  - Preferred: parse `src/manifest.ts` with the TypeScript compiler API, locate `content_scripts` array, and append the new object if not present; match entries by `js` path.
  - Fallback (if AST edit becomes fragile): regex/text splice into the `content_scripts` array while preserving formatting, still checking for existing `js: ['src/contents/<name>/index.tsx']`.
  - Keep formatting stable; do not reorder other entries.
- Pathing:
  - Template uses `../utils/anchor-mounter` (relative from `src/contents/<name>`).
  - Uses alias `@/components/HelloInCSUI` (assumes existing tsconfig path alias).
- Logging: print created files and whether manifest was updated or already contained the entry.

## Edge Cases / Safeguards

- Name collision: if `src/contents/<name>` exists, abort with an error (no files or manifest changes).
- Duplicate manifest entry: detect and avoid adding a second identical block.
- Ensure generator respects existing TypeScript/ES module setup (`type: module`).

## Validation Plan (after implementation)

- Run `npm run gen:content-script hello-world`:
  - Expect `src/contents/hello-world/index.tsx` and `style.css` created (if not existing).
  - Expect `src/components/HelloInCSUI.tsx` (created once).
  - Expect `manifest.ts` contains the new content script entry pointing to `src/contents/hello-world/index.tsx`.
- Run `npm run lint` to ensure generated code conforms to project lint rules.

## Not in scope (for initial pass)

- Deletion/cleanup of content scripts.
- Template customization beyond the Hello component and basic Tailwind directives.
