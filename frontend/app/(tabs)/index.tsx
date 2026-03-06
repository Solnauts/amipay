import React, { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, RefreshControl } from 'react-native';
import { useWallet } from '@/context/WalletContext';

// Home screen components
import { HomeHeader }          from '@/components/home/HomeHeader';
import { BalanceSection }      from '@/components/home/BalanceSection';
import { PeopleSection }       from '@/components/home/PeopleSection';
import { FavouriteSection }    from '@/components/home/FavouriteSection';
import { AIPayBanner }         from '@/components/home/AIPayBanner';
import { WalletConnectScreen } from '@/components/home/WalletConnectScreen';
import { OnboardingScreen }    from '@/components/home/OnboardingScreen';
import { userService }         from '@/src/services/api/UserService';

export default function HomeScreen() {
  const { authStep, connect } = useWallet();
  const [balance, setBalance]     = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBalance = async () => {
    try {
      const usdc = await userService.getUsdcBalance();
      console.log('[Balance] API returned:', usdc, typeof usdc);
      // usdc may be undefined if service swallows error — guard with ?? null
      setBalance(typeof usdc === 'number' ? usdc : null);
    } catch (e) {
      console.warn('[Balance] fetch failed:', e);
      setBalance(null);
    }
  };

  useEffect(() => {
    if (authStep === 'ready') fetchBalance();
    else setBalance(null);
  }, [authStep]);

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
        authStep={authStep}
      />
    );
  }

  // ── Gate 2: MWA connecting / signing / calling backend ───────────────────
  if (authStep === 'connecting' || authStep === 'logging_in') {
    return (
      <WalletConnectScreen
        onConnect={connect}
        authStep={authStep}
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
