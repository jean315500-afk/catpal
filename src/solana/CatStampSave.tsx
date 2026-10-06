// "Save on Solana" under a collected Passport stamp (Solana Devnet).
// Shown only while a wallet is connected (and the stamp is already saved, the
// saved state is always shown). Writes the Cat Stamp payload as a Memo, keeps
// the signature locally, and never submits the same stamp twice.
import { useRef, useState, type MouseEvent } from 'react';
import { useSelectedWalletAccount, useWalletAccountTransactionSendingSigner } from '@solana/react';
import type { UiWalletAccount } from '@wallet-standard/react';
import { SOLANA_CHAIN, shortAddress } from './config';
import { explorerTxUrl, memoErrorText, sendMemo, type MemoStage } from './memo';
import { buildCatStampPayload, catStampMemo, getSavedStamp, saveStampSignature, type CatStampInput } from './catStamp';

const text = { fontWeight: 600, fontSize: '10px', lineHeight: '14px', textAlign: 'center' } as const;
const STAGE: Record<MemoStage, string> = { preparing: 'Preparing…', approve: 'Approve in wallet…', confirming: 'Confirming…' };

export default function CatStampSave({ stamp }: { stamp: CatStampInput }) {
  const [account] = useSelectedWalletAccount();
  const saved = getSavedStamp(stamp.stampId);
  if (saved) return <SavedLink signature={saved.signature} />;
  if (!account || !account.features.includes('solana:signAndSendTransaction')) return null;
  return <SaveAction key={account.address + stamp.stampId} account={account} stamp={stamp} />;
}

// The stamp cell itself opens a profile on click; keep these taps local.
const stop = (e: MouseEvent) => e.stopPropagation();

function SavedLink({ signature }: { signature: string }) {
  return (
    <a href={explorerTxUrl(signature)} target="_blank" rel="noreferrer" onClick={stop} title={signature} style={{ ...text, color: '#010002', textDecoration: 'none' }}>
      Saved on Solana ✓<br />
      <span style={{ fontFamily: 'Inter,sans-serif', fontWeight: 500, color: '#746e63', textDecoration: 'underline', textUnderlineOffset: '2px', textDecorationColor: '#D9D9D9' }}>{shortAddress(signature)}</span>
    </a>
  );
}

function SaveAction({ account, stamp }: { account: UiWalletAccount; stamp: CatStampInput }) {
  const signer = useWalletAccountTransactionSendingSigner(account, SOLANA_CHAIN);
  const [saved, setSaved] = useState(() => getSavedStamp(stamp.stampId)?.signature ?? null);
  const [stage, setStage] = useState<MemoStage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  const save = async (e: MouseEvent) => {
    stop(e);
    if (inFlight.current || saved || getSavedStamp(stamp.stampId)) return; // no double submit
    inFlight.current = true;
    setError(null);
    try {
      const payload = buildCatStampPayload(stamp, account.address);
      const signature = await sendMemo(signer, catStampMemo(payload), setStage);
      saveStampSignature(stamp.stampId, account.address, signature);
      setSaved(signature);
    } catch (err) {
      setError(memoErrorText(err));
    } finally {
      setStage(null);
      inFlight.current = false;
    }
  };

  if (saved) return <SavedLink signature={saved} />;
  if (stage) return <span onClick={stop} style={{ ...text, color: '#a89f8d' }}>{STAGE[stage]}</span>;
  return (
    <span onClick={save} title={error ?? 'Records this stamp on Solana Devnet (Memo)'} style={{ ...text, color: error ? '#a89f8d' : '#010002', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '2px', textDecorationColor: '#D9D9D9' }}>
      {error ? 'Retry · Save on Solana' : 'Save on Solana'}
    </span>
  );
}
