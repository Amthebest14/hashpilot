import { useMockLedger } from '../hooks/useMockLedger';
import { RefreshCw } from 'lucide-react';

const TOKEN_CONFIG = {
  HBAR: { label: 'HBAR', color: '#5c54e6', bg: 'rgba(92,84,230,0.12)', border: 'rgba(92,84,230,0.25)' },
  USDC: { label: 'USDC', color: '#26a17b', bg: 'rgba(38,161,123,0.12)', border: 'rgba(38,161,123,0.25)' },
  SAUCE: { label: 'SAUCE', color: '#f7931a', bg: 'rgba(247,147,26,0.12)', border: 'rgba(247,147,26,0.25)' },
} as const;

function formatBalance(amount: number, symbol: string): string {
  if (symbol === 'SAUCE') return amount.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (symbol === 'USDC') return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}

type WalletBalanceWidgetProps = {
  hederaId?: string;
};

export default function WalletBalanceWidget({ hederaId }: WalletBalanceWidgetProps) {
  const { balances, resetBalances } = useMockLedger(hederaId);

  if (!hederaId) return null;

  return (
    <div className="px-4 md:px-6 py-3 border-b border-[#1a1d27] bg-[#090A0F]/60">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">

        {/* Label */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-1.5 h-1.5 rounded-full bg-[#5c54e6] animate-pulse" />
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#8c98b0] hidden sm:block">
            Mock Ledger
          </span>
        </div>

        {/* Balances */}
        <div className="flex items-center gap-2 flex-1 justify-center overflow-x-auto no-scrollbar">
          {(Object.keys(TOKEN_CONFIG) as Array<keyof typeof TOKEN_CONFIG>).map((token) => {
            const cfg = TOKEN_CONFIG[token];
            const balance = balances[token];
            const isLow = token === 'HBAR' && balance < 10 ||
                          token === 'USDC' && balance < 50 ||
                          token === 'SAUCE' && balance < 500;
            return (
              <div
                key={token}
                style={{ background: cfg.bg, border: `1px solid ${isLow ? 'rgba(239,68,68,0.3)' : cfg.border}` }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl shrink-0 transition-all duration-300"
              >
                <div
                  style={{ background: cfg.color }}
                  className="w-1.5 h-1.5 rounded-full"
                />
                <span
                  style={{ color: isLow ? '#f87171' : cfg.color }}
                  className="text-[11px] font-black font-mono tabular-nums"
                >
                  {formatBalance(balance, token)}
                </span>
                <span className="text-[9px] font-black uppercase tracking-wide text-[#8c98b0]">
                  {cfg.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Reset button */}
        <button
          onClick={resetBalances}
          title="Reset demo balances"
          className="shrink-0 p-1.5 rounded-lg text-[#8c98b0] hover:text-[#5c54e6] hover:bg-[#5c54e6]/10 transition-all duration-200 active:scale-90"
        >
          <RefreshCw size={12} />
        </button>

      </div>
    </div>
  );
}
