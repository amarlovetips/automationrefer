import React, { useState } from 'react';
import { Copy, Check, Send, QrCode, Key, Trash2, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { ChainConfig, WalletItem } from '../types';

interface WalletCardProps {
  wallet: WalletItem;
  chain: ChainConfig;
  onSend: (wallet: WalletItem) => void;
  onReceive: (wallet: WalletItem) => void;
  onExportKey: (wallet: WalletItem) => void;
  onDelete: (walletId: string) => void;
  canDelete: boolean;
  isSelectedForCheckin?: boolean;
  onToggleSelect?: () => void;
}

export const WalletCard: React.FC<WalletCardProps> = ({
  wallet,
  chain,
  onSend,
  onReceive,
  onExportKey,
  onDelete,
  canDelete,
  isSelectedForCheckin,
  onToggleSelect
}) => {
  const [copied, setCopied] = useState(false);

  // Strictly EVM style address starting with 0x
  const displayAddress = wallet.address;
  const shortAddress = `${displayAddress.slice(0, 10)}...${displayAddress.slice(-8)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(displayAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`relative p-4 rounded-2xl bg-[#0F1626] border transition-all duration-200 ${
        isSelectedForCheckin
          ? 'border-blue-500/80 shadow-lg shadow-blue-500/10'
          : 'border-[#202D49] hover:border-gray-700'
      }`}
    >
      {/* Top row: Checkbox, Name, Status Badge */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          {onToggleSelect && (
            <input
              type="checkbox"
              checked={isSelectedForCheckin || false}
              onChange={onToggleSelect}
              className="w-4 h-4 rounded border-[#202D49] text-blue-600 focus:ring-0 focus:ring-offset-0 bg-[#080B13] cursor-pointer"
            />
          )}
          <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-[#162035] text-blue-400 border border-blue-900/40">
            #{wallet.index + 1}
          </span>
          <span className="font-semibold text-sm text-gray-200 truncate max-w-[130px]">
            {wallet.name}
          </span>
        </div>

        {/* Live Status Badge */}
        <div>
          {wallet.status === 'checking' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <Loader2 className="w-3 h-3 animate-spin" /> Checking...
            </span>
          )}
          {wallet.status === 'transferring' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              <Loader2 className="w-3 h-3 animate-spin" /> Relaying funds...
            </span>
          )}
          {wallet.status === 'success' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <CheckCircle2 className="w-3 h-3" /> Done
            </span>
          )}
          {wallet.status === 'error' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-500/20 text-red-300 border border-red-500/30">
              <AlertCircle className="w-3 h-3" /> Error
            </span>
          )}
          {wallet.status === 'idle' && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-800 text-gray-400">
              Ready
            </span>
          )}
        </div>
      </div>

      {/* EVM Address */}
      <div className="mt-2.5 flex items-center justify-between p-2 rounded-xl bg-[#080B13] border border-[#202D49]/60">
        <div className="flex items-center gap-2">
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-950/60 text-blue-400 font-mono font-semibold border border-blue-900/30">
            0x
          </span>
          <span className="font-mono text-xs text-gray-200 select-all" title={displayAddress}>
            {shortAddress}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="p-1 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors"
          title="Copy 0x EVM address"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Balance Row */}
      <div className="mt-3 flex items-baseline justify-between">
        <span className="text-xs text-gray-400">Balance:</span>
        <div className="text-right">
          <span className="font-mono text-lg font-bold text-emerald-400">
            {wallet.balance}
          </span>
          <span className="ml-1 text-xs text-gray-400 font-semibold">{chain.symbol}</span>
        </div>
      </div>

      {/* Streak / Points (if synced) */}
      {(wallet.streak !== undefined || wallet.points !== undefined) && (
        <div className="mt-2 pt-2 border-t border-[#202D49]/40 flex items-center justify-between text-[11px] text-gray-400">
          <span>Streak: <b className="text-amber-400">{wallet.streak || 0}d</b></span>
          <span>Points: <b className="text-blue-400">{wallet.points || 0}</b></span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-3.5 pt-3 border-t border-[#202D49] grid grid-cols-4 gap-1.5">
        <button
          onClick={() => onSend(wallet)}
          className="py-1.5 px-2 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-1 border border-blue-800/30"
          title="Send funds"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Send</span>
        </button>

        <button
          onClick={() => onReceive(wallet)}
          className="py-1.5 px-2 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-1 border border-emerald-800/30"
          title="Receive funds with QR code"
        >
          <QrCode className="w-3.5 h-3.5" />
          <span>QR</span>
        </button>

        <button
          onClick={() => onExportKey(wallet)}
          className="py-1.5 px-2 bg-amber-600/20 hover:bg-amber-600 text-amber-400 hover:text-white rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-1 border border-amber-800/30"
          title="Export private key"
        >
          <Key className="w-3.5 h-3.5" />
          <span>Key</span>
        </button>

        {canDelete ? (
          <button
            onClick={() => onDelete(wallet.id)}
            className="py-1.5 px-2 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-1 border border-red-800/30"
            title="Remove wallet"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Del</span>
          </button>
        ) : (
          <div />
        )}
      </div>
    </div>
  );
};
