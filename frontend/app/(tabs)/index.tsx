import React, { useEffect, useState } from 'react';
import { SafeAreaView, ScrollView, RefreshControl } from 'react-native';
import { Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useWallet } from '@/context/WalletContext';

import { HomeHeader } from '@/components/home/HomeHeader';
import { BalanceSection } from '@/components/home/BalanceSection';
import { RecentContacts } from '@/components/home/RecentContacts';
import { RecentTransactions } from '@/components/home/RecentTransactions';

const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

export default function HomeScreen() {
  const { publicKey, isConnected, connecting, connect } = useWallet();
  const [balance, setBalance] = useState<number | null>(null);
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

  return (
    <SafeAreaView className="flex-1 bg-background dark:bg-background-dark">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#22c55e"
            colors={['#22c55e']}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <HomeHeader />
        <BalanceSection balance={balance} connecting={connecting} />
        <RecentContacts />
        <RecentTransactions isConnected={isConnected} onConnect={connect} />
      </ScrollView>
    </SafeAreaView>
  );
}
