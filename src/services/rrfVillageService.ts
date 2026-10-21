import { ethers } from 'ethers';
import { ChainConfig, RrfMeResponse } from '../types';
import { getProvider } from './chainService';

const RRF_API_BASE = '/proxy-rrf-api';
const CHECKIN_CONTRACT = '0x9f065e324a68e8cfa0c999e285a4ab935dd12ad9';
const CHECKIN_CALLDATA = '0x183ff085';

export interface RrfAuthSession {
  token: string;
  wallet: string;
  expires_at?: string;
}

/**
 * Validate a referral code on RRF Village
 */
export async function verifyReferralCode(code: string): Promise<{ valid: boolean; inviter?: string; error?: string }> {
  try {
    const res = await fetch(`${RRF_API_BASE}/api/qp/referrals/check?code=${encodeURIComponent(code)}`);
    const data = await res.json();
    return {
      valid: !!data.valid,
      inviter: data.inviter || data.name
    };
  } catch (error: any) {
    return { valid: false, error: error.message };
  }
}

/**
 * Request auth nonce message for signing
 */
export async function getAuthNonce(walletAddress: string): Promise<{ message: string; nonce: string }> {
  const res = await fetch(`${RRF_API_BASE}/api/qp/auth/nonce`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      wallet_address: walletAddress.toLowerCase(),
      domain: 'quests.rrfvillage.xyz'
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Failed to fetch nonce (${res.status})`);
  }

  return await res.json();
}

/**
 * Sign nonce and authenticate wallet with RRF Village API
 */
export async function authenticateWallet(privateKey: string): Promise<RrfAuthSession> {
  const wallet = new ethers.Wallet(privateKey);
  const address = wallet.address.toLowerCase();

  // 1. Get SIWE Nonce
  const nonceData = await getAuthNonce(address);

  // 2. Sign SIWE Message with wallet private key (EIP-191 standard)
  const signature = await wallet.signMessage(nonceData.message);

  // 3. Verify signature with API (this auto-creates account if first-time)
  const verifyRes = await fetch(`${RRF_API_BASE}/api/qp/auth/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: nonceData.message,
      signature
    })
  });

  if (!verifyRes.ok) {
    const err = await verifyRes.json().catch(() => ({}));
    throw new Error(err.message || `Auth verification failed (${verifyRes.status})`);
  }

  const sessionData = await verifyRes.json();
  return {
    token: sessionData.token,
    wallet: address,
    expires_at: sessionData.expires_at
  };
}

/**
 * Register wallet with referral code (first-time sign-up via refer link)
 * The RRF Village API auto-creates an account on SIWE verify,
 * this is used to explicitly attach the referral on new accounts.
 */
export async function registerWithReferral(token: string, code: string): Promise<{ ok: boolean; isNew: boolean; message: string }> {
  try {
    // Check current profile to detect if new account
    const me = await fetchRrfMe(token);
    const isNew = !me?.points?.total && !me?.checkin?.streak;

    // Attach referral (works for both new and existing wallets)
    const attach = await attachReferralCode(token, code);
    return {
      ok: attach.ok,
      isNew,
      message: isNew
        ? `New account created! ${attach.message}`
        : attach.message
    };
  } catch (e: any) {
    return { ok: false, isNew: false, message: e.message };
  }
}

/**
 * Attach referral code to the authenticated wallet
 */
export async function attachReferralCode(token: string, code: string): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await fetch(`${RRF_API_BASE}/api/qp/referrals/attach`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        code,
        source: 'link'
      })
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      return { ok: true, message: `Joined with refer code: ${code}` };
    }

    if (data.code === 'already_attached' || data.error === 'already_attached') {
      return { ok: true, message: 'Referral already attached to this wallet.' };
    }

    return { ok: false, message: data.message || data.error || 'Failed to attach referral' };
  } catch (error: any) {
    return { ok: false, message: error.message };
  }
}

/**
 * Fetch current wallet's RRF profile, streak, and daily checkin status
 */
export async function fetchRrfMe(token: string): Promise<RrfMeResponse | null> {
  try {
    const res = await fetch(`${RRF_API_BASE}/api/qp/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Execute on-chain daily check-in on Ronin Network
 */
export async function executeCheckinTransaction(
  privateKey: string,
  chain: ChainConfig
): Promise<ethers.TransactionReceipt> {
  const provider = getProvider(chain);
  const wallet = new ethers.Wallet(privateKey, provider);

  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice || ethers.parseUnits('20', 'gwei');

  // Estimate gas or fallback to safe 55,000 gas limit
  let gasLimit = 55000n;
  try {
    const est = await provider.estimateGas({
      from: wallet.address,
      to: CHECKIN_CONTRACT,
      data: CHECKIN_CALLDATA,
      value: 0n
    });
    gasLimit = (est * 13n) / 10n; // add 30% safety margin
  } catch (err: any) {
    console.warn('Gas estimation fallback:', err.message);
  }

  const tx = await wallet.sendTransaction({
    to: CHECKIN_CONTRACT,
    data: CHECKIN_CALLDATA,
    value: 0n,
    gasLimit,
    gasPrice
  });

  const receipt = await tx.wait(1);
  if (!receipt) {
    throw new Error('Check-in transaction sent but no receipt received');
  }

  return receipt;
}

/**
 * Submit mined check-in transaction hash to RRF Village API to record streak and points
 */
export async function submitCheckinTxHash(token: string, txHash: string): Promise<any> {
  let attempts = 0;
  while (attempts < 5) {
    try {
      const res = await fetch(`${RRF_API_BASE}/api/qp/checkin/tx`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ tx_hash: txHash })
      });

      if (res.ok) {
        return await res.json();
      }

      const err = await res.json().catch(() => ({}));
      if (err.code === 'not_found' || err.code === 'chain_unreachable') {
        // Ronin block indexers might take 2-3 seconds to index receipt
        await new Promise((r) => setTimeout(r, 2500));
        attempts++;
        continue;
      }
      throw new Error(err.message || `Check-in recording failed (${res.status})`);
    } catch (e: any) {
      if (attempts >= 4) throw e;
      await new Promise((r) => setTimeout(r, 2000));
      attempts++;
    }
  }
}

/**
 * Generic dynamic quest submitter
 * Works for any current and future tasks that do not require external OAuth redirect
 */
export async function submitGenericQuest(
  token: string,
  questId: string,
  payload: Record<string, any> = {}
): Promise<{ ok: boolean; status?: string; message?: string }> {
  try {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    const bodyData = {
      request_id: requestId,
      note: 'Completed',
      ...payload
    };

    const res = await fetch(`${RRF_API_BASE}/api/qp/quests/${encodeURIComponent(questId)}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(bodyData)
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok && (data.ok || data.status === 'pending' || data.status === 'completed')) {
      return { ok: true, status: data.status, message: 'Submitted successfully' };
    }
    return { ok: false, message: data.message || data.error || `Failed with status ${res.status}` };
  } catch (error: any) {
    return { ok: false, message: error.message };
  }
}
