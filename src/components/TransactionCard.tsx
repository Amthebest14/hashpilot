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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { address } = useAccount();

  const handleExecute = async () => {
    setStatus('pending');
    setErrorMsg(null);
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
      setErrorMsg(err.message || 'Unknown Transaction Error');
      onUpdateState('error');
    }
  };

  const resetToIdle = () => {
    setStatus('idle');
    setErrorMsg(null);
    onUpdateState('idle');
  };

  return (
    <div className="w-full max-w-md my-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-[#12141C] border border-[#222631] rounded-3xl overflow-hidden shadow-xl">
        {/* Header */}
        <div className="px-5 py-3 border-b border-[#222631] bg-[#1A1D27] flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8B95A5]">
            {status === 'success' ? 'Transaction Confirmed' : status === 'error' ? 'Transaction Failed' : 'Copilot: Transaction Drafted'}
          </span>
          {status === 'success' && <CheckCircle2 size={14} className="text-green-400" />}
          {status === 'error' && <XCircle size={14} className="text-red-400" />}
        </div>

        {/* content */}
        <div className="p-6 space-y-4">
          {status === 'error' && errorMsg && (
            <div className="px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-xl">
               <span className="text-[9px] font-mono text-red-400 leading-tight block break-words">
                 RAE_ERROR: {errorMsg.substring(0, 120)}{errorMsg.length > 120 ? '...' : ''}
               </span>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <span className="text-[11px] text-[#8B95A5] uppercase font-bold tracking-wider">Action</span>
            <span className="text-sm font-bold capitalize text-[#E2E8F0] flex items-center gap-2">
              {intent.replace('_', ' ')}
            </span>
          </div>

          <div className="bg-[#1A1D27] rounded-2xl p-4 border border-[#222631] grid grid-cols-2 gap-4">
            {intent === 'swap_token' ? (
              <>
                <div className="flex flex-col">
                  <span className="text-[10px] text-[#8B95A5] uppercase font-bold">Pay</span>
                  <span className="text-sm font-mono text-[#E2E8F0]">{parameters.amount} {parameters.tokenIn}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] text-[#8B95A5] uppercase font-bold">Receive</span>
                  <span className="text-sm font-mono text-[#5C54E6]">{parameters.tokenOut}</span>
                </div>
              </>
            ) : intent === 'transfer_token' ? (
              <>
                <div className="flex flex-col">
                  <span className="text-[10px] text-[#8B95A5] uppercase font-bold">Amount</span>
                  <span className="text-sm font-mono text-[#E2E8F0]">{parameters.amount} HBAR</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] text-[#8B95A5] uppercase font-bold">Recipient</span>
                  <span className="text-sm font-mono text-[#E2E8F0] truncate w-full text-right">{parameters.destination}</span>
                </div>
              </>
            ) : (
              <div className="col-span-2 text-xs text-[#8B95A5] italic">Details serialized in parameters</div>
            )}
          </div>

          {/* Actions */}
          <div className="pt-2">
            {status === 'idle' && (
              <button 
                onClick={handleExecute}
                className="w-full py-4 bg-[#5C54E6] text-white rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-[#6F68F4] active:scale-[0.98] transition-all"
              >
                Execute Transaction
              </button>
            )}

            {status === 'pending' && (
              <div className="w-full py-4 flex flex-col items-center justify-center gap-3 bg-[#1A1D27] border border-[#222631] rounded-2xl">
                <Loader2 size={20} className="text-[#5C54E6] animate-spin" />
                <span className="text-[11px] font-black uppercase tracking-widest text-[#E2E8F0] animate-pulse">
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
