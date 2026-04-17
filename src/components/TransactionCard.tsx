import { useState } from 'react';
import { ExternalLink, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { awardHP } from '../services/hpService';
import { useAccount } from 'wagmi';
import toast from 'react-hot-toast';

type TxStatus = 'idle' | 'pending' | 'success' | 'error';

type TransactionCardProps = {
  msgId: string;
  intent: string;
  parameters: any;
  initialStatus?: TxStatus;
  initialHash?: string | null;
  hederaId?: string;
  onExecute: () => Promise<string>;
  onUpdateState: (status: TxStatus, hash?: string | null) => void;
};

export default function TransactionCard({
  intent,
  parameters,
  initialStatus = 'idle',
  initialHash = null,
  hederaId,
  onExecute,
  onUpdateState
}: TransactionCardProps) {
  const [status, setStatus] = useState<TxStatus>(initialStatus);
  const [hash, setHash] = useState<string | null>(initialHash);
  const { address } = useAccount();

  const handleExecute = async () => {
    setStatus('pending');
    onUpdateState('pending');
    
    try {
      const txHash = await onExecute();
      setHash(txHash);
      setStatus('success');
      onUpdateState('success', txHash);

      // Award HP and Toast on success
      if (address) {
        const hpAmount = intent === 'swap_token' ? 25 : 10;
        awardHP(address, hpAmount, hederaId).then(() => {
          toast.success(intent === 'swap_token' ? '⚡ +25 HP REWARDED' : '⚡ +10 HP REWARDED');
        }).catch(e => console.error('[TX_CARD] HP Award failed:', e));
      }
    } catch (err: any) {
      console.error('[TX_CARD] Execution failed:', err);
      setStatus('error');
      onUpdateState('error');
    }
  };

  const resetToIdle = () => {
    setStatus('idle');
    onUpdateState('idle');
  };

  return (
    <div className="w-full max-w-md my-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="glass-panel rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
        {/* Header */}
        <div className="px-5 py-3 border-b border-white/5 bg-white/5 flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
            {status === 'success' ? 'Transaction Confirmed' : status === 'error' ? 'Transaction Failed' : 'Copilot: Transaction Drafted'}
          </span>
          {status === 'success' && <CheckCircle2 size={14} className="text-green-400" />}
          {status === 'error' && <XCircle size={14} className="text-red-400" />}
        </div>

        {/* content */}
        <div className="p-6 space-y-4">
          <div className="flex flex-col gap-1">
            <span className="text-[11px] text-white/30 uppercase font-bold tracking-wider">Action</span>
            <span className="text-sm font-bold capitalize text-white flex items-center gap-2">
              {intent.replace('_', ' ')}
            </span>
          </div>

          <div className="bg-white/5 rounded-2xl p-4 border border-white/5 grid grid-cols-2 gap-4">
            {intent === 'swap_token' ? (
              <>
                <div className="flex flex-col">
                  <span className="text-[10px] text-white/30 uppercase font-bold">Pay</span>
                  <span className="text-sm font-mono text-white">{parameters.amount} {parameters.tokenIn}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] text-white/30 uppercase font-bold">Receive</span>
                  <span className="text-sm font-mono text-soft-purple">{parameters.tokenOut}</span>
                </div>
              </>
            ) : intent === 'transfer_token' ? (
              <>
                <div className="flex flex-col">
                  <span className="text-[10px] text-white/30 uppercase font-bold">Amount</span>
                  <span className="text-sm font-mono text-white">{parameters.amount} HBAR</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] text-white/30 uppercase font-bold">Recipient</span>
                  <span className="text-sm font-mono text-white truncate w-full text-right">{parameters.destination}</span>
                </div>
              </>
            ) : (
              <div className="col-span-2 text-xs text-white/50 italic">Details serialized in parameters</div>
            )}
          </div>

          {/* Actions */}
          <div className="pt-2">
            {status === 'idle' && (
              <button 
                onClick={handleExecute}
                className="w-full py-4 bg-soft-purple text-white rounded-2xl font-black uppercase tracking-widest text-[11px] purple-glow hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                Execute Transaction
              </button>
            )}

            {status === 'pending' && (
              <div className="w-full py-4 flex flex-col items-center justify-center gap-3 bg-soft-purple/10 border border-soft-purple/20 rounded-2xl">
                <Loader2 size={20} className="text-soft-purple animate-spin" />
                <span className="text-[11px] font-black uppercase tracking-widest text-soft-purple animate-pulse">
                  Awaiting Signature... Check Wallet
                </span>
              </div>
            )}

            {status === 'success' && (
              <a 
                href={`https://hashscan.io/testnet/transaction/${hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-4 bg-green-500/10 border border-green-500/20 text-green-400 rounded-2xl flex items-center justify-center gap-2 font-black uppercase tracking-widest text-[11px] hover:bg-green-500/20 transition-all"
              >
                View on Hashscan
                <ExternalLink size={14} />
              </a>
            )}

            {status === 'error' && (
              <button 
                onClick={resetToIdle}
                className="w-full py-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-red-500/20 transition-all"
              >
                Transaction Failed or Rejected - Retry
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
