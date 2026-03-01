// Activity Screen — 2nd tab
// Composes: ActivityHeader, SearchBar, FilterPills, TransactionGroup
// All state + logic lives here; components receive only what they need

import React, { useState, useMemo } from 'react';
import { FlatList, ListRenderItem } from 'react-native';
import { ThemedView } from '@/components/ui/ThemedView';
import { ThemedText } from '@/components/ui/ThemedText';
import { ActivityHeader } from '@/components/activity/ActivityHeader';
import { SearchBar } from '@/components/activity/SearchBar';
import { FilterPills } from '@/components/activity/FilterPills';
import { TransactionGroup } from '@/components/activity/TransactionGroup';
import { ACTIVITY_TRANSACTIONS } from '@/components/activity/activityData';
import {
  FilterType,
  TransactionGroup as TxGroup,
  getFilteredGroups,
} from '@/utils/activityUtils';

export default function ActivityScreen() {
  const [filter, setFilter] = useState<FilterType>('all');
  const [query, setQuery] = useState('');

  // Pure pipeline: filter → search → group (memoized, only recalculates when deps change)
  const groups: TxGroup[] = useMemo(
    () => getFilteredGroups(ACTIVITY_TRANSACTIONS, filter, query),
    [filter, query],
  );

  // ---------------------------------------------------------------------------
  // FlatList renderers — keeps JSX below clean
  // ---------------------------------------------------------------------------
  const renderGroup: ListRenderItem<TxGroup> = ({ item }) => (
    <TransactionGroup group={item} />
  );

  const keyExtractor = (item: TxGroup) => item.label;

  const ListHeader = (
    <>
      <ActivityHeader />
      <SearchBar value={query} onChangeText={setQuery} />
      <FilterPills active={filter} onChange={setFilter} />
    </>
  );

  const EmptyState = (
    <ThemedView className="items-center justify-center py-16 px-8">
      <ThemedText className="text-4xl mb-3">🔍</ThemedText>
      <ThemedText type="defaultSemiBold" variant="default" className="text-base mb-1">
        No transactions found
      </ThemedText>
      <ThemedText variant="muted" className="text-sm text-center">
        Try a different search or change the filter.
      </ThemedText>
    </ThemedView>
  );

  // ---------------------------------------------------------------------------
  return (
    <ThemedView variant="default" className="flex-1">
      <FlatList
        data={groups}
        keyExtractor={keyExtractor}
        renderItem={renderGroup}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={EmptyState}
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />
    </ThemedView>
  );
}
