import React, { useState, useEffect, useRef } from 'react';
import {
  CheckSquare,
  Play,
  Square,
  RefreshCw,
  Layers,
  Terminal,
  Copy,
  Check,
  EyeOff,
  Sparkles,
  Wallet
} from 'lucide-react';
import { ChainConfig, CheckinLog, WalletItem, WebsiteConfig } from '../types';
import { authenticateWallet, fetchRrfMe, submitGenericQuest } from '../services/rrfVillageService';

interface TasksSectionProps {
  activeWebsite: WebsiteConfig;
  wallets: WalletItem[];
  chain: ChainConfig;
  onRefreshBalances: () => void;
}

export const TasksSection: React.FC<TasksSectionProps> = ({
  wallets,
  chain,
  onRefreshBalances
}) => {
  const [selectedWalletIds, setSelectedWalletIds] = useState<string[]>(() => wallets.map((w) => w.id));
  const [rangeStart, setRangeStart] = useState<number>(1);
  const [rangeEnd, setRangeEnd] = useState<number>(wallets.length || 1);
  const [rangeError, setRangeError] = useState<string>('');

  // Dropdown for inspecting a specific wallet's live quests
  const [inspectedWalletId, setInspectedWalletId] = useState<string>(wallets[0]?.id || '');

  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isLoadingQuests, setIsLoadingQuests] = useState<boolean>(false);
  const [logs, setLogs] = useState<CheckinLog[]>([]);
  const [copiedLog, setCopiedLog] = useState<boolean>(false);

  // Dynamic live quests detected from server
  const [liveQuests, setLiveQuests] = useState<any[]>([]);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Record<string, boolean>>({});

  const isCancelledRef = useRef<boolean>(false);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  const addLog = (logItem: Omit<CheckinLog, 'id' | 'timestamp'>) => {
    const newLog: CheckinLog = {
      ...logItem,
      id: `task-log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleTimeString()
    };
    setLogs((prev) => [...prev, newLog]);
  };

  // Helper: check if a quest is executable without external OAuth redirect
  const isQuestAutoCompletable = (q: any) => {
    if (q.id === 'daily_checkin') return false;
    if (q.verify === 'x_link' || q.verify === 'discord_link') return false;
    if (q.status === 'locked' && (q.reason?.includes('Link your') || q.reason?.includes('first'))) return false;
    return true;
  };

  // Fetch live available quests for the currently selected inspected wallet
  const fetchLiveQuests = async (targetWalletId?: string) => {
    if (wallets.length === 0) return;
    const currentId = targetWalletId || inspectedWalletId || wallets[0].id;
    const targetWallet = wallets.find((w) => w.id === currentId) || wallets[0];

    setIsLoadingQuests(true);
    try {
      const session = await authenticateWallet(targetWallet.privateKey);
      const profile = await fetchRrfMe(session.token);

      const allQuests = profile?.quests || [];
      setLiveQuests(allQuests);

      // Select all completable and not-yet-completed tasks by default
      const initialSelection: Record<string, boolean> = {};
      allQuests.forEach((q: any) => {
        const isDone = (q.done_count && q.done_count > 0) || q.status === 'completed' || q.status === 'pending';
        if (isQuestAutoCompletable(q) && !isDone) {
          initialSelection[q.id] = true;
        }
      });
      setSelectedTaskIds(initialSelection);
    } catch (e: any) {
      console.warn(`Failed to inspect quests for ${targetWallet.name}:`, e);
    } finally {
      setIsLoadingQuests(false);
    }
  };

  // On mount or wallet list change, ensure inspectedWalletId is valid and fetch
  useEffect(() => {
    if (wallets.length > 0) {
      if (!inspectedWalletId || !wallets.some((w) => w.id === inspectedWalletId)) {
        setInspectedWalletId(wallets[0].id);
        fetchLiveQuests(wallets[0].id);
      } else {
        fetchLiveQuests(inspectedWalletId);
      }
    }
  }, [wallets.length]);

  const handleWalletDropdownChange = (id: string) => {
    setInspectedWalletId(id);
    fetchLiveQuests(id);
  };

  const selectAll = () => {
    setSelectedWalletIds(wallets.map((w) => w.id));
  };

  const deselectAll = () => {
    setSelectedWalletIds([]);
  };

  const toggleTaskSelection = (taskId: string) => {
    setSelectedTaskIds((prev) => ({
      ...prev,
      [taskId]: !prev[taskId]
    }));
  };

  const handleStartTasks = async () => {
    if (selectedWalletIds.length === 0) {
      alert('Please select at least one wallet.');
      return;
    }

    const tasksToRun = Object.entries(selectedTaskIds)
      .filter(([_, v]) => v)
      .map(([k]) => k);

    if (tasksToRun.length === 0) {
      alert('Please select at least one task to run.');
      return;
    }

    setIsRunning(true);
    isCancelledRef.current = false;

    const targets = selectedWalletIds
      .map((id) => wallets.find((w) => w.id === id))
      .filter((w): w is WalletItem => !!w);

    addLog({
      type: 'info',
      message: `🚀 Initiating Dynamic Tasks Auto-Runner for ${targets.length} wallet(s)...`
    });

    for (let i = 0; i < targets.length; i++) {
      if (isCancelledRef.current) {
        addLog({ type: 'warning', message: '🛑 Sequence cancelled by user.' });
        break;
      }

      const w = targets[i];
      addLog({
        type: 'step',
        walletName: w.name,
        walletAddress: w.address,
        message: `\n[${i + 1}/${targets.length}] Processing Tasks for ${w.name} (${w.address.slice(0, 6)}...${w.address.slice(-4)})`
      });

      try {
        const session = await authenticateWallet(w.privateKey);
        const me = await fetchRrfMe(session.token);
        const currentWalletQuests = me?.quests || [];

        for (const taskId of tasksToRun) {
          if (isCancelledRef.current) break;

          const q = currentWalletQuests.find((item: any) => item.id === taskId);
          // If task not found on this wallet, smoothly skip
          if (!q) {
            addLog({
              type: 'info',
              walletName: w.name,
              message: `ℹ️ Task [${taskId}] not available on this wallet. Skipping...`
            });
            continue;
          }

          // If already completed or pending on this wallet, smoothly skip
          if (q.done_count > 0 || q.status === 'completed' || q.status === 'pending') {
            addLog({
              type: 'info',
              walletName: w.name,
              message: `✓ Task "${q.title}" already ${q.status || 'completed'} on ${w.name}. Skipping...`
            });
            continue;
          }

          // If locked, skip
          if (q.status === 'locked') {
            addLog({
              type: 'warning',
              walletName: w.name,
              message: `Task "${q.title}" is locked on ${w.name}. Skipping...`
            });
            continue;
          }

          addLog({
            type: 'info',
            walletName: w.name,
            message: `Submitting task "${q.title}" (+${q.points_now} pts)...`
          });

          const subRes = await submitGenericQuest(session.token, taskId, {
            note: 'Completed via Refer Check'
          });

          if (subRes.ok) {
            addLog({
              type: 'success',
              walletName: w.name,
              message: `✅ "${q.title}" submitted successfully! Status: ${subRes.status || 'pending'}`
            });
          } else {
            addLog({
              type: 'warning',
              walletName: w.name,
              message: `⚠️ "${q.title}" response: ${subRes.message}`
            });
          }

          // Smooth delay between tasks
          await new Promise((r) => setTimeout(r, 1200));
        }
      } catch (err: any) {
        addLog({
          type: 'error',
          walletName: w.name,
          walletAddress: w.address,
          message: `❌ Error on ${w.name}: ${err.message}`
        });
      }

      await new Promise((r) => setTimeout(r, 1500));
    }

    addLog({
      type: 'success',
      message: '✨ Tasks processing finished. Re-syncing live quests...'
    });

    setIsRunning(false);
    fetchLiveQuests();
    onRefreshBalances();
  };

  const handleStopTasks = () => {
    isCancelledRef.current = true;
    addLog({ type: 'warning', message: 'Stop requested. Finishing current call...' });
  };

  const handleCopyLogs = () => {
    const text = logs
      .map((l) => `[${l.timestamp}] ${l.type.toUpperCase()}: ${l.message}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopiedLog(true);
    setTimeout(() => setCopiedLog(false), 2000);
  };

  // Filter out completed and daily_checkin tasks dynamically
  const activeCompletableQuests = liveQuests.filter((q) => {
    const isDone = (q.done_count && q.done_count > 0) || q.status === 'completed' || q.status === 'pending';
    return isQuestAutoCompletable(q) && !isDone;
  });

  const completedQuestsCount = liveQuests.filter((q) => {
    return (q.done_count && q.done_count > 0) || q.status === 'completed' || q.status === 'pending';
  }).length;

  const currentWalletObj = wallets.find((w) => w.id === inspectedWalletId) || wallets[0];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-[#111D42] to-[#0A142F] border border-[#202D49] shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-400">
              <CheckSquare className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Dynamic Quests & Tasks Automation
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                  Auto-Detecting
                </span>
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Inspect quests from any wallet via the dropdown. Start tasks across selected wallets—completed ones skip smoothly!
              </p>
            </div>
          </div>

          {/* Inspect Wallet Dropdown & Refresh Button */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#080B13] border border-[#202D49] rounded-xl text-xs">
              <Wallet className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-gray-400 font-medium">Inspect:</span>
              <select
                value={inspectedWalletId}
                onChange={(e) => handleWalletDropdownChange(e.target.value)}
                className="bg-transparent text-white font-mono font-semibold focus:outline-none cursor-pointer pr-1"
              >
                {wallets.map((w, idx) => (
                  <option key={w.id} value={w.id} className="bg-[#0F1626] text-white">
                    #{idx + 1} ({w.address.slice(0, 6)}...{w.address.slice(-4)})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => fetchLiveQuests()}
              disabled={isLoadingQuests}
              className="px-3 py-1.5 bg-[#162035] hover:bg-[#202D49] text-gray-300 hover:text-white rounded-xl border border-[#202D49] text-xs font-semibold flex items-center gap-1.5 transition-all"
              title="Re-check live quests from server"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingQuests ? 'animate-spin text-blue-400' : ''}`} />
              <span>{isLoadingQuests ? 'Checking...' : 'Refresh'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Quests Section */}
      <div className="p-6 rounded-2xl bg-[#0F1626] border border-[#202D49] shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#202D49]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">
              Available Active Quests for {currentWalletObj ? currentWalletObj.name : 'Selected Wallet'} ({activeCompletableQuests.length})
            </h3>
          </div>
          {completedQuestsCount > 0 && (
            <span className="text-[11px] text-gray-400 flex items-center gap-1">
              <EyeOff className="w-3.5 h-3.5 text-gray-500" />
              {completedQuestsCount} completed/pending task(s) hidden for this wallet
            </span>
          )}
        </div>

        {/* Dynamic Task Cards */}
        {isLoadingQuests ? (
          <div className="py-8 text-center text-gray-400 text-xs">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-400" />
            Inspecting server quests for {currentWalletObj ? currentWalletObj.name : 'wallet'}...
          </div>
        ) : activeCompletableQuests.length === 0 ? (
          <div className="py-8 text-center bg-[#080B13] border border-[#202D49] rounded-xl text-xs space-y-1">
            <span className="text-2xl">🎉</span>
            <p className="font-semibold text-emerald-400">All current completable tasks are finished or pending on {currentWalletObj ? currentWalletObj.name : 'this wallet'}!</p>
            <p className="text-gray-500 text-[11px]">
              Select another wallet from the dropdown above to inspect, or click "Refresh" when new tasks arrive.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {activeCompletableQuests.map((q) => {
              const isSelected = !!selectedTaskIds[q.id];
              return (
                <div
                  key={q.id}
                  onClick={() => toggleTaskSelection(q.id)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                    isSelected
                      ? 'bg-blue-950/30 border-blue-500/50 text-white shadow-md'
                      : 'bg-[#080B13] border-[#202D49] text-gray-400 hover:border-gray-600'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}}
                    className="mt-0.5 w-4 h-4 rounded border-[#202D49] text-blue-600 bg-[#162035]"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">{q.title}</span>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono text-[10px] font-bold">
                        +{q.points_now || q.base_points || 10} Pts
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1">
                      {q.description || q.reason || 'Auto-completable quest'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Range Selector & Wallet Filter */}
        <div className="space-y-3 pt-2">
          <div className="flex flex-wrap items-center gap-2 p-3 bg-[#080B13] border border-[#202D49] rounded-xl text-xs">
            <span className="text-gray-400 font-medium flex-shrink-0">Target Wallet Range:</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-gray-500">From</span>
              <input
                type="number"
                min={1}
                max={wallets.length || 1}
                value={rangeStart}
                onChange={(e) => {
                  const v = Math.max(1, Math.min(wallets.length || 1, Number(e.target.value)));
                  setRangeStart(v);
                  setRangeError('');
                }}
                className="w-14 px-2 py-1 bg-[#162035] border border-[#202D49] rounded-lg text-white text-xs font-mono focus:outline-none focus:border-blue-500 text-center"
              />
              <span className="text-gray-500">to</span>
              <input
                type="number"
                min={1}
                max={wallets.length || 1}
                value={rangeEnd}
                onChange={(e) => {
                  const v = Math.max(1, Math.min(wallets.length || 1, Number(e.target.value)));
                  setRangeEnd(v);
                  setRangeError('');
                }}
                className="w-14 px-2 py-1 bg-[#162035] border border-[#202D49] rounded-lg text-white text-xs font-mono focus:outline-none focus:border-blue-500 text-center"
              />
              <span className="text-gray-500">of {wallets.length}</span>
              <button
                onClick={() => {
                  if (wallets.length === 0) return;
                  const s = Math.max(1, rangeStart);
                  const e = Math.min(wallets.length, rangeEnd);
                  if (s > e) {
                    setRangeError('Start must be ≤ End');
                    return;
                  }
                  const ids = wallets.slice(s - 1, e).map((w) => w.id);
                  setSelectedWalletIds(ids);
                  setRangeError('');
                }}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold transition-all"
              >
                Apply Range
              </button>
              <button
                onClick={() => {
                  setRangeStart(1);
                  setRangeEnd(wallets.length || 1);
                  setSelectedWalletIds(wallets.map((w) => w.id));
                  setRangeError('');
                }}
                className="px-3 py-1 bg-[#162035] hover:bg-[#202D49] text-gray-300 rounded-lg transition-all border border-[#202D49]"
              >
                All
              </button>
            </div>
            {rangeError && <span className="text-red-400 font-medium ml-1">{rangeError}</span>}
            {!rangeError && selectedWalletIds.length > 0 && (
              <span className="text-emerald-400 ml-1">
                ✓ {selectedWalletIds.length} wallet(s) selected
              </span>
            )}
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-gray-300 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-blue-400" />
              Selected Target Wallets ({selectedWalletIds.length}/{wallets.length})
            </span>
            <div className="flex gap-2">
              <button onClick={selectAll} className="text-blue-400 hover:text-blue-300 font-medium">
                Select All
              </button>
              <span className="text-gray-600">•</span>
              <button onClick={deselectAll} className="text-gray-400 hover:text-gray-300 font-medium">
                Deselect All
              </button>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          {!isRunning ? (
            <button
              onClick={handleStartTasks}
              disabled={selectedWalletIds.length === 0 || activeCompletableQuests.length === 0}
              className="w-full py-3.5 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-bold text-white text-sm shadow-lg shadow-blue-900/30 transition-all flex items-center justify-center gap-2 transform active:scale-[0.99]"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>
                Start Automated Tasks ({selectedWalletIds.length} Wallets · {activeCompletableQuests.length} Quest(s))
              </span>
            </button>
          ) : (
            <button
              onClick={handleStopTasks}
              className="w-full py-3.5 px-6 bg-red-600 hover:bg-red-500 rounded-xl font-bold text-white text-sm shadow-lg shadow-red-900/30 transition-all flex items-center justify-center gap-2"
            >
              <Square className="w-5 h-5 fill-current" />
              <span>Stop Sequence</span>
            </button>
          )}
        </div>
      </div>

      {/* Terminal Logs */}
      <div className="rounded-2xl bg-[#080B13] border border-[#202D49] overflow-hidden shadow-2xl">
        <div className="px-4 py-3 bg-[#0F1626] border-b border-[#202D49] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span className="font-mono text-xs font-semibold text-gray-200">
              Tasks Execution Terminal
            </span>
            {isRunning && (
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLogs}
              disabled={logs.length === 0}
              className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-[#162035] transition-colors text-xs flex items-center gap-1"
            >
              {copiedLog ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">Copy Logs</span>
            </button>
            <button
              onClick={() => setLogs([])}
              className="text-xs text-gray-500 hover:text-gray-300 px-2 py-1 rounded hover:bg-[#162035]"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="p-4 font-mono text-xs max-h-72 overflow-y-auto space-y-2 select-text">
          {logs.length === 0 ? (
            <div className="py-6 text-center text-gray-600">
              <p>Ready. Select wallets and click "Start Automated Tasks" to begin.</p>
            </div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="leading-relaxed">
                <span className="text-gray-500 mr-2">[{log.timestamp}]</span>
                {log.type === 'step' && <span className="text-cyan-400 font-bold whitespace-pre-line">{log.message}</span>}
                {log.type === 'info' && <span className="text-gray-300">{log.message}</span>}
                {log.type === 'success' && <span className="text-emerald-400 font-medium">{log.message}</span>}
                {log.type === 'warning' && <span className="text-amber-400 font-medium">{log.message}</span>}
                {log.type === 'error' && <span className="text-red-400 font-medium">{log.message}</span>}
              </div>
            ))
          )}
          <div ref={terminalEndRef} />
        </div>
      </div>
    </div>
  );
};