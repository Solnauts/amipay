import React, { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, RefreshControl } from 'react-native';
import { Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useWallet } from '@/context/WalletContext';

// Home screen components — each has a single responsibility
import { HomeHeader }          from '@/components/home/HomeHeader';
import { BalanceSection }      from '@/components/home/BalanceSection';
import { PeopleSection }       from '@/components/home/PeopleSection';
import { FavouriteSection }    from '@/components/home/FavouriteSection';
import { AIPayBanner }         from '@/components/home/AIPayBanner';
import { WalletConnectScreen } from '@/components/home/WalletConnectScreen';

const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

export default function HomeScreen() {
  const { publicKey, isConnected, connecting, connect } = useWallet();
  const [balance, setBalance]       = useState<number | null>(null);
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
    if (isConnected) fetchBalance();
    else setBalance(null);
  }, [isConnected, publicKey]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchBalance();
    setRefreshing(false);
  };

  // ── Gate: show connect screen until wallet is connected ──────────────────
  if (!isConnected) {
    return <WalletConnectScreen onConnect={connect} connecting={connecting} />;
  }

  // ── Home screen (wallet connected) ──────────────────────────────────────
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
        {/* Header — wallet avatar, account name, icon tray */}
        <HomeHeader />

        {/* Balance — dollar amount, Deposit/Withdraw buttons */}
        <BalanceSection balance={balance} connecting={connecting} />

        {/* People — 2-row avatar grid of recent contacts */}
        <PeopleSection />

        {/* Favourite — pinned contacts + Add button */}
        <FavouriteSection />

        {/* AI Pay promo banner */}
        <AIPayBanner />
      </ScrollView>
    </SafeAreaView>
  );
}
