import { PublicKey } from "@solana/web3.js";
import { toByteArray } from "base64-js";

export function toPublicKey(address: string | Uint8Array): PublicKey {
  if (typeof address === 'string') {
    // base64-encoded bytes (MWA protocol returns base64)
    try {
      const bytes = toByteArray(address);
      return new PublicKey(bytes);
    } catch {
      // fallback: treat as base58
      return new PublicKey(address);
    }
  }
  return new PublicKey(address);
}