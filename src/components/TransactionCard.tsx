import { useState, useEffect } from 'react';
import { ExternalLink, CheckCircle2, Loader2 } from 'lucide-react';
import { awardHP } from '../services/hpService';
import { useAccount } from 'wagmi';
import { fetchOraclePrices } from '../services/oracle';
import type { Prices } from '../services/oracle';
import toast from 'react-hot-toast';

type TxStatus = 'idle' | 'pending' | 'success' | 'error';

type TransactionCardProps = {
  msgId: string;
  intent: string;
  parameters: any;
  initialStatus?: TxStatus;
  initialHash?: string | null;
  hederaId?: string;
  isExpired?: boolean;
  onExecute: () => Promise<any>;
  onUpdateState: (status: TxStatus, hash?: string | null) => void;
};

export default function TransactionCard({
  intent,
  parameters,
  initialStatus = 'idle',
  initialHash = null,
  hederaId,
  isExpired = false,
  onExecute,
  onUpdateState,
}: TransactionCardProps) {
  const [status, setStatus] = useState<TxStatus>(initialStatus);
  const [hash, setHash] = useState<string | null>(initialHash);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [prices, setPrices] = useState<Prices | null>(null);
  const { address } = useAccount();

  useEffect(() => {
    fetchOraclePrices()
      .then(setPrices)
      .catch((err) => console.error('[TX_CARD] Oracle fetch failed:', err));
  }, []);

  const handleExecute = async () => {
    setStatus('pending');
    setErrorMsg(null);
    onUpdateState('pending');
    try {
      const result = await onExecute();
      const explorerUrl =
        result && typeof result === 'object' ? result.explorerUrl : result;
      setHash(explorerUrl);
      setStatus('success');
      onUpdateState('success', explorerUrl);
      if (address) {
        awardHP(address, 15, hederaId)
          .then(() => toast.success('⚡ +15 HP REWARDED FOR TREASURY TRANSFER'))
          .catch((e) => console.error('[TX_CARD] HP Award failed:', e));
      }
    } catch (err: any) {
      console.error('[TX_CARD] Execution failed:', err);
      setStatus('error');
      setErrorMsg(err.message || 'Unknown Transaction Error');
      onUpdateState('error');
    }
  };

  const resetToIdle = () => {
    setStatus('idle');
    setErrorMsg(null);
    onUpdateState('idle');
  };

  const isEffectivelyExpired = isExpired && status !== 'success';

  // Safely extract and sanitize parameters
  const tokenSymbol = (parameters.tokenSymbol || 'HBAR').toUpperCase().replace(/[^A-Z]/g, '');
  const isFiat = !!parameters.isFiatDenominated;
  const fiatUsd = parameters.fiatAmountUsd ? parseFloat(parameters.fiatAmountUsd) : 0;
  const rawAmount = parameters.amount ? parseFloat(parameters.amount) : 0;

  let displayAmount = rawAmount;
  let displayFiat = isFiat ? fiatUsd : 0;

  if (prices) {
    const rate = prices[tokenSymbol as keyof Prices] || 1;
    if (isFiat) {
      displayAmount = fiatUsd / rate;
    } else {
      displayFiat = rawAmount * rate;
    }
  }

  let actionLabel = 'Execute Treasury Transfer';
  if (intent === 'pay_service') actionLabel = `Pay in ${tokenSymbol}`;
  else if (intent === 'transfer_token') actionLabel = `Send ${tokenSymbol}`;

  return (
    <div
      className={`w-full max-w-sm my-3 animate-in fade-in slide-in-from-bottom-4 duration-500 ${
        isEffectivelyExpired ? 'opacity-40 pointer-events-none' : ''
      }`}
    >
      <div className="bg-[#16161a] border border-[#222631] rounded-2xl overflow-hidden shadow-xl">
        {/* Subtle top accent line */}
        <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-[#5c54e6]/60 to-transparent" />

        <div className="px-6 py-6 flex flex-col items-center gap-5">
          {/* ── Primary Amount Display ── */}
          <div className="flex flex-col items-center gap-1 w-full">
            <div className="flex items-baseline gap-2">
              <span className="text-[2.75rem] font-black text-white font-mono leading-none tracking-tight">
                {displayAmount.toFixed(4)}
              </span>
              <span className="text-lg font-black text-[#5c54e6] uppercase tracking-widest">
                {tokenSymbol}
              </span>
            </div>

            {displayFiat > 0 && (
              <span className="text-xs text-[#6b7280] font-medium tabular-nums">
                ≈ ${displayFiat.toFixed(2)} USD
              </span>
            )}
          </div>

          {/* ── Error banner ── */}
          {status === 'error' && errorMsg && (
            <div className="w-full px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-xl">
              <span className="text-[10px] font-mono text-red-400 leading-snug break-words block">
                {errorMsg.substring(0, 180)}{errorMsg.length > 180 ? '…' : ''}
              </span>
            </div>
          )}

          {/* ── CTA ── */}
          <div className="w-full">
            {status === 'idle' && (
              <button
                onClick={handleExecute}
                disabled={isEffectivelyExpired}
                className="w-full py-3.5 rounded-xl font-black uppercase tracking-[0.15em] text-[11px] transition-all duration-200 bg-[#5c54e6] text-white hover:bg-[#6c64ff] hover:shadow-[0_0_18px_rgba(92,84,230,0.45)] active:scale-[0.97]"
              >
                {actionLabel}
              </button>
            )}

            {status === 'pending' && (
              <div className="w-full py-3.5 flex items-center justify-center gap-2 bg-[#1a1d2a] border border-[#2a2f45] rounded-xl">
                <Loader2 size={15} className="text-[#5c54e6] animate-spin" />
                <span className="text-[10px] font-black uppercase tracking-widest text-[#8c98b0] animate-pulse">
                  Broadcasting…
                </span>
              </div>
            )}

            {status === 'success' && (
              <a
                href={hash || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center gap-2 font-black uppercase tracking-[0.15em] text-[11px] hover:bg-emerald-500/20 transition-all duration-200"
              >
                <CheckCircle2 size={14} />
                View on Hashscan
                <ExternalLink size={12} />
              </a>
            )}

            {status === 'error' && (
              <button
                onClick={resetToIdle}
                className="w-full py-3.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl font-black uppercase tracking-[0.15em] text-[11px] hover:bg-red-500/20 transition-all duration-200"
              >
                Retry
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
