import { TouchableOpacity, View, StyleSheet, Text } from 'react-native';
import React from 'react';
import { router, usePathname } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWallet } from '@/context/WalletContext';
import { AIPayIcon } from '@/components/icons/AIPayIcon';

const tabs = [
  { name: 'Home', icon: 'home', route: '/' as const },
  { name: 'Contact', icon: 'users', route: '/contacts' as const },
  { name: 'Wallet', icon: 'credit-card', route: '/activities' as const },
];

export function CustomTabBar() {
  const pathname = usePathname();
  const { authStep } = useWallet();
  const insets = useSafeAreaInsets();

  if (authStep !== 'ready') return null;

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: (insets.bottom || 16) + 12 },
      ]}
    >
      {/* Left: Tabs Row */}
      <View style={styles.tabsRow}>
        {tabs.map((tab) => {
          const isActive = pathname === tab.route;
          return (
            <TouchableOpacity
              key={tab.name}
              onPress={() => router.navigate(tab.route)}
              activeOpacity={0.7}
              style={[
                styles.tabItem,
                isActive && styles.tabItemActive,
              ]}
            >
              <Feather
                name={tab.icon as any}
                size={20}
                color={isActive ? '#09090b' : '#71717a'}
              />
              {isActive && (
                <Text style={styles.tabLabel}>
                  {tab.name}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Right: Pay Button */}
      <TouchableOpacity
        onPress={() => router.navigate('/pay')}
        activeOpacity={0.8}
        style={styles.payButtonOuter}
      >
        <LinearGradient
          colors={['#030712', '#09090b']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.payButtonGradient}
        >
          {/* Inset white top highlight */}
          <View style={styles.payHighlight} />
          {/* AIPayIcon SVG */}
          <AIPayIcon size={16} />
          <Text style={styles.payText}>pay</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
    borderRadius: 999,
  },
  tabItemActive: {
    width: 'auto',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#f4f4f5', // zinc-100
    borderWidth: 1,
    borderColor: '#e5e5e5', // neutral-200
    gap: 8,
  },
  tabLabel: {
    color: '#09090b',
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'Poppins',
  },
  // Pay Button
  payButtonOuter: {
    width: 96,
    height: 48,
    borderRadius: 50,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1e293b', // slate-800
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  payButtonGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  payHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderTopLeftRadius: 50,
    borderTopRightRadius: 50,
  },
  payText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'Inter',
    textTransform: 'capitalize',
  },
});