import { SafeAreaView, View, TouchableOpacity } from 'react-native';
import { ThemedText } from '@/components/ui/ThemedText';
import { ThemedView } from '@/components/ui/ThemedView';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ButtonComponent } from '@/components/ui/ButtonComponent';

export default function HomeScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <ThemedView className="flex-1 px-6 pt-12 pb-8">
        {/* Header Section */}
        <ThemedView className="items-center mb-12">
          <View className="w-16 h-16 rounded-full bg-yellow-400 items-center justify-center mb-6">
            <IconSymbol name="wallet.pass" size={32} color="#ffffff" />
          </View>
          <ThemedText variant="default" className="font-bold text-3xl text-center mb-3">
            Welcome to CryptoPay
          </ThemedText>
          <ThemedText variant="secondary" className="text-center text-base px-4">
            Send crypto easily to anyone, anywhere. Connect your wallet to get started.
          </ThemedText>
        </ThemedView>

        {/* Features List */}
        <ThemedView className="flex-1 flex-col gap-8 mb-8">
          <FeatureItem
            icon="sparkles"
            title="AI-Powered Payments"
            description="Use AI to send payments with simple voice or text commands"
          />
          <FeatureItem
            icon="person.2.fill"
            title="Group Payments"
            description="Send to multiple family members or friends at once"
          />
          <FeatureItem
            icon="lock.fill"
            title="Secure & Simple"
            description="No complex crypto jargon, just simple and secure transactions"
          />
        </ThemedView>

        {/* Connect Button Section */}
         <ThemedView className="mt-auto">
          <ButtonComponent label="Connect Wallet" onPress={() => {}} disabled={false} />
                 <ThemedText variant="secondary" className="text-center text-sm px-4">
            We support Phantom, Solflare, and other popular Solana wallets
          </ThemedText>
         </ThemedView>
      </ThemedView>
    </SafeAreaView>
  );
}

function FeatureItem({ icon, title, description }: { icon: any, title: string, description: string }) {
  return (
    <ThemedView className="flex-row items-start gap-4">
      <ThemedView className="w-12 h-12 rounded-full bg-blue-50 items-center justify-center mt-1">
        <IconSymbol name={icon} size={22} color="#60a5fa" />
      </ThemedView>
      <ThemedView className="flex-1">
        <ThemedText variant="default" className="font-semibold text-lg mb-1">
          {title}
        </ThemedText>
        <ThemedText variant="secondary" className="text-sm leading-5">
          {description}
        </ThemedText>
      </ThemedView>
    </ThemedView>
  );
}
