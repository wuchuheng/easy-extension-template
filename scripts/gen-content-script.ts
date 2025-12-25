import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import ts from 'typescript';
import { Command } from 'commander';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const CONTENTS_DIR = path.join(SRC, 'contents');
const COMPONENTS_DIR = path.join(SRC, 'components');
const MANIFEST_PATH = path.join(SRC, 'manifest.ts');
const PROJECT_TMP = path.join(ROOT, '.tmp');

const HELLO_COMPONENT = path.join(COMPONENTS_DIR, 'HelloInCSUI.tsx');

const INDEX_TEMPLATE = (name: string) => `import HelloInCSUI from '@/components/HelloInCSUI'
import styles from './style.css?inline'
import { mountAnchoredUI } from '../utils/anchor-mounter'

void mountAnchoredUI({
  anchor: async () => [document.body],
  mountType: { type: 'overlay' },
  component: () => <HelloInCSUI name="${name}" />,
  style: styles,
  hostId: 'extension-content-root'
})
`;

const STYLE_TEMPLATE = `@tailwind base;
@tailwind components;
@tailwind utilities;

:host {
  all: initial;
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

:host *,
:host *::before,
:host *::after {
  box-sizing: border-box;
}
`;

const HELLO_COMPONENT_TEMPLATE = `type HelloInCSUIProps = { name?: string }

export default function HelloInCSUI({ name }: HelloInCSUIProps) {
  return (
    <div className="fixed bottom-4 right-4 w-72 rounded-xl bg-white shadow-2xl ring-1 ring-gray-200">
      <div className="px-4 py-3 border-b border-gray-100">
        <p className="text-sm font-semibold text-gray-900">Content Script Created</p>
        <p className="text-xs text-gray-500">{name ?? 'Unnamed'} is mounted via Shadow DOM.</p>
      </div>
      <div className="px-4 py-3 text-sm text-gray-700">
        This UI is isolated with Tailwind inside the content script Shadow DOM.
      </div>
    </div>
  )
}
`;

function die(message: string): never {
  console.error(`❌ ${message}`);
  process.exit(1);
}

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

function fileExists(p: string) {
  return fs.existsSync(p);
}

function normalizeName(raw: string) {
  if (!raw) die('Name is required. Usage: npm run gen:content-script <name>');
  const safe = raw.trim();
  if (!/^[a-zA-Z0-9-_]+$/.test(safe)) die('Name must be alphanumeric, dash or underscore only.');
  return safe.toLowerCase();
}

function createFiles(name: string) {
  const folder = path.join(CONTENTS_DIR, name);
  if (fs.existsSync(folder)) die(`Content script folder already exists: ${folder}`);

  ensureDir(folder);
  const indexPath = path.join(folder, 'index.tsx');
  const stylePath = path.join(folder, 'style.css');

  if (fileExists(indexPath) || fileExists(stylePath)) {
    die(`Target files already exist in ${folder}. Aborting.`);
  }

  fs.writeFileSync(indexPath, INDEX_TEMPLATE(name), 'utf8');
  fs.writeFileSync(stylePath, STYLE_TEMPLATE, 'utf8');
  console.log(`✅ Created ${path.relative(ROOT, indexPath)}`);
  console.log(`✅ Created ${path.relative(ROOT, stylePath)}`);
}

function ensureHelloComponent() {
  if (fileExists(HELLO_COMPONENT)) return;
  ensureDir(COMPONENTS_DIR);
  fs.writeFileSync(HELLO_COMPONENT, HELLO_COMPONENT_TEMPLATE, 'utf8');
  console.log(`✅ Created ${path.relative(ROOT, HELLO_COMPONENT)}`);
}

function updateManifest(name: string) {
  const sourceText = fs.readFileSync(MANIFEST_PATH, 'utf8');
  const sourceFile = ts.createSourceFile(
    MANIFEST_PATH,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );

  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });

  let updated = false;

  const transformer: ts.TransformerFactory<ts.SourceFile> = context => {
    const visit = (node: ts.Node): ts.Node => {
      if (
        ts.isPropertyAssignment(node) &&
        ts.isIdentifier(node.name) &&
        node.name.text === 'content_scripts' &&
        ts.isArrayLiteralExpression(node.initializer)
      ) {
        const arr = node.initializer;

        const exists = arr.elements.some(el => {
          if (!ts.isObjectLiteralExpression(el)) return false;
          const jsProp = el.properties.find(
            p => ts.isPropertyAssignment(p) && ts.isIdentifier(p.name) && p.name.text === 'js'
          ) as ts.PropertyAssignment | undefined;
          if (!jsProp || !ts.isArrayLiteralExpression(jsProp.initializer)) return false;
          return jsProp.initializer.elements.some(
            e => ts.isStringLiteral(e) && e.text === `src/contents/${name}/index.tsx`
          );
        });

        if (exists) {
          console.log(`ℹ️ Manifest already contains src/contents/${name}/index.tsx; skipping.`);
          return node;
        }

        const newEntry = ts.factory.createObjectLiteralExpression(
          [
            ts.factory.createPropertyAssignment(
              ts.factory.createIdentifier('matches'),
              ts.factory.createArrayLiteralExpression(
                [ts.factory.createStringLiteral('<all_urls>')],
                false
              )
            ),
            ts.factory.createPropertyAssignment(
              ts.factory.createIdentifier('js'),
              ts.factory.createArrayLiteralExpression(
                [ts.factory.createStringLiteral(`src/contents/${name}/index.tsx`)],
                false
              )
            ),
            ts.factory.createPropertyAssignment(
              ts.factory.createIdentifier('run_at'),
              ts.factory.createStringLiteral('document_idle')
            ),
          ],
          true
        );

        const newElements = ts.factory.createNodeArray([...arr.elements, newEntry]);
        updated = true;
        return ts.factory.updatePropertyAssignment(
          node,
          node.name,
          ts.factory.updateArrayLiteralExpression(arr, newElements)
        );
      }
      return ts.visitEachChild(node, visit, context);
    };

    return file => ts.visitNode(file, visit);
  };
  const result = ts.transform<ts.SourceFile>(sourceFile, [transformer]);
  const transformed = result.transformed[0];
  result.dispose();

  if (!updated) {
    die('Failed to update manifest: content_scripts array not found.');
  }

  const newText = printer.printFile(transformed);
  fs.writeFileSync(MANIFEST_PATH, newText, 'utf8');
  console.log(`✅ Updated manifest with src/contents/${name}/index.tsx`);
}

function main() {
  const program = new Command();

  program
    .name('gen:content-script')
    .description('Scaffold a new content script with React/Tailwind + manifest entry');

  program.arguments('<name>');

  program.parse(process.argv);
  const args = program.args as string[];
  if (args.length < 1) {
    program.outputHelp();
    process.exit(1);
  }

  const rawName = args[0];
  const name = normalizeName(rawName);
  try {
    createFiles(name);
    ensureHelloComponent();
    updateManifest(name);
  } finally {
    cleanupTemp();
  }
}

main();

function cleanupTemp() {
  const tmpDir = process.env.TMPDIR;
  if (!tmpDir) return;
  const resolved = path.resolve(tmpDir);
  if (resolved !== PROJECT_TMP) return;
  if (!fs.existsSync(resolved)) return;

  try {
    fs.rmSync(resolved, { recursive: true, force: true });
    console.log(`ℹ️ Cleaned temp dir ${path.relative(ROOT, resolved)}`);
  } catch (error) {
    console.warn(`⚠️ Could not clean temp dir ${resolved}:`, error);
  }
}
