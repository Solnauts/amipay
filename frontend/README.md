# CryptoPay — Frontend

A React Native mobile app for Solana-based crypto payments, built with Expo. Connect your Solana wallet, view your balance, and send SOL to contacts — all with a clean, themed UI.

---

## Prerequisites

Make sure you have the following installed before starting:

| Tool | Version | Install |
|---|---|---|
| **Node.js** | 18+ | [nodejs.org](https://nodejs.org) |
| **npm** | 9+ | Included with Node |
| **Java JDK** | 17 | [Adoptium](https://adoptium.net) |
| **Android SDK** | API 34+ | Via [Android Studio](https://developer.android.com/studio) |

**Set these environment variables** in your `~/.zshrc` or `~/.bashrc`:

```bash
export JAVA_HOME=/path/to/jdk-17
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

---

## Getting Started

### 1. Install dependencies

```bash
cd frontend
npm install
```

### 2. Run on Android (physical device or emulator)

> ⚠️ This app uses **native modules** (Solana wallet adapter, quick-crypto). It **cannot** run in Expo Go — you must use a custom development build.

```bash
# Connect your Android device via USB with USB debugging enabled, then:
npx expo run:android
```

This will:
- Compile native code (takes ~2–3 min on first run)
- Install and launch the app on your device

### 3. After the first native build — start Metro only

Once the native app is installed on your device, you don't need to rebuild every time:

```bash
npx expo start --clear
```

Press `a` to open on Android, or scan the QR code with the Expo app.

---

## Project Structure

```
frontend/
├── app/
│   ├── _layout.tsx               # Root layout — wraps app in WalletProvider
│   └── (tabs)/
│       └── index.tsx             # Home screen (composes all home components)
├── components/
│   ├── home/                     # Home screen components
│   │   ├── HomeHeader.tsx        # Wallet avatar + clock/QR icons header
│   │   ├── BalanceSection.tsx    # Balance + Deposit/Claim buttons + token pills
│   │   ├── RecentContacts.tsx    # Horizontally scrollable contacts row
│   │   ├── RecentTransactions.tsx # Transaction list with empty state
│   │   └── homeData.ts           # Mock contacts & transactions data + types
│   └── ui/                       # Reusable UI kit
│       ├── ButtonComponent.tsx   # Themed button (primary/success/error variants)
│       ├── ThemedText.tsx        # Text with automatic dark/light colors
│       └── ThemedView.tsx        # View with automatic dark/light background
├── context/
│   └── WalletContext.tsx         # Solana wallet state, connect/disconnect hooks
├── constants/
│   └── theme.ts                  # Color tokens for light and dark mode
├── utils/
│   └── getPublicKey.ts           # Decodes base64 MWA address → Solana PublicKey
├── polyfill.js                   # Node.js polyfills (Buffer, process, URL)
├── index.js                      # App entry — imports polyfills before everything
├── metro.config.js               # Metro config + crypto/stream native aliases
├── tailwind.config.js            # NativeWind theme (darkMode: "media")
└── global.css                    # NativeWind base styles
```

---

## Wallet Connection

The app uses the official [Solana Mobile Wallet Adapter](https://github.com/solana-mobile/mobile-wallet-adapter) to connect to any MWA-compatible wallet installed on the device.

**Supported wallets:**
- [Phantom](https://play.google.com/store/apps/details?id=app.phantom)
- [Solflare](https://play.google.com/store/apps/details?id=com.solflare.mobile)
- Any wallet implementing the MWA protocol

**To test:**
1. Install **Phantom** from the Play Store.
2. Create or import a Solana wallet.
3. Switch Phantom to **Devnet** in its settings.
4. Open the app → tap **Connect Wallet** → approve in Phantom.

---

## Theme System

Colors are defined in **one place** — `tailwind.config.js` — and applied everywhere via NativeWind. Dark mode automatically follows the device system setting.

To change the primary color:

```js
// tailwind.config.js
primary: {
  DEFAULT: "#22c55e",  // ← change this
},
```

Also update the matching value in `constants/theme.ts` to keep inline styles in sync.

---

## Key Commands

| Command | Description |
|---|---|
| `npx expo run:android` | Full native build + install on device |
| `npx expo start --clear` | Start Metro with cleared cache |
| `npx expo prebuild --clean` | Regenerate native Android/iOS folders |
| `npm run lint` | Run ESLint |

---

## Switching to Mainnet

The app currently runs on **Solana Devnet**. To switch to mainnet, change two places:

```ts
// app/(tabs)/index.tsx
const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');

// context/WalletContext.tsx
cluster: 'mainnet-beta',
```
