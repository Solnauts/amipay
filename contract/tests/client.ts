import { Rpc, RpcSubscriptions, SolanaRpcApi, SolanaRpcSubscriptionsApi } from '@solana/kit';
import { createSolanaRpc, createSolanaRpcSubscriptions, sendAndConfirmTransactionFactory } from '@solana/kit';

export type Client = {
  rpc: Rpc<SolanaRpcApi>;
  rpcSubscriptions: RpcSubscriptions<SolanaRpcSubscriptionsApi>;
};

let client: Client | undefined;
export function createClient(): Client {
  if (!client) {
    client = {
      rpc: createSolanaRpc('http://127.0.0.1:8899'),
      rpcSubscriptions: createSolanaRpcSubscriptions('ws://127.0.0.1:8900'),
    };
  }
  return client;
}

export function getSendandConfirm() {
  const sendAndConfirm = sendAndConfirmTransactionFactory({
    rpc: createSolanaRpc('http://127.0.0.1:8899'),
    rpcSubscriptions: createSolanaRpcSubscriptions('ws://127.0.0.1:8900'),
  }
  )
  return sendAndConfirm
}
