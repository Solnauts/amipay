// All Transactions Screen — opened from the "View all" link on Activities
// Full searchable + filterable transaction history

import React, { useState, useMemo } from 'react';
import { FlatList, ListRenderItem, TouchableOpacity, useColorScheme, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { ThemedView } from '@/components/ui/ThemedView';
import { ThemedText } from '@/components/ui/ThemedText';
import { SearchBar }        from '@/components/activity/SearchBar';
import { FilterPills }      from '@/components/activity/FilterPills';
import { TransactionGroup } from '@/components/activity/TransactionGroup';
import { useTransactions }  from '@/hooks/useTransactions';
import {
  FilterType,
  TransactionGroup as TxGroup,
  getFilteredGroups,
} from '@/utils/activityUtils';
import { Colors } from '@/constants/theme';

export default function AllTransactionsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const { transactions, isLoading, refresh } = useTransactions();
  const [refreshing, setRefreshing] = useState(false);

  const [filter, setFilter] = useState<FilterType>('all');
  const [query, setQuery] = useState('');

  const groups: TxGroup[] = useMemo(
    () => getFilteredGroups(transactions, filter, query),
    [transactions, filter, query],
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const renderGroup: ListRenderItem<TxGroup> = ({ item }) => (
    <TransactionGroup group={item} />
  );

  const keyExtractor = (item: TxGroup) => item.label;

  // ── Header rendered inside FlatList so it scrolls with the list ──────────
  const ListHeader = (
    <>
      {/* ── Top bar: back arrow + title + filter icon ── */}
      <ThemedView
        className="flex-row items-center justify-between px-6 pt-14 pb-4"
      >
        {/* Back button */}
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.7}
          className="w-9 h-9 rounded-full items-center justify-center"
          style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
        >
          <MaterialIcons name="arrow-back" size={18} color={colors.text} />
        </TouchableOpacity>

        {/* Title block */}
        <ThemedView className="flex-1 items-center">
          <ThemedText type="subtitle" variant="default">
            All Transactions
          </ThemedText>
          <ThemedText variant="muted" className="text-xs mt-0.5">
            {transactions.length} total
          </ThemedText>
        </ThemedView>

      </ThemedView>

      {/* ── Search ── */}
      <SearchBar value={query} onChangeText={setQuery} />

      {/* ── Filter pills ── */}
      <FilterPills active={filter} onChange={setFilter} />
    </>
  );

  const EmptyState = (
    <ThemedView className="items-center justify-center py-20 px-8">
      <ThemedText className="text-4xl mb-3">🔍</ThemedText>
      <ThemedText type="defaultSemiBold" variant="default" className="text-base mb-1">
        No transactions found
      </ThemedText>
      <ThemedText variant="muted" className="text-sm text-center">
        Try a different search or change the filter.
      </ThemedText>
    </ThemedView>
  );

  return (
    <ThemedView variant="default" className="flex-1">
      <FlatList
        data={groups}
        keyExtractor={keyExtractor}
        renderItem={renderGroup}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={isLoading && !refreshing ? (
          <ThemedView className="py-20 italic">
            <ThemedText className="text-center" variant="muted">Refreshing transactions...</ThemedText>
          </ThemedView>
        ) : EmptyState}
        contentContainerStyle={{ paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      />
    </ThemedView>
  );
}
