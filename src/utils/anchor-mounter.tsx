import React from "react";
import { createRoot, type Root } from "react-dom/client";

type InlinePosition =
  | "beforebegin" // before the element itself
  | "afterend" // after the element itself
  | "afterbegin" // just inside the element, before its first child
  | "beforeend"; // just inside the element, after its last child

type MountType =
  | { type: "overlay" }
  | { type: "inline"; position: InlinePosition };

type AnchorGetter = () => Promise<Element[] | NodeListOf<Element> | undefined>;

export interface MountAnchoredUIArgs {
  anchor: AnchorGetter;
  mountType: MountType;
  component: () => React.ReactElement;
  style: string;
  hostId?: string;
  debounceMs?: number;
}

interface MountRecord {
  anchor: Element;
  host: HTMLElement;
  container: HTMLElement;
  shadowRoot: ShadowRoot;
  root: Root;
}

const stylesheetCache = new Map<string, CSSStyleSheet>();
const defaultDebounceMs = 500;
let idCounter = 0;

export function mountAnchoredUI(args: MountAnchoredUIArgs) {
  const debounceMs = args.debounceMs ?? defaultDebounceMs;
  const mounted = new Map<Element, MountRecord>();
  let debounceHandle: number | undefined;

  const run = async () => {
    try {
      const anchors = await resolveAnchors(args.anchor);

      const mountedEntries = Array.from(mounted.entries());
      for (const [anchor, record] of mountedEntries) {
        if (!anchors?.includes(anchor)) {
          record.root.unmount();
          record.host.remove();
          mounted.delete(anchor);
        }
      }

      if (!anchors || anchors.length === 0) {
        return;
      }

      anchors.forEach((anchor) => {
        if (mounted.has(anchor)) {
          return;
        }
        if (args.hostId && document.getElementById(args.hostId)) {
          return;
        }
        const record = mountOnAnchor(anchor, args);
        mounted.set(anchor, record);
      });
    } catch (error) {
      console.error("mountAnchoredUI anchor error", error);
    }
  };

  void run();

  const observer = new MutationObserver(() => {
    if (debounceHandle) {
      window.clearTimeout(debounceHandle);
    }
    debounceHandle = window.setTimeout(() => {
      void run().catch(console.error);
    }, debounceMs);
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  window.addEventListener("popstate", () => {
    if (debounceHandle) {
      window.clearTimeout(debounceHandle);
    }
    void run().catch(console.error);
  });
}

async function resolveAnchors(
  getter: AnchorGetter,
): Promise<Element[] | undefined> {
  const result = await getter();
  if (!result) {
    return undefined;
  }
  const raw = Array.from(result);
  const filtered = raw.filter(
    (el) => !el.hasAttribute("data-extension-shadow-host"),
  );
  // Deduplicate while preserving order
  const seen = new Set<Element>();
  const unique: Element[] = [];
  filtered.forEach((el) => {
    if (!seen.has(el)) {
      seen.add(el);
      unique.push(el);
    }
  });
  return unique;
}

function mountOnAnchor(
  anchor: Element,
  args: MountAnchoredUIArgs,
): MountRecord {
  const host = document.createElement("div");
  const hostId = args.hostId ?? generateHostId();
  host.id = hostId;
  host.setAttribute("data-extension-shadow-host", "true");
  host.style.all = "initial";

  placeHost(anchor, host, args.mountType);

  const shadowRoot = host.shadowRoot ?? host.attachShadow({ mode: "open" });
  applyStyles(shadowRoot, args.style);

  const existingContainer = shadowRoot.querySelector<HTMLElement>(
    "[data-extension-react-root]",
  );
  const container = existingContainer ?? document.createElement("div");
  if (!existingContainer) {
    container.dataset.extensionReactRoot = "true";
    shadowRoot.appendChild(container);
  }

  const root = createRoot(container);
  root.render(args.component());

  return { anchor, host, container, shadowRoot, root };
}

function placeHost(anchor: Element, host: HTMLElement, mountType: MountType) {
  if (mountType.type === "overlay") {
    host.style.position = "relative";
    host.style.zIndex = "2147483647";
    document.body.appendChild(host);
    return;
  }

  const position: InlinePosition = mountType.position ?? "afterend";
  anchor.insertAdjacentElement(position, host);
}

function applyStyles(shadowRoot: ShadowRoot, cssText: string) {
  const adoptedStyleSheets = (
    shadowRoot as ShadowRoot & { adoptedStyleSheets?: CSSStyleSheet[] }
  ).adoptedStyleSheets;
  const supportsAdopted =
    Array.isArray(adoptedStyleSheets)
    && "replaceSync" in CSSStyleSheet.prototype;

  if (supportsAdopted) {
    const currentSheets = adoptedStyleSheets ?? [];
    let sheet = stylesheetCache.get(cssText);
    if (!sheet) {
      sheet = new CSSStyleSheet();
      sheet.replaceSync(cssText);
      stylesheetCache.set(cssText, sheet);
    }

    if (!currentSheets.includes(sheet)) {
      shadowRoot.adoptedStyleSheets = [...currentSheets, sheet];
    }
    return;
  }

  const existingStyle = shadowRoot.querySelector(
    'style[data-extension-style="true"]',
  );
  if (existingStyle) {
    return;
  }

  const styleEl = document.createElement("style");
  styleEl.setAttribute("data-extension-style", "true");
  styleEl.textContent = cssText;
  shadowRoot.appendChild(styleEl);
}

function generateHostId() {
  idCounter += 1;
  return `extension-anchor-${idCounter}`;
}
