// App-wide wallet state: which Wallet Standard account is selected. Lives above
// every screen, so the connection survives navigation; the selection is also
// remembered in localStorage and restored on reload if the wallet is still there.
import { useEffect, useRef, type ReactNode } from 'react';
import { SelectedWalletAccountContextProvider, useSelectedWalletAccount } from '@solana/react';
import { getWalletFeature, type UiWallet } from '@wallet-standard/react';
import { SOLANA_CHAIN } from './config';

const STORAGE_KEY = 'catpal:selected-wallet-account';

const stateSync = {
  getSelectedWallet: () => {
    try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
  },
  storeSelectedWallet: (accountKey: string) => {
    try { localStorage.setItem(STORAGE_KEY, accountKey); } catch { /* storage unavailable */ }
  },
  deleteSelectedWallet: () => {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* storage unavailable */ }
  },
};

/** Only wallets that support Solana Devnet and the standard connect flow. */
export const supportsCatPal = (wallet: UiWallet) =>
  wallet.chains.includes(SOLANA_CHAIN) && wallet.features.includes('standard:connect');

/**
 * After a reload, wallets usually expose no accounts until the app reconnects.
 * If a wallet was selected last time, ask it once to reconnect silently (no
 * popup); the provider then re-selects the saved account by itself.
 */
function SilentReconnect() {
  const [account, , wallets] = useSelectedWalletAccount();
  const tried = useRef(false);
  useEffect(() => {
    if (account || tried.current) return;
    const key = stateSync.getSelectedWallet(); // "<wallet name>:<address>"
    if (!key) return;
    const wallet = wallets.find((w) => w.name === key.slice(0, key.lastIndexOf(':')));
    if (!wallet) return;
    tried.current = true;
    // Next tick: this child effect runs before the provider subscribes to wallet
    // "change" events, and a wallet that answers synchronously would be missed.
    const t = setTimeout(() => {
      try {
        const feature = getWalletFeature(wallet, 'standard:connect') as { connect: (input?: { silent?: boolean }) => Promise<unknown> };
        feature.connect({ silent: true }).catch(() => {});
      } catch { /* wallet without standard:connect */ }
    }, 0);
    return () => clearTimeout(t);
  }, [account, wallets]);
  return null;
}

export function WalletProvider({ children }: { children: ReactNode }) {
  return (
    <SelectedWalletAccountContextProvider filterWallets={supportsCatPal} stateSync={stateSync}>
      <SilentReconnect />
      {children}
    </SelectedWalletAccountContextProvider>
  );
}
