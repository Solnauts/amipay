import React, { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, RefreshControl, ActivityIndicator, View } from 'react-native';
import { Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useWallet } from '@/context/WalletContext';

// Home screen components
import { HomeHeader }          from '@/components/home/HomeHeader';
import { BalanceSection }      from '@/components/home/BalanceSection';
import { PeopleSection }       from '@/components/home/PeopleSection';
import { FavouriteSection }    from '@/components/home/FavouriteSection';
import { AIPayBanner }         from '@/components/home/AIPayBanner';
import { WalletConnectScreen } from '@/components/home/WalletConnectScreen';
import { OnboardingScreen }    from '@/components/home/OnboardingScreen';
import { Colors }              from '@/constants/theme';

const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

export default function HomeScreen() {
  const { publicKey, authStep, connect } = useWallet();
  const [balance, setBalance]     = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

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
    if (authStep === 'ready') fetchBalance();
    else setBalance(null);
  }, [authStep, publicKey]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchBalance();
    setRefreshing(false);
  };

  // ── Gate 1: Not connected at all ─────────────────────────────────────────
  if (authStep === 'idle') {
    return (
      <WalletConnectScreen
        onConnect={connect}
        connecting={false}
      />
    );
  }

  // ── Gate 2: MWA connecting / signing / calling backend ───────────────────
  if (authStep === 'connecting' || authStep === 'logging_in') {
    return (
      <WalletConnectScreen
        onConnect={connect}
        connecting={true}
      />
    );
  }

  // ── Gate 3: New user — pick alias + PIN ──────────────────────────────────
  if (authStep === 'onboarding') {
    return <OnboardingScreen />;
  }

  // ── Home screen (authStep === 'ready') ───────────────────────────────────
  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-background-dark">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#8B5CF6"
            colors={['#8B5CF6']}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <HomeHeader />
        <BalanceSection balance={balance} connecting={false} />
        <PeopleSection />
        <FavouriteSection />
        <AIPayBanner />
      </ScrollView>
    </SafeAreaView>
  );
}
