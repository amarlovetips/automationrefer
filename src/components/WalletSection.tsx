import React, { useState } from 'react';
import {
  Plus,
  Minus,
  Wallet,
  Sparkles,
  RefreshCw,
  Sliders,
  Layers,
  ArrowRight
} from 'lucide-react';
import { ChainConfig, WalletItem } from '../types';
import { WalletCard } from './WalletCard';

interface WalletSectionProps {
  wallets: WalletItem[];
  chain: ChainConfig;
  vaultType?: 'mnemonic' | 'private_key' | null;
  onAddBatch: (count: number) => void;
  onRemoveBatch: (count: number) => void;
  onSetTotalCount: (total: number) => void;
  onAddWallet: () => void;
  onRemoveWallet: (id: string) => void;
  onSend: (wallet: WalletItem) => void;
  onReceive: (wallet: WalletItem) => void;
  onExportKey: (wallet: WalletItem) => void;
  onOpenVault: () => void;
  onRefreshBalances: () => void;
  isRefreshing: boolean;
  totalBalance: string;
}

export const WalletSection: React.FC<WalletSectionProps> = ({
  wallets,
  chain,
  vaultType = 'mnemonic',
  onAddBatch,
  onRemoveBatch,
  onSetTotalCount,
  onAddWallet,
  onRemoveWallet,
  onSend,
  onReceive,
  onExportKey,
  onOpenVault,
  onRefreshBalances,
  isRefreshing,
  totalBalance
}) => {
  const [batchAmount, setBatchAmount] = useState<string>('5');
  const [exactTarget, setExactTarget] = useState<string>(wallets.length.toString());

  const isMnemonic = vaultType === 'mnemonic';

  const handleIncrease = () => {
    const num = parseInt(batchAmount, 10);
    if (!isNaN(num) && num > 0) {
      onAddBatch(num);
    }
  };

  const handleDecrease = () => {
    const num = parseInt(batchAmount, 10);
    if (!isNaN(num) && num > 0) {
      onRemoveBatch(num);
    }
  };

  const handleApplyExact = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(exactTarget, 10);
    if (!isNaN(num) && num >= 1) {
      onSetTotalCount(num);
    }
  };

  return (
    <div className="space-y-5">
      {/* Overview Stat Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Wallets */}
        <div className="p-4 rounded-2xl bg-[#0F1626] border border-[#202D49] flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-400 font-medium">Smart Wallets</span>
            <div className="text-xl font-black text-white mt-0.5">{wallets.length} Derived</div>
            <span className="text-[10px] text-gray-500">
              {isMnemonic ? 'Single BIP-39 Seed Phrase' : 'Single Raw Private Key'}
            </span>
          </div>
          <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl">
            <Wallet className="w-6 h-6" />
          </div>
        </div>

        {/* Total Balance */}
        <div className="p-4 rounded-2xl bg-[#0F1626] border border-[#202D49] flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-400 font-medium">Total Vault Balance</span>
            <div className="text-xl font-black text-emerald-400 mt-0.5 font-mono">
              {totalBalance} {chain.symbol}
            </div>
            <span className="text-[10px] text-gray-500">Network: {chain.name}</span>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
            <Sparkles className="w-6 h-6" />
          </div>
        </div>

        {/* Chain Status */}
        <div className="p-4 rounded-2xl bg-[#0F1626] border border-[#202D49] flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-400 font-medium">Active EVM Chain</span>
            <div className="text-base font-bold text-white mt-0.5 flex items-center gap-1.5">
              <span>{chain.logo}</span>
              <span>{chain.name}</span>
            </div>
            <span className="text-[10px] text-emerald-400">Standard 0x EVM Format</span>
          </div>
          <button
            onClick={onRefreshBalances}
            disabled={isRefreshing}
            className="p-3 bg-[#162035] hover:bg-[#202D49] text-gray-300 hover:text-white rounded-xl border border-[#202D49] transition-all"
            title="Refresh All Balances"
          >
            <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Interactive Batch Wallet Controller (Increasing & Decreasing Controls) */}
      {isMnemonic ? (
        <div className="p-5 rounded-2xl bg-[#0F1626] border border-blue-500/30 shadow-xl space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#202D49]">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-500/10 rounded-xl text-blue-400">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-white flex items-center gap-2">
                  Batch Wallet Generator & Manager
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/20 text-blue-300">
                    Active: {wallets.length} Wallets
                  </span>
                </h4>
                <p className="text-xs text-gray-400">
                  Easily add or decrease multiple smart wallets derived from your single seed phrase.
                </p>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-gray-500 mr-1">Quick Add:</span>
              {[1, 5, 10, 20].map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => onAddBatch(count)}
                  className="px-2.5 py-1 bg-[#162035] hover:bg-blue-600 text-blue-300 hover:text-white rounded-lg text-xs font-mono font-semibold border border-[#202D49] transition-all"
                >
                  +{count}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
            {/* Increasing / Decreasing by Input Amount */}
            <div className="p-3.5 bg-[#080B13] border border-[#202D49] rounded-xl space-y-2.5">
              <span className="font-semibold text-gray-300 block">
                Adjust Wallet Count (Add / Remove by Amount)
              </span>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={batchAmount}
                  onChange={(e) => setBatchAmount(e.target.value)}
                  className="w-24 px-3 py-2 bg-[#162035] border border-[#202D49] rounded-xl text-sm font-bold text-white text-center focus:outline-none focus:border-blue-500 font-mono"
                  placeholder="5"
                />

                {/* Increasing / Plus Button */}
                <button
                  type="button"
                  onClick={handleIncrease}
                  className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 shadow-md shadow-blue-900/30 transition-all active:scale-[0.98]"
                  title={`Add ${batchAmount || 1} more wallets`}
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>Add +{batchAmount || '1'} More</span>
                </button>

                {/* Decreasing / Minus Button */}
                <button
                  type="button"
                  onClick={handleDecrease}
                  disabled={wallets.length <= 1}
                  className="flex-1 py-2 px-3 bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white border border-red-800/40 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
                  title={`Remove ${batchAmount || 1} wallets`}
                >
                  <Minus className="w-4 h-4 stroke-[3]" />
                  <span>Remove -{batchAmount || '1'}</span>
                </button>
              </div>

              <p className="text-[11px] text-gray-500">
                Example: If you have {wallets.length} wallets, entering {batchAmount || '5'} and clicking Add gives {wallets.length + (parseInt(batchAmount, 10) || 5)} wallets.
              </p>
            </div>

            {/* Set Direct Total Count */}
            <form onSubmit={handleApplyExact} className="p-3.5 bg-[#080B13] border border-[#202D49] rounded-xl space-y-2.5">
              <span className="font-semibold text-gray-300 block">
                Set Exact Total Wallets Directly
              </span>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="150"
                  value={exactTarget}
                  onChange={(e) => setExactTarget(e.target.value)}
                  className="w-24 px-3 py-2 bg-[#162035] border border-[#202D49] rounded-xl text-sm font-bold text-white text-center focus:outline-none focus:border-blue-500 font-mono"
                  placeholder="10"
                />

                <button
                  type="submit"
                  className="flex-1 py-2 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-900/30 transition-all active:scale-[0.98]"
                >
                  <span>Set Total to {exactTarget || wallets.length}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <p className="text-[11px] text-gray-500">
                Instantly generates exactly this number of smart wallets from your single phrase.
              </p>
            </form>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-900/30 text-xs text-blue-300 flex items-center justify-between">
          <span>
            Currently active with a single Private Key. To generate multiple smart wallets (#1, #2, #3...), import a 12/24-word Secret Phrase.
          </span>
          <button
            onClick={onOpenVault}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold"
          >
            Switch to Phrase
          </button>
        </div>
      )}

      {/* Header for Wallet Cards List */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            Smart Wallets ({wallets.length})
            <span className="text-xs font-normal text-gray-400">
              (All starting with 0x)
            </span>
          </h3>
          <p className="text-xs text-gray-400">
            Fund Wallet #1 to start the daily check-in sequence or transfer funds between accounts.
          </p>
        </div>

        {isMnemonic && (
          <button
            onClick={onAddWallet}
            className="px-3 py-1.5 bg-[#162035] hover:bg-[#202D49] text-gray-200 hover:text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 border border-[#202D49] transition-all"
          >
            <Plus className="w-3.5 h-3.5 text-blue-400" />
            <span>+1 Wallet</span>
          </button>
        )}
      </div>

      {/* Wallet Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {wallets.map((wallet, idx) => (
          <WalletCard
            key={wallet.id}
            wallet={wallet}
            chain={chain}
            onSend={onSend}
            onReceive={onReceive}
            onExportKey={onExportKey}
            onDelete={onRemoveWallet}
            canDelete={wallets.length > 1 && idx !== 0 && wallet.index !== 0}
          />
        ))}
      </div>
    </div>
  );
};
