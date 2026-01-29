/**
 * Custom hook for handling window resize functionality.
 * Extracted from MacWindowShell for improved modularity and testability.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Directions in which a window can be resized.
 */
export type ResizeDirection =
  | 'right'
  | 'left'
  | 'top'
  | 'bottom'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'

/**
 * Metadata for tracking resize state during pointer movement.
 */
export interface ResizeMeta {
  startX: number
  startY: number
  originWidth: number
  originHeight: number
  originX: number
  originY: number
  direction: ResizeDirection
}

/**
 * Configuration options for useWindowResize.
 */
export interface UseWindowResizeOptions {
  /** Current window position */
  position: { x: number; y: number }
  /** Current window size */
  size: { width: number; height: number }
  /** Reference to the container element */
  containerRef: React.RefObject<HTMLDivElement | null>
  /** Current window state (only 'normal' allows resizing) */
  windowState: 'normal' | 'maximized' | 'minimized'
  /** Whether the window is closed */
  isClosed: boolean
  /** Callback when size or position changes */
  onSizeChange: (state: {
    position: { x: number; y: number }
    size: { width: number; height: number }
  }) => void
  /** Function to clamp size within viewport */
  clampSize: (
    size: { width: number; height: number },
    position: { x: number; y: number }
  ) => {
    width: number
    height: number
  }
  /** Function to get viewport dimensions */
  getViewport: () => { width: number; height: number }
  /** Minimum allowed size */
  minSize: { width: number; height: number }
}

/**
 * Result object returned by useWindowResize.
 */
export interface UseWindowResizeResult {
  /** Whether the window is currently being resized */
  isResizing: boolean
  /** Creates a resize start handler for a given direction */
  handleResizeStart: (
    direction: ResizeDirection
  ) => (event: React.PointerEvent<HTMLDivElement>) => void
}

const PADDING = 12

/**
 * Custom hook for managing window resize functionality.
 *
 * @param options - Configuration options
 * @returns Resize state and event handlers
 *
 * @example
 * ```tsx
 * const { isResizing, handleResizeStart } = useWindowResize({
 *   position,
 *   size,
 *   containerRef,
 *   windowState,
 *   isClosed,
 *   onSizeChange: (state) => setShellState(prev => ({ ...prev, ...state })),
 *   clampSize,
 *   getViewport,
 *   minSize: MIN_SIZE,
 * })
 *
 * <ResizeHandle direction="right" onPointerDown={handleResizeStart} />
 * ```
 */
export function useWindowResize(options: UseWindowResizeOptions): UseWindowResizeResult {
  const {
    position,
    containerRef,
    windowState,
    isClosed,
    onSizeChange,
    clampSize,
    getViewport,
    minSize,
  } = options

  const [isResizing, setIsResizing] = useState(false)
  const resizeMetaRef = useRef<ResizeMeta | null>(null)

  /**
   * Handles pointer movement during resize.
   * Calculates new size and position based on resize direction.
   */
  const handleResizeMove = useCallback(
    (event: PointerEvent) => {
      const resizeMeta = resizeMetaRef.current
      if (!resizeMeta) {
        return
      }
      event.preventDefault()

      const deltaX = event.clientX - resizeMeta.startX
      const deltaY = event.clientY - resizeMeta.startY
      const viewport = getViewport()

      const rightEdge = resizeMeta.originX + resizeMeta.originWidth
      const bottomEdge = resizeMeta.originY + resizeMeta.originHeight

      const affectLeft = resizeMeta.direction.includes('left')
      const affectRight = resizeMeta.direction.includes('right')
      const affectTop = resizeMeta.direction.includes('top')
      const affectBottom = resizeMeta.direction.includes('bottom')

      let nextX = resizeMeta.originX
      let nextY = resizeMeta.originY
      let nextWidth = resizeMeta.originWidth
      let nextHeight = resizeMeta.originHeight

      if (affectRight) {
        const maxWidth = viewport.width - PADDING - resizeMeta.originX
        nextWidth = Math.max(minSize.width, Math.min(maxWidth, resizeMeta.originWidth + deltaX))
      }

      if (affectBottom) {
        const maxHeight = viewport.height - PADDING - resizeMeta.originY
        nextHeight = Math.max(minSize.height, Math.min(maxHeight, resizeMeta.originHeight + deltaY))
      }

      if (affectLeft) {
        let proposedX = resizeMeta.originX + deltaX
        const maxX = rightEdge - minSize.width
        proposedX = Math.min(proposedX, maxX)
        proposedX = Math.max(PADDING, proposedX)
        const maxWidth = viewport.width - PADDING - proposedX
        nextX = proposedX
        nextWidth = Math.max(minSize.width, Math.min(maxWidth, rightEdge - proposedX))
      }

      if (affectTop) {
        let proposedY = resizeMeta.originY + deltaY
        const maxY = bottomEdge - minSize.height
        proposedY = Math.min(proposedY, maxY)
        proposedY = Math.max(PADDING, proposedY)
        const maxHeight = viewport.height - PADDING - proposedY
        nextY = proposedY
        nextHeight = Math.max(minSize.height, Math.min(maxHeight, bottomEdge - proposedY))
      }

      onSizeChange({
        position: { x: nextX, y: nextY },
        size: clampSize({ width: nextWidth, height: nextHeight }, { x: nextX, y: nextY }),
      })
    },
    [clampSize, getViewport, minSize, onSizeChange]
  )

  // Store the latest handleResizeMove for cleanup
  const handleResizeMoveRef = useRef(handleResizeMove)
  useEffect(() => {
    handleResizeMoveRef.current = handleResizeMove
  }, [handleResizeMove])

  /**
   * Handles pointer up to end resize.
   */
  const handleResizeUp = useCallback(() => {
    resizeMetaRef.current = null
    setIsResizing(false)
    // Use ref to avoid self-dependency
    const currentMove = handleResizeMoveRef.current
    window.removeEventListener('pointermove', currentMove)
    // We'll remove the pointerup listener in the useEffect cleanup
  }, [])

  /**
   * Creates a resize start handler for a given direction.
   * Initializes resize metadata and attaches global event listeners.
   */
  const handleResizeStart = useCallback(
    (direction: ResizeDirection) => (event: React.PointerEvent<HTMLDivElement>) => {
      if (windowState !== 'normal' || isClosed) {
        return
      }
      event.preventDefault()
      event.stopPropagation()

      const container = containerRef.current
      if (!container) {
        return
      }

      resizeMetaRef.current = {
        startX: event.clientX,
        startY: event.clientY,
        originWidth: container.offsetWidth,
        originHeight: container.offsetHeight,
        originX: position.x,
        originY: position.y,
        direction,
      }

      setIsResizing(true)
      window.addEventListener('pointermove', handleResizeMove)
      window.addEventListener('pointerup', handleResizeUp)
      window.addEventListener('pointercancel', handleResizeUp)
    },
    [windowState, isClosed, position, handleResizeMove, handleResizeUp, containerRef]
  )

  /**
   * Cleanup effect to remove all event listeners on unmount.
   */
  useEffect(
    () => () => {
      if (typeof window === 'undefined') {
        return
      }
      window.removeEventListener('pointermove', handleResizeMove)
      window.removeEventListener('pointerup', handleResizeUp)
      window.removeEventListener('pointercancel', handleResizeUp)
    },
    [handleResizeMove, handleResizeUp]
  )

  return { isResizing, handleResizeStart }
}
