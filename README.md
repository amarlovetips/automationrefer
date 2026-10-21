# Refer Check ⚡

> **Automated Multi-Wallet Web3 Daily Check-in & Referral Relay System**  
> Custom built for **RRF Village Quests** on **Ronin Network** with expandable EVM multi-chain support.

---

## 🔍 System Analysis of RRF Village Quests

From reverse engineering `https://quests.rrfvillage.xyz/r/WNUGJZTA`:
- **API Backend**: `https://api.rrfvillage.xyz`
- **Network**: Ronin Chain (EVM `chainId: 2020`, RPC: `https://api.roninchain.com/rpc`, Explorer: `https://app.roninchain.com`)
- **Check-in Contract**: `0x9f065e324a68e8cfa0c999e285a4ab935dd12ad9`
- **Check-in Calldata**: `0x183ff085` (Function selector for daily check-in)
- **Check-in Fee**: `0 RON` (Only network gas is needed: ~32,000 gas units @ 20 Gwei = ~0.0006 RON per tx)
- **Referral Code**: `WNUGJZTA` (Invited by `@Amarlovetips`)
- **Authentication**: EIP-4361 SIWE signature (`/api/qp/auth/nonce` ➔ `personal_sign` ➔ `/api/qp/auth/verify`)
- **Referral Attachment**: `POST /api/qp/referrals/attach` with `{ code: "WNUGJZTA", source: "link" }`
- **Transaction Recording**: `POST /api/qp/checkin/tx` with `{ tx_hash: txHash }`

---

## 🛠️ Key Features

### 1. Hierarchical Deterministic (HD) Smart Wallets from a Single Seed Phrase
- **One BIP-39 Seed Phrase**: Generates and manages multiple EVM smart wallets (`m/44'/60'/0'/0/i`).
- **Create or Import**: Generate a new 12-word seed phrase or import an existing 12/24-word phrase.
- **Dynamic Derivation**: Add as many smart wallets as you need with a single click (`Wallet #1`, `Wallet #2`, `Wallet #3`...).
- **Safety First**: Your mnemonic and private keys are stored **exclusively in your browser's local storage** (`localStorage`) and never leave your device.
- **Address Formatting**: Seamless toggle between standard EVM `0x...` and Ronin `ronin:...` formats.
- **Send & Receive**:
  - **Send Modal**: Custom recipient, percentage presets (25%, 50%, 75%), and **MAX (Gas Reserved)** smart calculation.
  - **Receive Modal**: Address copying and interactive **QR Code** generated client-side.
  - **Export Key**: Individual private key export with warning prompts.

### 2. Daisy-Chain Relay Automated Daily Check-in
Instead of having to fund every single wallet individually:
1. **Fund only the first wallet** (Wallet #1) with a small amount of RON (e.g. 0.05 - 0.1 RON).
2. The engine authenticates Wallet #1 via SIWE signature and attaches your referral code `WNUGJZTA`.
3. Executes the daily check-in transaction on Ronin contract `0x9f065e324a68e8cfa0c999e285a4ab935dd12ad9`.
4. Submits the receipt to RRF Village API to update streaks and points.
5. Automatically transfers the maximum remaining balance (minus your configured safety reserve fee, e.g. 0.003 RON) to Wallet #2.
6. Waits for transaction confirmation on Ronin.
7. Switches to Wallet #2, executes daily check-in, relays funds to Wallet #3, and continues the daisy chain until all selected wallets complete their check-in!

### 3. Modular Websites & Quests Directory
- Built with a modular architecture allowing you to add future airdrops, testnet campaigns, and quest platforms.
- Includes a built-in "+ Add Website / Campaign" modal.

---

## 🚀 Running Locally

```bash
# Start development server
npm run dev

# Or build for production
npm run build

# Preview production build
npm run preview
```

Server will run at: `http://localhost:5173`
