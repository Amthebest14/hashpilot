import { useEffect, useState } from 'react';
import { useMockLedger } from '../hooks/useMockLedger';
import { fetchOraclePrices } from '../services/oracle';
import type { Prices } from '../services/oracle';
import { Wallet, Activity, TrendingUp } from 'lucide-react';
import { useAccount } from 'wagmi';

export default function DashboardHeader({ hederaId }: { hederaId?: string }) {
  const { balances } = useMockLedger(hederaId);
  const [prices, setPrices] = useState<Prices | null>(null);
  const { address } = useAccount();

  useEffect(() => {
    // Fetch prices immediately
    fetchOraclePrices().then(setPrices).catch(e => console.warn('Oracle fetch failed on frontend:', e));
    
    // Poll every 15 seconds
    const interval = setInterval(() => {
      fetchOraclePrices().then(setPrices).catch(() => {});
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  if (!hederaId && !address) return null;

  return (
    <div className="w-full bg-[#090a0f] border-b border-[#222631] relative z-40">
      {/* Top Section: User Wallet & Mock Ledger */}
      <div className="flex flex-col md:flex-row items-center justify-between px-4 md:px-10 py-3 bg-[#12141c]/50 backdrop-blur-sm gap-4">
        
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#5c54e6]/10 rounded-xl border border-[#5c54e6]/20">
            <Wallet size={16} className="text-[#5c54e6]" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-[#8b95a5] uppercase font-bold tracking-widest">Active Ledger</span>
            <span className="text-xs font-mono font-bold text-[#e2e8f0]">{hederaId || 'Awaiting Sync...'}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 md:gap-6 bg-[#090a0f] border border-[#222631] rounded-2xl px-4 py-2 shadow-inner">
          <div className="flex flex-col items-center md:items-start">
            <span className="text-[9px] text-[#8b95a5] uppercase font-bold">HBAR</span>
            <span className="text-xs font-mono font-black text-white">{balances.HBAR.toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
          </div>
          <div className="w-px h-6 bg-[#222631]"></div>
          <div className="flex flex-col items-center md:items-start">
            <span className="text-[9px] text-[#8b95a5] uppercase font-bold">USDC</span>
            <span className="text-xs font-mono font-black text-white">{balances.USDC.toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
          </div>
          <div className="w-px h-6 bg-[#222631]"></div>
          <div className="flex flex-col items-center md:items-start">
            <span className="text-[9px] text-[#8b95a5] uppercase font-bold">SAUCE</span>
            <span className="text-xs font-mono font-black text-white">{balances.SAUCE.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
          </div>
        </div>

      </div>

      {/* Bottom Section: Live Market Ticker */}
      <div className="w-full bg-[#161a26] border-t border-[#222631] py-1.5 overflow-hidden flex items-center shadow-[inset_0_2px_10px_rgba(0,0,0,0.2)]">
        <div className="px-4 border-r border-[#222631] flex items-center gap-2 shrink-0">
          <Activity size={12} className="text-green-400" />
          <span className="text-[9px] text-green-400 font-bold uppercase tracking-widest">Live Oracle</span>
        </div>
        
        <div className="flex-1 flex items-center justify-start gap-8 px-6 animate-[marquee_20s_linear_infinite] whitespace-nowrap md:animate-none md:justify-center md:gap-12">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-[#8b95a5]">HBAR</span>
            <span className="text-[11px] font-mono font-black text-white">${prices ? prices.HBAR.toFixed(4) : '...'}</span>
            <TrendingUp size={10} className="text-green-500" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-[#8b95a5]">USDC</span>
            <span className="text-[11px] font-mono font-black text-white">${prices ? prices.USDC.toFixed(4) : '...'}</span>
            <TrendingUp size={10} className="text-green-500" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-[#8b95a5]">SAUCE</span>
            <span className="text-[11px] font-mono font-black text-white">${prices ? prices.SAUCE.toFixed(4) : '...'}</span>
            <TrendingUp size={10} className="text-green-500" />
          </div>
        </div>
      </div>
    </div>
  );
}
