import React, { useCallback, useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useWallet } from '@/context/WalletContext';

// Home screen components
import { HomeHeader } from '@/components/home/HomeHeader';
import { BalanceSection } from '@/components/home/BalanceSection';
import { PeopleSection } from '@/components/home/PeopleSection';
import { FavouriteSection } from '@/components/home/FavouriteSection';
import { AIPayBanner } from '@/components/home/AIPayBanner';
import { WalletConnectScreen } from '@/components/home/WalletConnectScreen';
import { OnboardingScreen } from '@/components/home/OnboardingScreen';
import { useBalance } from '@/hooks/useBalance';
import { userService } from '@/src/services/api/UserService';

export default function HomeScreen() {
  const { authStep, connect } = useWallet();
  const { balance, refetch, isLoading } = useBalance();
  const [refreshing, setRefreshing] = useState(false);

  // Re-fetch every time the home tab gains focus
  useFocusEffect(
    useCallback(() => {
      if (authStep === 'ready') refetch();
    }, [authStep, refetch]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
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
