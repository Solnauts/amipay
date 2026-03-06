import { TouchableOpacity, useColorScheme, View, StyleSheet, Platform } from 'react-native';
import { router, usePathname } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { ThemedView } from '@/components/ui/ThemedView';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors } from '@/constants/theme';
import { useWallet } from '@/context/WalletContext';

const tabs = [
  { name: 'Home',       icon: 'home',        route: '/'           as const },
  { name: 'Wallet',     icon: 'credit-card', route: '/activities' as const },
  { name: 'Contacts',   icon: 'users',       route: '/contacts'   as const },
];

export function CustomTabBar() {
  const colors = Colors[useColorScheme() ?? 'light'];
  const pathname = usePathname();
  const { isConnected } = useWallet();

  if (!isConnected) return null;

  return (
    <View style={styles.container}>
      {/* Left: Tabs */}
      <View style={styles.tabsRow}>
        {tabs.map((tab) => {
          const isActive = pathname === tab.route;

          if (isActive) {
            // Active pill — matches: bg-zinc-100, rounded-[90px], outline outline-1 outline-neutral-200
            return (
              <TouchableOpacity
                key={tab.name}
                onPress={() => router.push(tab.route)}
                activeOpacity={0.7}
                style={styles.activePill}
              >
                <Feather name={tab.icon as any} size={20} color="#09090b" />
                <ThemedText style={styles.activeLabel}>{tab.name}</ThemedText>
              </TouchableOpacity>
            );
          }

          // Inactive — icon only
          return (
            <TouchableOpacity
              key={tab.name}
              onPress={() => router.push(tab.route)}
              activeOpacity={0.6}
              style={styles.inactiveTab}
            >
              <Feather name={tab.icon as any} size={22} color="#09090b" />
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Right: Pay Button — matches Figma exactly */}
      <TouchableOpacity
        onPress={() => router.push('/pay')}
        activeOpacity={0.8}
        style={styles.payButton}
      >
        {/* Violet dot with layered circles */}
        <View style={styles.dotOuter}>
          <View style={styles.dotInner1} />
          <View style={styles.dotInner2} />
          <View style={styles.dotInner3} />
        </View>
        <ThemedText style={styles.payLabel}>Pay</ThemedText>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    // Figma: w-96 h-16, bg-white, border-t border-neutral-200
    height: 64,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
    paddingHorizontal: 13,
    marginBottom: Platform.OS === 'ios' ? 20 : 0,
  },

  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  // Figma: w-28 px-4 py-3 bg-zinc-100 rounded-[90px] outline outline-1 outline-neutral-200
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f4f4f5',
    borderRadius: 90,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },

  activeLabel: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'Poppins',
    color: '#09090b',
    lineHeight: 16,
  },

  inactiveTab: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Figma: bg-gradient-to-b from-gray-950 to-zinc-950, rounded-[50px], w-24 h-12
  // shadow-[0px_1px_0px_0px_rgba(0,0,0,0.10)] shadow-[0px_4px_14px_0px_rgba(0,0,0,0.05)]
  // outline outline-1 outline-slate-900
  // inset shadow: shadow-[inset_0px_2px_0px_0px_rgba(255,255,255,0.50)]
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: 96,
    height: 48,
    backgroundColor: '#0a0a0a',
    borderRadius: 50,
    borderWidth: 1,
    borderColor: '#1e293b', // outline-slate-900
    // Outer shadows (React Native only supports one shadow natively on iOS)
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 10,
      },
      android: {
        elevation: 6,
      },
    }),
  },

  // Figma: w-4 h-4 bg-violet-500 rounded-[110px]
  dotOuter: {
    width: 16,
    height: 16,
    borderRadius: 110,
    backgroundColor: '#8b5cf6',
    overflow: 'hidden',
    position: 'relative',
  },

  // left-0 top-[4px] bg-violet-700 rounded-full w-2.5 h-2.5
  dotInner1: {
    position: 'absolute',
    width: 10,
    height: 10,
    left: 0,
    top: 4,
    borderRadius: 999,
    backgroundColor: '#7c3aed',
  },

  // left-0 top-[4px] bg-white rounded-full w-2.5 h-2.5
  dotInner2: {
    position: 'absolute',
    width: 10,
    height: 10,
    left: 0,
    top: 4,
    borderRadius: 999,
    backgroundColor: '#ffffff',
  },

  // left-[2px] top-[5.85px] bg-purple-300 rounded-full w-2.5 h-2.5
  dotInner3: {
    position: 'absolute',
    width: 10,
    height: 10,
    left: 2,
    top: 5.85,
    borderRadius: 999,
    backgroundColor: '#d8b4fe',
  },

  payLabel: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'Inter',
    textTransform: 'capitalize',
  },
});
