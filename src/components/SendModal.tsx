import React, { useState, useEffect } from 'react';
import { Send, X, AlertCircle, CheckCircle2, Loader2, ExternalLink } from 'lucide-react';
import { ChainConfig, WalletItem } from '../types';
import { toEthAddress } from '../services/cryptoService';
import { calculateMaxTransferable, sendNativeTransfer } from '../services/chainService';

interface SendModalProps {
  senderWallet: WalletItem | null;
  allWallets: WalletItem[];
  chain: ChainConfig;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const SendModal: React.FC<SendModalProps> = ({
  senderWallet,
  allWallets,
  chain,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [maxAvailable, setMaxAvailable] = useState<string>('0');

  useEffect(() => {
    if (isOpen && senderWallet) {
      setRecipient('');
      setAmount('');
      setError(null);
      setTxHash(null);
      calculateMaxTransferable(senderWallet.address, chain, '0.001')
        .then((res) => setMaxAvailable(res.maxEther))
        .catch(() => setMaxAvailable('0'));
    }
  }, [isOpen, senderWallet, chain]);

  if (!isOpen || !senderWallet) return null;

  const handleSetMax = () => {
    const num = parseFloat(maxAvailable);
    if (num > 0) {
      setAmount(num < 0.0001 ? num.toFixed(6) : num.toFixed(4));
    } else {
      // Fallback: balance minus minimal fee (0.0005)
      const curBal = parseFloat(senderWallet.balance);
      const estMax = Math.max(0, curBal - 0.0005);
      if (estMax > 0) {
        setAmount(estMax.toFixed(4));
      }
    }
  };

  const handlePercentage = (pct: number) => {
    const num = parseFloat(senderWallet.balance) * (pct / 100);
    if (num > 0) {
      setAmount(num.toFixed(4));
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setTxHash(null);

    const cleanRecipient = toEthAddress(recipient.trim());
    if (!cleanRecipient || cleanRecipient.length !== 42 || !cleanRecipient.startsWith('0x')) {
      setError('Please enter a valid EVM (0x...) or Ronin (ronin:...) address.');
      return;
    }

    const sendAmt = parseFloat(amount);
    if (isNaN(sendAmt) || sendAmt <= 0) {
      setError('Please enter a valid amount to send.');
      return;
    }

    if (sendAmt > parseFloat(senderWallet.balance)) {
      setError(`Amount exceeds current wallet balance (${senderWallet.balance} ${chain.symbol}).`);
      return;
    }

    setIsSubmitting(true);
    try {
      const receipt = await sendNativeTransfer(
        senderWallet.privateKey,
        cleanRecipient,
        amount,
        chain
      );
      setTxHash(receipt.hash);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Transaction failed to broadcast.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Other derived wallets for quick select
  const otherWallets = allWallets.filter((w) => w.id !== senderWallet.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-[#0F1626] border border-[#202D49] rounded-2xl p-6 shadow-2xl text-white">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#202D49]">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Send {chain.symbol}</h3>
              <p className="text-xs text-gray-400">From {senderWallet.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {txHash ? (
          <div className="py-6 text-center space-y-4">
            <div className="w-14 h-14 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-emerald-400">Transaction Confirmed!</h4>
              <p className="text-xs text-gray-400 mt-1">
                Transferred {amount} {chain.symbol} successfully
              </p>
            </div>

            <div className="p-3 bg-[#080B13] border border-[#202D49] rounded-xl font-mono text-xs break-all text-gray-300">
              Tx: {txHash}
            </div>

            <div className="flex justify-center gap-3 pt-2">
              <a
                href={`${chain.explorerUrl}/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-medium text-white transition-all"
              >
                View on Explorer <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs font-medium text-gray-300 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSend} className="space-y-4 mt-4">
            {/* Sender Balance Pill */}
            <div className="p-3 bg-[#080B13] border border-[#202D49] rounded-xl flex items-center justify-between text-xs">
              <span className="text-gray-400">Available Balance:</span>
              <span className="font-mono font-semibold text-emerald-400">
                {senderWallet.balance} {chain.symbol}
              </span>
            </div>

            {/* Recipient Input */}
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">
                Recipient Address (0x EVM Address)
              </label>
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="0x..."
                className="w-full px-3.5 py-2.5 bg-[#080B13] border border-[#202D49] rounded-xl text-xs font-mono text-white focus:outline-none focus:border-blue-500 placeholder-gray-600"
              />

              {/* Quick Select another derived wallet */}
              {otherWallets.length > 0 && (
                <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-gray-500">Quick fill:</span>
                  {otherWallets.slice(0, 3).map((w) => (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => setRecipient(w.address)}
                      className="px-2 py-0.5 bg-[#162035] hover:bg-blue-900/40 text-[10px] rounded text-blue-300 border border-blue-900/30 transition-all"
                    >
                      {w.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Amount Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-gray-300">
                  Amount ({chain.symbol})
                </label>
                <div className="flex gap-1">
                  {[25, 50, 75].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => handlePercentage(pct)}
                      className="px-2 py-0.5 bg-gray-800 hover:bg-gray-700 text-[10px] rounded text-gray-300"
                    >
                      {pct}%
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={handleSetMax}
                    className="px-2 py-0.5 bg-blue-600/30 hover:bg-blue-600 text-blue-300 hover:text-white text-[10px] rounded font-semibold transition-colors"
                  >
                    MAX (Auto-gas)
                  </button>
                </div>
              </div>
              <input
                type="number"
                step="0.0001"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.0"
                className="w-full px-3.5 py-2.5 bg-[#080B13] border border-[#202D49] rounded-xl text-xs font-mono text-white focus:outline-none focus:border-blue-500 placeholder-gray-600"
              />
            </div>

            {/* Fee Note */}
            <div className="text-[11px] text-gray-400 bg-blue-950/20 border border-blue-900/30 rounded-lg p-2.5">
              Ronin network gas fee is ~0.0004 RON (21,000 gas units @ 20 Gwei).
            </div>

            {error && (
              <div className="p-3 bg-red-950/30 border border-red-900/50 rounded-xl flex items-start gap-2 text-xs text-red-300">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 rounded-xl text-xs font-medium text-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-xl text-xs font-medium text-white transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending on Ronin...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Confirm Send
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
