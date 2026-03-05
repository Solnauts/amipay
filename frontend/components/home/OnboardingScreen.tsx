/**
 * OnboardingScreen — shown to new users after wallet login.
 * Step 1: Pick an alias from server suggestions.
 * Step 2: Set a display name + 4-digit PIN.
 */

import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  View,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  ScrollView,
  useColorScheme,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ThemedText } from '@/components/ui/ThemedText';
import { ThemedView } from '@/components/ui/ThemedView';
import { Colors } from '@/constants/theme';
import { authService } from '@/src/services/api/AuthService';
import { useWallet } from '@/context/WalletContext';

type Step = 'alias' | 'profile';

export function OnboardingScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  const { user, setUser, completeOnboarding } = useWallet();

  const [step, setStep] = useState<Step>('alias');
  const [aliasSuggestions, setAliasSuggestions] = useState<string[]>([]);
  const [selectedAlias, setSelectedAlias] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingAliases, setFetchingAliases] = useState(true);

  // Fetch alias suggestions on mount
  useEffect(() => {
    (async () => {
      try {
        const suggestions = await authService.getAliasSuggestions();
        setAliasSuggestions(suggestions);
      } catch (e: any) {
        Alert.alert('Error', 'Could not fetch alias suggestions. ' + e.message);
      } finally {
        setFetchingAliases(false);
      }
    })();
  }, []);

  // ── Step 1: Confirm alias ────────────────────────────────────────────────
  const handleAliasConfirm = async () => {
    if (!selectedAlias) return;
    setLoading(true);
    try {
      await authService.createAlias(selectedAlias);
      setStep('profile');
    } catch (e: any) {
      Alert.alert('Alias Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Save display name + PIN ─────────────────────────────────────
  const handleProfileSave = async () => {
    if (displayName.trim().length < 2) {
      Alert.alert('Invalid Name', 'Please enter at least 2 characters.');
      return;
    }
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      Alert.alert('Invalid PIN', 'PIN must be exactly 4 digits.');
      return;
    }
    setLoading(true);
    try {
      const response = await authService.updateProfile({
        username: displayName.trim(),
        pin,
      });
      setUser(response.user);
      completeOnboarding();
    } catch (e: any) {
      Alert.alert('Profile Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <LinearGradient
            colors={['#A78BFA', '#8B5CF6']}
            style={styles.iconBadge}
          >
            <MaterialIcons
              name={step === 'alias' ? 'badge' : 'person'}
              size={28}
              color="#fff"
            />
          </LinearGradient>
          <ThemedText style={styles.title}>
            {step === 'alias' ? 'Choose Your Alias' : 'Set Up Profile'}
          </ThemedText>
          <ThemedText variant="muted" style={styles.subtitle}>
            {step === 'alias'
              ? 'This is how others will find and pay you.'
              : 'Almost done — set a name and a 4-digit PIN.'}
          </ThemedText>
        </View>

        {/* ── STEP 1: Alias picker ─────────────────────────────────────── */}
        {step === 'alias' && (
          <ThemedView variant="surface" style={styles.card}>
            {fetchingAliases ? (
              <ActivityIndicator color="#8B5CF6" style={{ marginVertical: 24 }} />
            ) : (
              aliasSuggestions.map((alias) => {
                const isSelected = alias === selectedAlias;
                return (
                  <TouchableOpacity
                    key={alias}
                    onPress={() => setSelectedAlias(alias)}
                    activeOpacity={0.8}
                    style={[
                      styles.aliasRow,
                      {
                        borderColor: isSelected ? '#8B5CF6' : colors.border,
                        backgroundColor: isSelected
                          ? 'rgba(139,92,246,0.10)'
                          : colors.surface,
                      },
                    ]}
                  >
                    <MaterialIcons
                      name="alternate-email"
                      size={18}
                      color={isSelected ? '#8B5CF6' : colors.muted}
                    />
                    <ThemedText
                      style={[
                        styles.aliasLabel,
                        { color: isSelected ? '#8B5CF6' : colors.text },
                      ]}
                    >
                      {alias}
                    </ThemedText>
                    {isSelected && (
                      <MaterialIcons
                        name="check-circle"
                        size={18}
                        color="#8B5CF6"
                        style={{ marginLeft: 'auto' }}
                      />
                    )}
                  </TouchableOpacity>
                );
              })
            )}
          </ThemedView>
        )}

        {/* ── STEP 2: Profile form ─────────────────────────────────────── */}
        {step === 'profile' && (
          <ThemedView variant="surface" style={styles.card}>
            <ThemedText variant="muted" style={styles.fieldLabel}>
              Display Name
            </ThemedText>
            <TextInput
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="e.g. Alice"
              placeholderTextColor={colors.muted}
              style={[
                styles.input,
                { color: colors.text, borderColor: colors.border },
              ]}
              autoCapitalize="words"
              autoCorrect={false}
              maxLength={32}
            />

            <ThemedText variant="muted" style={[styles.fieldLabel, { marginTop: 16 }]}>
              4-Digit PIN
            </ThemedText>
            <TextInput
              value={pin}
              onChangeText={(v) => setPin(v.replace(/\D/g, '').slice(0, 4))}
              placeholder="• • • •"
              placeholderTextColor={colors.muted}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={4}
              style={[
                styles.input,
                { color: colors.text, borderColor: colors.border, letterSpacing: 8 },
              ]}
            />
          </ThemedView>
        )}

        {/* CTA Button */}
        <TouchableOpacity
          onPress={step === 'alias' ? handleAliasConfirm : handleProfileSave}
          disabled={loading || (step === 'alias' && !selectedAlias)}
          activeOpacity={0.85}
          style={[
            styles.ctaBtn,
            {
              opacity:
                loading || (step === 'alias' && !selectedAlias) ? 0.55 : 1,
            },
          ]}
        >
          <LinearGradient
            colors={['#A78BFA', '#8B5CF6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaGradient}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <ThemedText style={styles.ctaText}>
                  {step === 'alias' ? 'Confirm Alias' : 'Finish Setup'}
                </ThemedText>
                <MaterialIcons name="arrow-forward" size={18} color="#fff" />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* Step indicator */}
        <View style={styles.stepDots}>
          {(['alias', 'profile'] as Step[]).map((s) => (
            <View
              key={s}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    step === s ? '#8B5CF6' : colors.border,
                  width: step === s ? 20 : 8,
                },
              ]}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 48,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  iconBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    gap: 10,
  },
  aliasRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  aliasLabel: {
    fontSize: 15,
    fontFamily: 'Poppins_500Medium',
  },
  fieldLabel: {
    fontSize: 12,
    fontFamily: 'Poppins_500Medium',
    marginBottom: 6,
  },
  input: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    fontSize: 15,
    fontFamily: 'Poppins_400Regular',
  },
  ctaBtn: {
    borderRadius: 50,
    overflow: 'hidden',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  ctaText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Poppins_600SemiBold',
  },
  stepDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 20,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
});
