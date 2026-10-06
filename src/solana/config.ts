// Solana network config. CatPal targets Devnet only for now.
import { createSolanaRpc, devnet } from '@solana/kit';

/** Wallet Standard chain id for Solana Devnet. */
export const SOLANA_CHAIN = 'solana:devnet' as const;

/** Public Devnet RPC endpoint. */
export const DEVNET_RPC_URL = devnet('https://api.devnet.solana.com');

/** Kit RPC client for Devnet (not used for any requests yet). */
export const rpc = createSolanaRpc(DEVNET_RPC_URL);

/** "7xK2...9PqA" style short form of a base58 address. */
export const shortAddress = (address: string) =>
  address.length > 10 ? `${address.slice(0, 4)}...${address.slice(-4)}` : address;
