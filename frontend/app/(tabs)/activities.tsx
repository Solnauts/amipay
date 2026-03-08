import React, { useState, useMemo, useCallback } from 'react';
import {
  ScrollView,
  RefreshControl,
  View,
  TouchableOpacity,
  useColorScheme,
  ActivityIndicator,
} from 'react-native';

import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';

// ── Shared home components ─────────────────────────────────────────────────
import { HomeHeader } from '@/components/home/HomeHeader';
import { BalanceSection } from '@/components/home/BalanceSection';

// ── Activity-specific components ───────────────────────────────────────────
import { TokensSection } from '@/components/activity/TokensSection';
import { TransactionGroup } from '@/components/activity/TransactionGroup';

import { useTransactions } from '@/hooks/useTransactions';
import { useBalance } from '@/hooks/useBalance';

import {
  TransactionGroup as TxGroup,
  getFilteredGroups,
} from '@/utils/activityUtils';

import { ThemedView } from '@/components/ui/ThemedView';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors } from '@/constants/theme';

const PREVIEW_COUNT = 3;

export default function ActivityScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const { transactions, isLoading, refresh } = useTransactions();
  const { balance, refetch: refetchBalance } = useBalance();

  const [refreshing, setRefreshing] = useState(false);

  // Sync balance when screen gains focus
  useFocusEffect(
    useCallback(() => {
      refetchBalance();
    }, [refetchBalance]),
  );

  const allGroups: TxGroup[] = useMemo(
    () => getFilteredGroups(transactions, 'all', ''),
    [transactions],
  );

  const previewGroups: TxGroup[] = useMemo(() => {
    let count = 0;
    const result: TxGroup[] = [];

    for (const group of allGroups) {
      if (count >= PREVIEW_COUNT) break;

      const sliced = group.data.slice(0, PREVIEW_COUNT - count);
      result.push({ label: group.label, data: sliced });

      count += sliced.length;
    }

    return result;
  }, [allGroups]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refresh(), refetchBalance()]);
    setRefreshing(false);
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView className="flex-1 bg-background dark:bg-background-dark">
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 48 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >
          {/* Header */}
          <HomeHeader />

          {/* Balance */}
          <BalanceSection balance={balance} connecting={false} />

          {/* Tokens */}
          <TokensSection />

          {/* Divider */}
          <ThemedView
            style={{
              height: 1,
              backgroundColor: colors.border,
              marginHorizontal: 24,
              marginBottom: 8,
            }}
          />

          {/* Recent Transactions header */}
          <ThemedView className="flex-row items-center justify-between px-6 mb-2 mt-2">
            <ThemedText type="defaultSemiBold" variant="default" className="text-base">
              Recent Transaction
            </ThemedText>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push('/all-transactions')}
            >
              <ThemedText
                className="text-sm font-semibold"
                style={{ color: colors.primary }}
              >
                View all
              </ThemedText>
            </TouchableOpacity>
          </ThemedView>

          {/* Loading */}
          {isLoading && !refreshing && (
            <View style={{ paddingVertical: 40 }}>
              <ActivityIndicator color={colors.primary} />
              <ThemedText
                variant="muted"
                style={{ textAlign: 'center', marginTop: 12 }}
              >
                Fetching latest activity...
              </ThemedText>
            </View>
          )}

          {/* Empty state */}
          {!isLoading && previewGroups.length === 0 && (
            <View style={{ paddingVertical: 60, paddingHorizontal: 32 }}>
              <ThemedText
                variant="muted"
                style={{ textAlign: 'center', fontSize: 13 }}
              >
                No recent transactions found
              </ThemedText>
            </View>
          )}

          {/* Transactions preview */}
          {previewGroups.map((group) => (
            <TransactionGroup key={group.label} group={group} />
          ))}
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}