// AI Payment Screen — opened as a modal when user taps the Pay button
// Chat-style interface with suggestion chips, message list, and text/mic input

import React, { useState, useRef } from 'react';
import {
  FlatList,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  useColorScheme,
} from 'react-native';
import { router } from 'expo-router';
import { ThemedView } from '@/components/ui/ThemedView';
import { ThemedText } from '@/components/ui/ThemedText';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Colors } from '@/constants/theme';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type Message = {
  id: string;
  text: string;
  isUser: boolean;
  time: string;
};

// Suggestion chips shown at the top
const SUGGESTIONS = [
  'Send $100 to Mom',
  'Pay 50 USDC to Sarah',
  'Send 0.5 SOL to Brother',
  'Split $60 with Family',
];

// Initial AI greeting message
const INITIAL_MESSAGE: Message = {
  id: 'ai-0',
  text: "Hi! I'm your AI payment assistant. You can say things like 'Send $100 to Sarah' or 'Pay 50 USDC to my brother'",
  isUser: false,
  time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function nowTime() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function buildAiReply(input: string): string {
  const lower = input.toLowerCase();
  if (lower.includes('send') || lower.includes('pay')) {
    return `Got it! Let me process that payment: "${input}". Please confirm the details.`;
  }
  if (lower.includes('split')) {
    return `Sure! I'll help you split that. Shall I use equal amounts for each person?`;
  }
  return `I understand you want to: "${input}". Can you provide more details like the amount and recipient?`;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
function ChatBubble({ msg, colors }: { msg: Message; colors: typeof Colors[keyof typeof Colors] }) {
  const isUser = msg.isUser;
  return (
    <View
      className={`mb-3 mx-4 max-w-xs ${isUser ? 'self-end items-end' : 'self-start items-start'}`}
    >
      <View
        className="rounded-2xl px-4 py-3"
        style={{
          backgroundColor: isUser ? colors.primary : colors.surface,
          borderBottomRightRadius: isUser ? 4 : 16,
          borderBottomLeftRadius: isUser ? 16 : 4,
          borderWidth: isUser ? 0 : 1,
          borderColor: colors.border,
        }}
      >
        <ThemedText
          className="text-sm leading-5"
          style={{ color: isUser ? colors.primaryForeground : colors.text }}
        >
          {msg.text}
        </ThemedText>
      </View>
      <ThemedText variant="muted" className="text-xs mt-1 px-1">
        {msg.time}
      </ThemedText>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------
export default function PayScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const listRef = useRef<FlatList>(null);

  const sendMessage = (text: string) => {
    if (!text.trim()) return;

    const userMsg: Message = { id: `u-${Date.now()}`, text: text.trim(), isUser: true, time: nowTime() };
    const aiMsg: Message   = { id: `a-${Date.now()}`, text: buildAiReply(text.trim()), isUser: false, time: nowTime() };

    setMessages((prev) => [...prev, userMsg, aiMsg]);
    setInput('');
    // Scroll to end after render
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  };

  return (
    <ThemedView variant="default" className="flex-1">

      {/* ── Header ── */}
      <>
        <ThemedView
          variant="default"
          className="flex-row items-center justify-between px-5 pt-14 pb-4"
        >
          {/* Back / close */}
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.7}
            className="w-9 h-9 rounded-full items-center justify-center"
            style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
          >
            <MaterialIcons name="arrow-back" size={18} color={colors.text} />
          </TouchableOpacity>

          {/* Title */}
          <ThemedView variant="default" className="items-center">
            <ThemedText type="subtitle" variant="default">AI Payment</ThemedText>
            <ThemedText variant="muted" className="text-xs">Powered by AI</ThemedText>
          </ThemedView>

          {/* AI star icon */}
          <View
            className="w-10 h-10 rounded-full items-center justify-center"
            style={{ backgroundColor: colors.primary }}
          >
            <MaterialIcons name="auto-awesome" size={20} color={colors.primaryForeground} />
          </View>
        </ThemedView>

        {/* Divider */}
        <View style={{ height: 1, backgroundColor: colors.border, marginHorizontal: 24, marginBottom: 12 }} />

        {/* ── Suggestion chips ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: 4 }}
          style={{ flexGrow: 0 }}
        >
          {SUGGESTIONS.map((s) => (
            <TouchableOpacity
              key={s}
              onPress={() => sendMessage(s)}
              activeOpacity={0.75}
              className="rounded-full px-4 py-2"
              style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
            >
              <ThemedText variant="default" className="text-xs font-semibold" style={{ color: colors.text }}>
                {s}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Progress bar (decorative — shows "AI thinking" feel) */}
        <View style={{ height: 3, backgroundColor: colors.muted, marginHorizontal: 0, marginTop: 10 }}>
          <View style={{ width: '35%', height: 3, backgroundColor: colors.primary, borderRadius: 2 }} />
        </View>
      </>

      {/* ── Chat messages ── */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ChatBubble msg={item} colors={colors} />}
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 8 }}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
      />

      {/* ── Input bar ── */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ThemedView
          variant="default"
          className="flex-row items-center px-4 py-3 gap-3"
          style={{ borderTopWidth: 1, borderTopColor: colors.border }}
        >
          {/* Mic button */}
          <TouchableOpacity
            activeOpacity={0.75}
            className="w-10 h-10 rounded-full items-center justify-center"
            style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
          >
            <MaterialIcons name="mic" size={20} color={colors.mutedForeground} />
          </TouchableOpacity>

          {/* Text input */}
          <ThemedView
            variant="surface"
            className="flex-1 rounded-2xl px-4"
            style={{ height: 44, justifyContent: 'center', borderWidth: 1, borderColor: colors.border }}
          >
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Type your request..."
              placeholderTextColor={colors.mutedForeground}
              onSubmitEditing={() => sendMessage(input)}
              returnKeyType="send"
              style={{ color: colors.text, fontSize: 14, paddingVertical: 0 }}
            />
          </ThemedView>

          {/* Send button */}
          <TouchableOpacity
            onPress={() => sendMessage(input)}
            activeOpacity={0.75}
            className="w-10 h-10 rounded-full items-center justify-center"
            style={{
              backgroundColor: input.trim() ? colors.primary : colors.surface,
              borderWidth: input.trim() ? 0 : 1,
              borderColor: colors.border,
            }}
          >
            <MaterialIcons
              name="send"
              size={18}
              color={input.trim() ? colors.primaryForeground : colors.mutedForeground}
            />
          </TouchableOpacity>
        </ThemedView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}
