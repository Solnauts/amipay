import { TouchableOpacity, useColorScheme, View } from 'react-native';
import { router, usePathname } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { ThemedView } from '@/components/ui/ThemedView';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors } from '@/constants/theme';
import { useWallet } from '@/context/WalletContext';

const tabs = [
  { name: 'Home',      icon: 'home',        route: '/'                 as const },
   { name: 'Contacts',   icon: 'users',        route: '/contacts'    as const },
  { name: 'Activities', icon: 'credit-card',   route: '/activities' as const },
 
];

export function CustomTabBar() {
  const colors = Colors[useColorScheme() ?? 'light'];
  const pathname = usePathname();
  const { isConnected } = useWallet();

  // Hide the tab bar on the connect screen (wallet not yet connected)
  if (!isConnected) return null;

  return (
    <ThemedView
      className="flex-row items-center justify-between px-3 py-2"
      style={{ 
        marginBottom: 20,
      }}
    >
      {/* Left: Tabs */}
      <ThemedView className="flex-row items-center gap-1">
        {tabs.map((tab) => {
          const isActive = pathname === tab.route;
          return (
            <TouchableOpacity
              key={tab.name}
              onPress={() => router.push(tab.route)}
              activeOpacity={0.7}
              className="flex-row items-center gap-1.5 px-3 py-2 rounded-full"
              style={{
                backgroundColor: isActive ? colors.primary : 'transparent',
              }}
            >
              <Feather
                name={tab.icon as any}
                size={18}
                color={isActive ? colors.text : colors.textMuted}
              />
              {isActive && (
                <ThemedText className="text-sm font-medium">
                  {tab.name}
                </ThemedText>
              )}
            </TouchableOpacity>
          );
        })}
      </ThemedView>

      {/* Right: Pay Button */}
      <TouchableOpacity
        onPress={() => router.push('/pay')}
        activeOpacity={0.8}
        className="flex-row items-center gap-2 px-4 py-2.5 rounded-full"
        style={{ backgroundColor: '#0d0d0d' }}
      >
        <View
          className="w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: '#8b5cf6' }}
        />
        <ThemedText
          className="text-sm font-semibold"
          style={{ color: '#ffffff' }}
        >
          Pay
        </ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );
}
