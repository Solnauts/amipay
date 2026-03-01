# CryptoPay — Frontend

A React Native mobile app for Solana-based crypto payments, built with Expo. Connect your Solana wallet, view your balance, and send SOL to contacts — all with a clean, themed UI.

---

## 🛠 Full Setup Guide (for new team members)

Follow every step in order. Skipping steps is the #1 cause of build failures.

---

### Step 1 — Install Homebrew (if not already installed)

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Verify:
```bash
brew --version
```

---

### Step 2 — Install Node.js 18+

```bash
brew install node@18
```

Verify:
```bash
node --version   # should print v18.x.x or higher
npm --version    # should print 9.x.x or higher
```

---

### Step 3 — Install Java 17 (Temurin)

> ⚠️ **This is the most commonly missed step.** Android builds (Gradle) require Java 17 exactly. Do not use Java 11 or Java 21.

```bash
brew install --cask temurin@17
```

---

### Step 4 — Install Android Studio

1. Download from [developer.android.com/studio](https://developer.android.com/studio)
2. Open Android Studio → go through the setup wizard
3. In **SDK Manager** (`Settings → Languages & Frameworks → Android SDK`), make sure these are installed:
   - **Android SDK Platform 34**
   - **Android SDK Build-Tools 34**
   - **Android Emulator** (if using an emulator)
   - **Android SDK Platform-Tools** (has `adb`)

---

### Step 5 — Set Environment Variables (permanent)

Add the following to your `~/.zshrc` (or `~/.bashrc` if using bash):

```bash
# Java 17
export JAVA_HOME=$(/usr/libexec/java_home -v 17)

# Android SDK
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin
export PATH=$PATH:$ANDROID_HOME/emulator
```

Then reload your shell:
```bash
source ~/.zshrc
```

Verify everything:
```bash
java -version       # openjdk version "17.x.x"
adb --version       # Android Debug Bridge version x.x.x
echo $ANDROID_HOME  # /Users/<you>/Library/Android/sdk
```

---

### Step 6 — Install project dependencies

```bash
cd frontend
npm install
```

---

### Step 7 — Connect your Android device

1. On your Android phone go to **Settings → About Phone** → tap **Build Number** 7 times to enable Developer Options
2. Go to **Settings → Developer Options** → enable **USB Debugging**
3. Plug your phone in via USB
4. Run `adb devices` — you should see your device listed

---

### Step 8 — Run the app

> ⚠️ This app uses **native modules** (Solana wallet adapter, quick-crypto). It **cannot** run in Expo Go — a custom dev build is required.

```bash
npx expo run:android
```

This compiles native code and installs the app on your device (~2–3 min on first run).

### After the first build — Metro only

Once the native app is installed, you don't need to rebuild every time:

```bash
npx expo start --clear
```

Press `a` to reload on Android.

---

## Project Structure

```
frontend/
├── app/
│   ├── _layout.tsx               # Root layout — wraps app in WalletProvider
│   └── (tabs)/
│       └── index.tsx             # Home screen
├── components/
│   ├── home/                     # Home screen components
│   │   ├── HomeHeader.tsx        # Wallet avatar + clock/QR icons header
│   │   ├── BalanceSection.tsx    # Balance + Deposit/Claim buttons + token pills
│   │   ├── RecentContacts.tsx    # Horizontally scrollable contacts row
│   │   ├── RecentTransactions.tsx# Transaction list with empty state
│   │   └── homeData.ts           # Mock contacts & transactions data + types
│   └── ui/                       # Reusable UI kit
│       ├── ButtonComponent.tsx   # Themed button (primary/success/error variants)
│       ├── CustomTabBar.tsx      # Custom bottom tab bar
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

## Wallet Connection

The app uses the [Solana Mobile Wallet Adapter](https://github.com/solana-mobile/mobile-wallet-adapter).

**Supported wallets:**
- [Phantom](https://play.google.com/store/apps/details?id=app.phantom)
- [Solflare](https://play.google.com/store/apps/details?id=com.solflare.mobile)
- Any MWA-compatible wallet

**To test:**
1. Install **Phantom** from the Play Store.
2. Create or import a Solana wallet.
3. Switch Phantom to **Devnet** in its settings.
4. Open the app → tap **Connect Wallet** → approve in Phantom.

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

---

## Common Errors

| Error | Cause | Fix |
|---|---|---|
| `Unable to locate a Java Runtime` | Java not installed | Follow Step 3 above |
| `JAVA_HOME is set to an invalid directory` | Env var set but Java not installed | Run `brew install --cask temurin@17` then re-add to `~/.zshrc` |
| `adb: command not found` | platform-tools not on PATH | Check Step 5 env vars |
| `No devices found` | USB debugging not enabled | Follow Step 7 |
| App crashes on launch | Native build outdated | Run `npx expo run:android` again |

---

## 🧩 How to Create a New Feature / Screen

All screens follow a strict **4-layer pattern**. Stick to it and the codebase stays clean.

```
data file      →  components/[feature]/featureData.ts
utils file     →  utils/featureUtils.ts
components     →  components/[feature]/MyComponent.tsx
screen         →  app/(tabs)/featureName.tsx
```

---

### Layer 1 — Data file (`featureData.ts`)

Define your types and mock data here. No UI logic.

```ts
// components/activity/activityData.ts
export type Transaction = {
  id: string;
  name: string;
  amount: number;
  type: 'sent' | 'received';
  date: Date;
};

export const TRANSACTIONS: Transaction[] = [
  { id: '1', name: 'Mom', amount: 50, type: 'sent', date: new Date() },
];
```

---

### Layer 2 — Utils file (`utils/featureUtils.ts`)

Pure functions only — no imports of React or UI components. Easy to test.

```ts
// utils/activityUtils.ts
export function filterByType(txs: Transaction[], type: string) {
  if (type === 'all') return txs;
  return txs.filter((tx) => tx.type === type);
}
```

---

### Layer 3 — Components (`components/[feature]/MyComponent.tsx`)

**Rules:**
- Always use `ThemedView` / `ThemedText` — never `View`/`Text` with hardcoded colors
- Use `Colors[colorScheme]` for any color that can't be expressed as a NativeWind class
- Use NativeWind `className` for layout, spacing, sizing
- Keep each component to a single responsibility (one job, one file)

```tsx
// components/activity/TransactionCard.tsx
import { ThemedView } from '@/components/ui/ThemedView';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors } from '@/constants/theme';
import { useColorScheme } from 'react-native';

type Props = { transaction: Transaction };

export function TransactionCard({ transaction }: Props) {
  const colors = Colors[useColorScheme() ?? 'light'];

  return (
    <ThemedView
      variant="surface"
      className="flex-row items-center rounded-2xl p-4 mx-6 mb-3"
      style={{ borderWidth: 1, borderColor: colors.border }}
    >
      <ThemedText type="defaultSemiBold">{transaction.name}</ThemedText>
      <ThemedText variant="muted">{transaction.amount} USDC</ThemedText>
    </ThemedView>
  );
}
```

---

### Layer 4 — Screen (clean composer)

The screen file owns **state only**. All logic goes to utils, all UI goes to components.

```tsx
// app/(tabs)/activities.tsx
import React, { useState, useMemo } from 'react';
import { FlatList } from 'react-native';
import { ThemedView } from '@/components/ui/ThemedView';
import { filterByType } from '@/utils/activityUtils';
import { TRANSACTIONS } from '@/components/activity/activityData';
import { TransactionCard } from '@/components/activity/TransactionCard';

export default function ActivityScreen() {
  const [filter, setFilter] = useState('all');

  // Logic lives in utils, not here
  const filtered = useMemo(
    () => filterByType(TRANSACTIONS, filter),
    [filter],
  );

  return (
    <ThemedView variant="default" className="flex-1">
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <TransactionCard transaction={item} />}
      />
    </ThemedView>
  );
}
```

---

### Quick rules summary

| Rule | Why |
|---|---|
| Always `ThemedView` / `ThemedText` | Automatic dark/light mode |
| Colors from `Colors[colorScheme]` | Single source of truth, easy to update |
| NativeWind `className` for layout | Consistent spacing, no magic numbers |
| `StyleSheet` only when NativeWind can't | e.g. shadows, `LinearGradient` children |
| State only in the screen file | Keeps components pure and reusable |
| Logic only in `utils/` | Easy to test, no UI coupling |

