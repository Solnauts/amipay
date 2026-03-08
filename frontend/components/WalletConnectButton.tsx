import ButtonComponent from '@/components/ui/ButtonComponent';
import { useWallet } from '@/context/WalletContext';

export default function WalletConnectButton() {
  const { publicKey, isConnected, authStep, connect, disconnect } = useWallet();
  const connecting = authStep === 'connecting' || authStep === 'logging_in';

  const displayKey = publicKey
    ? `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}`
    : null;

  if (isConnected) {
    return (
      <ButtonComponent
        label={`✓ ${displayKey}`}
        onPress={disconnect}
        icon="checkmark.circle.fill"
        variant="success"
      />
    );
  }

  return (
    <ButtonComponent
      label="Connect Wallet"
      onPress={connect}
      loading={connecting}
      icon="wallet.pass.fill"
      variant="primary"
    />
  );
}
