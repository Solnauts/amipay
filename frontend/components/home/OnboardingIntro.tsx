/**
 * OnboardingIntro — 3-slide intro shown to new users before alias/PIN setup.
 *
 * Slide 1 › Send Crypto. Simply.
 * Slide 2 › Just Say It. We Send It.
 * Slide 3 › Secure. Private. Yours.
 *
 * After the last slide → calls onDone() which triggers the alias/PIN flow.
 */

import React, { useRef, useState } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,

  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { ThemedText } from '@/components/ui/ThemedText';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_W } = Dimensions.get('window');

// ─── Slide data ───────────────────────────────────────────────────────────────

const SLIDES = [
  {
    id: '1',
    image: require('@/assets/images/coin.png'),
    title: 'Send Crypto.\nSimply.',
    subtitle: 'Pay your family using SOL or USDC —\nas easy as sending money on UPI.',
  },
  {
    id: '2',
    image: require('@/assets/images/ai-illustration.png'),
    title: 'Just Say It. We\nSend It.',
    subtitle: 'Type or say "Send $50 to Mom."\nWe handle everything behind the scenes.',
  },
  {
    id: '3',
    image: require('@/assets/images/vault-secure.png'),
    title: 'Secure. Private.\nYours.',
    subtitle: 'Your wallet stays in your control.\nWe never access or hold your funds.',
  },
];

// ─── Dot indicator ────────────────────────────────────────────────────────────

function Dots({ total, active }: { total: number; active: number }) {
  return (
    <View style={dotStyles.row}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            dotStyles.dot,
            i === active ? dotStyles.dotActive : dotStyles.dotInactive,
          ]}
        />
      ))}
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  onDone: () => void; // called when user finishes intro → triggers alias/PIN flow
}

export function OnboardingIntro({ onDone }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const isLast = activeIndex === SLIDES.length - 1;

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
    setActiveIndex(index);
  };

  const handleNext = () => {
    if (isLast) {
      onDone();
      return;
    }
    flatListRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
  };

  const handleSkip = () => {
    onDone();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />

      {/* Skip — top right */}
      <View style={styles.skipRow}>
        <TouchableOpacity onPress={handleSkip} activeOpacity={0.7} style={styles.skipBtn}>
          <ThemedText style={styles.skipText}>Skip</ThemedText>
        </TouchableOpacity>
      </View>

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            {/* Illustration */}
            <Image
              source={item.image}
              style={styles.illustration}
              resizeMode="contain"
            />

            {/* Text */}
            <View style={styles.textBlock}>
              <ThemedText style={styles.title}>{item.title}</ThemedText>
              <ThemedText style={styles.subtitle}>{item.subtitle}</ThemedText>
            </View>
          </View>
        )}
      />

      {/* Dots + Next button */}
      <View style={styles.footer}>
        <Dots total={SLIDES.length} active={activeIndex} />

        <TouchableOpacity onPress={handleNext} activeOpacity={0.85} style={styles.nextBtn}>
          <LinearGradient
            colors={['#A78BFA', '#7C3AED']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.nextBtnInner}
          >
            <ThemedText style={styles.nextBtnText}>
              {isLast ? 'Get Started' : 'Next'}
            </ThemedText>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#ffffff',
  },

  // Skip button — top right
  skipRow: {
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  skipBtn: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 18,
    paddingVertical: 6,
    borderRadius: 999,
  },
  skipText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Poppins',
  },

  // Each slide takes full screen width
  slide: {
    width: SCREEN_W,
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 24,
  },

  // Hero illustration — top half
  illustration: {
    width: SCREEN_W * 0.78,
    height: SCREEN_W * 0.78,
    marginBottom: 32,
  },

  // Title + subtitle block
  textBlock: {
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    fontFamily: 'Poppins',
    color: '#0a0a0a',
    textAlign: 'center',
    lineHeight: 38,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: 'Poppins',
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '400',
  },

  // Footer: dots + button
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 36,
    paddingTop: 16,
    gap: 20,
    alignItems: 'center',
  },

  nextBtn: {
    width: '100%',
    borderRadius: 999,
    overflow: 'hidden',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 8,
  },
  nextBtnInner: {
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  nextBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Poppins',
    letterSpacing: 0.2,
  },
});

// ─── Dot styles ───────────────────────────────────────────────────────────────

const dotStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  dot: {
    height: 8,
    borderRadius: 999,
  },
  dotActive: {
    width: 24,
    backgroundColor: '#8B5CF6',
  },
  dotInactive: {
    width: 8,
    backgroundColor: '#D1D5DB',
  },
});
