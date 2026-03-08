import { Tabs } from 'expo-router';
import React from 'react';
import { CustomTabBar } from '@/components/ui/CustomTabBar';

export default function TabLayout() {
  return (
    <Tabs
      tabBar={() => <CustomTabBar />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Home' }}
      />
      <Tabs.Screen
        name="contacts"
        options={{ title: 'Contacts' }}
      />
      <Tabs.Screen
        name="activities"
        options={{ title: 'Activities' }}
      />
      <Tabs.Screen
        name="cards"
        options={{ title: 'Payment' }}
      />
    </Tabs>
  );
}
