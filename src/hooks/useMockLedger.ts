import { useState, useEffect, useCallback } from 'react';

export type MockBalances = {
  HBAR: number;
  USDC: number;
  SAUCE: number;
};

export type SupportedToken = keyof MockBalances;

const DEFAULT_BALANCES: MockBalances = {
  HBAR: 100,
  USDC: 500,
  SAUCE: 5000,
};

const STORAGE_PREFIX = 'hashpilot_ledger_';
const LEDGER_UPDATE_EVENT = 'hashpilot:ledger:updated';

function getStorageKey(address: string): string {
  return `${STORAGE_PREFIX}${address.replace(/\./g, '_')}`;
}



export function useMockLedger(hederaAddress?: string) {
  const [balances, setBalances] = useState<MockBalances>(DEFAULT_BALANCES);

  // Initialize or restore from localStorage when address changes
  useEffect(() => {
    if (!hederaAddress) {
      setBalances({ ...DEFAULT_BALANCES });
      return;
    }

    const key = getStorageKey(hederaAddress);
    const stored = localStorage.getItem(key);

    if (stored) {
      try {
        setBalances({ ...DEFAULT_BALANCES, ...JSON.parse(stored) });
      } catch {
        localStorage.setItem(key, JSON.stringify(DEFAULT_BALANCES));
        setBalances({ ...DEFAULT_BALANCES });
      }
    } else {
      // First-time user: initialize with demo balance
      localStorage.setItem(key, JSON.stringify(DEFAULT_BALANCES));
      setBalances({ ...DEFAULT_BALANCES });
    }
  }, [hederaAddress]);

  // Listen for updates dispatched by other instances of this hook (same tab)
  useEffect(() => {
    if (!hederaAddress) return;

    const handleUpdate = (e: Event) => {
      const detail = (e as CustomEvent<{ address: string; balances: MockBalances }>).detail;
      if (detail.address === hederaAddress) {
        setBalances(detail.balances);
      }
    };

    window.addEventListener(LEDGER_UPDATE_EVENT, handleUpdate);
    return () => window.removeEventListener(LEDGER_UPDATE_EVENT, handleUpdate);
  }, [hederaAddress]);

  const deductBalance = useCallback(
    (tokenSymbol: SupportedToken, amount: number) => {
      if (!hederaAddress) return;

      setBalances((prev) => {
        const updated: MockBalances = {
          ...prev,
          [tokenSymbol]: Math.max(0, parseFloat((prev[tokenSymbol] - amount).toFixed(6))),
        };

        // Persist to localStorage
        localStorage.setItem(getStorageKey(hederaAddress), JSON.stringify(updated));

        // Broadcast to all other useMockLedger instances in the same tab
        window.dispatchEvent(
          new CustomEvent(LEDGER_UPDATE_EVENT, {
            detail: { address: hederaAddress, balances: updated },
          })
        );

        return updated;
      });
    },
    [hederaAddress]
  );

  const hasSufficientBalance = useCallback(
    (tokenSymbol: SupportedToken, amount: number): boolean => {
      return balances[tokenSymbol] >= amount;
    },
    [balances]
  );

  const resetBalances = useCallback(() => {
    if (!hederaAddress) return;
    localStorage.setItem(getStorageKey(hederaAddress), JSON.stringify(DEFAULT_BALANCES));
    setBalances({ ...DEFAULT_BALANCES });
    window.dispatchEvent(
      new CustomEvent(LEDGER_UPDATE_EVENT, {
        detail: { address: hederaAddress, balances: DEFAULT_BALANCES },
      })
    );
  }, [hederaAddress]);

  return { balances, deductBalance, hasSufficientBalance, resetBalances };
}
