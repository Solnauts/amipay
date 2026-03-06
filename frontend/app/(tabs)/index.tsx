import React, { useEffect, useState } from "react";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { RefreshControl, ScrollView } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useWallet } from "@/context/WalletContext";

// Home screen components
import { HomeHeader }          from "@/components/home/HomeHeader";
import { BalanceSection }      from "@/components/home/BalanceSection";
import { PeopleSection }       from "@/components/home/PeopleSection";
import { FavouriteSection }    from "@/components/home/FavouriteSection";
import { AIPayBanner }         from "@/components/home/AIPayBanner";
import { WalletConnectScreen } from "@/components/home/WalletConnectScreen";
import { OnboardingIntro }     from "@/components/home/OnboardingIntro";
import { OnboardingScreen }    from "@/components/home/OnboardingScreen";

const connection = new Connection("https://api.devnet.solana.com", "confirmed");

export default function HomeScreen() {
  const { publicKey, authStep, connect } = useWallet();
  const [balance, setBalance]           = useState<number | null>(null);
  const [refreshing, setRefreshing]     = useState(false);
  const [showIntro, setShowIntro]       = useState(false); // false until storage checked
  const [introChecked, setIntroChecked] = useState(false); // prevents flash

  // ── Check if intro has been seen before ─────────────────────────────────
  useEffect(() => {
    AsyncStorage.getItem("intro_seen").then((val) => {
      setShowIntro(val === null); // null = first time ever
      setIntroChecked(true);
    });
  }, []);

  const handleIntroDone = async () => {
    await AsyncStorage.setItem("intro_seen", "true");
    setShowIntro(false);
  };

  // ── Balance ──────────────────────────────────────────────────────────────
  const fetchBalance = async () => {
    if (!publicKey) return;
    try {
      const lamports = await connection.getBalance(publicKey);
      setBalance(lamports / LAMPORTS_PER_SOL);
    } catch (e) {
      console.error("Balance fetch failed:", e);
    }
  };

  useEffect(() => {
    if (authStep === "ready") fetchBalance();
    else setBalance(null);
  }, [authStep, publicKey]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchBalance();
    setRefreshing(false);
  };

  // ── Wait until AsyncStorage check is done (prevents intro flash) ────────
  if (!introChecked) return null;

  // ── Step 1: Intro slides (first launch only) ─────────────────────────────
  if (showIntro) {
    return <OnboardingIntro onDone={handleIntroDone} />;
  }

  // ── Step 2: Connect wallet ───────────────────────────────────────────────
  if (authStep === "idle" || authStep === "connecting" || authStep === "logging_in") {
    return <WalletConnectScreen onConnect={connect} authStep={authStep} />;
  }

  // ── Step 3: New user — pick alias + PIN ─────────────────────────────────
  if (authStep === "onboarding") {
    return <OnboardingScreen />;
  }

  // ── Step 4: Home (authStep === 'ready') ──────────────────────────────────
  return (
    <SafeAreaProvider>
      <SafeAreaView className="flex-1 bg-background dark:bg-background-dark">
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#8B5CF6"
              colors={["#8B5CF6"]}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          <HomeHeader />
          <BalanceSection balance={balance} connecting={false} />
          <PeopleSection />
          <FavouriteSection />
          <AIPayBanner />
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
