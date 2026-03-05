import React from 'react';
import { View, TouchableOpacity, StyleSheet, useColorScheme } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/ui/ThemedText';
import { ThemedView } from '@/components/ui/ThemedView';

/**
 * "Try AI Pay" promotional banner.
 * Green gradient card — matches the design in both light and dark modes.
 */
export function AIPayBanner() {
  const isDark = useColorScheme() === 'dark';

  return (
    <ThemedView className="px-6 mb-6">
      <LinearGradient
        colors={['#22c55e', '#16a34a']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        {/* Text content */}
        <View style={styles.textBlock}>
          <ThemedText
            style={styles.title}
          >
            Try AI Pay
          </ThemedText>
          <ThemedText style={styles.body} numberOfLines={3}>
            Don't want to type addresses?{'\n'}
            Just tell Amipay what to do.{'\n'}
            Try saying "Send $50 to Mom."
          </ThemedText>

          <TouchableOpacity activeOpacity={0.85} style={styles.learnBtn}>
            <ThemedText style={styles.learnText}>Learn More</ThemedText>
          </TouchableOpacity>
        </View>

        {/* Decorative coin graphic (simulated with layered circles) */}
        <View style={styles.coinsWrapper} pointerEvents="none">
          <View style={[styles.coin, styles.coinBack,  { backgroundColor: '#7C3AED' }]} />
          <View style={[styles.coin, styles.coinMid,   { backgroundColor: '#9333EA' }]} />
          <View style={[styles.coin, styles.coinFront, { backgroundColor: '#A855F7' }]} />
        </View>
      </LinearGradient>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    minHeight: 120,
  },
  textBlock: {
    flex: 1,
    gap: 6,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 2,
  },
  body: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.88)',
    lineHeight: 18,
  },
  learnBtn: {
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  learnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  coinsWrapper: {
    width: 80,
    height: 80,
    position: 'relative',
  },
  coin: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  coinBack: {
    bottom: 0,
    right: 0,
    opacity: 0.6,
  },
  coinMid: {
    bottom: 14,
    right: 12,
    opacity: 0.8,
  },
  coinFront: {
    bottom: 28,
    right: 24,
  },
});
