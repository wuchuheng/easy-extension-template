import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { LogEntry, LogLevel, LogPagination } from '@/types/logging';
import { logAdd, logGet, logMeta, logClear } from '@/messaging/channels';

interface LogContextType {
  logs: LogEntry[];
  totalLogs: number;
  isLoading: boolean;
  pagination: LogPagination;
  addLog: (level: LogLevel, message: string, agentId?: string) => Promise<void>;
  fetchLogs: (offset?: number) => Promise<void>;
  clearLogs: () => Promise<void>;
}

const LogContext = createContext<LogContextType | undefined>(undefined);

export const useLogContext = () => {
  const context = useContext(LogContext);
  if (!context) {
    throw new Error('useLogContext must be used within a LogProvider');
  }
  return context;
};

export const LogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const limit = 100;

  const fetchMeta = useCallback(async () => {
    try {
      const { total } = await logMeta.send({});
      setTotalLogs(total);
    } catch (error) {
      console.error('Failed to fetch log metadata', error);
    }
  }, []);

  const fetchLogs = useCallback(
    async (reqOffset = 0) => {
      setIsLoading(true);
      try {
        // Parallel fetch: logs and meta
        const [logsResp, metaResp] = await Promise.all([
          logGet.send({ limit, offset: reqOffset }),
          logMeta.send({}),
        ]);

        setLogs(logsResp.logs);
        setTotalLogs(metaResp.total);
        setOffset(reqOffset);
      } catch (error) {
        console.error('Failed to fetch logs', error);
      } finally {
        setIsLoading(false);
      }
    },
    [limit]
  );

  const addLog = useCallback(
    async (level: LogLevel, message: string, agentId?: string) => {
      const timestamp = new Date()
        .toLocaleString('sv-SE', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
        .replace(' ', ' '); // Format: YYYY-MM-DD HH:mm:ss

      try {
        // 1. Send to background (which routes to offscreen)
        await logAdd.send({ level, message, agentId, timestamp });

        // 2. Update meta
        await fetchMeta();

        // 3. If we are viewing the latest page (offset 0), refresh the logs
        if (offset === 0) {
          const { logs: newLogs } = await logGet.send({ limit, offset: 0 });
          setLogs(newLogs);
        }
      } catch (error) {
        console.error('Failed to add log', error);
      }
    },
    [offset, fetchMeta]
  );

  const clearLogs = useCallback(async () => {
    try {
      await logClear.send({});
      setLogs([]);
      setTotalLogs(0);
      setOffset(0);
    } catch (error) {
      console.error('Failed to clear logs', error);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchLogs(0);
  }, [fetchLogs]);

  const value: LogContextType = {
    logs,
    totalLogs,
    isLoading,
    pagination: { limit, offset, total: totalLogs },
    addLog,
    fetchLogs,
    clearLogs,
  };

  return <LogContext.Provider value={value}>{children}</LogContext.Provider>;
};
