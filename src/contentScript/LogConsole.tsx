import { useRef, useLayoutEffect } from 'react';
import { useLogContext } from './LogContext';
import clsx from 'clsx';
import type { LogLevel } from '@/types/logging';

const ICONS: Record<LogLevel, string> = {
  info: '📄',
  success: '✅',
  warn: '⚠️',
  error: '❌',
};

export default function LogConsole() {
  const { logs, isLoading } = useLogContext();
  const containerRef = useRef<HTMLDivElement>(null);
  const isAutoScroll = useRef(true);

  // --- Scroll Guard Logic ---

  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollHeight, scrollTop, clientHeight } = containerRef.current;

    // Distance from the bottom of the scroll content
    const distanceToBottom = scrollHeight - scrollTop - clientHeight;

    // Guard: Check if we are within ~3 lines (approx 60-80px)
    // If we are close to bottom, enable auto-scroll.
    // If user scrolls up, disable it.
    isAutoScroll.current = distanceToBottom <= 80;
  };

  // Run whenever `logs` changes to potentially snap to bottom
  useLayoutEffect(() => {
    if (isAutoScroll.current && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="relative flex-1 min-h-0 overflow-hidden bg-gray-50">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto p-2 space-y-1.5 scroll-smooth"
      >
        {logs.length === 0 && !isLoading && (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm">
            <p>No activity yet.</p>
            <p className="text-xs mt-1">Configure settings and click Start.</p>
          </div>
        )}

        {logs.map(log => (
          <div
            key={log.id}
            className={clsx(
              'group flex items-start gap-2 p-2 rounded-md text-sm border shadow-sm animate-entry',
              {
                'bg-red-50 border-red-100 text-red-900': log.level === 'error',
                'bg-amber-50 border-amber-100 text-amber-900': log.level === 'warn',
                'bg-green-50 border-green-100 text-green-900': log.level === 'success',
                'bg-white border-gray-100 text-gray-700': log.level === 'info',
              }
            )}
          >
            <span className="flex-shrink-0 mt-0.5 select-none" role="img" aria-label={log.level}>
              {ICONS[log.level]}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-mono text-gray-400">
                  {log.timestamp.split(' ')[1] || log.timestamp}
                </span>
                {log.agentId && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-black/5 text-black/60">
                    {log.agentId}
                  </span>
                )}
              </div>
              <p className="leading-snug break-words">{log.message}</p>
            </div>
          </div>
        ))}

        {isLoading && <div className="text-center py-2 text-xs text-gray-400">Loading...</div>}
      </div>
    </div>
  );
}
