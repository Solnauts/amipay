import { TouchableOpacity, View, Text, useColorScheme } from 'react-native';
import React from 'react';
import { router, usePathname } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWallet } from '@/context/WalletContext';
import { AIPayIcon } from '@/components/icons/AIPayIcon';
import { Colors } from '@/constants/theme';

const tabs = [
  { name: 'Home', icon: 'home', route: '/' as const },
  { name: 'Contact', icon: 'users', route: '/contacts' as const },
  { name: 'Wallet', icon: 'credit-card', route: '/activities' as const },
];

export function CustomTabBar() {
  const pathname = usePathname();
  const { authStep } = useWallet();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  if (authStep !== 'ready') return null;

  return (
    <View
      style={[
        {
          width: '100%',
          backgroundColor: colors.background,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingTop: 16,
        },
        { paddingBottom: (insets.bottom || 16) + 12 },
      ]}
    >
      {/* Left: Tabs Row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {tabs.map((tab) => {
          const isActive = pathname === tab.route;
          return (
            <TouchableOpacity
              key={tab.name}
              onPress={() => router.navigate(tab.route)}
              activeOpacity={0.7}
              style={
                isActive
                  ? {
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      borderRadius: 999,
                      backgroundColor: colors.violetLight,
                      borderWidth: 1,
                      borderColor: colors.border,
                      gap: 8,
                    }
                  : {
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 44,
                      height: 44,
                      borderRadius: 999,
                    }
              }
            >
              <Feather
                name={tab.icon as any}
                size={20}
                color={isActive ? colors.text : colors.mutedForeground}
              />
              {isActive && (
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 16,
                    fontWeight: '500',
                    fontFamily: 'Poppins',
                  }}
                >
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
        style={{
          width: 96,
          height: 48,
          borderRadius: 50,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: colorScheme === 'dark' ? '#ffffff' : '#1e293b',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 10,
          elevation: 4,
        }}
      >
        {colorScheme === 'dark' ? (
          <View
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              paddingHorizontal: 16,
              backgroundColor: '#ffffff',
            }}
          >
            <AIPayIcon size={16} />
            <Text
              style={{
                color: '#09090b',
                fontSize: 16,
                fontWeight: '500',
                fontFamily: 'Inter',
                textTransform: 'capitalize',
              }}
            >
              pay
            </Text>
          </View>
        ) : (
          <LinearGradient
            colors={['#030712', '#09090b']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              paddingHorizontal: 16,
            }}
          >
            {/* Inset white top highlight */}
            <View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 2,
                backgroundColor: 'rgba(255,255,255,0.5)',
                borderTopLeftRadius: 50,
                borderTopRightRadius: 50,
              }}
            />
            <AIPayIcon size={16} />
            <Text
              style={{
                color: '#ffffff',
                fontSize: 16,
                fontWeight: '500',
                fontFamily: 'Inter',
                textTransform: 'capitalize',
              }}
            >
              pay
            </Text>
          </LinearGradient>
        )}
      </TouchableOpacity>
    </View>
  );
}