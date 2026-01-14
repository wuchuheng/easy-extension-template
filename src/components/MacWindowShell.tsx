import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";

type WindowState = "normal" | "maximized" | "minimized";

type ShellState = {
  windowState: WindowState;
  isClosed: boolean;
  position: { x: number; y: number };
  size: { width: number; height: number };
};

type DragMeta = {
  startX: number;
  startY: number;
  originX: number;
  originY: number;
  size: { width: number; height: number };
};

type ResizeDirection =
  | "right"
  | "left"
  | "top"
  | "bottom"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

type ResizeMeta = {
  startX: number;
  startY: number;
  originWidth: number;
  originHeight: number;
  originX: number;
  originY: number;
  direction: ResizeDirection;
};

type ToolbarProps = {
  title: string;
  windowState: WindowState;
  onClose: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
  onRestore: () => void;
  onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
  onDoubleClick: () => void;
};

type MacWindowShellProps = {
  title: string;
  children: React.ReactNode;
  storageKey: string;
};

type TrafficLightVariant = "close" | "minimize" | "maximize";

const PADDING = 12;
const DEFAULT_SIZE = { width: 340 * 2, height: 240 * 3 } as const;
const MIN_SIZE = { width: 260, height: 180 } as const;

const trafficLightStyles: Record<
  TrafficLightVariant,
  { bg: string; border: string; ring: string }
> = {
  close: {
    bg: "bg-red-500",
    border: "border-red-300",
    ring: "focus:ring-red-400",
  },
  minimize: {
    bg: "bg-yellow-400",
    border: "border-yellow-300",
    ring: "focus:ring-yellow-300",
  },
  maximize: {
    bg: "bg-green-500",
    border: "border-green-300",
    ring: "focus:ring-green-300",
  },
};

const getViewport = () => {
  if (typeof window === "undefined") {
    return { width: 1024, height: 768 };
  }
  return { width: window.innerWidth, height: window.innerHeight };
};

const clampPosition = (
  position: { x: number; y: number },
  size: { width: number; height: number },
) => {
  const { width, height } = getViewport();
  const maxX = Math.max(width - size.width - PADDING, PADDING);
  const maxY = Math.max(height - size.height - PADDING, PADDING);

  return {
    x: Math.min(Math.max(position.x, PADDING), maxX),
    y: Math.min(Math.max(position.y, PADDING), maxY),
  };
};

const clampSize = (
  size: { width: number; height: number },
  position: { x: number; y: number },
) => {
  const { width, height } = getViewport();
  const maxWidth = Math.max(MIN_SIZE.width, width - position.x - PADDING);
  const maxHeight = Math.max(MIN_SIZE.height, height - position.y - PADDING);

  return {
    width: Math.min(Math.max(size.width, MIN_SIZE.width), maxWidth),
    height: Math.min(Math.max(size.height, MIN_SIZE.height), maxHeight),
  };
};

const getDefaultPosition = () => {
  const { width, height } = getViewport();
  const panelWidth = DEFAULT_SIZE.width;
  const panelHeight = DEFAULT_SIZE.height;

  return {
    x: Math.max(width - panelWidth - PADDING * 2, PADDING),
    y: Math.max(height - panelHeight - PADDING * 2, PADDING),
  };
};

const readPersistedShellState = (storageKey: string): ShellState => {
  const fallback: ShellState = {
    windowState: "normal",
    isClosed: false,
    position: getDefaultPosition(),
    size: DEFAULT_SIZE,
  };

  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return fallback;
    }

    const parsed = JSON.parse(raw) as Partial<ShellState>;
    if (!parsed || typeof parsed !== "object") {
      return fallback;
    }

    const windowState: WindowState =
      parsed.windowState === "maximized" || parsed.windowState === "minimized"
        ? parsed.windowState
        : "normal";

    const isClosed = Boolean(parsed.isClosed);
    const position =
      parsed.position
      && typeof parsed.position.x === "number"
      && typeof parsed.position.y === "number"
        ? parsed.position
        : getDefaultPosition();

    const rawSize =
      parsed.size
      && typeof parsed.size.width === "number"
      && typeof parsed.size.height === "number"
        ? { width: parsed.size.width, height: parsed.size.height }
        : DEFAULT_SIZE;

    const size = clampSize(rawSize, position ?? getDefaultPosition());
    const clampedPosition = clampPosition(position, size);

    return {
      windowState,
      isClosed,
      position: clampedPosition,
      size,
    };
  } catch {
    return fallback;
  }
};

const persistShellState = (storageKey: string, state: ShellState) => {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(state));
  } catch {
    /* ignore storage errors */
  }
};

const TrafficLightButton = ({
  variant,
  label,
  onClick,
}: {
  variant: TrafficLightVariant;
  label: string;
  onClick: () => void;
}) => {
  const style = trafficLightStyles[variant];
  return (
    <button
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`h-3 w-3 rounded-full border ${style.border} ${style.bg} shadow-inner transition hover:scale-105 focus:outline-none focus:ring-2 ${style.ring}`}
    />
  );
};

const Toolbar = ({
  title,
  windowState,
  onClose,
  onMinimize,
  onMaximize,
  onRestore,
  onPointerDown,
  onDoubleClick,
}: ToolbarProps) => (
  <div
    className={`flex items-center gap-3 border-b border-gray-100 px-4 py-3 ${
      windowState === "normal" ? "cursor-move select-none" : ""
    }`}
    onPointerDown={onPointerDown}
    onDoubleClick={onDoubleClick}
  >
    <div className="flex items-center gap-2">
      <TrafficLightButton variant="close" label="Close" onClick={onClose} />
      <TrafficLightButton
        variant="minimize"
        label="Minimize"
        onClick={onMinimize}
      />
      <TrafficLightButton
        variant="maximize"
        label={windowState === "maximized" ? "Normal" : "Maximize"}
        onClick={windowState === "maximized" ? onRestore : onMaximize}
      />
    </div>

    <div className="flex-1 text-sm font-semibold text-gray-900">{title}</div>
  </div>
);

const MiniRestoreButton = ({ onClick }: { onClick: () => void }) => (
  <button
    aria-label="Restore panel"
    title="Restore panel"
    onClick={onClick}
    className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow-xl transition hover:-translate-y-0.5 hover:shadow-2xl focus:outline-none focus:ring-2 focus:ring-blue-400"
  >
    <span className="inline-block h-2 w-2 rounded-full bg-white" />
    Restore panel
  </button>
);

const OpenPanelButton = ({ onClick }: { onClick: () => void }) => (
  <button
    aria-label="Open panel"
    title="Open panel"
    onClick={onClick}
    className="fixed bottom-4 right-4 z-50 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
  >
    Open panel
  </button>
);

const ResizeHandle = ({
  direction,
  onPointerDown,
}: {
  direction: ResizeDirection;
  onPointerDown: (
    direction: ResizeDirection,
  ) => (event: React.PointerEvent<HTMLDivElement>) => void;
}) => {
  const directionClasses: Record<ResizeDirection, string> = {
    right: "right-0 top-2 bottom-2 w-2 cursor-ew-resize",
    left: "left-0 top-2 bottom-2 w-2 cursor-ew-resize",
    top: "top-0 left-2 right-2 h-2 cursor-ns-resize",
    bottom: "bottom-0 left-2 right-2 h-2 cursor-ns-resize",
    "top-left": "top-0 left-0 h-4 w-4 cursor-nwse-resize",
    "top-right": "top-0 right-0 h-4 w-4 cursor-nesw-resize",
    "bottom-left": "bottom-0 left-0 h-4 w-4 cursor-nesw-resize",
    "bottom-right": "bottom-0 right-0 h-4 w-4 cursor-nwse-resize",
  };

  return (
    <div
      data-resize-handle
      className={`absolute touch-none bg-transparent ${directionClasses[direction]}`}
      onPointerDown={onPointerDown(direction)}
    />
  );
};

export default function MacWindowShell({
  title,
  children,
  storageKey,
}: MacWindowShellProps) {
  const [shellState, setShellState] = useState<ShellState>(() =>
    readPersistedShellState(storageKey),
  );
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragMetaRef = useRef<DragMeta | null>(null);
  const resizeMetaRef = useRef<ResizeMeta | null>(null);

  const { windowState, isClosed, position, size } = shellState;
  const showPanel = !isClosed && windowState !== "minimized";
  const motionClass =
    !isDragging && !isResizing ? "transition-all duration-300 ease-in-out" : "";

  useEffect(() => {
    persistShellState(storageKey, shellState);
  }, [shellState, storageKey]);

  useEffect(() => {
    setShellState(readPersistedShellState(storageKey));
  }, [storageKey]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const clampToViewport = () => {
      const container = containerRef.current;
      const measuredSize = container
        ? { width: container.offsetWidth, height: container.offsetHeight }
        : DEFAULT_SIZE;

      setShellState((prev) => {
        const nextSize = clampSize(prev.size ?? measuredSize, prev.position);
        const nextPosition = clampPosition(prev.position, nextSize);
        return { ...prev, size: nextSize, position: nextPosition };
      });
    };

    window.addEventListener("resize", clampToViewport);
    return () => {
      window.removeEventListener("resize", clampToViewport);
    };
  }, []);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (windowState !== "normal" || isClosed) {
      return;
    }
    const target = event.target as HTMLElement;
    if (target.closest("button") || target.closest("[data-resize-handle]")) {
      return;
    }

    const container = containerRef.current;
    const measuredSize = container
      ? { width: container.offsetWidth, height: container.offsetHeight }
      : DEFAULT_SIZE;

    dragMetaRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: position.x,
      originY: position.y,
      size: measuredSize,
    };

    setIsDragging(true);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
  };

  const handlePointerMove = useCallback((event: PointerEvent) => {
    const dragMeta = dragMetaRef.current;
    if (!dragMeta) {
      return;
    }
    event.preventDefault();

    const deltaX = event.clientX - dragMeta.startX;
    const deltaY = event.clientY - dragMeta.startY;

    const nextPosition = clampPosition(
      { x: dragMeta.originX + deltaX, y: dragMeta.originY + deltaY },
      dragMeta.size,
    );

    setShellState((prev) => ({ ...prev, position: nextPosition }));
  }, []);

  const handlePointerUp = useCallback(() => {
    dragMetaRef.current = null;
    setIsDragging(false);
    window.removeEventListener("pointermove", handlePointerMove);
    window.removeEventListener("pointerup", handlePointerUp);
    window.removeEventListener("pointercancel", handlePointerUp);
  }, [handlePointerMove]);

  const handleResizeMove = useCallback((event: PointerEvent) => {
    const resizeMeta = resizeMetaRef.current;
    if (!resizeMeta) {
      return;
    }
    event.preventDefault();

    const deltaX = event.clientX - resizeMeta.startX;
    const deltaY = event.clientY - resizeMeta.startY;
    const viewport = getViewport();

    const rightEdge = resizeMeta.originX + resizeMeta.originWidth;
    const bottomEdge = resizeMeta.originY + resizeMeta.originHeight;

    const affectLeft = resizeMeta.direction.includes("left");
    const affectRight = resizeMeta.direction.includes("right");
    const affectTop = resizeMeta.direction.includes("top");
    const affectBottom = resizeMeta.direction.includes("bottom");

    let nextX = resizeMeta.originX;
    let nextY = resizeMeta.originY;
    let nextWidth = resizeMeta.originWidth;
    let nextHeight = resizeMeta.originHeight;

    if (affectRight) {
      const maxWidth = viewport.width - PADDING - resizeMeta.originX;
      nextWidth = Math.max(
        MIN_SIZE.width,
        Math.min(maxWidth, resizeMeta.originWidth + deltaX),
      );
    }

    if (affectBottom) {
      const maxHeight = viewport.height - PADDING - resizeMeta.originY;
      nextHeight = Math.max(
        MIN_SIZE.height,
        Math.min(maxHeight, resizeMeta.originHeight + deltaY),
      );
    }

    if (affectLeft) {
      let proposedX = resizeMeta.originX + deltaX;
      const maxX = rightEdge - MIN_SIZE.width;
      proposedX = Math.min(proposedX, maxX);
      proposedX = Math.max(PADDING, proposedX);
      const maxWidth = viewport.width - PADDING - proposedX;
      nextX = proposedX;
      nextWidth = Math.max(
        MIN_SIZE.width,
        Math.min(maxWidth, rightEdge - proposedX),
      );
    }

    if (affectTop) {
      let proposedY = resizeMeta.originY + deltaY;
      const maxY = bottomEdge - MIN_SIZE.height;
      proposedY = Math.min(proposedY, maxY);
      proposedY = Math.max(PADDING, proposedY);
      const maxHeight = viewport.height - PADDING - proposedY;
      nextY = proposedY;
      nextHeight = Math.max(
        MIN_SIZE.height,
        Math.min(maxHeight, bottomEdge - proposedY),
      );
    }

    setShellState((prev) => ({
      ...prev,
      position: { x: nextX, y: nextY },
      size: clampSize(
        { width: nextWidth, height: nextHeight },
        { x: nextX, y: nextY },
      ),
    }));
  }, []);

  const handleResizeUp = useCallback(() => {
    resizeMetaRef.current = null;
    setIsResizing(false);
    window.removeEventListener("pointermove", handleResizeMove);
    window.removeEventListener("pointerup", handleResizeUp);
    window.removeEventListener("pointercancel", handleResizeUp);
  }, [handleResizeMove]);

  useEffect(
    () => () => {
      if (typeof window === "undefined") {
        return;
      }
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
      window.removeEventListener("pointermove", handleResizeMove);
      window.removeEventListener("pointerup", handleResizeUp);
      window.removeEventListener("pointercancel", handleResizeUp);
    },
    [handlePointerMove, handlePointerUp, handleResizeMove, handleResizeUp],
  );

  const handleResizeStart =
    (direction: ResizeDirection) =>
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (windowState !== "normal" || isClosed) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();

      const container = containerRef.current;
      if (!container) {
        return;
      }

      resizeMetaRef.current = {
        startX: event.clientX,
        startY: event.clientY,
        originWidth: container.offsetWidth,
        originHeight: container.offsetHeight,
        originX: position.x,
        originY: position.y,
        direction,
      };

      setIsResizing(true);
      window.addEventListener("pointermove", handleResizeMove);
      window.addEventListener("pointerup", handleResizeUp);
      window.addEventListener("pointercancel", handleResizeUp);
    };

  const handleMaximize = () =>
    setShellState((prev) => ({
      ...prev,
      windowState: "maximized",
      isClosed: false,
    }));

  const handleMinimize = () =>
    setShellState((prev) => ({
      ...prev,
      windowState: "minimized",
      isClosed: false,
    }));

  const handleRestore = () =>
    setShellState((prev) => ({
      ...prev,
      windowState: "normal",
      isClosed: false,
    }));

  const handleToggleMaximize = () =>
    setShellState((prev) =>
      prev.windowState === "maximized"
        ? { ...prev, windowState: "normal", isClosed: false }
        : { ...prev, windowState: "maximized", isClosed: false },
    );

  const handleClose = () =>
    setShellState((prev) => ({
      ...prev,
      windowState: "normal",
      isClosed: true,
    }));

  return (
    <>
      {isClosed && <OpenPanelButton onClick={handleRestore} />}

      {!isClosed && windowState === "minimized" && (
        <MiniRestoreButton onClick={handleRestore} />
      )}

      {showPanel && (
        <div
          ref={containerRef}
          role="dialog"
          aria-label="Extension panel"
          className={` fixed z-50 flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-gray-200 border border-gray-400 ${motionClass} ${
            windowState === "maximized" ? "inset-0 sm:inset-4 md:inset-6" : ""
          }`}
          style={
            windowState === "normal"
              ? {
                  top: position.y,
                  left: position.x,
                  width: size.width,
                  height: size.height,
                  border: "1px solid #D3D3D3",
                }
              : undefined
          }
        >
          <Toolbar
            title={title}
            windowState={windowState}
            onClose={handleClose}
            onMinimize={handleMinimize}
            onMaximize={handleMaximize}
            onRestore={handleRestore}
            onPointerDown={handlePointerDown}
            onDoubleClick={handleToggleMaximize}
          />

          <div className="flex-1 space-y-2 overflow-auto px-4 py-3">
            {children}
          </div>

          {windowState === "normal" && (
            <>
              <ResizeHandle direction="top" onPointerDown={handleResizeStart} />
              <ResizeHandle
                direction="right"
                onPointerDown={handleResizeStart}
              />
              <ResizeHandle
                direction="bottom"
                onPointerDown={handleResizeStart}
              />
              <ResizeHandle
                direction="left"
                onPointerDown={handleResizeStart}
              />
              <ResizeHandle
                direction="top-left"
                onPointerDown={handleResizeStart}
              />
              <ResizeHandle
                direction="top-right"
                onPointerDown={handleResizeStart}
              />
              <ResizeHandle
                direction="bottom-right"
                onPointerDown={handleResizeStart}
              />
              <ResizeHandle
                direction="bottom-left"
                onPointerDown={handleResizeStart}
              />
            </>
          )}
        </div>
      )}
    </>
  );
}
