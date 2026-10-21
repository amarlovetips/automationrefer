import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Square,
  Repeat,
  Zap,
  Terminal,
  ExternalLink,
  Layers,
  Copy,
  Check,
  RefreshCw,
  Sliders,
  Edit3,
  RotateCcw,
  Save,
  Link as LinkIcon
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ChainConfig, CheckinLog, RelayRunConfig, WalletItem, WebsiteConfig } from '../types';
import { DaisyChainRunner, RelayStepUpdate } from '../services/daisyChainEngine';

interface DailyCheckinSectionProps {
  activeWebsite: WebsiteConfig;
  wallets: WalletItem[];
  chain: ChainConfig;
  onRefreshBalances: () => void;
  onUpdateWalletStatus: (update: RelayStepUpdate) => void;
  onSaveCustomReferral: (code: string, link: string) => void;
  onResetDefaultReferral: () => void;
  isCustomReferral: boolean;
}

export const DailyCheckinSection: React.FC<DailyCheckinSectionProps> = ({
  activeWebsite,
  wallets,
  chain,
  onRefreshBalances,
  onUpdateWalletStatus,
  onSaveCustomReferral,
  onResetDefaultReferral,
  isCustomReferral
}) => {
  // Wallet selection for relay
  const [selectedWalletIds, setSelectedWalletIds] = useState<string[]>(() => wallets.map((w) => w.id));
  // Range selection state
  const [rangeStart, setRangeStart] = useState<number>(1);
  const [rangeEnd, setRangeEnd] = useState<number>(wallets.length);
  const [rangeError, setRangeError] = useState<string>('');
  const [reserveFee, setReserveFee] = useState<string>('0.003');
  const [autoAttachRef, setAutoAttachRef] = useState<boolean>(true);
  const [autoTransferNext, setAutoTransferNext] = useState<boolean>(true);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [logs, setLogs] = useState<CheckinLog[]>([]);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [copiedLog, setCopiedLog] = useState<boolean>(false);

  // Referral editing state
  const [isEditingReferral, setIsEditingReferral] = useState<boolean>(false);
  const [referralInput, setReferralInput] = useState<string>(activeWebsite.referralLink || activeWebsite.referralCode);
  const [savedToast, setSavedToast] = useState<boolean>(false);

  const runnerRef = useRef<DaisyChainRunner | null>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Sync referral input if website changes
  useEffect(() => {
    setReferralInput(activeWebsite.referralLink || activeWebsite.referralCode);
  }, [activeWebsite.referralLink, activeWebsite.referralCode]);

  // Sync selected wallets when wallets list changes if empty
  useEffect(() => {
    if (selectedWalletIds.length === 0 && wallets.length > 0) {
      setSelectedWalletIds(wallets.map((w) => w.id));
    }
    // Keep rangeEnd in bounds
    setRangeEnd((prev) => Math.min(prev, wallets.length || 1));
  }, [wallets]);

  // Auto scroll terminal
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const selectAll = () => {
    setSelectedWalletIds(wallets.map((w) => w.id));
  };

  const deselectAll = () => {
    setSelectedWalletIds([]);
  };

  const addLog = (logItem: Omit<CheckinLog, 'id' | 'timestamp'>) => {
    const newLog: CheckinLog = {
      ...logItem,
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleTimeString()
    };
    setLogs((prev) => [...prev, newLog]);
  };

  const handleSaveReferral = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = referralInput.trim();
    if (!clean) return;

    let code = clean;
    let link = clean;

    if (clean.includes('/r/')) {
      const parts = clean.split('/r/');
      const codePart = parts[1]?.split(/[?#/]/)[0]?.trim();
      if (codePart) {
        code = codePart;
        link = clean;
      }
    } else if (!clean.startsWith('http')) {
      code = clean.replace(/[^a-zA-Z0-9_-]/g, '');
      link = `https://quests.rrfvillage.xyz/r/${code}`;
    }

    onSaveCustomReferral(code, link);
    setIsEditingReferral(false);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 3000);
  };

  const handleResetReferral = () => {
    onResetDefaultReferral();
    setReferralInput('https://quests.rrfvillage.xyz/r/WNUGJZTA');
    setIsEditingReferral(false);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 3000);
  };

  const handleStartCheckin = async () => {
    if (selectedWalletIds.length === 0) {
      alert('Please select at least one wallet for check-in.');
      return;
    }

    setIsRunning(true);
    runnerRef.current = new DaisyChainRunner();

    const config: RelayRunConfig = {
      reserveTxFee: reserveFee,
      selectedWalletIds,
      autoAttachReferral: autoAttachRef,
      autoTransferNext,
      delayBetweenStepsMs: 2500
    };

    addLog({
      type: 'info',
      message: `Initiating Refer Check sequence on ${chain.name} with referral [${activeWebsite.referralCode}]...`
    });

    const success = await runnerRef.current.runDaisyChain(
      wallets,
      chain,
      config,
      activeWebsite.referralCode,
      addLog,
      onUpdateWalletStatus
    );

    setIsRunning(false);
    runnerRef.current = null;

    if (success) {
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch {}
    }

    // Refresh all balances after completion
    onRefreshBalances();
  };

  const handleCancelCheckin = () => {
    if (runnerRef.current) {
      runnerRef.current.cancel();
      addLog({
        type: 'warning',
        message: 'Sequence cancellation requested. Finishing current block...'
      });
    }
  };

  const handleCopyLogs = () => {
    const text = logs
      .map((l) => `[${l.timestamp}] ${l.type.toUpperCase()}: ${l.message}${l.txHash ? ` (Tx: ${l.txHash})` : ''}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopiedLog(true);
    setTimeout(() => setCopiedLog(false), 2000);
  };

  // Selected wallets ordered
  const orderedSelected = selectedWalletIds
    .map((id) => wallets.find((w) => w.id === id))
    .filter((w): w is WalletItem => !!w);

  return (
    <div className="space-y-6">
      {/* Top Banner: Active Website & Refer Link */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-[#111D42] to-[#0A142F] border border-ronin-border/80 shadow-xl relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-44 h-44 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">{activeWebsite.icon || '🌾'}</span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-white">{activeWebsite.name}</h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {activeWebsite.badge}
                  </span>
                  {isCustomReferral ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      CUSTOM REFERRAL
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      DEFAULT REFERRAL
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{activeWebsite.description}</p>
              </div>
            </div>

            {/* Referral Info & Edit Trigger */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              <span className="text-gray-400">Active Referral Code:</span>
              <span className="px-2.5 py-1 rounded-lg bg-blue-500/20 text-blue-300 font-mono font-bold border border-blue-500/30 flex items-center gap-1">
                {activeWebsite.referralCode}
              </span>

              <button
                type="button"
                onClick={() => setIsEditingReferral(!isEditingReferral)}
                className="px-2.5 py-1 bg-[#162035] hover:bg-[#202D49] text-blue-300 hover:text-white border border-[#202D49] rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all"
                title="Change or set custom referral link"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{isEditingReferral ? 'Hide Form' : 'Change Refer Link'}</span>
              </button>

              {isCustomReferral && (
                <button
                  type="button"
                  onClick={handleResetReferral}
                  className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg text-xs font-medium flex items-center gap-1 transition-all"
                  title="Reset to default WNUGJZTA link"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Default</span>
                </button>
              )}

              <span className="text-gray-500">•</span>
              <a
                href={activeWebsite.referralLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium transition-colors"
              >
                Open Refer Link <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {savedToast && (
              <div className="text-[11px] text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-3 py-1 rounded-lg inline-flex items-center gap-1 animate-fade-in">
                <Check className="w-3.5 h-3.5" /> Referral link saved successfully!
              </div>
            )}
          </div>

          {/* Quick Stats or Chain Contract Pill */}
          <div className="flex lg:flex-col items-center lg:items-end justify-between gap-2 border-t lg:border-t-0 border-[#202D49] pt-3 lg:pt-0">
            <div className="text-right">
              <span className="text-[11px] text-gray-400 block">Check-in Contract (Ronin)</span>
              <span className="font-mono text-xs text-gray-300">
                {activeWebsite.contractAddress ? `${activeWebsite.contractAddress.slice(0, 10)}...${activeWebsite.contractAddress.slice(-8)}` : 'On-chain'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold bg-emerald-950/40 px-3 py-1 rounded-lg border border-emerald-900/40">
              <Zap className="w-3.5 h-3.5" /> 0 RON Protocol Fee
            </div>
          </div>
        </div>

        {/* Inline Referral Editor (Shown when user clicks 'Change Refer Link') */}
        {isEditingReferral && (
          <form
            onSubmit={handleSaveReferral}
            className="mt-4 pt-4 border-t border-[#202D49] grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center animate-fade-in text-xs"
          >
            <div className="sm:col-span-8">
              <label className="block text-[11px] text-gray-400 mb-1">
                Paste Any Referral Link or Code (e.g. https://quests.rrfvillage.xyz/r/YOUR_CODE or YOUR_CODE)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={referralInput}
                  onChange={(e) => setReferralInput(e.target.value)}
                  placeholder="https://quests.rrfvillage.xyz/r/WNUGJZTA"
                  className="w-full pl-8 pr-3 py-2 bg-[#080B13] border border-[#202D49] rounded-xl text-xs text-white font-mono focus:outline-none focus:border-blue-500 placeholder-gray-600"
                />
                <LinkIcon className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-3" />
              </div>
            </div>

            <div className="sm:col-span-4 flex items-end gap-2 pt-2 sm:pt-4">
              <button
                type="submit"
                className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-1.5 shadow-md shadow-blue-900/20"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Referral</span>
              </button>

              <button
                type="button"
                onClick={handleResetReferral}
                className="py-2 px-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl transition-all"
                title="Reset to default link"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Main Daisy-Chain Relay Automation Control Panel */}
      <div className="p-6 rounded-2xl bg-[#0F1626] border border-[#202D49] shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#202D49]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-400">
              <Repeat className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                Daisy-Chain Daily Check-in Engine
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-500/20 text-blue-400 font-semibold">
                  Relay Mode
                </span>
              </h3>
              <p className="text-xs text-gray-400">
                Runs daily check-in on first wallet, auto-transfers max RON to next wallet, confirms on Ronin, and repeats!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-all ${
                showSettings
                  ? 'bg-blue-600 text-white border-blue-500'
                  : 'bg-[#080B13] text-gray-300 border-[#202D49] hover:text-white'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>Relay Config</span>
            </button>
            <button
              onClick={onRefreshBalances}
              className="p-2 bg-[#080B13] hover:bg-[#162035] text-gray-300 hover:text-white border border-[#202D49] rounded-xl text-xs transition-colors"
              title="Refresh balances"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Collapsible Settings */}
        {showSettings && (
          <div className="p-4 bg-[#080B13] border border-[#202D49] rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in text-xs">
            <div>
              <label className="block font-medium text-gray-300 mb-1">
                Reserve Gas Fee ({chain.symbol})
              </label>
              <input
                type="number"
                step="0.001"
                value={reserveFee}
                onChange={(e) => setReserveFee(e.target.value)}
                placeholder="0.003"
                className="w-full px-3 py-2 bg-[#162035] border border-[#202D49] rounded-lg text-white font-mono focus:outline-none focus:border-blue-500"
              />
              <p className="text-[11px] text-gray-500 mt-1">
                Amount kept in each wallet to guarantee safe future transactions without gas starvation.
              </p>
            </div>

            <div>
              <label className="block font-medium text-gray-300 mb-1">Referral Attachment</label>
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  id="attachRef"
                  checked={autoAttachRef}
                  onChange={(e) => setAutoAttachRef(e.target.checked)}
                  className="w-4 h-4 rounded border-[#202D49] text-blue-600 focus:ring-0 bg-[#162035] cursor-pointer"
                />
                <label htmlFor="attachRef" className="text-gray-300 cursor-pointer">
                  Auto-bind active refer code (<b className="text-blue-400">{activeWebsite.referralCode}</b>)
                </label>
              </div>
              <p className="text-[11px] text-gray-500 mt-1">
                Automatically links all derived smart wallets to this code upon first SIWE sign-in.
              </p>
            </div>
          </div>
        )}

        {/* Quick Relay Mode Toggle Switch */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-[#080B13] border border-[#202D49] rounded-xl text-xs">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg ${autoTransferNext ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-800 text-gray-400'}`}>
              <Repeat className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white">Auto-Transfer Max Fee to Next Wallet</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  autoTransferNext
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}>
                  {autoTransferNext ? 'ON (Relay Chain Mode)' : 'OFF (Independent Check-in)'}
                </span>
              </div>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {autoTransferNext
                  ? `ON: Checks in wallet, keeps gas reserve (${reserveFee} ${chain.symbol}), then transfers max remaining to next wallet.`
                  : `OFF: Checks in each wallet independently using its own balance without transferring funds to next wallet.`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setAutoTransferNext(!autoTransferNext)}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              autoTransferNext ? 'bg-blue-600' : 'bg-gray-700'
            }`}
            title="Toggle Auto Transfer to Next Wallet"
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                autoTransferNext ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Wallet Selection & Chain Relay Path preview */}
        <div className="space-y-3">
          {/* Range Selector Row */}
          <div className="flex flex-wrap items-center gap-2 p-3 bg-[#080B13] border border-[#202D49] rounded-xl text-xs">
            <span className="text-gray-400 font-medium flex-shrink-0">Wallet Range:</span>
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
                  if (wallets.length === 0) { setRangeError('No wallets loaded.'); return; }
                  const s = Math.max(1, rangeStart);
                  const e = Math.min(wallets.length, rangeEnd);
                  if (s > e) { setRangeError('Start must be ≤ End'); return; }
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
            {rangeError && (
              <span className="text-red-400 font-medium ml-1">{rangeError}</span>
            )}
            {!rangeError && selectedWalletIds.length > 0 && (
              <span className="text-emerald-400 ml-1">
                ✓ {selectedWalletIds.length} wallet(s) selected
              </span>
            )}
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-gray-300 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-blue-400" />
              Relay Order ({selectedWalletIds.length}/{wallets.length})
            </span>
            <div className="flex gap-2">
              <button
                onClick={selectAll}
                className="text-blue-400 hover:text-blue-300 font-medium"
              >
                Select All
              </button>
              <span className="text-gray-600">•</span>
              <button
                onClick={deselectAll}
                className="text-gray-400 hover:text-gray-300 font-medium"
              >
                Deselect All
              </button>
            </div>
          </div>

          {/* Relay Path Flow Preview */}
          <div className="p-3 bg-[#080B13] border border-[#202D49] rounded-xl flex items-center gap-2 overflow-x-auto text-xs py-2.5">
            <span className="text-gray-400 font-medium flex-shrink-0">Relay Path:</span>
            {orderedSelected.length === 0 ? (
              <span className="text-gray-500 italic">No wallets selected</span>
            ) : (
              orderedSelected.map((w, idx) => (
                <React.Fragment key={w.id}>
                  <div
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-mono font-medium flex-shrink-0 ${
                      idx === 0
                        ? 'bg-blue-900/30 border-blue-700 text-blue-300'
                        : 'bg-[#162035] border-[#202D49] text-gray-300'
                    }`}
                  >
                    <span>#{w.index + 1}</span>
                    <span className="text-emerald-400">{w.balance} {chain.symbol}</span>
                  </div>
                  {idx < orderedSelected.length - 1 && (
                    <span className="text-blue-400 font-bold flex-shrink-0">➔</span>
                  )}
                </React.Fragment>
              ))
            )}
          </div>
        </div>

        {/* Action Button Row */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          {!isRunning ? (
            <button
              onClick={handleStartCheckin}
              disabled={selectedWalletIds.length === 0}
              className="flex-1 py-3.5 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-bold text-white text-sm shadow-lg shadow-blue-900/30 transition-all flex items-center justify-center gap-2 transform active:scale-[0.99]"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>Start Auto Daily Check ({selectedWalletIds.length} Wallets)</span>
            </button>
          ) : (
            <button
              onClick={handleCancelCheckin}
              className="flex-1 py-3.5 px-6 bg-red-600 hover:bg-red-500 rounded-xl font-bold text-white text-sm shadow-lg shadow-red-900/30 transition-all flex items-center justify-center gap-2"
            >
              <Square className="w-5 h-5 fill-current" />
              <span>Stop Sequence</span>
            </button>
          )}
        </div>
      </div>

      {/* Live Terminal / Execution Console */}
      <div className="rounded-2xl bg-[#080B13] border border-[#202D49] overflow-hidden shadow-2xl">
        <div className="px-4 py-3 bg-[#0F1626] border-b border-[#202D49] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span className="font-mono text-xs font-semibold text-gray-200">
              Execution Logs & Blockchain Confirmations
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
              title="Copy all logs"
            >
              {copiedLog ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">Copy Logs</span>
            </button>
            <button
              onClick={() => setLogs([])}
              className="text-xs text-gray-500 hover:text-gray-300 px-2 py-1 rounded hover:bg-[#162035] transition-colors"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Terminal Body */}
        <div className="p-4 font-mono text-xs max-h-80 overflow-y-auto space-y-2 select-text">
          {logs.length === 0 ? (
            <div className="py-8 text-center text-gray-600">
              <p>Ready to execute. Select wallets and click "Start Auto Daily Check" to begin.</p>
              <p className="text-[11px] mt-1 text-gray-700">
                All signatures and transactions happen client-side through Ronin RPC.
              </p>
            </div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="leading-relaxed">
                <span className="text-gray-500 mr-2">[{log.timestamp}]</span>
                {log.type === 'step' && (
                  <span className="text-cyan-400 font-bold whitespace-pre-line">{log.message}</span>
                )}
                {log.type === 'info' && (
                  <span className="text-gray-300">{log.message}</span>
                )}
                {log.type === 'success' && (
                  <span className="text-emerald-400 font-medium">{log.message}</span>
                )}
                {log.type === 'warning' && (
                  <span className="text-amber-400 font-medium">{log.message}</span>
                )}
                {log.type === 'error' && (
                  <span className="text-red-400 font-medium">{log.message}</span>
                )}
                {log.type === 'tx' && (
                  <div className="inline">
                    <span className="text-blue-400 font-medium">{log.message}</span>
                    {log.txHash && (
                      <a
                        href={`${chain.explorerUrl}/tx/${log.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 text-blue-300 underline hover:text-blue-200 inline-flex items-center gap-0.5"
                      >
                        view tx <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={terminalEndRef} />
        </div>
      </div>
    </div>
  );
};
