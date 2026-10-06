// Shared helper: write a text memo to Solana Devnet with the connected wallet.
// Builds a v0 transaction with a single SPL Memo instruction, has the wallet
// sign + send it (Wallet Standard solana:signAndSendTransaction), then polls
// Devnet until it is confirmed. Moves no SOL; only the network fee is paid.
import {
  address,
  appendTransactionMessageInstruction,
  createTransactionMessage,
  getBase58Decoder,
  getUtf8Encoder,
  pipe,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signAndSendTransactionMessageWithSigners,
  type Signature,
  type TransactionSendingSigner,
} from '@solana/kit';
import { rpc } from './config';

/** SPL Memo program (v2). */
export const MEMO_PROGRAM = address('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');

export type MemoStage = 'preparing' | 'approve' | 'confirming';

/** Polls Devnet until the signature is confirmed (or fails / times out). */
async function waitForConfirmation(signature: Signature, timeoutMs = 60_000) {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    const { value } = await rpc.getSignatureStatuses([signature]).send();
    const s = value[0];
    if (s?.err) throw new Error('Transaction failed on-chain');
    if (s && (s.confirmationStatus === 'confirmed' || s.confirmationStatus === 'finalized')) return;
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error('Timed out waiting for confirmation');
}

/** Sends `text` as a Memo on Devnet and resolves with the confirmed base58 signature. */
export async function sendMemo(signer: TransactionSendingSigner, text: string, onStage?: (s: MemoStage) => void): Promise<string> {
  onStage?.('preparing');
  const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();
  const message = pipe(
    createTransactionMessage({ version: 0 }),
    (m) => setTransactionMessageFeePayerSigner(signer, m),
    (m) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, m),
    (m) => appendTransactionMessageInstruction({ programAddress: MEMO_PROGRAM, data: getUtf8Encoder().encode(text) }, m),
  );
  onStage?.('approve');
  const signatureBytes = await signAndSendTransactionMessageWithSigners(message);
  const signature = getBase58Decoder().decode(signatureBytes) as Signature;
  onStage?.('confirming');
  await waitForConfirmation(signature);
  return signature;
}

/** Short, user-facing error text (wallet rejections read as "Cancelled in wallet."). */
export const memoErrorText = (e: unknown) => {
  const msg = e instanceof Error ? e.message : String(e);
  return /reject|denied|cancel/i.test(msg) ? 'Cancelled in wallet.' : msg.slice(0, 120);
};

export const explorerTxUrl = (signature: string) => `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
