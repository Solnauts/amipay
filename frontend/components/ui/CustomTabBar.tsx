import { useState } from 'react';
import { TouchableOpacity, useColorScheme, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ThemedView } from '@/components/ui/ThemedView';
import { ThemedText } from '@/components/ui/ThemedText';
import { Colors } from '@/constants/theme';

const tabs = [
  { name: 'Home', icon: 'home' },
  { name: 'Wallet', icon: 'credit-card' },
  { name: 'Contacts', icon: 'users' },
];

export function CustomTabBar() {
  const colors = Colors[useColorScheme() ?? 'light'];
  const [activeTab, setActiveTab] = useState('Home');

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
          const isActive = activeTab === tab.name;
          return (
            <TouchableOpacity
              key={tab.name}
              onPress={() => setActiveTab(tab.name)}
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
