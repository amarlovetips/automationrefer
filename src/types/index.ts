export interface WalletItem {
  id: string;
  index: number;
  name: string;
  address: string;
  roninAddress: string;
  privateKey: string;
  balance: string;
  balanceRaw: bigint;
  status: 'idle' | 'checking' | 'transferring' | 'success' | 'error';
  lastCheckedIn?: string;
  streak?: number;
  points?: number;
  error?: string;
  referralAttached?: boolean;
}

export interface ChainConfig {
  id: string;
  name: string;
  chainId: number;
  symbol: string;
  rpcUrl: string;
  explorerUrl: string;
  isTestnet?: boolean;
  logo: string;
  active: boolean;
  nativeDecimal: number;
}

export interface WebsiteConfig {
  id: string;
  name: string;
  url: string;
  referralLink: string;
  referralCode: string;
  chainId: number;
  contractAddress: string;
  calldata: string;
  badge: string;
  description: string;
  icon?: string;
  enabled: boolean;
  apiBaseUrl?: string;
}

export interface CheckinLog {
  id: string;
  timestamp: string;
  walletName?: string;
  walletAddress?: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'tx' | 'step';
  message: string;
  txHash?: string;
  stepName?: string;
}

export interface RelayRunConfig {
  reserveTxFee: string; // amount of RON to keep for safety, e.g. 0.002
  customTransferAmount?: string; // or 'max'
  autoTransferNext: boolean; // toggle auto transfer to next wallet
  selectedWalletIds: string[];
  autoAttachReferral: boolean;
  delayBetweenStepsMs: number;
}

export interface RrfMeResponse {
  account?: {
    wallet: string;
    wallets: string[];
    created_at: string;
  };
  checkin?: {
    checked_in_today: boolean;
    streak: number;
    best: number;
    total: number;
    multiplier_bps: number;
    next_multiplier_bps: number;
    contract: string;
    calldata: string;
    fee_wei: string;
  };
  points?: {
    total: number;
    rank: number;
    today: number;
  };
  quests?: any[];
}
