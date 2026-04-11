import { ArrowRight, Coins, User } from 'lucide-react';

type TransactionPreviewProps = {
  intent: {
    type: 'TRANSFER';
    amount: string;
    token: string;
    target: string;
  } | null;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function TransactionPreviewCard({ intent, onConfirm, onCancel }: TransactionPreviewProps) {
  if (!intent) return null;

  return (
    <div className="fixed inset-x-0 bottom-24 mx-auto w-full max-w-lg px-4 z-40 animate-in slide-in-from-bottom-8 duration-500">
      <div className="glass-panel rounded-3xl p-6 border border-electric-cyan/30 shadow-[0_0_50px_rgba(0,242,255,0.15)]">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-electric-cyan font-bold tracking-wider uppercase text-sm">Transaction Preview</h3>
          <span className="bg-electric-cyan/10 text-electric-cyan text-[10px] px-2 py-1 rounded-full border border-electric-cyan/20">Awaiting Approval</span>
        </div>

        <div className="space-y-4 mb-8">
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-electric-cyan/10 text-electric-cyan">
                <Coins size={18} />
              </div>
              <span className="text-zinc-400 text-sm">Amount</span>
            </div>
            <span className="text-white font-mono font-bold">{intent.amount} {intent.token}</span>
          </div>

          <div className="flex items-center justify-center py-2 text-zinc-600">
            <ArrowRight size={20} />
          </div>

          <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-hedara-purple/10 text-hedara-purple">
                <User size={18} />
              </div>
              <span className="text-zinc-400 text-sm">Recipient</span>
            </div>
            <span className="text-white font-mono text-sm truncate max-w-[150px]">{intent.target}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={onCancel}
            className="py-4 rounded-2xl border border-white/10 text-zinc-400 hover:bg-white/5 transition-all font-bold uppercase tracking-widest text-xs"
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm}
            className="py-4 rounded-2xl bg-electric-cyan text-deep-obsidian hover:bg-white transition-all font-black uppercase tracking-widest text-xs shadow-[0_0_20px_rgba(0,242,255,0.4)]"
          >
            Execute Script
          </button>
        </div>
      </div>
    </div>
  );
}
