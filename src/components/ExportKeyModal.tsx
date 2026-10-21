import React, { useState } from 'react';
import { Key, Copy, Check, Eye, EyeOff, AlertTriangle, X } from 'lucide-react';
import { WalletItem } from '../types';

interface ExportKeyModalProps {
  wallet: WalletItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ExportKeyModal: React.FC<ExportKeyModalProps> = ({ wallet, isOpen, onClose }) => {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen || !wallet) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(wallet.privateKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-[#0F1626] border border-[#202D49] rounded-2xl p-6 shadow-2xl text-white">
        <div className="flex items-center justify-between pb-4 border-b border-[#202D49]">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base">Export Private Key</h3>
              <p className="text-xs text-gray-400">{wallet.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 p-3 bg-red-950/20 border border-red-900/40 rounded-xl flex items-start gap-2.5 text-xs text-red-300">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>
            Anyone with this private key can steal your funds. Never share it with anyone.
          </span>
        </div>

        <div className="mt-4">
          <label className="block text-xs font-medium text-gray-300 mb-1.5">
            Private Key (ECDSA Secp256k1)
          </label>
          <div className="relative p-3 bg-[#080B13] border border-[#202D49] rounded-xl font-mono text-xs text-gray-200 break-all select-all">
            {revealed ? wallet.privateKey : '•'.repeat(64)}
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => setRevealed(!revealed)}
            className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 text-xs rounded-xl flex items-center justify-center gap-1.5 text-gray-300 transition-colors"
          >
            {revealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {revealed ? 'Hide Key' : 'Reveal Key'}
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-xs rounded-xl flex items-center justify-center gap-1.5 text-white transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy Key'}
          </button>
        </div>
      </div>
    </div>
  );
};
