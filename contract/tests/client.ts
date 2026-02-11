import {
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  sendAndConfirmTransactionFactory,
} from "@solana/kit";

// ═══════════════════════════════════════════════════════════════
// Devnet RPC endpoints
// ═══════════════════════════════════════════════════════════════
const DEVNET_RPC_URL = "https://api.devnet.solana.com";
const DEVNET_WS_URL = "wss://api.devnet.solana.com";

// export type Client = {
//   rpc: Rpc<SolanaRpcApi>;
//   rpcSubscriptions: RpcSubscriptions<SolanaRpcSubscriptionsApi>;
// };
//
//let client : Clent || undefined

export function createClient() {
  let client = {
    rpc: createSolanaRpc(DEVNET_RPC_URL),
    rpcSubscriptions: createSolanaRpcSubscriptions(DEVNET_WS_URL),
  };
  return client;
}

export function getSendAndConfirm() {
  const sendAndConfirm = sendAndConfirmTransactionFactory({
    rpc: createSolanaRpc(DEVNET_RPC_URL),
    rpcSubscriptions: createSolanaRpcSubscriptions(DEVNET_WS_URL),
  });
  return sendAndConfirm;
}
