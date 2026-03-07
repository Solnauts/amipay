import { TouchableOpacity, View, StyleSheet, Pressable, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, usePathname } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedView } from '@/components/ui/ThemedView';
import { ThemedText } from '@/components/ui/ThemedText';
import { useWallet } from '@/context/WalletContext';
import { AIPayIcon } from '../icons/AIPayIcon';

const tabs = [
  { name: 'Home',     icon: 'home',        route: '/'           as const },
  { name: 'Contacts', icon: 'users',       route: '/contacts'   as const },
  { name: 'Wallet',   icon: 'credit-card', route: '/activities' as const },
];

export function CustomTabBar() {
  const pathname = usePathname();
  const { isConnected } = useWallet();
  const insets = useSafeAreaInsets();

  const TAB_ROUTES = ['/', '/contacts', '/activities'];

  if (!isConnected) return null;
  if (!TAB_ROUTES.includes(pathname)) return null; 

  return (
    <View 
      style={[
        styles.tabBarContainer, 
        { paddingBottom: insets.bottom > 0 ? insets.bottom : 16 }
      ]}
    >
      {/* Left: Tabs */}
      <View style={styles.tabsRow}>
        {tabs.map((tab) => {
          const isActive = pathname === tab.route;
          return (
            <TouchableOpacity
              key={tab.name}
              onPress={() => router.push(tab.route)}
              activeOpacity={0.7}
              style={[
                styles.tabItem,
                isActive && styles.tabItemActive
              ]}
            >
              <Feather
                name={tab.icon as any}
                size={isActive ? 20 : 22}
                color="#09090b" // zinc-950
              />
              {isActive && (
                <Text style={styles.tabTextActive}>
                  {tab.name}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Right: Pay Button */}
      <Pressable
        onPress={() => router.push('/pay')}
        style={({ pressed }) => [
          styles.payButtonShadow,
          pressed && { transform: [{ scale: 0.97 }] }
        ]}
      >
        <LinearGradient
          colors={['#030712', '#09090b']} // gray-950 to zinc-950
          style={styles.payButtonGradient}
        >
          {/* Simulated Inset Highlight */}
          <View style={styles.insetHighlight} />
          
          <View style={styles.payContent}>
            {/* Custom Figma Violet 3D Icon */}
            <AIPayIcon />
            
            {/* Standard Text component forces it to stay white */}
            <Text style={styles.payText}>Pay</Text>
          </View>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5', // neutral-200
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8, // Requires RN 0.71+
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    width: 48, // Default circle for inactive
    borderRadius: 999,
  },
  tabItemActive: {
    width: 'auto',
    paddingHorizontal: 16,
    backgroundColor: '#f4f4f5', // zinc-100
    borderWidth: 1,
    borderColor: '#e5e5e5', // neutral-200
    gap: 8,
  },
  tabTextActive: {
    color: '#09090b', // zinc-950
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'Inter',
  },
  
  // Pay Button Styles
  payButtonShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  payButtonGradient: {
    width: 96,  // w-24
    height: 48, // h-12
    borderRadius: 50,
    borderWidth: 1,
    borderColor: '#0f172a', // slate-900
    overflow: 'hidden',
  },
  insetHighlight: {
    ...StyleSheet.absoluteFillObject,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 50,
  },
  payContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  payText: {
    color: '#ffffff', // Forced white!
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'Inter',
    textTransform: 'capitalize',
  },
  
  // 3D Sphere Styles exactly matching Figma
  sphereContainer: {
    width: 16,
    height: 16,
    backgroundColor: '#8b5cf6', // violet-500
    borderRadius: 110,
    overflow: 'hidden',
    position: 'relative',
  },
  sphereLayer1: {
    position: 'absolute',
    width: 10,
    height: 10,
    left: 0,
    top: 4,
    backgroundColor: '#7c3aed', // violet-700
    borderRadius: 999,
  },
  sphereLayer2: {
    position: 'absolute',
    width: 10,
    height: 10,
    left: 0,
    top: 4,
    backgroundColor: '#ffffff',
    borderRadius: 999,
  },
  sphereLayer3: {
    position: 'absolute',
    width: 10,
    height: 10,
    left: 2,
    top: 5.85,
    backgroundColor: '#d8b4fe', // purple-300
    borderRadius: 999,
  },
});