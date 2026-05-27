import { useState, useEffect } from 'react';
import { ExternalLink, CheckCircle2, XCircle, Loader2, ShieldCheck, Wallet, ArrowRight, DollarSign } from 'lucide-react';
import { awardHP } from '../services/hpService';
import { useAccount } from 'wagmi';
import { fetchOraclePrices } from '../services/oracle';
import type { Prices } from '../services/oracle';
import toast from 'react-hot-toast';
import { useMockLedger } from '../hooks/useMockLedger';
import type { SupportedToken } from '../hooks/useMockLedger';

type TxStatus = 'idle' | 'pending' | 'success' | 'error';

type TransactionCardProps = {
  msgId: string;
  intent: string;
  parameters: any;
  initialStatus?: TxStatus;
  initialHash?: string | null;
  hederaId?: string;
  isExpired?: boolean;
  intentType?: 'p2p_transfer' | 'premium_unlock';
  onExecute: () => Promise<any>;
  onUpdateState: (status: TxStatus, hash?: string | null, resultData?: any) => void;
};

export default function TransactionCard({
  intent,
  parameters,
  initialStatus = 'idle',
  initialHash = null,
  hederaId,
  isExpired = false,
  intentType = 'p2p_transfer',
  onExecute,
  onUpdateState,
}: TransactionCardProps) {
  const [status, setStatus] = useState<TxStatus>(initialStatus);
  const [hash, setHash] = useState<string | null>(initialHash);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [prices, setPrices] = useState<Prices | null>(null);
  const { address } = useAccount();
  const { balances, deductBalance, hasSufficientBalance } = useMockLedger(hederaId);

  useEffect(() => {
    fetchOraclePrices()
      .then(setPrices)
      .catch((err) => console.error('[TX_CARD] Oracle fetch failed:', err));
  }, []);

  const handleExecute = async () => {
    // --- PRE-CHECK: Mock ledger balance gate ---
    const token = (tokenSymbol as SupportedToken) in balances ? tokenSymbol as SupportedToken : 'HBAR';
    if (!hasSufficientBalance(token, displayAmount)) {
      setStatus('error');
      setErrorMsg(`Insufficient Hashpilot Balance. You have ${balances[token]} ${token} but this transaction requires ${displayAmount.toFixed(4)} ${token}.`);
      onUpdateState('error');
      return;
    }

    setStatus('pending');
    setErrorMsg(null);
    onUpdateState('pending');
    try {
      const result = await onExecute();
      const explorerUrl =
        result && typeof result === 'object' ? result.explorerUrl : result;

      // --- POST-EXECUTION: Deduct from mock ledger on confirmed success ---
      deductBalance(token, displayAmount);

      setHash(explorerUrl);
      setStatus('success');
      onUpdateState('success', explorerUrl, result);
      if (address) {
        awardHP(address, 15, hederaId)
          .then(() => toast.success('⚡ +15 HP REWARDED FOR TREASURY TRANSFER'))
          .catch((e) => console.error('[TX_CARD] HP Award failed:', e));
      }
    } catch (err: any) {
      console.error('[TX_CARD] Execution failed:', err);
      setStatus('error');
      // Show the actual error from the backend — never spin forever
      setErrorMsg(err.message || 'Unknown execution error. Please retry.');
      onUpdateState('error');
    }
  };

  const resetToIdle = () => {
    setStatus('idle');
    setErrorMsg(null);
    onUpdateState('idle');
  };

  const isEffectivelyExpired = isExpired && status !== 'success';

  // Safely extract and sanitize parameters (hardened against JSON bleed)
  const tokenSymbol = (parameters.tokenSymbol || 'HBAR').toUpperCase();
  const recipient = intentType === 'premium_unlock' ? 'Hashpilot Premium Vault' : (parameters.targetAddress || parameters.destination || '');
  const isFiat = !!parameters.isFiatDenominated;
  
  // The AI sometimes puts the fiat value in fiatAmountUsd and leaves amount empty.
  // We must pull from fiatAmountUsd if it's a fiat transaction.
  const fiatUsd = parameters.fiatAmountUsd ? parseFloat(parameters.fiatAmountUsd) : 0;
  const rawAmount = isFiat 
    ? (fiatUsd || (parameters.amount ? parseFloat(parameters.amount) : 0))
    : (parameters.amount ? parseFloat(parameters.amount) : 0);

  // 1. Fix the Fiat vs. Token Math Routing
  let displayTokenAmount = isFiat ? 0 : rawAmount;
  let displayFiatAmount = isFiat ? rawAmount : 0;

  if (prices) {
    const pythPrice = prices[tokenSymbol as keyof Prices] || 1;
    if (isFiat) {
      displayFiatAmount = rawAmount;
      displayTokenAmount = rawAmount / pythPrice;
    } else {
      displayTokenAmount = rawAmount;
      displayFiatAmount = rawAmount * pythPrice;
    }
  }

  const missingRecipient = !recipient;

  // Make sure we check against the actual calculated token amount for the ledger pre-check
  const displayAmount = displayTokenAmount;

  let actionLabel = 'Execute Treasury Transaction';
  if (intentType === 'premium_unlock') actionLabel = 'Pay & Unlock';
  else if (intent === 'pay_service') actionLabel = `Pay Vendor in ${tokenSymbol}`;
  else if (intent === 'transfer_token' || intentType === 'p2p_transfer') actionLabel = `Send ${tokenSymbol} Now`;

  return (
    <div className={`w-full max-w-md my-4 animate-in fade-in slide-in-from-bottom-4 duration-500 ${isEffectivelyExpired ? 'opacity-50' : ''}`}>
      <div className="bg-gradient-to-b from-[#161a26] to-[#0f111a] border border-[#23293d] rounded-3xl overflow-hidden shadow-2xl relative">
        {/* Glow line at top */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#5c54e6] to-transparent opacity-80" />

        {/* Header Bar */}
        <div className="px-5 py-4 border-b border-[#23293d] bg-[#1a1e2e]/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-[#5c54e6]" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8c98b0]">
              {status === 'success'
                ? 'Secured Consensus'
                : status === 'error'
                  ? 'Execution Halted'
                  : isEffectivelyExpired
                    ? 'Session Expired'
                    : intentType === 'premium_unlock' ? 'AP2 Mandate Authorization' : 'Treasury Agent Draft'}
            </span>
          </div>

          {/* Status Badges */}
          {status === 'success' && (
            <span className="px-2 py-0.5 text-[9px] font-black uppercase bg-green-500/10 text-green-400 border border-green-500/20 rounded-full flex items-center gap-1">
              <CheckCircle2 size={10} /> Confirmed
            </span>
          )}
          {status === 'error' && (
            <span className="px-2 py-0.5 text-[9px] font-black uppercase bg-red-500/10 text-red-400 border border-red-500/20 rounded-full flex items-center gap-1">
              <XCircle size={10} /> Failed
            </span>
          )}
          {status === 'idle' && !isEffectivelyExpired && (
            <span className="px-2 py-0.5 text-[9px] font-black uppercase bg-[#5c54e6]/10 text-[#7a72f5] border border-[#5c54e6]/20 rounded-full">
              Autonomous Ready
            </span>
          )}
        </div>

        {/* Card Body */}
        <div className="p-6 space-y-5">
          {/* Error Message — always visible, never hidden */}
          {status === 'error' && errorMsg && (
            <div className="p-3 bg-red-500/10 border border-red-500/25 rounded-2xl">
              <span className="text-[10px] font-mono text-red-400 leading-tight block break-words">
                TRANSACTION_REJECTED: {errorMsg.substring(0, 200)}{errorMsg.length > 200 ? '…' : ''}
              </span>
            </div>
          )}

          {/* Intent Context + Oracle Rate */}
          <div className="flex justify-between items-end">
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-[#8c98b0] uppercase font-bold tracking-wider">Requested Command</span>
              <span className="text-sm font-bold text-[#e2e8f0] capitalize">
                {intent.replace(/_/g, ' ')}
              </span>
            </div>
            {prices && (
              <span className="text-[10px] text-[#8c98b0] bg-[#1a1e2e]/80 border border-[#23293d] rounded-lg px-2 py-1 font-mono">
                1 {tokenSymbol} ≈ ${prices[tokenSymbol as keyof Prices]?.toFixed(4)} USD
              </span>
            )}
          </div>

          {/* Large Payment Display */}
          <div className="bg-[#10121d] border border-[#1e2335] rounded-2xl p-5 flex flex-col items-center justify-center gap-1.5 relative overflow-hidden">
            <span className="text-[10px] text-[#8c98b0] uppercase font-black tracking-widest">Calculated Transaction Flow</span>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black text-white font-mono">
                {prices ? displayTokenAmount.toFixed(4) : (isFiat ? '...' : displayTokenAmount.toFixed(4))}
              </span>
              <span className="text-sm font-black text-[#5c54e6]">{tokenSymbol}</span>
            </div>
            {(displayFiatAmount > 0 || isFiat) && (
              <span className="text-xs text-[#8c98b0] font-medium flex items-center gap-0.5">
                <DollarSign size={12} className="inline text-[#8c98b0]" /> 
                {prices ? displayFiatAmount.toFixed(2) : (isFiat ? displayFiatAmount.toFixed(2) : '...')} USD
              </span>
            )}
          </div>

          {/* Transfer Details Partition */}
          <div className="bg-[#1a1e2e]/30 border border-[#23293d] rounded-2xl p-4 space-y-4">
            
            {/* Sender -> Receiver */}
            <div className="flex justify-between items-center text-xs">
              <div className="flex flex-col">
                <span className="text-[9px] text-[#8c98b0] uppercase font-bold">Authorized Sender</span>
                <span className="font-semibold text-[#e2e8f0] flex items-center gap-1.5 mt-0.5">
                  <Wallet size={12} className="text-[#5c54e6]" /> Hashpilot Treasury
                </span>
              </div>
              <ArrowRight size={14} className="text-[#3c4764] mx-2" />
              <div className="flex flex-col items-end">
                <span className="text-[9px] text-[#8c98b0] uppercase font-bold">Target Recipient</span>
                <span className="font-mono font-semibold text-[#e2e8f0] truncate w-28 text-right mt-0.5" title={recipient}>
                  {recipient || 'Unknown Address'}
                </span>
              </div>
            </div>

            {/* Network Fee Row */}
            <div className="pt-3 border-t border-[#23293d] flex justify-between items-center">
              <span className="text-[10px] text-[#8c98b0] uppercase font-bold">Estimated Network Fee</span>
              <span className="text-xs font-mono text-[#e2e8f0]">~$0.0001</span>
            </div>

          </div>

          {/* CTAs */}
          <div className="pt-2">
            {status === 'idle' && (
              missingRecipient ? (
                <div className="w-full p-4 bg-amber-500/10 border border-amber-500/25 rounded-2xl flex flex-col gap-1.5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">⚠ No Recipient Address</span>
                  <span className="text-[11px] text-amber-300/80 leading-snug">
                    Please retry your message and include a destination account ID — e.g. <span className="font-mono">0.0.12345</span>
                  </span>
                </div>
              ) : (
                <button
                  onClick={handleExecute}
                  disabled={isEffectivelyExpired}
                  className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] transition-all duration-300 ${
                    isEffectivelyExpired
                      ? 'bg-[#222631] text-[#8b95a5] cursor-not-allowed border border-transparent'
                      : 'bg-[#5c54e6] hover:bg-[#6c64ff] text-white hover:shadow-[0_0_20px_rgba(92,84,230,0.4)] active:scale-[0.98]'
                  }`}
                >
                  {isEffectivelyExpired ? 'Aborted / Cancelled' : actionLabel}
                </button>
              )
            )}

            {status === 'pending' && (
              <div className="w-full py-4 flex flex-col items-center justify-center gap-3 bg-[#131622] border border-[#23293d] rounded-2xl shadow-inner">
                <Loader2 size={22} className="text-[#5c54e6] animate-spin" />
                <span className="text-[10px] font-black uppercase tracking-widest text-[#e2e8f0] animate-pulse">
                  Broadcasting to Hedera Testnet...
                </span>
              </div>
            )}

            {status === 'success' && (
              <a
                href={hash || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-4 bg-green-500/10 border border-green-500/25 text-green-400 rounded-2xl flex items-center justify-center gap-2 font-black uppercase tracking-widest text-[11px] hover:bg-green-500/25 transition-all duration-300 shadow-[0_0_15px_rgba(34,197,94,0.1)]"
              >
                Inspect on Hashscan
                <ExternalLink size={14} />
              </a>
            )}

            {status === 'error' && (
              <button
                onClick={resetToIdle}
                className="w-full py-4 bg-red-500/10 border border-red-500/25 text-red-400 rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-red-500/25 transition-all duration-300"
              >
                Execution Failed — Retry Draft
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
