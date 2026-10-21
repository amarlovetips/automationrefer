import React from 'react';
import { Shield, ChevronDown, Plus, Globe, CheckCircle2, Flame, RefreshCw } from 'lucide-react';
import { ChainConfig, WebsiteConfig } from '../types';

interface NavbarProps {
  chains: ChainConfig[];
  activeChain: ChainConfig;
  onSelectChain: (chain: ChainConfig) => void;
  websites: WebsiteConfig[];
  activeWebsite: WebsiteConfig;
  onSelectWebsite: (website: WebsiteConfig) => void;
  onOpenAddWebsite: () => void;
  onOpenVault: () => void;
  totalWallets: number;
  totalBalance: string;
  onRefreshBalances: () => void;
  isRefreshing: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  chains,
  activeChain,
  onSelectChain,
  websites,
  activeWebsite,
  onSelectWebsite,
  onOpenAddWebsite,
  onOpenVault,
  totalWallets,
  totalBalance,
  onRefreshBalances,
  isRefreshing
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#080B13]/90 backdrop-blur-md border-b border-[#202D49]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white font-black text-lg">
            ⚡
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-gray-100 to-gray-400 bg-clip-text text-transparent">
                Refer Check
              </span>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">
                v1.0
              </span>
            </div>
            <p className="text-[10px] text-gray-500 hidden sm:block">
              Auto Daily Check-in & Referral Relay System
            </p>
          </div>
        </div>

        {/* Center / Right controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Target Website Menu Dropdown */}
          <div className="relative group">
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0F1626] border border-[#202D49] hover:border-gray-600 text-xs text-white transition-all">
              <span className="text-base">{activeWebsite.icon || '🌾'}</span>
              <span className="font-medium hidden md:inline truncate max-w-[120px]">
                {activeWebsite.name}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </button>

            <div className="absolute right-0 mt-1 w-60 rounded-xl bg-[#0F1626] border border-[#202D49] shadow-2xl py-1 hidden group-hover:block z-50 animate-fade-in">
              <div className="px-3 py-1.5 text-[11px] font-semibold text-gray-400 border-b border-[#202D49]">
                Target Websites & Quests
              </div>
              {websites.map((web) => (
                <button
                  key={web.id}
                  onClick={() => onSelectWebsite(web)}
                  className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-[#162035] transition-colors ${
                    activeWebsite.id === web.id ? 'text-blue-400 font-semibold' : 'text-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span>{web.icon || '🌐'}</span>
                    <span className="truncate">{web.name}</span>
                  </div>
                  {activeWebsite.id === web.id && <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />}
                </button>
              ))}
              <div className="border-t border-[#202D49] mt-1 pt-1">
                <button
                  onClick={onOpenAddWebsite}
                  className="w-full px-3 py-2 text-left text-xs flex items-center gap-2 text-blue-400 hover:bg-[#162035] transition-colors font-medium"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add New Website</span>
                </button>
              </div>
            </div>
          </div>

          {/* Chain Selector */}
          <div className="relative group">
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0F1626] border border-[#202D49] hover:border-gray-600 text-xs text-white transition-all">
              <span className="text-base">{activeChain.logo}</span>
              <span className="font-medium hidden lg:inline">{activeChain.name}</span>
              <span className="font-medium lg:hidden">{activeChain.symbol}</span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </button>

            <div className="absolute right-0 mt-1 w-52 rounded-xl bg-[#0F1626] border border-[#202D49] shadow-2xl py-1 hidden group-hover:block z-50 animate-fade-in">
              <div className="px-3 py-1.5 text-[11px] font-semibold text-gray-400 border-b border-[#202D49]">
                Active EVM Chain
              </div>
              {chains.map((c) => (
                <button
                  key={c.id}
                  onClick={() => onSelectChain(c)}
                  className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-[#162035] transition-colors ${
                    activeChain.id === c.id ? 'text-blue-400 font-semibold' : 'text-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>{c.logo}</span>
                    <span>{c.name}</span>
                  </div>
                  {activeChain.id === c.id && <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />}
                </button>
              ))}
            </div>
          </div>

          {/* Refresh Balances Button */}
          <button
            onClick={onRefreshBalances}
            disabled={isRefreshing}
            className="p-2 rounded-xl bg-[#0F1626] border border-[#202D49] hover:border-gray-600 text-gray-400 hover:text-white transition-all"
            title="Refresh All Balances"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
          </button>

          {/* Vault Key Status / Button */}
          <button
            onClick={onOpenVault}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-xs font-semibold text-white shadow-md shadow-blue-900/20 transition-all"
          >
            <Shield className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Phrase Vault</span>
            <span className="px-1.5 py-0.2 bg-black/30 rounded text-[10px]">{totalWallets}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
