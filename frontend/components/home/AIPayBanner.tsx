import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';

export function AIPayBanner({ onLearnMore }: { onLearnMore?: () => void }) {
  return (
    // Outer wrapper — overflow visible so coin can "hover" outside card
    <View style={styles.wrapper}>

      {/* Card — overflow hidden to clip the stripes */}
      <View style={styles.card}>

        {/* Decorative diagonal stripes */}
        <View style={styles.stripe1} />
        <View style={styles.stripe2} />

        {/* Text content */}
        <View style={styles.content}>
          <Text style={styles.title}>Try AI Pay</Text>
          <Text style={styles.subtitle}>
            Don't want to type addresses? Just tell Amipay what to do. Try saying "Send $50 to Mom."
          </Text>
          <TouchableOpacity onPress={onLearnMore} activeOpacity={0.8} style={styles.learnMoreBtn}>
            <Text style={styles.learnMoreText}>Learn More</Text>
          </TouchableOpacity>
        </View>

      </View>

      {/* Coin — lives OUTSIDE card, overlaps via absolute + zIndex */}
      <Image
        source={require('@/assets/images/coin.png')}
        style={styles.coinsImage}
        resizeMode="contain"
      />

    </View>
  );
}

const styles = StyleSheet.create({
  // Outer shell — gives horizontal margin, allows coin overflow
  wrapper: {
    marginHorizontal: 16,
    marginVertical: 8,
    position: 'relative',
  },

  // Card — lime green, clips stripes but NOT the coin
  card: {
    height: 172,
    backgroundColor: '#C3F53C',   // lime-400
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D8F282',        // lime-200
    overflow: 'hidden',            // clips stripes inside
  },

  // Stripe 1
  stripe1: {
    position: 'absolute',
    width: 16,
    height: 260,
    backgroundColor: '#E0FF8B',   // lime-300
    opacity: 1,
    left: 380,
    top: -60,
    transform: [{ rotate: '130deg' }],
  },

  // Stripe 2 — parallel, offset right
  stripe2: {
    position: 'absolute',
    width: 16,
    height: 280,
    backgroundColor: '#E0FF8B',
    opacity: 1,
    left: 300,
    top: -60,
    transform: [{ rotate: '40deg' }],
  },

  // Text block — left side only, right reserved for coin
  content: {
    position: 'absolute',
    left: 16,
    top: 16,
    right: 140,
    gap: 6,
  },

  title: {
  
    color: '#000000',
    fontSize: 16,
    fontWeight: '800',
    fontFamily: 'Poppins',
    lineHeight: 22,
    marginBottom: 4,
  },

  subtitle: {
    width: 220,
    color: '#577353',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Poppins',
    lineHeight: 20,
    marginBottom: 8,
  },

  learnMoreBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#ffffff',
    borderRadius: 999,
  },

  learnMoreText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '800',
    fontFamily: 'Poppins',
    letterSpacing: -0.2,
  },

  // Coin — absolute to wrapper, bleeds past card edges to hover
  coinsImage: {
    position: 'absolute',
    right: -18,     // hangs past right edge of card
    bottom: -35,    // hangs past bottom edge of card
    width: 180,
    height: 160,
    zIndex: 10,     // floats above the card
  },
});
