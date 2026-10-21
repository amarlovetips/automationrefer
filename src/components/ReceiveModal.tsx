import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, ExternalLink, X, QrCode } from 'lucide-react';
import { ChainConfig, WalletItem } from '../types';

interface ReceiveModalProps {
  wallet: WalletItem | null;
  chain: ChainConfig;
  isOpen: boolean;
  onClose: () => void;
}

export const ReceiveModal: React.FC<ReceiveModalProps> = ({ wallet, chain, isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !wallet) return null;

  // Standard EVM 0x address
  const currentAddress = wallet.address;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const explorerUrl = `${chain.explorerUrl}/address/${wallet.address}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-[#0F1626] border border-[#202D49] rounded-2xl p-6 shadow-2xl text-white">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#202D49]">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">{wallet.name}</h3>
              <p className="text-xs text-gray-400">0x EVM Address on {chain.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* QR Code */}
        <div className="my-6 flex flex-col items-center">
          <div className="p-4 bg-white rounded-2xl shadow-lg border border-gray-100">
            <QRCodeSVG
              value={currentAddress}
              size={190}
              level="H"
              includeMargin={false}
            />
          </div>
          <p className="mt-3 text-xs text-gray-400">Scan QR Code to deposit funds</p>
        </div>

        {/* Address Box */}
        <div className="p-3 bg-[#080B13] border border-[#202D49] rounded-xl flex items-center justify-between gap-2">
          <span className="font-mono text-xs text-emerald-400 break-all select-all font-medium">
            {currentAddress}
          </span>
          <button
            onClick={handleCopy}
            className="flex-shrink-0 p-2 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white rounded-lg transition-all"
            title="Copy 0x EVM address"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        {/* Explorer Link */}
        <div className="mt-4 flex items-center justify-between text-xs text-gray-400">
          <span>Asset: {chain.symbol}</span>
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
          >
            View on Explorer <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
};
