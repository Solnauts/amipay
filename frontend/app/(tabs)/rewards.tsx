// Send Payment Screen — Rewards tab (4th tab)
// 3-step flow:
//   'contacts' → search + pick a recipient
//   'amount'   → token selector, amount input, quick pills
//   'confirm'  → review details, confirm & send

import React, { useState, useMemo } from 'react';
import { ScrollView, useColorScheme } from 'react-native';
import { router } from 'expo-router';
import { ThemedView } from '@/components/ui/ThemedView';
import { ThemedText } from '@/components/ui/ThemedText';
import { GroupPaymentHeader } from '@/components/cards/GroupPaymentHeader';
import { SearchBar } from '@/components/activity/SearchBar';
import { ContactRow } from '@/components/send/ContactRow';
import { AmountStep, TokenType } from '@/components/send/AmountStep';
import { SendConfirmation } from '@/components/send/SendConfirmation';
import { CONTACTS, Contact } from '@/components/cards/cardsData';

type Step = 'contacts' | 'amount' | 'confirm';

const STEP_SUBTITLES: Record<Step, string> = {
  contacts: 'Select recipient',
  amount:   'Enter amount',
  confirm:  'Confirm transaction',
};

// Contacts shown in "Recent" vs "All Contacts" sections
const RECENT_IDS  = ['c2', 'c1', 'c3'];       // Dad, Mom, Brother
const ALL_IDS     = CONTACTS.map((c) => c.id).filter((id) => !RECENT_IDS.includes(id));

export default function RewardsScreen() {
  const colorScheme = useColorScheme() ?? 'light';

  const [step, setStep]           = useState<Step>('contacts');
  const [query, setQuery]         = useState('');
  const [recipient, setRecipient] = useState<Contact | null>(null);
  const [amount, setAmount]       = useState(0);
  const [token, setToken]         = useState<TokenType>('USDC');

  // ── Navigation ────────────────────────────────────────────────────
  const goBack = () => {
    if (step === 'contacts') { router.replace('/'); return; }
    if (step === 'amount')   setStep('contacts');
    if (step === 'confirm')  setStep('amount');
  };

  const handleContactSelect = (contact: Contact) => {
    setRecipient(contact);
    setStep('amount');
  };

  const handleAmountContinue = (amt: number, tok: TokenType) => {
    setAmount(amt);
    setToken(tok);
    setStep('confirm');
  };

  const handleSend = () => {
    // TODO: submit real Solana transaction
    router.replace('/');
  };

  // ── Filtered contacts for search ──────────────────────────────────
  const recentContacts = useMemo(
    () => CONTACTS.filter((c) => RECENT_IDS.includes(c.id)),
    [],
  );
  const allContacts = useMemo(
    () => CONTACTS.filter((c) => ALL_IDS.includes(c.id)),
    [],
  );
  const searchResults = useMemo(() => {
    if (!query.trim()) return null;
    const q = query.toLowerCase();
    return CONTACTS.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.shortAddress.toLowerCase().includes(q),
    );
  }, [query]);

  // ── Render ────────────────────────────────────────────────────────
  return (
    <ThemedView variant="default" className="flex-1">
      <GroupPaymentHeader
        subtitle={STEP_SUBTITLES[step]}
        showBack={true}
        onBack={goBack}
      />

      {/* ── Step 1: Contact picker ── */}
      {step === 'contacts' && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 32 }}
        >
          <SearchBar value={query} onChangeText={setQuery} />

          {searchResults ? (
            // Search mode — show results flat
            <>
              <ThemedText variant="muted" className="px-6 text-xs font-semibold tracking-widest mb-3">
                Results
              </ThemedText>
              {searchResults.length === 0 ? (
                <ThemedText variant="muted" className="px-6 text-sm">
                  No contacts found.
                </ThemedText>
              ) : (
                searchResults.map((c) => (
                  <ContactRow key={c.id} contact={c} onPress={handleContactSelect} />
                ))
              )}
            </>
          ) : (
            // Default — Recent + All Contacts
            <>
              <ThemedText variant="muted" className="px-6 text-xs font-semibold tracking-widest mb-3">
                Recent
              </ThemedText>
              {recentContacts.map((c) => (
                <ContactRow key={c.id} contact={c} onPress={handleContactSelect} />
              ))}

              {allContacts.length > 0 && (
                <>
                  <ThemedText variant="muted" className="px-6 text-xs font-semibold tracking-widest mt-4 mb-3">
                    All Contacts
                  </ThemedText>
                  {allContacts.map((c) => (
                    <ContactRow key={c.id} contact={c} onPress={handleContactSelect} />
                  ))}
                </>
              )}
            </>
          )}
        </ScrollView>
      )}

      {/* ── Step 2: Amount entry ── */}
      {step === 'amount' && recipient && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
        >
          <AmountStep recipient={recipient} onContinue={handleAmountContinue} />
        </ScrollView>
      )}

      {/* ── Step 3: Confirm & send ── */}
      {step === 'confirm' && recipient && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
        >
          <SendConfirmation
            recipient={recipient}
            amount={amount}
            token={token}
            onSend={handleSend}
          />
        </ScrollView>
      )}
    </ThemedView>
  );
}
