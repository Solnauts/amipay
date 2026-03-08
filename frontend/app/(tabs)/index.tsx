import React, { useCallback, useState } from 'react';
import { ScrollView, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useWallet } from '@/context/WalletContext';
import { SafeAreaView } from 'react-native-safe-area-context';

// Home screen components
import { HomeHeader } from '@/components/home/HomeHeader';
import { BalanceSection } from '@/components/home/BalanceSection';
import { PeopleSection } from '@/components/home/PeopleSection';
import { FavouriteSection } from '@/components/home/FavouriteSection';
import { AIPayBanner } from '@/components/home/AIPayBanner';
import { WalletConnectScreen } from '@/components/home/WalletConnectScreen';
import { OnboardingScreen } from '@/components/home/OnboardingScreen';

import { useBalance } from '@/hooks/useBalance';

export default function HomeScreen() {
  const { authStep, connect } = useWallet();
  const { balance, refetch } = useBalance();

  const [refreshing, setRefreshing] = useState(false);

  // Re-fetch when screen gains focus
  useFocusEffect(
    useCallback(() => {
      if (authStep === 'ready') {
        refetch();
      }
    }, [authStep, refetch]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // ── Gate 1: Not connected ───────────────────────────────
  if (authStep === 'idle') {
    return <WalletConnectScreen onConnect={connect} authStep={authStep} />;
  }

  // ── Gate 2: Connecting / logging in ─────────────────────
  if (authStep === 'connecting' || authStep === 'logging_in') {
    return <WalletConnectScreen onConnect={connect} authStep={authStep} />;
  }

  // ── Gate 3: New user onboarding ─────────────────────────
  if (authStep === 'onboarding') {
    return <OnboardingScreen />;
  }

  // ── Home screen ─────────────────────────────────────────
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

        <BalanceSection
          balance={balance}
          connecting={false}
        />

        <PeopleSection />
        <FavouriteSection />
        <AIPayBanner />
      </ScrollView>
    </SafeAreaView>
  );
}