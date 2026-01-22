import React from 'react'
import { createRoot, type Root } from 'react-dom/client'

/**
 * Defines where the element should be inserted relative to the anchor.
 *
 * @example
 * // 'beforebegin': Before the anchor element itself
 * // 'afterend': After the anchor element itself
 * // 'afterbegin': Just inside the anchor, before its first child
 * // 'beforeend': Just inside the anchor, after its last child
 */
type InlinePosition =
  | 'beforebegin' // before the element itself
  | 'afterend' // after the element itself
  | 'afterbegin' // just inside the element, before its first child
  | 'beforeend' // just inside the element, after its last child

/**
 * Defines the mounting strategy for the UI.
 *
 * @property type - 'overlay' for absolute positioning on body, or 'inline' for relative positioning
 * @property position - (Optional) The insertion position for 'inline' type. Defaults to 'afterend'
 */
type MountType = { type: 'overlay' } | { type: 'inline'; position: InlinePosition }

/**
 * A function that returns a Promise resolving to the anchor element(s).
 *
 * @returns A Promise that resolves to an Element array, NodeList, or undefined
 */
type AnchorGetter = () => Promise<Element[] | NodeListOf<Element> | undefined>

/**
 * Configuration options for mounting an anchored UI component.
 */
export interface MountAnchoredUIArgs {
  /**
   * Function to retrieve the anchor element(s) to mount against.
   *
   * @example
   * async () => document.querySelectorAll('.product-item')
   */
  anchor: AnchorGetter

  /**
   * The mounting strategy and position.
   *
   * @example
   * { type: 'inline', position: 'beforeend' }
   */
  mountType: MountType

  /**
   * The React component to render.
   *
   * @example
   * () => <MyButton />
   */
  component: () => React.ReactElement

  /**
   * CSS styles to inject into the shadow DOM.
   *
   * @example
   * `button { color: red; }`
   */
  style: string

  /**
   * (Optional) Unique ID for the host element.
   * If provided, prevents duplicate mounting if an element with this ID already exists.
   */
  hostId?: string

  /**
   * (Optional) Debounce time in milliseconds for the mutation observer.
   * Defaults to 500ms.
   */
  debounceMs?: number

  /**
   * (Optional) A unique identifier for this specific component type.
   * Used to detect and remove stale/duplicate instances when remounting.
   *
   * @example
   * 'my-extension-button'
   */
  componentId?: string

  /**
   * (Optional) Inline styles to apply to the shadow host element (the wrapper div).
   * Useful for positioning the wrapper itself (e.g., absolute positioning).
   *
   * @example
   * { position: 'absolute', top: '10px', zIndex: '9999' }
   */
  hostStyle?: Partial<CSSStyleDeclaration>

  /**
   * (Optional) The element or selector to observe for mutations.
   * If not provided, defaults to document.documentElement.
   * Scoping this to a specific container improves performance.
   *
   * @example
   * '#product-list-container'
   */
  observerTarget?: Element | string
}

/**
 * Internal record of a mounted UI instance.
 */
interface MountRecord {
  anchor: Element
  host: HTMLElement
  container: HTMLElement
  shadowRoot: ShadowRoot
  root: Root
}

const stylesheetCache = new Map<string, CSSStyleSheet>()
const defaultDebounceMs = 500
let idCounter = 0

/**
 * Mounts a React component to the DOM relative to specific anchor elements.
 * Automatically handles Shadow DOM creation, style injection, and lifecycle management (mounting/unmounting)
 * based on DOM mutations.
 *
 * @param args - Configuration options for the mounted UI
 *
 * @example
 * mountAnchoredUI({
 *   anchor: async () => document.querySelectorAll('.item'),
 *   mountType: { type: 'inline', position: 'beforeend' },
 *   component: () => <MyButton />,
 *   style: `.btn { color: blue; }`,
 *   componentId: 'my-btn',
 *   observerTarget: '#app'
 * })
 */
export function mountAnchoredUI(args: MountAnchoredUIArgs) {
  const debounceMs = args.debounceMs ?? defaultDebounceMs
  const mounted = new Map<Element, MountRecord>()
  let debounceHandle: number | undefined

  const run = async () => {
    try {
      const anchors = await resolveAnchors(args.anchor)
      const anchorSet = new Set(anchors)

      const mountedEntries = Array.from(mounted.entries())
      for (const [anchor, record] of mountedEntries) {
        if (!anchorSet.has(anchor)) {
          record.root.unmount()
          record.host.remove()
          mounted.delete(anchor)
        }
      }

      if (!anchors || anchors.length === 0) {
        return
      }

      anchors.forEach((anchor) => {
        if (mounted.has(anchor)) {
          return
        }

        if (args.componentId && args.mountType.type === 'inline') {
          const position = args.mountType.position
          if (position === 'beforeend' || position === 'afterbegin') {
            const stale = anchor.querySelectorAll(
              `[data-extension-component-id="${args.componentId}"]`
            )
            stale.forEach((el) => el.remove())
          }
        }

        if (args.hostId && document.getElementById(args.hostId)) {
          return
        }
        const record = mountOnAnchor(anchor, args)
        mounted.set(anchor, record)
      })
    } catch (error) {
      console.error('mountAnchoredUI anchor error', error)
    }
  }

  void run()

  const observer = new MutationObserver(() => {
    if (debounceHandle) {
      window.clearTimeout(debounceHandle)
    }
    debounceHandle = window.setTimeout(() => {
      void run().catch(console.error)
    }, debounceMs)
  })

  let target: Node = document.documentElement
  if (args.observerTarget) {
    if (typeof args.observerTarget === 'string') {
      const el = document.querySelector(args.observerTarget)
      if (el) target = el
    } else {
      target = args.observerTarget
    }
  }

  observer.observe(target, {
    childList: true,
    subtree: true,
  })

  window.addEventListener('popstate', () => {
    if (debounceHandle) {
      window.clearTimeout(debounceHandle)
    }
    void run().catch(console.error)
  })
}

/**
 * Resolves the anchor elements from the getter function.
 * Filters out internal extension elements and deduplicates results.
 *
 * @param getter - The anchor getter function
 * @returns A Promise resolving to a unique array of valid anchor elements
 */
async function resolveAnchors(getter: AnchorGetter): Promise<Element[] | undefined> {
  const result = await getter()
  if (!result) {
    return undefined
  }

  const unique: Element[] = []
  const seen = new Set<Element>()

  // Single pass for filtering and deduplication
  const raw = Array.isArray(result) ? result : Array.from(result)

  for (const el of raw) {
    if (!el.hasAttribute('data-extension-shadow-host') && !seen.has(el)) {
      seen.add(el)
      unique.push(el)
    }
  }

  return unique
}

/**
 * Creates the shadow host, attaches Shadow DOM, injects styles, and renders the React component.
 *
 * @param anchor - The anchor element to mount on
 * @param args - Mounting configuration
 * @returns The mount record containing the host, root, and shadow DOM details
 */
function mountOnAnchor(anchor: Element, args: MountAnchoredUIArgs): MountRecord {
  const host = document.createElement('div')
  const hostId = args.hostId ?? generateHostId()
  host.id = hostId
  host.setAttribute('data-extension-shadow-host', 'true')
  if (args.componentId) {
    host.setAttribute('data-extension-component-id', args.componentId)
  }
  host.style.all = 'initial'
  if (args.hostStyle) {
    Object.assign(host.style, args.hostStyle)
  }
  placeHost(anchor, host, args.mountType)

  const shadowRoot = host.shadowRoot ?? host.attachShadow({ mode: 'open' })
  applyStyles(shadowRoot, args.style)

  const existingContainer = shadowRoot.querySelector<HTMLElement>('[data-extension-react-root]')
  const container = existingContainer ?? document.createElement('div')
  if (!existingContainer) {
    container.dataset.extensionReactRoot = 'true'
    shadowRoot.appendChild(container)
  }

  const root = createRoot(container)
  root.render(args.component())

  return { anchor, host, container, shadowRoot, root }
}

/**
 * Places the host element in the DOM relative to the anchor based on the mount type.
 *
 * @param anchor - The anchor element
 * @param host - The shadow host element to place
 * @param mountType - The mounting strategy (overlay or inline)
 */
function placeHost(anchor: Element, host: HTMLElement, mountType: MountType) {
  if (mountType.type === 'overlay') {
    host.style.position = 'relative'
    host.style.zIndex = '2147483647'
    document.body.appendChild(host)
    return
  }

  const position: InlinePosition = mountType.position ?? 'afterend'
  anchor.insertAdjacentElement(position, host)
}

/**
 * Injects CSS styles into the Shadow DOM.
 * Uses `adoptedStyleSheets` if supported for better performance, falling back to `<style>` tags.
 *
 * @param shadowRoot - The target Shadow DOM root
 * @param cssText - The CSS string to inject
 */
function applyStyles(shadowRoot: ShadowRoot, cssText: string) {
  const adoptedStyleSheets = (shadowRoot as ShadowRoot & { adoptedStyleSheets?: CSSStyleSheet[] })
    .adoptedStyleSheets
  const supportsAdopted =
    Array.isArray(adoptedStyleSheets) && 'replaceSync' in CSSStyleSheet.prototype

  if (supportsAdopted) {
    const currentSheets = adoptedStyleSheets ?? []
    let sheet = stylesheetCache.get(cssText)
    if (!sheet) {
      sheet = new CSSStyleSheet()
      sheet.replaceSync(cssText)
      stylesheetCache.set(cssText, sheet)
    }

    if (!currentSheets.includes(sheet)) {
      shadowRoot.adoptedStyleSheets = [...currentSheets, sheet]
    }
    return
  }

  const existingStyle = shadowRoot.querySelector('style[data-extension-style="true"]')
  if (existingStyle) {
    return
  }

  const styleEl = document.createElement('style')
  styleEl.setAttribute('data-extension-style', 'true')
  styleEl.textContent = cssText
  shadowRoot.appendChild(styleEl)
}

/**
 * Generates a unique ID for the shadow host element.
 *
 * @returns A unique string ID (e.g., "extension-anchor-1")
 */
function generateHostId() {
  idCounter += 1
  return `extension-anchor-${idCounter}`
}
