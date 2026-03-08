// WalletConnectScreen — shown before the home screen when wallet is not connected
// Matches the design reference: full-screen, branded, Connect Wallet CTA at bottom

import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ThemedText } from '@/components/ui/ThemedText';
import { ThemedView } from '@/components/ui/ThemedView';
import { Colors } from '@/constants/theme';

import { AuthStep } from '@/context/WalletContext';

type Props = {
  onConnect: () => void;
  authStep: AuthStep;
};

export function WalletConnectScreen({ onConnect, authStep }: Props) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />

      {/* ── Top branding area ── */}
      <ThemedView variant="default" style={styles.topSection}>
        {/* Wallet Image */}
        <Image
          source={require('@/assets/images/wallet.png')}
          style={styles.walletImage}
          resizeMode="contain"
        />

        {/* App Welcome */}
        <ThemedText
          style={{
            fontSize: 42,
            fontWeight: '800',
            fontFamily: 'Poppins_700Bold',
            marginTop: 40,
            textAlign: 'center',
            lineHeight: 50,
          }}
        >
          Welcome to{'\n'}Amipay
        </ThemedText>

        <ThemedText
          variant="muted"
          style={{
            fontSize: 16,
            marginTop: 16,
            textAlign: 'center',
            lineHeight: 24,
            paddingHorizontal: 20,
            fontFamily: 'Poppins_500Medium',
          }}
        >
          Link your wallet to unlock AI-powered cross-border transfers.
        </ThemedText>
      </ThemedView>

      {/* ── Bottom CTA ── */}
      <ThemedView variant="default" style={styles.bottomSection}>
        {/* Connect Wallet button — same design as Deposit / Withdraw */}
        <TouchableOpacity
          onPress={onConnect}
          disabled={authStep !== 'idle'}
          activeOpacity={0.88}
          style={[styles.connectBtn, { opacity: authStep !== 'idle' ? 0.7 : 1 }]}
        >
          <LinearGradient
            colors={['#A78BFA', '#8B5CF6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.connectGradient}
          >
            {authStep !== 'idle' ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : null}
            <ThemedText style={styles.connectBtnText}>
              {authStep === 'connecting' ? 'Opening Wallet…'
                : authStep === 'logging_in' ? 'Verifying…'
                  : 'Connect Wallet'}
            </ThemedText>
          </LinearGradient>
        </TouchableOpacity>

        <ThemedText variant="muted" style={{ fontSize: 11, textAlign: 'center', marginTop: 14 }}>
          Supports Phantom, Solflare & all MWA wallets
        </ThemedText>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  topSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  walletImage: {
    width: 320,
    height: 320,
    marginTop: -20,
  },
  bottomSection: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 16,
  },
  connectBtn: {
    borderRadius: 50,
    borderWidth: 1,
    borderColor: '#8B5CF6',
    overflow: 'hidden',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 7,
  },
  connectGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 10,
    // Inset top highlight — matches Deposit/Withdraw button
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.50)',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  connectBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
    letterSpacing: 0.2,
  },
});
