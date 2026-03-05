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
import { router, useLocalSearchParams } from 'expo-router';
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
  confirmLabel?: string;
};

const SUGGESTIONS = ['Send $50 to Mom', 'Send 5 SOL to Dad'];

const INITIAL_MESSAGE: Message = {
  id: 'ai-0',
  text: "Hi! I'm your AI payment assistant. Just tell me who you want to send money to and how much. Try saying 'Send $50 to Mom' or 'Send 2 SOL to Dad'.",
  isUser: false,
  time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function nowTime() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function buildAiReply(input: string): { text: string; confirmLabel?: string } {
  const lower = input.toLowerCase();
  if (lower.includes('send') || lower.includes('pay')) {
    return {
      text: `Perfect! I'll help you send ${input}. Tap the button below to confirm the payment.`,
      confirmLabel: `Confirm ${input}`,
    };
  }
  if (lower.includes('split')) {
    return { text: `Sure! I'll help you split that. Shall I use equal amounts for each person?` };
  }
  return { text: `I understand you want to: "${input}". Can you provide more details like the amount and recipient?` };
}

// ---------------------------------------------------------------------------
// ChatBubble
// ---------------------------------------------------------------------------
function ChatBubble({
  msg,
  colors,
}: {
  msg: Message;
  colors: (typeof Colors)[keyof typeof Colors];
}) {
  const isUser = msg.isUser;

  return (
    <View className={`mb-4 mx-4 ${isUser ? 'items-end' : 'items-start'}`}>
      {/* Name + dot */}
      <View
        className={`flex-row items-center gap-1.5 mb-1.5 ${isUser ? 'flex-row-reverse' : ''}`}
      >
        <View
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: isUser ? '#22c55e' : '#8b5cf6' }}
        />
        <ThemedText className="text-xs font-semibold">
          {isUser ? 'You' : 'Amipay'}
        </ThemedText>
      </View>

      {/* Bubble */}
      <View
        className="rounded-2xl px-4 py-3 max-w-xs"
        style={{
          backgroundColor: isUser ? colors.surface : '#ede9fe',
          borderBottomRightRadius: isUser ? 4 : 16,
          borderBottomLeftRadius: isUser ? 16 : 4,
          borderWidth: isUser ? 1 : 0,
          borderColor: colors.border,
        }}
      >
        <ThemedText
          className="text-sm leading-5"
          style={{ color: colors.text }}
        >
          {msg.text}
        </ThemedText>
      </View>

      {/* Confirm button — only on AI payment replies */}
      {!isUser && msg.confirmLabel && (
        <TouchableOpacity
          activeOpacity={0.8}
          className="mt-3 px-5 py-3 rounded-full"
          style={{ backgroundColor: '#0d0d0d' }}
        >
          <ThemedText
            className="text-sm font-semibold"
            style={{ color: '#ffffff' }}
          >
            {msg.confirmLabel}
          </ThemedText>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------
export default function PayScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { to } = useLocalSearchParams<{ to?: string }>();

  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  // Pre-fill input with contact name if navigated from contacts
  const [input, setInput] = useState(to ? `Send to ${to} ` : '');
  const listRef = useRef<FlatList>(null);

  const sendMessage = (text: string) => {
    if (!text.trim()) return;

    const reply = buildAiReply(text.trim());

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      text: text.trim(),
      isUser: true,
      time: nowTime(),
    };
    const aiMsg: Message = {
      id: `a-${Date.now()}`,
      text: reply.text,
      confirmLabel: reply.confirmLabel,
      isUser: false,
      time: nowTime(),
    };

    setMessages((prev) => [...prev, userMsg, aiMsg]);
    setInput('');
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  };

  return (
    <ThemedView variant="default" className="flex-1">

      {/* ── Header ── */}
      <ThemedView
        variant="default"
        className="flex-row items-center justify-between px-5 pt-14 pb-4"
      >
        {/* Back */}
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.7}
          className="w-9 h-9 rounded-full items-center justify-center"
          style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
        >
          <MaterialIcons name="arrow-back" size={18} color={colors.text} />
        </TouchableOpacity>

        {/* Title */}
        <ThemedText type="subtitle" variant="default">AI Pay</ThemedText>

        {/* Spacer to keep title centered */}
        <View style={{ width: 36 }} />
      </ThemedView>

      {/* Divider */}
      <View
        style={{ height: 1, backgroundColor: colors.border, marginHorizontal: 24, marginBottom: 12 }}
      />

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

      {/* ── Bottom area ── */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {/* Suggestion chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingVertical: 8 }}
          style={{ flexGrow: 0 }}
        >
          {SUGGESTIONS.map((s) => (
            <TouchableOpacity
              key={s}
              onPress={() => sendMessage(s)}
              activeOpacity={0.75}
              className="rounded-full px-4 py-2"
              style={{
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <ThemedText className="text-xs" style={{ color: colors.text }}>
                {s}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Input bar */}
        <ThemedView
          variant="default"
          className="flex-row items-center px-4 py-3 gap-3"
          style={{ borderTopWidth: 1, borderTopColor: colors.border }}
        >
          {/* Input + mic inside */}
          <ThemedView
            className="flex-1 flex-row items-center rounded-full px-4"
            style={{
              height: 48,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder="Type or use voice"
              placeholderTextColor={colors.mutedForeground}
              onSubmitEditing={() => sendMessage(input)}
              returnKeyType="send"
              style={{ flex: 1, color: colors.text, fontSize: 14, paddingVertical: 0 }}
            />
            <MaterialIcons name="mic" size={20} color={colors.mutedForeground} />
          </ThemedView>

          {/* Pay pill */}
          <TouchableOpacity
            onPress={() => sendMessage(input)}
            activeOpacity={0.75}
            className="px-5 rounded-full items-center justify-center"
            style={{ height: 48, backgroundColor: colors.primary }}
          >
            <ThemedText
              className="text-sm font-semibold"
              style={{ color: colors.primaryForeground }}
            >
              Pay
            </ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}
