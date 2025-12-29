import { useState, useEffect } from 'react';
import MacWindowShell from '@/components/MacWindowShell';
import { LogProvider, useLogContext } from './LogContext';
import LogConsole from './LogConsole';

function MainContent() {
  // --- State ---
  const { addLog, totalLogs, clearLogs } = useLogContext();
  const [runState, setRunState] = useState<'idle' | 'running'>('idle');
  const [serviceUrl, setServiceUrl] = useState('');
  const [agentCount, setAgentCount] = useState<number>(2);
  const [lastUpdated, setLastUpdated] = useState<string>('-');

  // --- Actions ---

  const handleStart = () => {
    // Validation
    if (!serviceUrl.trim() || !/^https?:\/\//.test(serviceUrl)) {
      addLog('error', 'Invalid Service URL. Must start with http:// or https://');
      return;
    }
    if (agentCount < 2 || agentCount > 5) {
      addLog('error', 'Agent count must be between 2 and 5');
      return;
    }

    setRunState('running');
    addLog('info', `Started with ${agentCount} agents connected to ${serviceUrl}`);
  };

  const handleStop = () => {
    setRunState('idle');
    addLog('warn', 'Stopped by user');
  };

  const handleClear = () => {
    clearLogs();
  };

  // --- Effects ---

  // Simulation effect
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    if (runState === 'running') {
      interval = setInterval(() => {
        const rand = Math.random();
        const agentId = `Agent ${Math.floor(Math.random() * agentCount) + 1}`;
        setLastUpdated(new Date().toLocaleTimeString());

        if (rand > 0.9) {
          addLog('error', 'Connection timeout', agentId);
        } else if (rand > 0.7) {
          addLog('warn', 'Retrying image analysis...', agentId);
        } else if (rand > 0.3) {
          addLog('success', `Analyzed image ${Math.floor(Math.random() * 1000)}`, agentId);
        } else {
          addLog('info', 'Queued next batch', agentId);
        }
      }, 1500); // Simulate activity every 1.5s
    }

    return () => clearInterval(interval);
  }, [runState, agentCount, addLog]);

  const isRunning = runState === 'running';

  return (
    <MacWindowShell title="AI Identification Console" storageKey="ai-identification-console">
      <div className="flex flex-col h-full bg-gray-50/50 text-gray-900 font-sans">
        {/* 1. Control Section */}
        <div className="flex flex-col gap-3 p-4 border-b border-gray-200 bg-white/50 backdrop-blur-sm">
          {/* Settings Row: Service URL */}
          <div className="flex flex-col gap-1">
            <label
              htmlFor="service-url"
              className="text-xs font-medium text-gray-500 uppercase tracking-wide"
            >
              Service Endpoint URL
            </label>
            <input
              id="service-url"
              type="text"
              value={serviceUrl}
              onChange={e => setServiceUrl(e.target.value)}
              disabled={isRunning}
              placeholder="https://api.service.com"
              className="w-full px-3 py-1.5 text-sm rounded-md border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500 transition-all shadow-sm"
            />
            {!serviceUrl && !isRunning && (
              <span className="text-[10px] text-red-500">Valid URL required</span>
            )}
          </div>

          {/* Actions Row */}
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex items-center gap-3">
              {/* Status Pill */}
              <div
                className={`
                flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium shadow-sm transition-colors
                ${
                  isRunning
                    ? 'bg-green-50 border-green-200 text-green-700'
                    : 'bg-gray-100 border-gray-200 text-gray-600'
                }
              `}
              >
                <span
                  className={`w-2 h-2 rounded-full ${isRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}
                />
                {isRunning ? 'Running' : 'Idle'}
              </div>

              {/* Concurrency Input */}
              <div className="flex flex-col">
                <label htmlFor="agent-count" className="sr-only">
                  Concurrent agents
                </label>
                <div className="flex items-center gap-1 bg-white rounded-md border border-gray-300 px-2 py-1 shadow-sm">
                  <span className="text-xs text-gray-500 whitespace-nowrap">Agents:</span>
                  <input
                    id="agent-count"
                    type="number"
                    min="2"
                    max="5"
                    value={agentCount}
                    onChange={e => setAgentCount(parseInt(e.target.value) || 2)}
                    disabled={isRunning}
                    className="w-10 text-center text-sm font-semibold outline-none border-none p-0 focus:ring-0 disabled:text-gray-400"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              {!isRunning && totalLogs > 0 && (
                <button
                  onClick={handleClear}
                  className="px-3 py-1.5 rounded-full text-sm font-medium text-gray-600 hover:text-red-600 hover:bg-red-50 transition-colors"
                >
                  Clear
                </button>
              )}
              {/* Start/Stop Button */}
              <button
                onClick={isRunning ? handleStop : handleStart}
                disabled={!serviceUrl && !isRunning}
                className={`
                    px-5 py-1.5 rounded-full text-sm font-semibold text-white shadow-md transition-all active:scale-95
                    ${
                      isRunning
                        ? 'bg-red-500 hover:bg-red-600 shadow-red-500/30'
                        : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none'
                    }
                  `}
              >
                {isRunning ? 'Stop' : 'Start'}
              </button>
            </div>
          </div>
        </div>

        {/* 2. Log Panel */}
        <LogConsole />

        {/* 3. Footer Strip */}
        <div className="flex items-center justify-between px-4 py-2 bg-gray-100 border-t border-gray-200 text-xs text-gray-500">
          <div className="flex gap-4">
            <span title="Total logs in database">
              Total Logs: <strong className="text-gray-700">{totalLogs}</strong>
            </span>
          </div>
          <div>
            Last updated: <span className="font-mono">{lastUpdated}</span>
          </div>
        </div>
      </div>
    </MacWindowShell>
  );
}

export default function App() {
  return (
    <LogProvider>
      <MainContent />
    </LogProvider>
  );
}
