import "../global.css";
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import { useColorScheme, View } from "react-native";
import { Colors } from "@/constants/theme";

// import { MobileWalletProvider } from '@wallet-ui/react-native-web3js';
// import {
//   MobileWalletProvider,
//   MobileWalletProviderContext,
// } from '@wallet-ui/react-native-web3js/dist/mobile-wallet-provider';
import { clusterApiUrl } from '@solana/web3.js';

const chain = 'solana:devnet';
const endpoint = clusterApiUrl('devnet');
const identity = {
  name: 'My Solana App',
  uri: 'https://mysolanaapp.com',
  icon: 'favicon.png',
};

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme() ?? "light";
  const isDark = colorScheme === "dark";
  const themeColors = Colors[colorScheme];

  return (
    //  <MobileWalletProvider chain={chain} endpoint={endpoint} identity={identity}>
    <View style={{ flex: 1, backgroundColor: themeColors.background }}>
      <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: "modal", title: "Modal" }} />
        </Stack>
        <StatusBar style={isDark ? "light" : "dark"} />
      </ThemeProvider>
    </View>
    // </MobileWalletProvider>
  );
}
