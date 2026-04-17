import { useState, useEffect } from 'react';
import { resolveHederaAddress } from '../services/hederaService';

export function useHederaId(evmAddress?: string): string | undefined {
  const [hederaId, setHederaId] = useState<string | undefined>();

  useEffect(() => {
    const resolve = async () => {
      if (evmAddress) {
        const resolved = await resolveHederaAddress(evmAddress);
        setHederaId(resolved);
      } else {
        setHederaId(undefined);
      }
    };
    resolve();
  }, [evmAddress]);

  return hederaId;
}
