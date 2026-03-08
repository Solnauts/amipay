import React, { useState, useRef, useCallback } from 'react';
import {
  FlatList,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  useColorScheme,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ThemedView } from '@/components/ui/ThemedView';
import { ThemedText } from '@/components/ui/ThemedText';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Colors } from '@/constants/theme';
import { useAiPayWs, type ChatMessage } from '@/hooks/useAiPayWs';
import { useWallet } from '@/context/WalletContext';
import { SafeAreaView } from 'react-native-safe-area-context';

// ---------------------------------------------------------------------------
// Suggestions
// ---------------------------------------------------------------------------
const SUGGESTIONS = ['Send $50 to Mom', 'Check Balance', 'Transaction History'];

// ---------------------------------------------------------------------------
// PIN Input Modal (inline)
// ---------------------------------------------------------------------------
function PinInput({
  onSubmit,
  onCancel,
  colors,
}: {
  onSubmit: (pin: string) => void;
  onCancel: () => void;
  colors: (typeof Colors)[keyof typeof Colors];
}) {
  const [pin, setPin] = useState('');

  return (
    <View
      className="mx-4 mb-4 p-4 rounded-2xl"
      style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}
    >
      <ThemedText className="text-sm font-semibold mb-3" style={{ color: colors.text }}>
        Enter your PIN to confirm
      </ThemedText>
      <TextInput
        value={pin}
        onChangeText={setPin}
        placeholder="Enter PIN"
        placeholderTextColor={colors.mutedForeground}
        secureTextEntry
        keyboardType="number-pad"
        maxLength={6}
        style={{
          color: colors.text,
          fontSize: 18,
          letterSpacing: 8,
          textAlign: 'center',
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 12,
          paddingVertical: 12,
          paddingHorizontal: 16,
          marginBottom: 12,
          backgroundColor: colors.background,
        }}
      />
      <View className="flex-row gap-3">
        <TouchableOpacity
          onPress={onCancel}
          activeOpacity={0.75}
          className="flex-1 py-3 rounded-full items-center"
          style={{ backgroundColor: colors.muted }}
        >
          <ThemedText className="text-sm font-semibold" style={{ color: colors.text }}>
            Cancel
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            if (pin.length >= 4) onSubmit(pin);
          }}
          activeOpacity={0.75}
          className="flex-1 py-3 rounded-full items-center"
          style={{
            backgroundColor: pin.length >= 4 ? '#8b5cf6' : colors.muted,
          }}
        >
          <ThemedText
            className="text-sm font-semibold"
            style={{ color: pin.length >= 4 ? '#fff' : colors.mutedForeground }}
          >
            Confirm
          </ThemedText>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// ChatBubble
// ---------------------------------------------------------------------------
function ChatBubble({
  msg,
  colors,
}: {
  msg: ChatMessage;
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
          style={{
            backgroundColor: isUser
              ? '#22c55e'
              : msg.isError
                ? '#ef4444'
                : '#8b5cf6',
          }}
        />
        <ThemedText className="text-xs font-semibold">
          {isUser ? 'You' : 'Amipay'}
        </ThemedText>
      </View>

      {/* Bubble */}
      <View
        className="rounded-2xl px-4 py-3 max-w-xs"
        style={{
          backgroundColor: isUser
            ? colors.surface
            : msg.isError
              ? '#fef2f2'
              : '#ede9fe',
          borderBottomRightRadius: isUser ? 4 : 16,
          borderBottomLeftRadius: isUser ? 16 : 4,
          borderWidth: isUser ? 1 : msg.isError ? 1 : 0,
          borderColor: isUser ? colors.border : msg.isError ? '#fecaca' : 'transparent',
        }}
      >
        <ThemedText
          className="text-sm leading-5"
          style={{ color: msg.isError ? '#dc2626' : colors.text }}
        >
          {msg.text}
        </ThemedText>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Typing indicator (3 dots)
// ---------------------------------------------------------------------------
function TypingIndicator({ colors }: { colors: (typeof Colors)[keyof typeof Colors] }) {
  return (
    <View className="mb-4 mx-4 items-start">
      <View className="flex-row items-center gap-1.5 mb-1.5">
        <View className="w-3 h-3 rounded-full" style={{ backgroundColor: '#8b5cf6' }} />
        <ThemedText className="text-xs font-semibold">Amipay</ThemedText>
      </View>
      <View
        className="rounded-2xl px-5 py-3"
        style={{ backgroundColor: '#ede9fe' }}
      >
        <ActivityIndicator size="small" color="#8b5cf6" />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Connection status banner
// ---------------------------------------------------------------------------
function ConnectionBanner({
  isConnected,
  colors,
}: {
  isConnected: boolean;
  colors: (typeof Colors)[keyof typeof Colors];
}) {
  if (isConnected) return null;
  return (
    <View
      className="flex-row items-center justify-center py-2 gap-2"
      style={{ backgroundColor: '#fef3c7' }}
    >
      <View className="w-2 h-2 rounded-full" style={{ backgroundColor: '#f59e0b' }} />
      <ThemedText className="text-xs font-medium" style={{ color: '#92400e' }}>
        Connecting to server…
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
  const { to } = useLocalSearchParams<{ to?: string }>();
  const { sessionToken } = useWallet();

  const {
    messages,
    isConnected,
    isWaiting,
    sendUserMessage,
    sendActionResponse,
    resetConversation,
  } = useAiPayWs({ token: sessionToken });

  // Pre-fill input when coming from a contact — user just needs to type the amount.
  // Format: "Send to Mom $" so the intent is clear and cursor lands after "$".
  const [input, setInput] = useState(to ? `Send to ${to} $` : '');
  const listRef = useRef<FlatList>(null);

  // Track which pendingActionIds have already been submitted so the PIN
  // prompt never reappears for an action the user already confirmed.
  const handledActionIds = useRef<Set<number>>(new Set());

  // Track which message is requesting a PIN
  const [pinPrompt, setPinPrompt] = useState<{
    conversationId: number;
    pendingActionId: number;
  } | null>(null);

  const lastMsg = messages[messages.length - 1];
  // Exclude action IDs already submitted — prevents PIN reappearing after payment.
  const shouldShowPin =
    lastMsg &&
    !lastMsg.isUser &&
    !lastMsg.isError &&
    lastMsg.pendingActionId != null &&
    pinPrompt === null &&
    !handledActionIds.current.has(lastMsg.pendingActionId!);

  // Auto-show PIN prompt when server requests it
  React.useEffect(() => {
    if (shouldShowPin && lastMsg.pendingActionId != null && lastMsg.conversationId != null) {
      setPinPrompt({
        conversationId: lastMsg.conversationId,
        pendingActionId: lastMsg.pendingActionId,
      });
    }
  }, [shouldShowPin, lastMsg]);

  const handleSend = useCallback(
    (text: string) => {
      if (!text.trim()) return;
      sendUserMessage(text);
      setInput('');
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    },
    [sendUserMessage],
  );

  const handlePinSubmit = useCallback(
    (pin: string) => {
      if (!pinPrompt) return;
      // Mark this action as handled BEFORE clearing the prompt so the
      // shouldShowPin guard fires correctly on the same render cycle.
      handledActionIds.current.add(pinPrompt.pendingActionId);
      sendActionResponse(pinPrompt.conversationId, pinPrompt.pendingActionId, pin);
      setPinPrompt(null);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    },
    [pinPrompt, sendActionResponse],
  );

  return (
    // KeyboardAvoidingView wraps the ENTIRE screen so the FlatList shrinks
    // when the keyboard appears — both iOS (padding) and Android (height).
    <SafeAreaView style={{ flex: 1 }}>
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
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

        {/* Title + connection dot */}
        <View className="flex-row items-center gap-2 ">
          <ThemedText type="subtitle" variant="default">AI Pay</ThemedText>
          <View
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: isConnected ? '#22c55e' : '#ef4444' }}
          />
        </View>

      
      </ThemedView>

      {/* Connection banner */}
      <ConnectionBanner isConnected={isConnected} colors={colors} />

      {/* Divider */}
      <View
        style={{ height: 1, backgroundColor: colors.border, marginHorizontal: 24, marginBottom: 12 }}
      />

      {/* ── No token warning ── */}
      {!sessionToken && (
        <View className="mx-6 mb-4 p-4 rounded-2xl" style={{ backgroundColor: '#fef3c7', borderWidth: 1, borderColor: '#fde68a' }}>
          <ThemedText className="text-sm" style={{ color: '#92400e' }}>
            ⚠️ Please connect your wallet first to use AI Pay.
          </ThemedText>
        </View>
      )}

      {/* ── Welcome message when empty ── */}
      {messages.length === 0 && (
        <View className="mx-4 mb-4 items-start">
          <View className="flex-row items-center gap-1.5 mb-1.5">
            <View className="w-3 h-3 rounded-full" style={{ backgroundColor: '#8b5cf6' }} />
            <ThemedText className="text-xs font-semibold">Amipay</ThemedText>
          </View>
          <View
            className="rounded-2xl px-4 py-3 max-w-xs"
            style={{ backgroundColor: '#ede9fe', borderBottomLeftRadius: 4 }}
          >
            <ThemedText className="text-sm leading-5" style={{ color: colors.text }}>
              Hi! I'm your AI payment assistant. Just tell me who you want to send money to and how much.{'\n\n'}Try saying "Send $50 to Mom" or "Check my balance".
            </ThemedText>
          </View>
        </View>
      )}

      {/* ── Chat messages ── */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ChatBubble msg={item} colors={colors} />}
        ListFooterComponent={isWaiting ? <TypingIndicator colors={colors} /> : null}
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 8 }}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
      />

      {/* ── PIN input overlay ── */}
      {pinPrompt && (
        <PinInput
          onSubmit={handlePinSubmit}
          onCancel={() => setPinPrompt(null)}
          colors={colors}
        />
      )}

      {/* ── Bottom area ── */}
      <View>
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
              onPress={() => handleSend(s)}
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

        {/* Input bar — visible above keyboard because KAV wraps the whole screen */}
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
              onSubmitEditing={() => handleSend(input)}
              returnKeyType="send"
              editable={isConnected}
              style={{ flex: 1, color: colors.text, fontSize: 14, paddingVertical: 0 }}
            />
            <MaterialIcons name="mic" size={20} color={colors.mutedForeground} />
          </ThemedView>

          {/* Pay pill */}
          <TouchableOpacity
            onPress={() => handleSend(input)}
            activeOpacity={0.75}
            disabled={!isConnected || !input.trim()}
            className="px-5 rounded-full items-center justify-center"
            style={{
              height: 48,
              backgroundColor: isConnected && input.trim() ? colors.primary : colors.muted,
            }}
          >
            <ThemedText
              className="text-sm font-semibold"
              style={{
                color: isConnected && input.trim() ? colors.primaryForeground : colors.mutedForeground,
              }}
            >
              Pay
            </ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </View>
    </ThemedView>
    </KeyboardAvoidingView>
  </SafeAreaView>
  );
}
