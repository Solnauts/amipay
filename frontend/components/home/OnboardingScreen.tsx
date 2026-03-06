/**
 * OnboardingScreen — 3-step new user setup after wallet login.
 *
 * Step 1 › alias  — Enter / confirm your AmipayID
 * Step 2 › pin    — Set up a 6-digit PIN (custom phone keypad)
 * Step 3 › confirm — Confirm the PIN; shows error if mismatch
 */

import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  View,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  useColorScheme,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors } from '@/constants/theme';
import { authService } from '@/src/services/api/AuthService';
import { useWallet } from '@/context/WalletContext';

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = 'alias' | 'pin' | 'confirm';

const PIN_LENGTH = 6;
const AMIPAY_SUFFIX = '@amipay';

// ─── Keypad data ──────────────────────────────────────────────────────────────

const KEYPAD_ROWS = [
  [{ digit: '1', letters: '' }, { digit: '2', letters: 'ABC' }, { digit: '3', letters: 'DEF' }],
  [{ digit: '4', letters: 'GHI' }, { digit: '5', letters: 'JKL' }, { digit: '6', letters: 'MNO' }],
  [{ digit: '7', letters: 'PQRS' }, { digit: '8', letters: 'TUV' }, { digit: '9', letters: 'WXYZ' }],
  [{ digit: '', letters: '' }, { digit: '0', letters: '' }, { digit: '⌫', letters: '' }],
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function PinBoxes({ pin, error }: { pin: string; error: boolean }) {
  return (
    <View style={pinStyles.row}>
      {Array.from({ length: PIN_LENGTH }).map((_, i) => {
        const filled = i < pin.length;
        return (
          <View
            key={i}
            style={[
              pinStyles.box,
              filled && !error && pinStyles.boxFilled,
              error && pinStyles.boxError,
            ]}
          />
        );
      })}
    </View>
  );
}

function NumericKeypad({ onPress }: { onPress: (key: string) => void }) {
  return (
    <View style={kbStyles.wrap}>
      {KEYPAD_ROWS.map((row, ri) => (
        <View key={ri} style={kbStyles.row}>
          {row.map(({ digit, letters }) => {
            if (!digit) return <View key="empty" style={kbStyles.emptyCell} />;
            const isBackspace = digit === '⌫';
            return (
              <TouchableOpacity
                key={digit}
                activeOpacity={0.7}
                onPress={() => onPress(digit)}
                style={kbStyles.cell}
              >
                {isBackspace ? (
                  <MaterialIcons name="backspace" size={22} color="#333" />
                ) : (
                  <View style={kbStyles.cellInner}>
                    <ThemedText style={kbStyles.digit}>{digit}</ThemedText>
                    {letters ? (
                      <ThemedText style={kbStyles.letters}>{letters}</ThemedText>
                    ) : null}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function OnboardingScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  const { setUser, completeOnboarding } = useWallet();

  const [step, setStep] = useState<Step>('alias');
  const [handle, setHandle] = useState('');
  const [fetchedAlias, setFetchedAlias] = useState('');
  const [fetchingAlias, setFetchingAlias] = useState(true);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fetch alias on mount:
  // 1. Check if user already has one via POST /wallet/get_user_alias
  // 2. If not, fall back to GET /wallet/unique-alias suggestions
  useEffect(() => {
    (async () => {
      try {
        // ── Priority 1: existing alias ─────────────────────────────────────
        console.log('[Onboarding] Calling /wallet/get_user_alias...');
        const aliasResponse = await authService.getUserAliases();
        console.log('[Onboarding] get_user_alias response:', JSON.stringify(aliasResponse));

        const existingAliases = aliasResponse?.alias;
        if (existingAliases && existingAliases.length > 0) {
          const raw = existingAliases[0].half_alias || existingAliases[0].alias_name.replace(AMIPAY_SUFFIX, '');
          console.log('[Onboarding] Existing alias found, pre-filling with:', raw);
          setFetchedAlias(raw);
          setHandle(raw);
          return;
        }

        // ── Priority 2: suggestions (new user, no alias yet) ──────────────
        console.log('[Onboarding] No alias found, fetching /wallet/unique-alias suggestions...');
        const suggestions = await authService.getAliasSuggestions();
        console.log('[Onboarding] Suggestions:', suggestions);
        if (suggestions.length > 0) {
          const raw = suggestions[0].replace(AMIPAY_SUFFIX, '');
          console.log('[Onboarding] Pre-filling with suggestion:', raw);
          setFetchedAlias(raw);
          setHandle(raw);
        }
      } catch (e: any) {
        console.error('[Onboarding] Failed to fetch alias:', e?.message ?? e);
        // Non-critical — user can still type their own handle manually
      } finally {
        setFetchingAlias(false);
      }
    })();
  }, []);

  // ── Alias step ─────────────────────────────────────────────────────────────
  const handleContinueAlias = async () => {
    const trimmed = handle.trim().toLowerCase();
    if (trimmed.length < 2) {
      Alert.alert('Too short', 'Your Amipay ID must be at least 2 characters.');
      return;
    }
    if (!/^[a-z0-9_]+$/.test(trimmed)) {
      Alert.alert('Invalid ID', 'Only letters, numbers and underscores are allowed.');
      return;
    }
    setLoading(true);
    try {
      const fullAlias = `${trimmed}${AMIPAY_SUFFIX}`;
      await authService.createAlias(fullAlias);
      setStep('pin');
    } catch (e: any) {
      Alert.alert('Alias Error', e.message ?? 'Could not save your Amipay ID.');
    } finally {
      setLoading(false);
    }
  };

  // ── PIN keypad handler ─────────────────────────────────────────────────────
  const handleKeyPress = (key: string) => {
    if (step === 'pin') {
      if (key === '⌫') {
        setPin((p) => p.slice(0, -1));
      } else if (pin.length < PIN_LENGTH) {
        setPin((p) => p + key);
      }
    } else if (step === 'confirm') {
      setPinError(false);
      if (key === '⌫') {
        setConfirmPin((p) => p.slice(0, -1));
      } else if (confirmPin.length < PIN_LENGTH) {
        setConfirmPin((p) => p + key);
      }
    }
  };

  // ── PIN Done ───────────────────────────────────────────────────────────────
  const handleDonePin = () => {
    if (pin.length < PIN_LENGTH) return;
    setStep('confirm');
    setConfirmPin('');
    setPinError(false);
  };

  // ── Confirm Done ───────────────────────────────────────────────────────────
  const handleDoneConfirm = async () => {
    if (confirmPin.length < PIN_LENGTH) return;
    if (confirmPin !== pin) {
      setPinError(true);
      setConfirmPin('');
      return;
    }
    setLoading(true);
    try {
      const response = await authService.updateProfile({
        username: handle.trim(),
        pin,
      });
      setUser(response.user);
      completeOnboarding();
    } catch (e: any) {
      Alert.alert('Profile Error', e.message ?? 'Could not save your profile.');
    } finally {
      setLoading(false);
    }
  };

  // ── Render: Alias step ─────────────────────────────────────────────────────
  if (step === 'alias') {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.aliasContent}>
            <View style={styles.fieldBlock}>
              <ThemedText style={styles.fieldLabel}>Your Amipay ID</ThemedText>

              {fetchingAlias ? (
                <ActivityIndicator color="#8B5CF6" style={{ marginTop: 16 }} />
              ) : (
                <View style={[
                  styles.inputRow,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}>
                  <TextInput
                    value={handle}
                    onChangeText={(v) =>
                      setHandle(v.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20))
                    }
                    placeholder={fetchedAlias || 'yourname'}
                    placeholderTextColor={colors.muted}
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={[styles.textInput, { color: colors.text }]}
                    returnKeyType="done"
                    onSubmitEditing={handle.trim().length >= 2 ? handleContinueAlias : undefined}
                  />
                  <ThemedText variant="muted" style={styles.suffix}>
                    {AMIPAY_SUFFIX}
                  </ThemedText>
                </View>
              )}
            </View>

            <TouchableOpacity
              onPress={handleContinueAlias}
              disabled={loading || handle.trim().length < 2}
              activeOpacity={0.85}
              style={[
                styles.continueBtn,
                { opacity: loading || handle.trim().length < 2 ? 0.5 : 1 },
              ]}
            >
              <LinearGradient
                colors={['#A78BFA', '#7C3AED']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.continueBtnInner}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <ThemedText style={styles.continueBtnText}>Continue</ThemedText>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ── Render: PIN steps ──────────────────────────────────────────────────────
  const isPinStep = step === 'pin';
  const activePin = isPinStep ? pin : confirmPin;
  const pinFull = activePin.length === PIN_LENGTH;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: '#fff' }]}>
      <StatusBar style="dark" />

      {/* Back button */}
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => {
          if (step === 'confirm') {
            setStep('pin');
            setConfirmPin('');
            setPinError(false);
          } else {
            setStep('alias');
            setPin('');
          }
        }}
      >
        <MaterialIcons name="chevron-left" size={28} color="#111" />
      </TouchableOpacity>

      {/* Header */}
      <View style={styles.pinHeader}>
        <ThemedText style={styles.pinTitle}>
          {isPinStep ? 'Set up your PIN' : 'Confirm your PIN'}
        </ThemedText>
        <ThemedText style={styles.pinSubtitle}>
          {isPinStep
            ? 'Choose a secure 6-digit PIN to protect your account.'
            : 'Re-enter your PIN to confirm.'}
        </ThemedText>
      </View>

      {/* PIN boxes */}
      <PinBoxes pin={activePin} error={pinError} />

      {/* Error message */}
      {pinError && (
        <ThemedText style={styles.errorText}>Incorrect PIN*</ThemedText>
      )}

      {/* Done button */}
      <TouchableOpacity
        onPress={isPinStep ? handleDonePin : handleDoneConfirm}
        disabled={!pinFull || loading}
        activeOpacity={0.85}
        style={[styles.doneBtn, { opacity: !pinFull || loading ? 0.65 : 1 }]}
      >
        <View style={styles.doneBtnInner}>
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <ThemedText style={styles.doneBtnText}>Done</ThemedText>
          )}
        </View>
      </TouchableOpacity>

      {/* Custom numeric keypad */}
      <NumericKeypad onPress={handleKeyPress} />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },

  // ── Alias step ──────────────────────────────────────────────
  aliasContent: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 24,
    paddingBottom: 48,
    gap: 16,
  },
  fieldBlock: { gap: 10 },
  fieldLabel: {
    fontSize: 15,
    fontFamily: 'Poppins_500Medium',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 50,
    borderWidth: 1,
    paddingHorizontal: 20,
    height: 52,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Poppins_400Regular',
  },
  suffix: {
    fontSize: 14,
    fontFamily: 'Poppins_400Regular',
  },
  continueBtn: {
    borderRadius: 50,
    overflow: 'hidden',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  continueBtnInner: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueBtnText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
  },

  // ── PIN steps ────────────────────────────────────────────────
  backBtn: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    alignSelf: 'flex-start',
  },
  pinHeader: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 32,
    paddingBottom: 40,
    gap: 10,
  },
  pinTitle: {
    fontSize: 22,
    fontFamily: 'Poppins_700Bold',
    color: '#111',
    fontWeight: '700',
  },
  pinSubtitle: {
    fontSize: 13,
    fontFamily: 'Poppins_400Regular',
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
  },
  errorText: {
    color: '#E53E3E',
    fontSize: 13,
    fontFamily: 'Poppins_500Medium',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  doneBtn: {
    marginHorizontal: 0,
    marginTop: 28,
  },
  doneBtnInner: {
    backgroundColor: '#8B5CF6',
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
  },
});

// ─── PIN box styles ───────────────────────────────────────────────────────────

const pinStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 24,
  },
  box: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#EBEBEB',
  },
  boxFilled: {
    backgroundColor: '#C4B5FD',
  },
  boxError: {
    backgroundColor: '#FED7D7',
  },
});

// ─── Keypad styles ────────────────────────────────────────────────────────────

const kbStyles = StyleSheet.create({
  wrap: {
    marginTop: 'auto',
    backgroundColor: '#E8E8E8',
    paddingTop: 2,
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    flex: 1,
    height: 72,
    backgroundColor: '#fff',
    margin: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCell: {
    flex: 1,
    height: 72,
    margin: 1,
    backgroundColor: '#E8E8E8',
  },
  cellInner: {
    alignItems: 'center',
    gap: 2,
  },
  digit: {
    fontSize: 24,
    fontWeight: '300',
    color: '#111',
    lineHeight: 28,
  },
  letters: {
    fontSize: 9,
    color: '#555',
    letterSpacing: 1,
    fontWeight: '500',
  },
});
