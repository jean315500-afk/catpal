// Wallet card for the Passport screen: detect Wallet Standard wallets,
// connect one on Solana Devnet, show the short address, disconnect.
// Sits between the passport summary and the Stamp Book / Journal tabs.
// No transactions are made.
import { useState } from 'react';
import { useSelectedWalletAccount } from '@solana/react';
import {
  uiWalletAccountBelongsToUiWallet,
  useConnect,
  useDisconnect,
  type UiWallet,
  type UiWalletAccount,
} from '@wallet-standard/react';
import { SOLANA_CHAIN, shortAddress } from './config';

const card = { marginTop: '12px', background: '#fff', boxShadow: 'inset 0 0 0 1px #EFE7D6', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' } as const;
const title = { fontWeight: 700, fontSize: '14px', lineHeight: '20px' } as const;
const note = { fontWeight: 500, fontSize: '12px', lineHeight: '18px', color: '#a89f8d' } as const;

export default function WalletSection() {
  const [account, setAccount, wallets] = useSelectedWalletAccount();
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const owner = account ? wallets.find((w) => uiWalletAccountBelongsToUiWallet(account, w)) : undefined;

  return (
    <div style={card}>
      {account ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <span style={{ ...title, fontFamily: 'Inter,sans-serif' }} title={account.address}>{shortAddress(account.address)}</span>
            <span style={note}>Devnet</span>
          </div>
          {owner && owner.features.includes('standard:disconnect') ? (
            <DisconnectButton wallet={owner} onDone={() => setAccount(undefined)} />
          ) : (
            <TextButton onClick={() => setAccount(undefined)}>Disconnect</TextButton>
          )}
        </div>
      ) : (
        <div onClick={() => { setError(null); setPicking((p) => !p); }} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <span style={title}>Connect Wallet</span>
            <span style={note}>Save your Cat Passport on Solana</span>
          </div>
          <span style={{ flex: 'none', fontWeight: 500, fontSize: picking ? '12px' : '18px', lineHeight: '18px', color: '#a89f8d' }}>{picking ? 'Close' : '›'}</span>
        </div>
      )}

      {!account && picking ? (
        wallets.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {wallets.map((w) => (
              <WalletOption key={w.name} wallet={w} onConnected={(a) => { setAccount(a); setPicking(false); }} onError={setError} />
            ))}
          </div>
        ) : (
          <span style={note}>No Solana wallet found. Install Phantom, Solflare or Backpack, then reload.</span>
        )
      ) : null}
      {error ? <span style={note}>{error}</span> : null}
    </div>
  );
}

function WalletOption({ wallet, onConnected, onError }: { wallet: UiWallet; onConnected: (a: UiWalletAccount) => void; onError: (m: string) => void }) {
  const [isConnecting, connect] = useConnect(wallet);
  const pick = async () => {
    if (isConnecting) return;
    try {
      const accounts = await connect();
      const a = accounts.find((x) => x.chains.includes(SOLANA_CHAIN)) || accounts[0];
      if (a) onConnected(a);
      else onError(`${wallet.name} didn't share an account.`);
    } catch {
      onError(`Couldn't connect to ${wallet.name}.`);
    }
  };
  return (
    <div className="dc-hover-13" onClick={pick} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 6px', borderRadius: '12px', cursor: 'pointer', transition: 'background .15s ease' }}>
      <img src={wallet.icon} alt="" style={{ flex: 'none', width: '28px', height: '28px', borderRadius: '7px' }} />
      <span style={{ flex: 1, fontWeight: 700, fontSize: '14px' }}>{wallet.name}</span>
      <span style={{ fontWeight: 500, fontSize: '12px', color: '#a89f8d' }}>{isConnecting ? 'Connecting…' : ''}</span>
    </div>
  );
}

function DisconnectButton({ wallet, onDone }: { wallet: UiWallet; onDone: () => void }) {
  const [isDisconnecting, disconnect] = useDisconnect(wallet);
  return (
    <TextButton onClick={async () => { try { await disconnect(); } finally { onDone(); } }}>
      {isDisconnecting ? 'Disconnecting…' : 'Disconnect'}
    </TextButton>
  );
}

function TextButton({ onClick, children }: { onClick: () => void; children: string }) {
  return (
    <span onClick={onClick} style={{ flex: 'none', fontWeight: 500, fontSize: '12px', color: '#746e63', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '3px', textDecorationColor: '#D9D9D9' }}>
      {children}
    </span>
  );
}
