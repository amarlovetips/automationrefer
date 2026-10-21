import React, { useState } from 'react';
import { Shield, AlertTriangle, Copy, Check, X, RefreshCw, Key, Trash2, ArrowRight } from 'lucide-react';
import { generateNewMnemonic, isValidMnemonic, isValidPrivateKey } from '../services/cryptoService';

interface VaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveMnemonic: (phrase: string, initialCount?: number) => void;
  onSavePrivateKey: (key: string) => void;
  onWipeVault: () => void;
  hasExistingVault: boolean;
  activeType?: 'mnemonic' | 'private_key' | null;
  firstWalletAddress?: string;
}

export const VaultModal: React.FC<VaultModalProps> = ({
  isOpen,
  onClose,
  onSaveMnemonic,
  onSavePrivateKey,
  onWipeVault,
  hasExistingVault,
  activeType,
  firstWalletAddress
}) => {
  const [tab, setTab] = useState<'import' | 'create'>('import');
  const [generatedPhrase, setGeneratedPhrase] = useState(() => generateNewMnemonic());
  const [importInput, setImportInput] = useState('');
  const [initialWalletsCount, setInitialWalletsCount] = useState<string>('5');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRegenerate = () => {
    setGeneratedPhrase(generateNewMnemonic());
    setCopied(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedPhrase);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreateSubmit = () => {
    if (!isValidMnemonic(generatedPhrase)) {
      setError('Invalid phrase generated');
      return;
    }
    const count = parseInt(initialWalletsCount, 10) || 5;
    onSaveMnemonic(generatedPhrase, count);
  };

  const handleImportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const clean = importInput.trim();

    if (!clean) {
      setError('Please paste a secret phrase (12/24 words) or an EVM private key.');
      return;
    }

    const count = parseInt(initialWalletsCount, 10) || 5;

    // Check if it is a 12 or 24 word mnemonic
    const words = clean.split(/\s+/).join(' ');
    if (isValidMnemonic(words)) {
      onSaveMnemonic(words, count);
      return;
    }

    // Check if it is a valid Private Key
    if (isValidPrivateKey(clean)) {
      onSavePrivateKey(clean);
      return;
    }

    setError('Invalid input. Please enter a valid 12/24-word recovery phrase or 64-character private key (0x...).');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-[#0F1626] border border-[#202D49] rounded-2xl p-6 shadow-2xl text-white">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#202D49]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-500/10 rounded-xl text-blue-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">
                {hasExistingVault ? 'Wallet Key Management' : 'Setup Single Wallet Vault'}
              </h3>
              <p className="text-xs text-gray-400">
                Only 1 active master key/phrase is kept. Importing replaces any previous key.
              </p>
            </div>
          </div>
          {hasExistingVault && (
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Existing Active Vault Banner (if active) */}
        {hasExistingVault && (
          <div className="mt-4 p-3.5 bg-[#080B13] border border-blue-900/40 rounded-xl flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span className="text-xs font-semibold text-white">
                  Current Active: {activeType === 'private_key' ? 'Private Key' : '12-Word Seed Phrase'}
                </span>
              </div>
              {firstWalletAddress && (
                <p className="font-mono text-[11px] text-gray-400 mt-0.5 truncate max-w-[260px]">
                  Addr: {firstWalletAddress}
                </p>
              )}
            </div>
            <button
              onClick={onWipeVault}
              className="px-2.5 py-1.5 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-800/40 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 flex-shrink-0"
              title="Remove this wallet and start fresh"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Remove / Wipe</span>
            </button>
          </div>
        )}

        {/* Tab Selection */}
        <div className="grid grid-cols-2 gap-2 mt-4 p-1 bg-[#080B13] rounded-xl border border-[#202D49]">
          <button
            onClick={() => { setTab('import'); setError(null); }}
            className={`py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              tab === 'import'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>Import Key / Phrase</span>
          </button>
          <button
            onClick={() => { setTab('create'); setError(null); }}
            className={`py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              tab === 'create'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Create New Phrase</span>
          </button>
        </div>

        {tab === 'import' ? (
          <form onSubmit={handleImportSubmit} className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">
                Paste 12/24-Word Recovery Phrase OR Private Key (0x...)
              </label>
              <textarea
                rows={3}
                value={importInput}
                onChange={(e) => setImportInput(e.target.value)}
                placeholder="e.g. apple banana cherry dog elephant... OR 0xabcd1234..."
                className="w-full p-3 bg-[#080B13] border border-[#202D49] rounded-xl text-xs font-mono text-white focus:outline-none focus:border-blue-500 placeholder-gray-600 resize-none"
              />
            </div>

            {/* Initial Wallets Count for Phrase */}
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                Initial Number of Smart Wallets to Derive (for phrase)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={initialWalletsCount}
                  onChange={(e) => setInitialWalletsCount(e.target.value)}
                  className="w-24 px-3 py-1.5 bg-[#080B13] border border-[#202D49] rounded-xl text-xs font-mono font-bold text-white text-center focus:outline-none focus:border-blue-500"
                />
                <span className="text-[11px] text-gray-500">
                  (You can also increase or decrease this anytime later)
                </span>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-950/30 border border-red-900/50 rounded-xl text-xs text-red-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold text-white transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2"
            >
              <span>Import & Activate Wallet</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>Your new 12-word recovery phrase:</span>
              <button
                type="button"
                onClick={handleRegenerate}
                className="flex items-center gap-1 text-blue-400 hover:text-blue-300"
              >
                <RefreshCw className="w-3 h-3" /> Generate Different
              </button>
            </div>

            {/* Mnemonic Grid */}
            <div className="grid grid-cols-3 gap-2 p-3 bg-[#080B13] border border-[#202D49] rounded-xl">
              {generatedPhrase.split(' ').map((word, i) => (
                <div key={i} className="flex items-center gap-1.5 p-2 bg-[#162035]/60 rounded-lg text-xs font-mono">
                  <span className="text-[10px] text-gray-500 w-3">{i + 1}.</span>
                  <span className="font-semibold text-gray-200">{word}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center">
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#162035] hover:bg-[#202D49] text-xs text-blue-300 rounded-lg transition-colors border border-blue-900/30"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied Phrase' : 'Copy Phrase'}
              </button>

              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-gray-400">Wallets to derive:</span>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={initialWalletsCount}
                  onChange={(e) => setInitialWalletsCount(e.target.value)}
                  className="w-14 px-2 py-0.5 bg-[#080B13] border border-[#202D49] rounded text-xs font-mono text-center text-white"
                />
              </div>
            </div>

            <div className="p-3 bg-amber-950/20 border border-amber-800/30 rounded-xl flex items-start gap-2.5 text-xs text-amber-300">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                Creating this phrase will replace any previously loaded wallet. Save your 12 words safely.
              </span>
            </div>

            <button
              onClick={handleCreateSubmit}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold text-white transition-all shadow-lg shadow-blue-900/20"
            >
              I Have Saved It — Activate This Wallet
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
