import { useEffect, useState } from 'react';
import { useMockLedger } from '../hooks/useMockLedger';
import { fetchOraclePrices } from '../services/oracle';
import type { Prices } from '../services/oracle';
import { Menu, Activity } from 'lucide-react';
import CustomWalletButton from './CustomWalletButton';

export default function Navbar({ hederaId, activeTab, onOpenMenu }: { hederaId?: string, activeTab: string, onOpenMenu: () => void }) {
  const { balances } = useMockLedger(hederaId);
  const [prices, setPrices] = useState<Prices | null>(null);

  useEffect(() => {
    fetchOraclePrices().then(setPrices).catch(() => {});
    const interval = setInterval(() => fetchOraclePrices().then(setPrices).catch(() => {}), 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="flex flex-col w-full border-b border-[#222631] bg-[#090A0F]/90 backdrop-blur-md z-40 relative shrink-0">
      {/* Top Row: Mobile & Desktop */}
      <div className="h-20 shrink-0 flex items-center justify-between px-4 md:px-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={onOpenMenu}
            className="md:hidden p-2 rounded-xl bg-[#1A1D27] border border-[#222631] text-[#E2E8F0] hover:bg-[#222631] transition-colors"
          >
            <Menu size={20} />
          </button>
          <div className="flex flex-col cursor-default">
             <span className="text-[10px] md:text-[11px] font-medium tracking-wide text-[#5C54E6] flex items-center gap-2">
               Hedera Network
               <div className="hidden md:block w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
             </span>
             <h1 className="text-lg md:text-xl font-bold tracking-wide capitalize text-[#E2E8F0]">{activeTab}</h1>
          </div>
        </div>

        {/* Desktop: Oracle & Ledger Balances Inline */}
        <div className="hidden xl:flex items-center gap-8 mx-auto absolute left-1/2 -translate-x-1/2">
          {/* Oracle Ticker */}
          <div className="flex items-center gap-6 bg-[#161a26] border border-[#222631] rounded-2xl px-6 py-2 shadow-inner">
             <div className="flex items-center gap-2 border-r border-[#222631] pr-4">
                <Activity size={12} className="text-green-400" />
                <span className="text-[9px] text-green-400 font-bold uppercase tracking-widest">Oracle</span>
             </div>
             <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-[#8b95a5]">HBAR</span>
                  <span className="text-[11px] font-mono font-black text-white">${prices ? prices.HBAR.toFixed(4) : '...'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-[#8b95a5]">USDC</span>
                  <span className="text-[11px] font-mono font-black text-white">${prices ? prices.USDC.toFixed(4) : '...'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-[#8b95a5]">SAUCE</span>
                  <span className="text-[11px] font-mono font-black text-white">${prices ? prices.SAUCE.toFixed(4) : '...'}</span>
                </div>
             </div>
          </div>
          
          {/* Ledger */}
          <div className="flex items-center gap-4 bg-[#12141c] border border-[#222631] rounded-2xl px-4 py-2">
             <span className="text-[9px] text-[#8b95a5] uppercase font-bold tracking-widest border-r border-[#222631] pr-3">Ledger</span>
             <div className="flex items-center gap-3">
               <span className="text-xs font-mono font-black text-white">{balances.HBAR.toLocaleString(undefined, {maximumFractionDigits: 0})} <span className="text-[9px] text-[#8b95a5]">HBAR</span></span>
               <span className="text-xs font-mono font-black text-white">{balances.USDC.toLocaleString(undefined, {maximumFractionDigits: 0})} <span className="text-[9px] text-[#8b95a5]">USDC</span></span>
               <span className="text-xs font-mono font-black text-white">{balances.SAUCE.toLocaleString(undefined, {maximumFractionDigits: 0})} <span className="text-[9px] text-[#8b95a5]">SAUCE</span></span>
             </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
           <CustomWalletButton />
        </div>
      </div>

      {/* Bottom Row: Tablet & Mobile Horizontal Scrollable Pill Container */}
      <div className="xl:hidden w-full bg-[#12141c] border-t border-[#222631] py-2 overflow-x-auto no-scrollbar flex items-center px-4 gap-4 shadow-inner">
         <div className="flex items-center gap-2 shrink-0 bg-[#090a0f] border border-[#222631] rounded-full px-4 py-1.5 shadow-sm">
            <span className="text-[9px] text-[#8b95a5] uppercase font-bold tracking-wider">Treasury:</span>
            <span className="text-[10px] font-mono font-black text-white">{balances.HBAR.toLocaleString(undefined, {maximumFractionDigits: 0})} HBAR</span>
            <span className="text-[10px] font-mono font-black text-white ml-1">{balances.USDC.toLocaleString(undefined, {maximumFractionDigits: 0})} USDC</span>
            <span className="text-[10px] font-mono font-black text-white ml-1">{balances.SAUCE.toLocaleString(undefined, {maximumFractionDigits: 0})} SAUCE</span>
         </div>
         <div className="flex items-center gap-3 shrink-0 bg-[#090a0f] border border-[#222631] rounded-full px-4 py-1.5 shadow-sm">
            <Activity size={10} className="text-green-400" />
            <span className="text-[9px] text-green-400 font-bold uppercase tracking-widest mr-1">Oracle</span>
            <div className="flex items-center gap-1">
               <span className="text-[10px] font-bold text-[#8b95a5]">HBAR</span>
               <span className="text-[10px] font-mono font-black text-white">${prices ? prices.HBAR.toFixed(4) : '...'}</span>
            </div>
            <div className="flex items-center gap-1 ml-1">
               <span className="text-[10px] font-bold text-[#8b95a5]">USDC</span>
               <span className="text-[10px] font-mono font-black text-white">${prices ? prices.USDC.toFixed(4) : '...'}</span>
            </div>
            <div className="flex items-center gap-1 ml-1">
               <span className="text-[10px] font-bold text-[#8b95a5]">SAUCE</span>
               <span className="text-[10px] font-mono font-black text-white">${prices ? prices.SAUCE.toFixed(4) : '...'}</span>
            </div>
         </div>
      </div>
    </header>
  );
}
