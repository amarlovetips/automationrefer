import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Wallet,
  Repeat,
  Globe,
  Key,
  PlusCircle,
  Trash2,
  ExternalLink,
  ShieldAlert,
  ArrowRight,
  CheckSquare
} from 'lucide-react';
import { ChainConfig, WalletItem, WebsiteConfig } from './types';
import { SUPPORTED_CHAINS, DEFAULT_CHAIN } from './constants/chains';
import { DEFAULT_WEBSITES } from './constants/websites';
import {
  clearVault,
  deriveWalletFromMnemonic,
  deriveWalletFromPrivateKey,
  loadVault,
  saveDerivedCount,
  saveVault
} from './services/cryptoService';
import { fetchBalance } from './services/chainService';
import { Navbar } from './components/Navbar';
import { WalletSection } from './components/WalletSection';
import { DailyCheckinSection } from './components/DailyCheckinSection';
import { TasksSection } from './components/TasksSection';
import { VaultModal } from './components/VaultModal';
import { SendModal } from './components/SendModal';
import { ReceiveModal } from './components/ReceiveModal';
import { ExportKeyModal } from './components/ExportKeyModal';
import { AddWebsiteModal } from './components/AddWebsiteModal';
import { RelayStepUpdate } from './services/daisyChainEngine';

export function App() {
  // Navigation tab
  const [activeTab, setActiveTab] = useState<'checkin' | 'tasks' | 'wallets' | 'websites'>('checkin');

  // Vault state (secret and type: 'mnemonic' | 'private_key' | null)
  const [vaultData, setVaultData] = useState<{ secret: string; type: 'mnemonic' | 'private_key'; derivedCount: number } | null>(() => loadVault());
  const [wallets, setWallets] = useState<WalletItem[]>([]);

  // Chains & Websites
  const [chains] = useState<ChainConfig[]>(SUPPORTED_CHAINS);
  const [activeChain, setActiveChain] = useState<ChainConfig>(DEFAULT_CHAIN);

  const [websites, setWebsites] = useState<WebsiteConfig[]>(() => {
    try {
      const saved = localStorage.getItem('refercheck_custom_websites');
      let base = saved ? JSON.parse(saved) : DEFAULT_WEBSITES;
      const customRef = localStorage.getItem('refercheck_referral_rrfvillage');
      if (customRef) {
        const parsed = JSON.parse(customRef);
        base = base.map((w: WebsiteConfig) =>
          w.id === 'rrfvillage' ? { ...w, referralCode: parsed.code, referralLink: parsed.link } : w
        );
      }
      return base;
    } catch {
      return DEFAULT_WEBSITES;
    }
  });
  const [activeWebsite, setActiveWebsite] = useState<WebsiteConfig>(websites[0]);
  const [isCustomReferral, setIsCustomReferral] = useState<boolean>(() => {
    return !!localStorage.getItem('refercheck_referral_rrfvillage');
  });

  const handleSaveCustomReferral = (code: string, link: string) => {
    localStorage.setItem(
      'refercheck_referral_' + activeWebsite.id,
      JSON.stringify({ code, link })
    );
    const updated = { ...activeWebsite, referralCode: code, referralLink: link };
    setActiveWebsite(updated);
    setWebsites((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
    setIsCustomReferral(true);
  };

  const handleResetDefaultReferral = () => {
    localStorage.removeItem('refercheck_referral_' + activeWebsite.id);
    const defaultSite = DEFAULT_WEBSITES.find((w) => w.id === activeWebsite.id) || DEFAULT_WEBSITES[0];
    setActiveWebsite(defaultSite);
    setWebsites((prev) => prev.map((w) => (w.id === defaultSite.id ? defaultSite : w)));
    setIsCustomReferral(false);
  };

  // Modals state
  const [isVaultOpen, setIsVaultOpen] = useState<boolean>(false);
  const [sendWallet, setSendWallet] = useState<WalletItem | null>(null);
  const [receiveWallet, setReceiveWallet] = useState<WalletItem | null>(null);
  const [exportKeyWallet, setExportKeyWallet] = useState<WalletItem | null>(null);
  const [isAddWebsiteOpen, setIsAddWebsiteOpen] = useState<boolean>(false);
  const [isRefreshingBalances, setIsRefreshingBalances] = useState<boolean>(false);

  // Derive wallets according to current vault data
  const deriveFromVault = useCallback((data: { secret: string; type: 'mnemonic' | 'private_key'; derivedCount: number }) => {
    let derived: WalletItem[] = [];
    if (data.type === 'mnemonic') {
      for (let i = 0; i < data.derivedCount; i++) {
        derived.push(deriveWalletFromMnemonic(data.secret, i));
      }
    } else {
      // Single private key
      derived = [deriveWalletFromPrivateKey(data.secret)];
    }
    setWallets(derived);

    // Immediately fetch balances for the derived wallets
    Promise.allSettled(
      derived.map(async (w) => {
        const bal = await fetchBalance(w.address, activeChain);
        return { id: w.id, balance: bal.formatted, balanceRaw: bal.raw };
      })
    ).then((results) => {
      setWallets((prev) =>
        prev.map((w) => {
          const r = results.find((res) => res.status === 'fulfilled' && res.value.id === w.id);
          if (r && r.status === 'fulfilled') {
            return { ...w, balance: r.value.balance, balanceRaw: r.value.balanceRaw };
          }
          return w;
        })
      );
    });
  }, [activeChain]);

  // Initialize vault from storage on first load (DO NOT auto-create if empty!)
  useEffect(() => {
    const loaded = loadVault();
    if (loaded) {
      setVaultData(loaded);
      deriveFromVault(loaded);
    } else {
      setVaultData(null);
      setWallets([]);
    }
  }, [deriveFromVault]);

  // Refresh all balances
  const refreshBalances = useCallback(async () => {
    setIsRefreshingBalances(true);
    try {
      // Read current wallets via a functional updater so we always have fresh list
      let currentWallets: WalletItem[] = [];
      setWallets((prev) => { currentWallets = prev; return prev; });

      if (currentWallets.length === 0) {
        setIsRefreshingBalances(false);
        return;
      }

      const results = await Promise.allSettled(
        currentWallets.map(async (w) => {
          const bal = await fetchBalance(w.address, activeChain);
          return { id: w.id, balance: bal.formatted, balanceRaw: bal.raw };
        })
      );

      setWallets((prev) =>
        prev.map((w) => {
          const r = results.find(
            (res) => res.status === 'fulfilled' && res.value.id === w.id
          );
          if (r && r.status === 'fulfilled') {
            return { ...w, balance: r.value.balance, balanceRaw: r.value.balanceRaw };
          }
          return w;
        })
      );
    } catch (err) {
      console.warn('Failed to refresh balances:', err);
    } finally {
      setIsRefreshingBalances(false);
    }
  }, [activeChain]);

  // Initial balance fetch when wallets or chain change
  useEffect(() => {
    if (wallets.length > 0) {
      refreshBalances();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChain.id, wallets.length]);

  // Add smart wallet (single)
  const handleAddWallet = () => {
    handleAddBatch(1);
  };

  // Batch Add wallets (Increasing)
  const handleAddBatch = (amount: number) => {
    if (!vaultData || vaultData.type !== 'mnemonic') {
      alert('Adding multiple derived wallets is available when using a 12/24-word recovery phrase.');
      return;
    }
    const currentCount = vaultData.derivedCount;
    const newCount = currentCount + amount;
    saveDerivedCount(newCount);
    const updatedVault = { ...vaultData, derivedCount: newCount };
    setVaultData(updatedVault);

    const newlyDerived: WalletItem[] = [];
    for (let i = currentCount; i < newCount; i++) {
      newlyDerived.push(deriveWalletFromMnemonic(vaultData.secret, i));
    }
    setWallets((prev) => [...prev, ...newlyDerived]);

    // Fetch balances for newly added wallets
    Promise.all(
      newlyDerived.map(async (w) => {
        const bal = await fetchBalance(w.address, activeChain);
        return { id: w.id, balance: bal.formatted, balanceRaw: bal.raw };
      })
    ).then((results) => {
      setWallets((prev) =>
        prev.map((w) => {
          const found = results.find((r) => r.id === w.id);
          return found ? { ...w, balance: found.balance, balanceRaw: found.balanceRaw } : w;
        })
      );
    });
  };

  // Batch Remove wallets (Decreasing)
  const handleRemoveBatch = (amount: number) => {
    if (!vaultData || vaultData.type !== 'mnemonic') return;
    const currentCount = wallets.length;
    const targetCount = Math.max(1, currentCount - amount);
    if (targetCount === currentCount) return;

    saveDerivedCount(targetCount);
    setVaultData({ ...vaultData, derivedCount: targetCount });
    setWallets((prev) => prev.slice(0, targetCount));
  };

  // Set Total Count Directly
  const handleSetTotalCount = (targetTotal: number) => {
    if (!vaultData || vaultData.type !== 'mnemonic') return;
    const cleanTotal = Math.max(1, Math.min(150, targetTotal));
    saveDerivedCount(cleanTotal);
    const updatedVault = { ...vaultData, derivedCount: cleanTotal };
    setVaultData(updatedVault);

    const derived: WalletItem[] = [];
    for (let i = 0; i < cleanTotal; i++) {
      derived.push(deriveWalletFromMnemonic(vaultData.secret, i));
    }
    setWallets(derived);
    setTimeout(() => refreshBalances(), 300);
  };

  // Remove/hide derived wallet
  const handleRemoveWallet = (id: string) => {
    if (wallets.length <= 1) return;
    const filtered = wallets.filter((w) => w.id !== id);
    setWallets(filtered);
    if (vaultData && vaultData.type === 'mnemonic') {
      const newCount = filtered.length;
      saveDerivedCount(newCount);
      setVaultData({ ...vaultData, derivedCount: newCount });
    }
  };

  // Save imported or newly created Mnemonic
  const handleSaveMnemonic = (phrase: string, initialCount: number = 5) => {
    const cleanCount = Math.max(1, initialCount);
    saveVault(phrase, 'mnemonic', cleanCount);
    const newData = { secret: phrase, type: 'mnemonic' as const, derivedCount: cleanCount };
    setVaultData(newData);
    deriveFromVault(newData);
    setIsVaultOpen(false);
    setTimeout(() => refreshBalances(), 500);
  };

  // Save imported Private Key
  const handleSavePrivateKey = (key: string) => {
    saveVault(key, 'private_key', 1);
    const newData = { secret: key, type: 'private_key' as const, derivedCount: 1 };
    setVaultData(newData);
    deriveFromVault(newData);
    setIsVaultOpen(false);
    setTimeout(() => refreshBalances(), 500);
  };

  // Wipe/Remove the active vault completely
  const handleWipeVault = () => {
    if (window.confirm('Are you sure you want to remove this wallet from Refer Check?')) {
      clearVault();
      setVaultData(null);
      setWallets([]);
      setIsVaultOpen(false);
    }
  };

  // Save added website
  const handleAddWebsite = (newSite: WebsiteConfig) => {
    const updated = [...websites, newSite];
    setWebsites(updated);
    setActiveWebsite(newSite);
    localStorage.setItem('refercheck_custom_websites', JSON.stringify(updated));
  };

  // Relay Step Update Callback
  const handleUpdateWalletStatus = (update: RelayStepUpdate) => {
    setWallets((prev) =>
      prev.map((w) => {
        if (w.id === update.walletId) {
          return {
            ...w,
            status: update.status,
            balance: update.balance !== undefined ? update.balance : w.balance,
            streak: update.streak !== undefined ? update.streak : w.streak,
            points: update.points !== undefined ? update.points : w.points,
            error: update.error
          };
        }
        return w;
      })
    );
  };

  // Calculate total balance
  const totalBalance = useMemo(() => {
    const sum = wallets.reduce((acc, curr) => acc + (parseFloat(curr.balance) || 0), 0);
    return sum.toFixed(4);
  }, [wallets]);

  return (
    <div className="min-h-screen bg-[#080B13] text-gray-100 flex flex-col font-sans">
      {/* Top Navigation */}
      <Navbar
        chains={chains}
        activeChain={activeChain}
        onSelectChain={setActiveChain}
        websites={websites}
        activeWebsite={activeWebsite}
        onSelectWebsite={setActiveWebsite}
        onOpenAddWebsite={() => setIsAddWebsiteOpen(true)}
        onOpenVault={() => setIsVaultOpen(true)}
        totalWallets={wallets.length}
        totalBalance={totalBalance}
        onRefreshBalances={refreshBalances}
        isRefreshing={isRefreshingBalances}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-[#202D49] pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('checkin')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 ${
                activeTab === 'checkin'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30'
                  : 'bg-[#0F1626] text-gray-400 hover:text-white border border-[#202D49]'
              }`}
            >
              <Repeat className="w-4 h-4" />
              <span>Auto Daily Check</span>
            </button>

            <button
              onClick={() => setActiveTab('tasks')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 ${
                activeTab === 'tasks'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30'
                  : 'bg-[#0F1626] text-gray-400 hover:text-white border border-[#202D49]'
              }`}
            >
              <CheckSquare className="w-4 h-4" />
              <span>Quests / Tasks</span>
            </button>

            <button
              onClick={() => setActiveTab('wallets')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 ${
                activeTab === 'wallets'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30'
                  : 'bg-[#0F1626] text-gray-400 hover:text-white border border-[#202D49]'
              }`}
            >
              <Wallet className="w-4 h-4" />
              <span>Smart Wallets ({wallets.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('websites')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 ${
                activeTab === 'websites'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30'
                  : 'bg-[#0F1626] text-gray-400 hover:text-white border border-[#202D49]'
              }`}
            >
              <Globe className="w-4 h-4" />
              <span className="hidden sm:inline">Websites & Referrals</span>
              <span className="sm:hidden">Websites</span>
            </button>
          </div>

          {/* Active Vault Status Indicator & Quick Remove Button */}
          <div className="flex items-center gap-3">
            {vaultData ? (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 text-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>Active: {vaultData.type === 'mnemonic' ? 'Phrase' : 'Private Key'}</span>
                </div>
                <button
                  onClick={handleWipeVault}
                  className="px-2.5 py-1 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-800/40 rounded-lg text-xs font-medium transition-all flex items-center gap-1"
                  title="Remove current wallet"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Remove Key</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsVaultOpen(true)}
                className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-semibold hover:bg-amber-500/30 transition-all flex items-center gap-1.5"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>No Wallet Loaded (Click to Setup)</span>
              </button>
            )}
          </div>
        </div>

        {/* Clean Empty State if No Vault is Loaded */}
        {!vaultData ? (
          <div className="py-12 px-6 rounded-2xl bg-[#0F1626] border border-[#202D49] text-center max-w-xl mx-auto shadow-2xl space-y-5 animate-fade-in">
            <div className="w-16 h-16 bg-blue-500/10 text-blue-400 rounded-2xl flex items-center justify-center mx-auto border border-blue-500/20">
              <Key className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">No Wallet Loaded Yet</h2>
              <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
                To test the auto daily check-in with your refer link, import your existing wallet or create a fresh one below. Only 1 wallet/key will be kept active.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => setIsVaultOpen(true)}
                className="py-3 px-4 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-bold text-white transition-all shadow-lg shadow-blue-900/30 flex items-center justify-center gap-2"
              >
                <Key className="w-4 h-4" />
                <span>Import My Wallet</span>
              </button>

              <button
                onClick={() => setIsVaultOpen(true)}
                className="py-3 px-4 bg-[#162035] hover:bg-[#202D49] border border-[#202D49] rounded-xl text-xs font-bold text-gray-200 transition-all flex items-center justify-center gap-2"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Create Fresh Phrase</span>
              </button>
            </div>

            <p className="text-[11px] text-gray-500">
              Your recovery phrase and private keys are stored only inside your browser.
            </p>
          </div>
        ) : (
          <>
            {/* Tab Content: Daily Checkin */}
            {activeTab === 'checkin' && (
              <DailyCheckinSection
                activeWebsite={activeWebsite}
                wallets={wallets}
                chain={activeChain}
                onRefreshBalances={refreshBalances}
                onUpdateWalletStatus={handleUpdateWalletStatus}
                onSaveCustomReferral={handleSaveCustomReferral}
                onResetDefaultReferral={handleResetDefaultReferral}
                isCustomReferral={isCustomReferral}
              />
            )}

            {/* Tab Content: Tasks / Quests */}
            {activeTab === 'tasks' && (
              <TasksSection
                activeWebsite={activeWebsite}
                wallets={wallets}
                chain={activeChain}
                onRefreshBalances={refreshBalances}
              />
            )}

            {/* Tab Content: Wallets Management */}
            {activeTab === 'wallets' && (
              <WalletSection
                wallets={wallets}
                chain={activeChain}
                vaultType={vaultData?.type}
                onAddBatch={handleAddBatch}
                onRemoveBatch={handleRemoveBatch}
                onSetTotalCount={handleSetTotalCount}
                onAddWallet={handleAddWallet}
                onRemoveWallet={handleRemoveWallet}
                onSend={(w) => setSendWallet(w)}
                onReceive={(w) => setReceiveWallet(w)}
                onExportKey={(w) => setExportKeyWallet(w)}
                onOpenVault={() => setIsVaultOpen(true)}
                onRefreshBalances={refreshBalances}
                isRefreshing={isRefreshingBalances}
                totalBalance={totalBalance}
              />
            )}
          </>
        )}

        {/* Tab Content: Websites & Referrals Directory */}
        {activeTab === 'websites' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Supported Quests & Referral Campaigns</h3>
                <p className="text-xs text-gray-400">
                  Select a campaign to run auto daily check-ins or add new upcoming Web3 campaigns.
                </p>
              </div>
              <button
                onClick={() => setIsAddWebsiteOpen(true)}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-md shadow-blue-900/20 transition-all"
              >
                <span>+ Add Campaign</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {websites.map((site) => (
                <div
                  key={site.id}
                  className={`p-5 rounded-2xl bg-[#0F1626] border transition-all ${
                    activeWebsite.id === site.id
                      ? 'border-blue-500 shadow-lg shadow-blue-500/10'
                      : 'border-[#202D49] hover:border-gray-700'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{site.icon || '🌾'}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-white text-base">{site.name}</h4>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            {site.badge}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">{site.description}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-[#080B13] border border-[#202D49] rounded-xl space-y-2 text-xs font-mono">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Referral Code:</span>
                      <span className="text-blue-400 font-bold">{site.referralCode}</span>
                    </div>
                    <div className="flex items-center justify-between truncate">
                      <span className="text-gray-500">Refer Link:</span>
                      <a
                        href={site.referralLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-300 hover:text-white underline truncate max-w-[200px]"
                      >
                        {site.referralLink}
                      </a>
                    </div>
                    {site.contractAddress && (
                      <div className="flex items-center justify-between truncate">
                        <span className="text-gray-500">Contract:</span>
                        <span className="text-gray-300 truncate max-w-[200px]">
                          {site.contractAddress}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => {
                        setActiveWebsite(site);
                        setActiveTab('checkin');
                      }}
                      className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-xs font-semibold text-white transition-all shadow-md shadow-blue-900/20"
                    >
                      Use for Daily Check-in
                    </button>
                    <a
                      href={site.referralLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 bg-[#162035] hover:bg-[#202D49] rounded-xl text-xs font-medium text-gray-300 hover:text-white flex items-center gap-1 border border-[#202D49]"
                    >
                      <span>Visit Site</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-[#202D49] py-4 bg-[#080B13]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-400">Refer Check</span>
            <span>•</span>
            <span>Single Active Vault Engine • Ronin EVM (0x)</span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://quests.rrfvillage.xyz/r/WNUGJZTA"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              Inviter: @Amarlovetips (WNUGJZTA) <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </footer>

      {/* Vault Modal */}
      <VaultModal
        isOpen={isVaultOpen}
        onClose={() => setIsVaultOpen(false)}
        onSaveMnemonic={handleSaveMnemonic}
        onSavePrivateKey={handleSavePrivateKey}
        onWipeVault={handleWipeVault}
        hasExistingVault={!!vaultData}
        activeType={vaultData?.type}
        firstWalletAddress={wallets[0]?.address}
      />

      <SendModal
        senderWallet={sendWallet}
        allWallets={wallets}
        chain={activeChain}
        isOpen={!!sendWallet}
        onClose={() => setSendWallet(null)}
        onSuccess={() => {
          setTimeout(() => refreshBalances(), 1500);
        }}
      />

      <ReceiveModal
        wallet={receiveWallet}
        chain={activeChain}
        isOpen={!!receiveWallet}
        onClose={() => setReceiveWallet(null)}
      />

      <ExportKeyModal
        wallet={exportKeyWallet}
        isOpen={!!exportKeyWallet}
        onClose={() => setExportKeyWallet(null)}
      />

      <AddWebsiteModal
        chains={chains}
        isOpen={isAddWebsiteOpen}
        onClose={() => setIsAddWebsiteOpen(false)}
        onAddWebsite={handleAddWebsite}
      />
    </div>
  );
}

export default App;
