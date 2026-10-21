import { ethers } from 'ethers';
import { WalletItem } from '../types';

const STORAGE_KEYS = {
  VAULT_SECRET: 'refercheck_vault_secret',
  VAULT_TYPE: 'refercheck_vault_type', // 'mnemonic' | 'private_key'
  DERIVED_COUNT: 'refercheck_derived_count'
};

/**
 * Validate a mnemonic seed phrase (12 or 24 words)
 */
export function isValidMnemonic(phrase: string): boolean {
  try {
    const trimmed = phrase.trim().split(/\s+/).join(' ');
    ethers.Mnemonic.fromPhrase(trimmed);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate an EVM private key (64 hex characters or 0x + 64 hex characters)
 */
export function isValidPrivateKey(key: string): boolean {
  try {
    let clean = key.trim();
    if (!clean.startsWith('0x')) clean = '0x' + clean;
    new ethers.Wallet(clean);
    return true;
  } catch {
    return false;
  }
}

/**
 * Generate a new 12-word BIP-39 seed phrase
 */
export function generateNewMnemonic(): string {
  const entropy = ethers.randomBytes(16);
  const mnemonic = ethers.Mnemonic.fromEntropy(entropy);
  return mnemonic.phrase;
}

/**
 * Derive a smart wallet from a mnemonic phrase using standard EVM path m/44'/60'/0'/0/index
 */
export function deriveWalletFromMnemonic(phrase: string, index: number): WalletItem {
  const trimmed = phrase.trim().split(/\s+/).join(' ');
  const path = `m/44'/60'/0'/0/${index}`;
  const hdWallet = ethers.HDNodeWallet.fromPhrase(trimmed, '', path);
  
  return {
    id: `wallet-${index}`,
    index,
    name: `Smart Wallet #${index + 1}`,
    address: hdWallet.address,
    roninAddress: hdWallet.address,
    privateKey: hdWallet.privateKey,
    balance: '0.0000',
    balanceRaw: 0n,
    status: 'idle',
    referralAttached: false,
  };
}

/**
 * Derive a smart wallet from a raw private key
 */
export function deriveWalletFromPrivateKey(rawKey: string): WalletItem {
  let clean = rawKey.trim();
  if (!clean.startsWith('0x')) clean = '0x' + clean;
  const wallet = new ethers.Wallet(clean);

  return {
    id: 'wallet-0',
    index: 0,
    name: 'Imported Wallet #1',
    address: wallet.address,
    roninAddress: wallet.address,
    privateKey: wallet.privateKey,
    balance: '0.0000',
    balanceRaw: 0n,
    status: 'idle',
    referralAttached: false,
  };
}

/**
 * Save vault (seed phrase or private key) to browser localStorage
 */
export function saveVault(secret: string, type: 'mnemonic' | 'private_key', initialCount: number = 1): void {
  // Clear any existing vault first so only ONE active secret exists
  clearVault();

  const trimmed = secret.trim();
  localStorage.setItem(STORAGE_KEYS.VAULT_SECRET, btoa(trimmed));
  localStorage.setItem(STORAGE_KEYS.VAULT_TYPE, type);
  localStorage.setItem(STORAGE_KEYS.DERIVED_COUNT, initialCount.toString());
}

/**
 * Load vault from browser localStorage
 */
export function loadVault(): { secret: string; type: 'mnemonic' | 'private_key'; derivedCount: number } | null {
  const encoded = localStorage.getItem(STORAGE_KEYS.VAULT_SECRET);
  const type = localStorage.getItem(STORAGE_KEYS.VAULT_TYPE) as 'mnemonic' | 'private_key' | null;
  const countStr = localStorage.getItem(STORAGE_KEYS.DERIVED_COUNT);

  if (!encoded || !type) return null;
  try {
    const secret = atob(encoded);
    const derivedCount = countStr ? Math.max(1, parseInt(countStr, 10)) : 1;
    return { secret, type, derivedCount };
  } catch {
    return null;
  }
}

/**
 * Completely wipe the vault from browser storage
 */
export function clearVault(): void {
  localStorage.removeItem(STORAGE_KEYS.VAULT_SECRET);
  localStorage.removeItem(STORAGE_KEYS.VAULT_TYPE);
  localStorage.removeItem(STORAGE_KEYS.DERIVED_COUNT);
  // Also clean old keys if present
  localStorage.removeItem('refercheck_vault_mnemonic');
  localStorage.removeItem('refercheck_custom_wallets');
}

/**
 * Save count of derived wallets
 */
export function saveDerivedCount(count: number): void {
  localStorage.setItem(STORAGE_KEYS.DERIVED_COUNT, count.toString());
}

/**
 * Convert Ronin address format (ronin:...) to 0x EVM address
 */
export function toEthAddress(address: string): string {
  if (!address) return '';
  const clean = address.trim();
  if (clean.startsWith('0x')) return clean;
  if (clean.startsWith('ronin:')) return '0x' + clean.slice(6);
  return '0x' + clean;
}
