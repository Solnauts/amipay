// Group Payment Screen — Cards tab
// 4-step flow:
//   'groups'  → list saved groups + create new
//   'members' → pick members from contacts
//   'amount'  → enter split / custom amounts
//   'confirm' → review + send

import React, { useState, useCallback } from 'react';
import { router } from 'expo-router';
import { ScrollView, TouchableOpacity, useColorScheme } from 'react-native';
import { ThemedView } from '@/components/ui/ThemedView';
import { ThemedText } from '@/components/ui/ThemedText';
import { GroupPaymentHeader } from '@/components/cards/GroupPaymentHeader';
import { CreateGroupButton } from '@/components/cards/CreateGroupButton';
import { GroupCard } from '@/components/cards/GroupCard';
import { MemberRow } from '@/components/cards/MemberRow';
import { SelectedMembersBar } from '@/components/cards/SelectedMembersBar';
import { SplitAmountStep, MemberAmounts } from '@/components/cards/SplitAmountStep';
import { ConfirmationStep } from '@/components/cards/ConfirmationStep';
import { CONTACTS, GROUPS, Contact, Group } from '@/components/cards/cardsData';
import { toggleMember, isMemberSelected } from '@/utils/cardsUtils';
import { Colors } from '@/constants/theme';

type Step = 'groups' | 'members' | 'amount' | 'confirm';

const STEP_SUBTITLES: Record<Step, string> = {
  groups:  'Select or create a group',
  members: 'Select group members',
  amount:  'Enter amounts',
  confirm: 'Confirm transaction',
};

export default function CardsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [step, setStep]         = useState<Step>('groups');
  const [selected, setSelected] = useState<Contact[]>([]);
  const [total, setTotal]       = useState(0);
  const [amounts, setAmounts]   = useState<MemberAmounts>({});

  // ── Navigation helpers ────────────────────────────────────────────
  const goBack = useCallback(() => {
    if (step === 'groups')  { router.replace('/'); return; }
    if (step === 'members') { setStep('groups');  setSelected([]); }
    if (step === 'amount')  { setStep('members'); }
    if (step === 'confirm') { setStep('amount');  }
  }, [step]);

  const handleGroupPress = (_group: Group) => {
    setSelected([]);
    setStep('members');
  };

  const handleCreateGroup = () => {
    setSelected([]);
    setStep('members');
  };

  const handleMemberToggle = useCallback((contact: Contact) => {
    setSelected((prev) => toggleMember(prev, contact));
  }, []);

  const handleMemberRemove = useCallback((contact: Contact) => {
    setSelected((prev) => prev.filter((c) => c.id !== contact.id));
  }, []);

  const handleMemberContinue = () => {
    if (selected.length > 0) setStep('amount');
  };

  const handleAmountContinue = (t: number, a: MemberAmounts) => {
    setTotal(t);
    setAmounts(a);
    setStep('confirm');
  };

  const handleSend = () => {
    // TODO: submit to blockchain
    router.replace('/');
  };

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <ThemedView variant="default" className="flex-1">
      <GroupPaymentHeader
        subtitle={STEP_SUBTITLES[step]}
        showBack={true}
        onBack={goBack}
      />

      {/* ── Step 1: Groups list ── */}
      {step === 'groups' && (
        <ScrollView showsVerticalScrollIndicator={false}>
          <CreateGroupButton onPress={handleCreateGroup} />
          <ThemedText variant="muted" className="px-6 text-xs font-semibold tracking-widest mb-3">
            Your Groups
          </ThemedText>
          {GROUPS.map((group) => (
            <GroupCard key={group.id} group={group} onPress={handleGroupPress} />
          ))}
        </ScrollView>
      )}

      {/* ── Step 2: Member selection ── */}
      {step === 'members' && (
        <>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 100 }}
            keyboardShouldPersistTaps="handled"
          >
            <SelectedMembersBar selected={selected} onRemove={handleMemberRemove} />
            <ThemedText variant="muted" className="px-6 text-xs font-semibold tracking-widest mb-3">
              Select Members
            </ThemedText>
            {CONTACTS.map((contact) => (
              <MemberRow
                key={contact.id}
                contact={contact}
                isSelected={isMemberSelected(selected, contact)}
                onPress={handleMemberToggle}
              />
            ))}
          </ScrollView>

          {/* Sticky Continue */}
          <ThemedView
            variant="default"
            className="absolute bottom-0 left-0 right-0 px-6 pb-6 pt-3"
            style={{ borderTopWidth: 1, borderTopColor: colors.border }}
          >
            <TouchableOpacity
              onPress={handleMemberContinue}
              activeOpacity={selected.length > 0 ? 0.85 : 1}
              className="rounded-2xl py-4 items-center"
              style={{ backgroundColor: selected.length > 0 ? colors.text : colors.muted }}
            >
              <ThemedText
                type="defaultSemiBold"
                className="text-base"
                style={{ color: selected.length > 0 ? colors.background : colors.mutedForeground }}
              >
                Continue ({selected.length} selected)
              </ThemedText>
            </TouchableOpacity>
          </ThemedView>
        </>
      )}

      {/* ── Step 3: Split amount ── */}
      {step === 'amount' && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
        >
          <SplitAmountStep members={selected} onContinue={handleAmountContinue} />
        </ScrollView>
      )}

      {/* ── Step 4: Confirm & send ── */}
      {step === 'confirm' && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
        >
          <ConfirmationStep
            members={selected}
            amounts={amounts}
            total={total}
            onSend={handleSend}
          />
        </ScrollView>
      )}
    </ThemedView>
  );
}
