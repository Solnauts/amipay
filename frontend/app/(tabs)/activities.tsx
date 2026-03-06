// Activities Screen — wallet overview + recent transaction preview
// Reuses HomeHeader + BalanceSection from the home screen.
// "View all" navigates to /all-transactions for the full list.

import React, { useState, useMemo } from 'react';
import {
  ScrollView,
  RefreshControl,
  View,
  TouchableOpacity,
  useColorScheme,

} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

// ── Shared home components ─────────────────────────────────────────────────
import { HomeHeader }     from '@/components/home/HomeHeader';
import { BalanceSection } from '@/components/home/BalanceSection';

// ── Activity-specific components ───────────────────────────────────────────
// Change these lines (around line 22-24):
import { TokensSection }    from '@/components/wallet/TokensSection';
import { TransactionGroup } from '@/components/wallet/TransactionGroup';
import { ACTIVITY_TRANSACTIONS } from '@/components/wallet/activityData';
import {
  TransactionGroup as TxGroup,
  getFilteredGroups,
} from '@/utils/activityUtils';

import { ThemedView } from '@/components/ui/ThemedView';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors } from '@/constants/theme';

// Only show a preview of the most recent 3 transactions on the overview
const PREVIEW_COUNT = 3;

export default function ActivityScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [refreshing, setRefreshing] = useState(false);

  // Grab all groups (no filter/search on overview), then slice to preview
  const allGroups: TxGroup[] = useMemo(
    () => getFilteredGroups(ACTIVITY_TRANSACTIONS, 'all', ''),
    [],
  );

  // Show only the Today group (first group) for the preview, or first N items
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
    await new Promise((r) => setTimeout(r, 800));
    setRefreshing(false);
  };

  return (
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
        {/* ── Header — same as home ── */}
        <HomeHeader />

        {/* ── Balance — $4,234.23, Deposit/Withdraw ── */}
        <BalanceSection balance={null} connecting={false} />

        {/* ── Your Tokens — USDC / SOL / SEEKER ── */}
        <TokensSection />

        {/* ── Divider ── */}
        <ThemedView
          style={{
            height: 1,
            backgroundColor: colors.border,
            marginHorizontal: 24,
            marginBottom: 8,
          }}
        />

        {/* ── Recent Transactions header + "View all" link ── */}
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

        {/* ── Preview: most recent 3 transactions grouped by date ── */}
        {previewGroups.map((group) => (
          <TransactionGroup key={group.label} group={group} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
