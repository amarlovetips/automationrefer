import { ethers } from 'ethers';
import { ChainConfig } from '../types';

// Cache providers to prevent unnecessary network re-connections
const providerCache: Record<string, ethers.JsonRpcProvider> = {};

function resolveRpcUrl(url: string): string {
  // If url is relative (e.g. /proxy-ronin-rpc), resolve it to full http://... in browser
  if (url.startsWith('/')) {
    if (typeof window !== 'undefined' && window.location) {
      return `${window.location.origin}${url}`;
    }
  }
  return url;
}

export function getProvider(chain: ChainConfig): ethers.JsonRpcProvider {
  if (!providerCache[chain.id]) {
    const finalUrl = resolveRpcUrl(chain.rpcUrl);
    providerCache[chain.id] = new ethers.JsonRpcProvider(
      finalUrl,
      { chainId: chain.chainId, name: chain.name },
      { staticNetwork: true }
    );
  }
  return providerCache[chain.id];
}

export function formatBalanceDisplay(rawWei: bigint): string {
  if (!rawWei || rawWei === 0n) return '0.0000';
  const formatted = ethers.formatEther(rawWei);
  const num = parseFloat(formatted);
  if (num === 0) return '0.0000';
  if (num < 0.0001) {
    // Show up to 6 decimals for micro balances
    return num.toFixed(6);
  }
  return num.toFixed(4);
}

/**
 * Fetch native coin balance via Ronin Explorer API (proxied through Vite to avoid CORS).
 * Falls back to direct JSON-RPC for other chains or on explorer failure.
 */
export async function fetchBalance(
  address: string,
  chain: ChainConfig
): Promise<{ formatted: string; raw: bigint }> {
  // ── Ronin chains: try Vite proxy → Explorer REST API first ─────────────────
  const explorerProxyBase =
    chain.id === 'ronin'
      ? '/proxy-ronin-explorer'
      : chain.id === 'ronin-saigon'
      ? '/proxy-saigon-explorer'
      : null;

  if (explorerProxyBase) {
    try {
      const res = await fetch(`${explorerProxyBase}/api/v2/addresses/${address}`, {
        headers: { Accept: 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        const rawWei = BigInt(data.coin_balance ?? '0');
        const display = formatBalanceDisplay(rawWei);
        return { formatted: display, raw: rawWei };
      }
    } catch (e) {
      console.warn('Explorer API failed, falling back to RPC:', e);
    }
  }

  // ── JSON-RPC fallback (or primary for non-Ronin chains) ───────────────────
  try {
    const provider = getProvider(chain);
    const raw = await provider.getBalance(address);
    const display = formatBalanceDisplay(raw);
    return { formatted: display, raw };
  } catch (error) {
    console.warn(`Failed to fetch balance for ${address} on ${chain.name}:`, error);
    return { formatted: '0.0000', raw: 0n };
  }
}

/**
 * Send native tokens from a private key wallet to a recipient
 */
export async function sendNativeTransfer(
  privateKey: string,
  recipientAddress: string,
  amountInEther: string,
  chain: ChainConfig
): Promise<ethers.TransactionReceipt> {
  const provider = getProvider(chain);
  const wallet = new ethers.Wallet(privateKey, provider);

  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice || ethers.parseUnits('20', 'gwei');

  const tx = await wallet.sendTransaction({
    to: recipientAddress,
    value: ethers.parseEther(amountInEther),
    gasLimit: 21000n,
    gasPrice
  });

  const receipt = await tx.wait(1);
  if (!receipt) throw new Error('Transaction sent but receipt not returned');
  return receipt;
}

/**
 * Calculate maximum transferable balance after keeping a safety reserve and network gas fee.
 * Uses Explorer API for balance (same as fetchBalance) so the figure is accurate.
 */
export async function calculateMaxTransferable(
  address: string,
  chain: ChainConfig,
  reserveFeeRon: string = '0.003'
): Promise<{ maxEther: string; maxWei: bigint; rawBalance: bigint; estimatedGasFee: bigint }> {
  // Fetch live balance (via Explorer for Ronin, RPC for others)
  const balInfo = await fetchBalance(address, chain);
  const rawBalance = balInfo.raw;

  // Estimate gas cost using RPC fee data
  let estimatedGasFee: bigint;
  try {
    const provider = getProvider(chain);
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('20', 'gwei');
    estimatedGasFee = 21000n * gasPrice;
  } catch {
    // Ronin default: 20 Gwei × 21000 = 0.00042 RON
    estimatedGasFee = ethers.parseUnits('0.00042', 'ether');
  }

  const reserveWei = ethers.parseEther(reserveFeeRon || '0.003');
  const totalDeduction = estimatedGasFee + reserveWei;

  if (rawBalance <= totalDeduction) {
    return { maxEther: '0', maxWei: 0n, rawBalance, estimatedGasFee };
  }

  const maxWei = rawBalance - totalDeduction;
  const maxEther = ethers.formatEther(maxWei);
  return { maxEther, maxWei, rawBalance, estimatedGasFee };
}

/**
 * Transfer max available balance (minus safety reserve) to next wallet
 */
export async function transferMaxBalanceToNext(
  senderPrivateKey: string,
  recipientAddress: string,
  chain: ChainConfig,
  reserveFeeRon: string = '0.003'
): Promise<{ receipt: ethers.TransactionReceipt; amountSent: string }> {
  const provider = getProvider(chain);
  const senderWallet = new ethers.Wallet(senderPrivateKey, provider);
  const senderAddress = senderWallet.address;

  const { maxEther, maxWei } = await calculateMaxTransferable(senderAddress, chain, reserveFeeRon);

  if (maxWei <= 0n || parseFloat(maxEther) <= 0.0001) {
    throw new Error(
      `Insufficient balance in ${senderAddress.slice(0, 6)}... to relay. Available: ${ethers.formatEther(maxWei)} ${chain.symbol}`
    );
  }

  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice || ethers.parseUnits('20', 'gwei');

  const tx = await senderWallet.sendTransaction({
    to: recipientAddress,
    value: maxWei,
    gasLimit: 21000n,
    gasPrice
  });

  const receipt = await tx.wait(1);
  if (!receipt) throw new Error('Transfer transaction mined without receipt');

  return { receipt, amountSent: parseFloat(maxEther).toFixed(5) };
}
