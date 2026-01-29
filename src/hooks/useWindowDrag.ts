/**
 * Custom hook for handling window drag functionality.
 * Extracted from MacWindowShell for improved modularity and testability.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Metadata for tracking drag state during pointer movement.
 */
export interface DragMeta {
  startX: number
  startY: number
  originX: number
  originY: number
  size: { width: number; height: number }
}

/**
 * Configuration options for useWindowDrag.
 */
export interface UseWindowDragOptions {
  /** Current window position */
  position: { x: number; y: number }
  /** Reference to the container element for size measurement */
  containerRef: React.RefObject<HTMLDivElement | null>
  /** Current window state (only 'normal' allows dragging) */
  windowState: 'normal' | 'maximized' | 'minimized'
  /** Whether the window is closed */
  isClosed: boolean
  /** Callback when position changes */
  onPositionChange: (position: { x: number; y: number }) => void
  /** Function to clamp position within viewport */
  clampPosition: (
    position: { x: number; y: number },
    size: { width: number; height: number }
  ) => { x: number; y: number }
  /** Default size fallback when container is not available */
  defaultSize: { width: number; height: number }
}

/**
 * Result object returned by useWindowDrag.
 */
export interface UseWindowDragResult {
  /** Whether the window is currently being dragged */
  isDragging: boolean
  /** Pointer down event handler for the toolbar */
  handlePointerDown: (event: React.PointerEvent<HTMLDivElement>) => void
}

/**
 * Custom hook for managing window drag functionality.
 *
 * @param options - Configuration options
 * @returns Drag state and event handlers
 *
 * @example
 * ```tsx
 * const { isDragging, handlePointerDown } = useWindowDrag({
 *   position,
 *   containerRef,
 *   windowState,
 *   isClosed,
 *   onPositionChange: (pos) => setShellState(prev => ({ ...prev, position: pos })),
 *   clampPosition,
 *   defaultSize: DEFAULT_SIZE,
 * })
 * ```
 */
export function useWindowDrag(options: UseWindowDragOptions): UseWindowDragResult {
  const {
    position,
    containerRef,
    windowState,
    isClosed,
    onPositionChange,
    clampPosition,
    defaultSize,
  } = options

  const [isDragging, setIsDragging] = useState(false)
  const dragMetaRef = useRef<DragMeta | null>(null)

  /**
   * Handles pointer movement during drag.
   * Clamps the new position within viewport bounds.
   */
  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      const dragMeta = dragMetaRef.current
      if (!dragMeta) {
        return
      }
      event.preventDefault()

      const deltaX = event.clientX - dragMeta.startX
      const deltaY = event.clientY - dragMeta.startY

      const nextPosition = clampPosition(
        { x: dragMeta.originX + deltaX, y: dragMeta.originY + deltaY },
        dragMeta.size
      )

      onPositionChange(nextPosition)
    },
    [clampPosition, onPositionChange]
  )

  // Store the latest handlePointerMove for cleanup
  const handlePointerMoveRef = useRef(handlePointerMove)
  useEffect(() => {
    handlePointerMoveRef.current = handlePointerMove
  }, [handlePointerMove])

  /**
   * Handles pointer up to end drag.
   */
  const handlePointerUp = useCallback(() => {
    dragMetaRef.current = null
    setIsDragging(false)
    // Use ref to avoid self-dependency
    const currentMove = handlePointerMoveRef.current
    window.removeEventListener('pointermove', currentMove)
    // We'll remove the pointerup listener in the useEffect cleanup
  }, [])

  /**
   * Handles pointer down to start drag.
   * Initializes drag metadata and attaches global event listeners.
   */
  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (windowState !== 'normal' || isClosed) {
        return
      }
      const target = event.target as HTMLElement
      if (target.closest('button') || target.closest('[data-resize-handle]')) {
        return
      }

      const container = containerRef.current
      const measuredSize = container
        ? { width: container.offsetWidth, height: container.offsetHeight }
        : defaultSize

      dragMetaRef.current = {
        startX: event.clientX,
        startY: event.clientY,
        originX: position.x,
        originY: position.y,
        size: measuredSize,
      }

      setIsDragging(true)
      window.addEventListener('pointermove', handlePointerMove)
      window.addEventListener('pointerup', handlePointerUp)
      window.addEventListener('pointercancel', handlePointerUp)
    },
    [windowState, isClosed, position, handlePointerMove, handlePointerUp, containerRef, defaultSize]
  )

  /**
   * Cleanup effect to remove all event listeners on unmount.
   */
  useEffect(
    () => () => {
      if (typeof window === 'undefined') {
        return
      }
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerUp)
    },
    [handlePointerMove, handlePointerUp]
  )

  return { isDragging, handlePointerDown }
}
