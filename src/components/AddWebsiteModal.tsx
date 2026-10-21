import React, { useState } from 'react';
import { Globe, X, PlusCircle, AlertCircle } from 'lucide-react';
import { ChainConfig, WebsiteConfig } from '../types';

interface AddWebsiteModalProps {
  chains: ChainConfig[];
  isOpen: boolean;
  onClose: () => void;
  onAddWebsite: (website: WebsiteConfig) => void;
}

export const AddWebsiteModal: React.FC<AddWebsiteModalProps> = ({
  chains,
  isOpen,
  onClose,
  onAddWebsite
}) => {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [referralLink, setReferralLink] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [chainId, setChainId] = useState<number>(chains[0]?.chainId || 2020);
  const [contractAddress, setContractAddress] = useState('');
  const [calldata, setCalldata] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !referralLink.trim()) {
      setError('Please provide at least a website name and your referral link.');
      return;
    }

    const newWebsite: WebsiteConfig = {
      id: `custom-${Date.now()}`,
      name: name.trim(),
      url: url.trim() || referralLink.trim(),
      referralLink: referralLink.trim(),
      referralCode: referralCode.trim(),
      chainId,
      contractAddress: contractAddress.trim(),
      calldata: calldata.trim(),
      badge: 'CUSTOM',
      description: description.trim() || 'Custom auto daily task target',
      icon: '🌐',
      enabled: true
    };

    onAddWebsite(newWebsite);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-[#0F1626] border border-[#202D49] rounded-2xl p-6 shadow-2xl text-white">
        <div className="flex items-center justify-between pb-4 border-b border-[#202D49]">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Add New Website / Campaign</h3>
              <p className="text-xs text-gray-400">Expand Refer Check with more airdrop & daily quest sites</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 max-h-[75vh] overflow-y-auto pr-1">
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Website Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Pixel Quests, Cyber Daily"
              className="w-full px-3.5 py-2 bg-[#080B13] border border-[#202D49] rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Your Referral Link *</label>
            <input
              type="url"
              value={referralLink}
              onChange={(e) => setReferralLink(e.target.value)}
              placeholder="https://quests.example.xyz/r/YOUR_CODE"
              className="w-full px-3.5 py-2 bg-[#080B13] border border-[#202D49] rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Referral Code</label>
              <input
                type="text"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value)}
                placeholder="e.g. WNUGJZTA"
                className="w-full px-3.5 py-2 bg-[#080B13] border border-[#202D49] rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Network Chain</label>
              <select
                value={chainId}
                onChange={(e) => setChainId(Number(e.target.value))}
                className="w-full px-3 py-2 bg-[#080B13] border border-[#202D49] rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
              >
                {chains.map((c) => (
                  <option key={c.chainId} value={c.chainId}>
                    {c.name} ({c.symbol})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">
              Check-in Smart Contract (Optional)
            </label>
            <input
              type="text"
              value={contractAddress}
              onChange={(e) => setContractAddress(e.target.value)}
              placeholder="0x..."
              className="w-full px-3.5 py-2 bg-[#080B13] border border-[#202D49] rounded-xl text-xs font-mono text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">
              Check-in Calldata (Optional)
            </label>
            <input
              type="text"
              value={calldata}
              onChange={(e) => setCalldata(e.target.value)}
              placeholder="0x183ff085..."
              className="w-full px-3.5 py-2 bg-[#080B13] border border-[#202D49] rounded-xl text-xs font-mono text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short notes or description about this quest system..."
              className="w-full px-3.5 py-2 bg-[#080B13] border border-[#202D49] rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-950/30 border border-red-900/50 rounded-xl flex items-center gap-2 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 rounded-xl text-xs font-medium text-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-medium text-white transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20"
            >
              <PlusCircle className="w-4 h-4" />
              Save Website
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
