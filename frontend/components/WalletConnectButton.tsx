import { ButtonComponent } from '@/components/ui/ButtonComponent';
import { useWallet } from '@/context/WalletContext';

export default function WalletConnectButton() {
  const { publicKey, isConnected, connecting, connect, disconnect } = useWallet();

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
