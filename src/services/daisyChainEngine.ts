import { ChainConfig, CheckinLog, RelayRunConfig, WalletItem } from '../types';
import { calculateMaxTransferable, fetchBalance, transferMaxBalanceToNext } from './chainService';
import {
  attachReferralCode,
  authenticateWallet,
  executeCheckinTransaction,
  fetchRrfMe,
  registerWithReferral,
  submitCheckinTxHash
} from './rrfVillageService';

export interface RelayStepUpdate {
  walletId: string;
  status: WalletItem['status'];
  balance?: string;
  streak?: number;
  points?: number;
  error?: string;
}

export type LogCallback = (log: Omit<CheckinLog, 'id' | 'timestamp'>) => void;
export type WalletUpdateCallback = (update: RelayStepUpdate) => void;

export class DaisyChainRunner {
  private isCancelled = false;

  public cancel() {
    this.isCancelled = true;
  }

  public async runDaisyChain(
    wallets: WalletItem[],
    chain: ChainConfig,
    config: RelayRunConfig,
    referralCode: string,
    onLog: LogCallback,
    onUpdateWallet: WalletUpdateCallback
  ): Promise<boolean> {
    this.isCancelled = false;

    // Filter wallets in order of selected IDs
    const selectedWallets = config.selectedWalletIds
      .map((id) => wallets.find((w) => w.id === id))
      .filter((w): w is WalletItem => !!w);

    if (selectedWallets.length === 0) {
      onLog({
        type: 'error',
        message: 'No wallets selected for daily check-in sequence.'
      });
      return false;
    }

    onLog({
      type: 'info',
      message: `🚀 Starting Automated Daily Check-in Sequence for ${selectedWallets.length} smart wallet(s)...`
    });

    for (let i = 0; i < selectedWallets.length; i++) {
      if (this.isCancelled) {
        onLog({
          type: 'warning',
          message: '🛑 Sequence cancelled by user.'
        });
        return false;
      }

      const currentWallet = selectedWallets[i];
      const nextWallet = i < selectedWallets.length - 1 ? selectedWallets[i + 1] : null;

      onLog({
        type: 'step',
        walletName: currentWallet.name,
        walletAddress: currentWallet.address,
        message: `\n=========================================\n👉 [${i + 1}/${selectedWallets.length}] Processing ${currentWallet.name} (${currentWallet.address.slice(0, 6)}...${currentWallet.address.slice(-4)})`
      });

      onUpdateWallet({
        walletId: currentWallet.id,
        status: 'checking'
      });

      try {
        // Step 1: Check native balance on Ronin
        const balanceInfo = await fetchBalance(currentWallet.address, chain);
        onUpdateWallet({
          walletId: currentWallet.id,
          status: 'checking',
          balance: balanceInfo.formatted
        });

        onLog({
          type: 'info',
          walletName: currentWallet.name,
          walletAddress: currentWallet.address,
          message: `Current Balance: ${balanceInfo.formatted} ${chain.symbol}`
        });

        // Step 2: Authenticate with SIWE signature to RRF Village
        // This auto-creates the account on first login (RRF API handles it on /verify)
        onLog({
          type: 'info',
          walletName: currentWallet.name,
          walletAddress: currentWallet.address,
          message: `Authenticating wallet with RRF Village API (auto-creates account if new)...`
        });

        const session = await authenticateWallet(currentWallet.privateKey);

        // Step 3: Attach referral code (works for new & existing accounts)
        if (config.autoAttachReferral && referralCode) {
          const regRes = await registerWithReferral(session.token, referralCode);
          onLog({
            type: regRes.ok ? 'success' : 'warning',
            walletName: currentWallet.name,
            walletAddress: currentWallet.address,
            message: regRes.isNew
              ? `🆕 New account registered! ${regRes.message}`
              : `Referral (${referralCode}): ${regRes.message}`
          });
        }

        // Step 4: Check if already checked in today
        const meProfile = await fetchRrfMe(session.token);
        const alreadyCheckedIn = meProfile?.checkin?.checked_in_today;

        if (alreadyCheckedIn) {
          onLog({
            type: 'info',
            walletName: currentWallet.name,
            walletAddress: currentWallet.address,
            message: `Already checked in today! Streak: ${meProfile?.checkin?.streak || 0} days | Points: ${meProfile?.points?.total || 0}`
          });

          onUpdateWallet({
            walletId: currentWallet.id,
            status: 'success',
            streak: meProfile?.checkin?.streak,
            points: meProfile?.points?.total
          });
        } else {
          // Verify balance is sufficient for gas
          if (balanceInfo.raw < 100000000000000n) { // ~0.0001 RON
            throw new Error(`Insufficient ${chain.symbol} balance for check-in gas fee.`);
          }

          onLog({
            type: 'info',
            walletName: currentWallet.name,
            walletAddress: currentWallet.address,
            message: `Broadcasting Daily Check-in transaction to contract 0x9f065... on Ronin...`
          });

          // Step 5: Execute check-in transaction on-chain and wait for confirmation
          const txReceipt = await executeCheckinTransaction(currentWallet.privateKey, chain);
          const txHash = txReceipt.hash;

          onLog({
            type: 'tx',
            walletName: currentWallet.name,
            walletAddress: currentWallet.address,
            message: `Check-in transaction confirmed on block #${txReceipt.blockNumber}`,
            txHash
          });

          // Wait 3 seconds for Ronin block indexers to pick up the transaction
          onLog({
            type: 'info',
            walletName: currentWallet.name,
            walletAddress: currentWallet.address,
            message: `Waiting 3s for Ronin indexers to process block...`
          });
          await new Promise((r) => setTimeout(r, 3000));

          // Step 6: Submit to RRF Village API
          onLog({
            type: 'info',
            walletName: currentWallet.name,
            walletAddress: currentWallet.address,
            message: `Recording check-in on RRF Village API...`
          });

          const checkinRes = await submitCheckinTxHash(session.token, txHash);
          const updatedStreak = checkinRes?.checkin?.streak;
          const updatedPoints = checkinRes?.total || checkinRes?.points?.total;

          onLog({
            type: 'success',
            walletName: currentWallet.name,
            walletAddress: currentWallet.address,
            message: `🎉 Check-in verified! New Streak: ${updatedStreak || 'Updated'} | Total Points: ${updatedPoints || 'Updated'}`
          });

          onUpdateWallet({
            walletId: currentWallet.id,
            status: 'success',
            streak: updatedStreak,
            points: updatedPoints
          });
        }

        // Step 7: Daisy-chain relay — transfer remaining funds to next wallet (if enabled)
        if (nextWallet) {
          if (config.autoTransferNext) {
            // Pause 2 seconds after check-in completion for chain balance confirmation
            onLog({
              type: 'info',
              walletName: currentWallet.name,
              walletAddress: currentWallet.address,
              message: `⏳ Check-in complete. Waiting 2 seconds before max transfer...`
            });
            await new Promise((r) => setTimeout(r, 2000));

            onLog({
              type: 'info',
              walletName: currentWallet.name,
              walletAddress: currentWallet.address,
              message: `Preparing to transfer remaining funds to next wallet (${nextWallet.name}: ${nextWallet.address.slice(0, 6)}...)...`
            });

            onUpdateWallet({
              walletId: currentWallet.id,
              status: 'transferring'
            });

            const maxCheck = await calculateMaxTransferable(currentWallet.address, chain, config.reserveTxFee);

            if (maxCheck.maxWei > 0n && parseFloat(maxCheck.maxEther) > 0.0001) {
              onLog({
                type: 'info',
                walletName: currentWallet.name,
                walletAddress: currentWallet.address,
                message: `Sending ${parseFloat(maxCheck.maxEther).toFixed(4)} ${chain.symbol} (keeping ${config.reserveTxFee} ${chain.symbol} tx fee reserve) to ${nextWallet.name}...`
              });

              const transferResult = await transferMaxBalanceToNext(
                currentWallet.privateKey,
                nextWallet.address,
                chain,
                config.reserveTxFee
              );

              onLog({
                type: 'tx',
                walletName: currentWallet.name,
                walletAddress: currentWallet.address,
                message: `✅ Transferred ${transferResult.amountSent} ${chain.symbol} to ${nextWallet.name} on block #${transferResult.receipt.blockNumber}`,
                txHash: transferResult.receipt.hash
              });

              // Update sender balance display
              const updatedSenderBal = await fetchBalance(currentWallet.address, chain);
              onUpdateWallet({
                walletId: currentWallet.id,
                status: 'success',
                balance: updatedSenderBal.formatted
              });

              // Update recipient balance display
              const updatedNextBal = await fetchBalance(nextWallet.address, chain);
              onUpdateWallet({
                walletId: nextWallet.id,
                status: 'idle',
                balance: updatedNextBal.formatted
              });

              onLog({
                type: 'info',
                walletName: nextWallet.name,
                walletAddress: nextWallet.address,
                message: `Next wallet funded: ${updatedNextBal.formatted} ${chain.symbol}. Waiting for confirmation before starting check-in on ${nextWallet.name}...`
              });

              // Wait 3 seconds for transaction to settle and index on Ronin chain
              await new Promise((r) => setTimeout(r, 3000));
            } else {
              onLog({
                type: 'warning',
                walletName: currentWallet.name,
                walletAddress: currentWallet.address,
                message: `Remaining balance is below reserve fee threshold (${config.reserveTxFee} ${chain.symbol}). Skipping transfer.`
              });
            }
          } else {
            // Auto transfer is OFF: just proceed to the next wallet directly
            onLog({
              type: 'info',
              walletName: currentWallet.name,
              walletAddress: currentWallet.address,
              message: `ℹ️ Auto-transfer is OFF. Moving to next wallet (${nextWallet.name}) without transferring funds...`
            });
            await new Promise((r) => setTimeout(r, 1500));
          }
        } else {
          onLog({
            type: 'info',
            walletName: currentWallet.name,
            walletAddress: currentWallet.address,
            message: `🏁 Final wallet in sequence reached. Chain sequence complete!`
          });
        }
      } catch (err: any) {
        onLog({
          type: 'error',
          walletName: currentWallet.name,
          walletAddress: currentWallet.address,
          message: `❌ Error on ${currentWallet.name}: ${err.message}`
        });

        onUpdateWallet({
          walletId: currentWallet.id,
          status: 'error',
          error: err.message
        });
      }
    }

    onLog({
      type: 'success',
      message: '✨ All selected wallets processed!'
    });

    return true;
  }
}
