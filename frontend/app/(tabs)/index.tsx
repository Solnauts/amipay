import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  View,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  useColorScheme,
} from 'react-native';
import { Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { ThemedText } from '@/components/ui/ThemedText';
import { ThemedView } from '@/components/ui/ThemedView';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ButtonComponent } from '@/components/ui/ButtonComponent';
import { useWallet } from '@/context/WalletContext';

const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

export default function HomeScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';

  const { publicKey, isConnected, connecting, connect, disconnect } = useWallet();
  const [balance, setBalance] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const displayKey = publicKey
    ? `${publicKey.toBase58().slice(0, 5)}...${publicKey.toBase58().slice(-4)}`
    : null;

  const fetchBalance = async () => {
    if (!publicKey) return;
    try {
      const lamports = await connection.getBalance(publicKey);
      setBalance(lamports / LAMPORTS_PER_SOL);
    } catch (e) {
      console.error('Balance fetch failed:', e);
    }
  };

  useEffect(() => {
    if (isConnected) fetchBalance();
    else setBalance(null);
  }, [isConnected, publicKey]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchBalance();
    setRefreshing(false);
  };

  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-background-dark">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#22c55e"
            colors={['#22c55e']}
          />
        }
      >
        <ThemedView className="flex-1 px-6 pt-12 pb-8">

          {/* ── Header ─────────────────────────── */}
          <ThemedView className="flex-row items-center justify-between mb-8">
            <ThemedView>
              <ThemedText variant="secondary" className="text-sm">My Wallet</ThemedText>
              <ThemedText variant="default" className="font-bold text-2xl">CryptoPay</ThemedText>
            </ThemedView>

            {isConnected ? (
              <TouchableOpacity
                onPress={disconnect}
                className="flex-row items-center gap-2 bg-surface dark:bg-surface-dark border border-border dark:border-border-dark px-3 py-2 rounded-xl"
              >
                <View className="w-2 h-2 rounded-full bg-success" />
                <ThemedText variant="default" className="text-xs font-medium">{displayKey}</ThemedText>
                <IconSymbol
                  name="rectangle.portrait.and.arrow.right"
                  size={14}
                  color={isDark ? '#9ca3af' : '#6b7280'}
                />
              </TouchableOpacity>
            ) : (
              <View className="w-2.5 h-2.5 rounded-full bg-error" />
            )}
          </ThemedView>

          {/* ── Balance Cards ─────────────────── */}
          {isConnected ? (
            <ThemedView className="flex-row gap-3 mb-8">

              {/* Card 1 — Connected Wallet (on-chain) */}
              <ThemedView className="flex-1 bg-primary rounded-2xl border border-border dark:border-border-dark p-5">
                <ThemedText className="text-white text-xs mb-2 opacity-80">
                  🔗 Wallet Balance
                </ThemedText>
                {balance === null ? (
                  <ThemedText className="text-white font-bold text-2xl">...</ThemedText>
                ) : (
                  <ThemedView className="flex-row items-end gap-1 bg-transparent">
                    <ThemedText className="text-white font-bold text-3xl">
                      {balance.toFixed(4)}
                    </ThemedText>
                    {/* <ThemedText className="text-white text-sm opacity-80 mb-1">SOL</ThemedText> */}
                  </ThemedView>
                )}
                <ThemedText className="text-white text-xs opacity-50 mt-2">Devnet</ThemedText>
              </ThemedView>

              {/* Card 2 — App Virtual Wallet (backend) */}
              <ThemedView className="flex-1 bg-surface-elevated dark:bg-surface-elevated-dark border border-border dark:border-border-dark rounded-2xl p-5">
                <ThemedText variant="secondary" className="text-xs mb-2">
                  💳 App Wallet
                </ThemedText>
                <ThemedView className="flex-row items-end gap-1 bg-transparent">
                  <ThemedText variant="default" className="font-bold text-3xl">0.00</ThemedText>
                  {/* <ThemedText variant="secondary" className="text-sm mb-1">SOL</ThemedText> */}
                </ThemedView>
                <ThemedText variant="muted" className="text-xs mt-2">No wallet fee</ThemedText>
              </ThemedView>

            </ThemedView>
          ) : (
            /* Not connected — single card with connect button */
            <ThemedView className="bg-primary rounded-2xl p-6 mb-8 items-center w-full">
              <ThemedText className="text-white text-sm mb-4 opacity-80">
                Connect your wallet to see balance
              </ThemedText>
              <ButtonComponent
                label="Connect Wallet"
                onPress={connect}
                loading={connecting}
                icon="wallet.pass.fill"
                variant="primary"
              />
            </ThemedView>
          )}

          {/* ── Deposite Button ─────────────────── */}
 <ButtonComponent
        label="Deposit To App Wallet"
      onPress={()=>{}}
      loading={false}
      icon="wallet.pass.fill"
      variant="primary"
    />
          {/* ── Quick Actions ─────────────────── */}
          <ThemedText variant="default" className="font-semibold text-lg mb-4">
            Quick Actions
          </ThemedText>
          <ThemedView className="flex-row gap-3 mb-8">
            <ActionCard icon="paperplane.fill"       label="Send"    iconColor="#6366f1" bgOpacity="20" />
            <ActionCard icon="arrow.down.circle.fill" label="Receive" iconColor="#22c55e" bgOpacity="20" />
            <ActionCard icon="arrow.left.arrow.right" label="Swap"    iconColor="#f59e0b" bgOpacity="20" />
          </ThemedView>

          {/* ── Recent Activity ────────────────── */}
          <ThemedText variant="default" className="font-semibold text-lg mb-4">
            Recent Activity
          </ThemedText>
          <ThemedView className="bg-surface dark:bg-surface-dark rounded-2xl p-6 items-center border border-border dark:border-border-dark">
            {isConnected ? (
              <>
                <IconSymbol name="clock" size={32} color="#9ca3af" />
                <ThemedText variant="muted" className="text-sm mt-3 text-center">
                  No transactions yet.{'\n'}Start by sending or receiving SOL.
                </ThemedText>
              </>
            ) : (
              <>
                <IconSymbol name="lock.fill" size={32} color="#9ca3af" />
                <ThemedText variant="muted" className="text-sm mt-3 text-center">
                  Connect your wallet{'\n'}to see your transactions.
                </ThemedText>
                <TouchableOpacity onPress={connect} className="mt-4">
                  <ThemedText className="text-primary text-sm font-semibold">
                    Connect Wallet →
                  </ThemedText>
                </TouchableOpacity>
              </>
            )}
          </ThemedView>

        </ThemedView>
      </ScrollView>
    </SafeAreaView>
  );
}

function ActionCard({
  icon, label, iconColor, bgOpacity,
}: {
  icon: any;
  label: string;
  iconColor: string;
  bgOpacity: string;
}) {
  return (
    <TouchableOpacity className="flex-1 items-center bg-surface dark:bg-surface-dark border border-border dark:border-border-dark rounded-2xl py-4 gap-2">
      <View
        className="w-12 h-12 rounded-full items-center justify-center"
        style={{ backgroundColor: `${iconColor}${bgOpacity}` }}
      >
        <IconSymbol name={icon} size={22} color={iconColor} />
      </View>
      <ThemedText variant="default" className="text-sm font-medium">{label}</ThemedText>
    </TouchableOpacity>
  );
}
