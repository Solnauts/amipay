import "../global.css";
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import { useColorScheme } from "react-native";
import { Colors } from "@/constants/theme";
import { WalletProvider } from "@/context/WalletContext";
import { ThemedView } from "@/components/ui/ThemedView";
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const colorScheme = useColorScheme() ?? "light";
  const isDark = colorScheme === "dark";
  const themeColors = Colors[colorScheme];

  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  // Keep splash visible until fonts are ready
  if (!fontsLoaded) return null;

  return (
    <WalletProvider>
      <ThemedView style={{ flex: 1, backgroundColor: themeColors.background }}>
        <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
          <Stack>
            <Stack.Screen name="(tabs)"            options={{ headerShown: false }} />
            <Stack.Screen name="modal"             options={{ presentation: 'modal', title: 'Modal' }} />
            <Stack.Screen name="pay"               options={{ presentation: 'modal', headerShown: false }} />
            <Stack.Screen name="all-transactions"  options={{ headerShown: false }} />
          </Stack>
          <StatusBar style={isDark ? "light" : "dark"} />
        </ThemeProvider>
      </ThemedView>
    </WalletProvider>
  );
}
