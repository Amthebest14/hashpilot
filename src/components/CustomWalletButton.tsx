import { useAccount } from 'wagmi';
import { useAppKit } from '@reown/appkit/react';
import { useHederaId } from '../hooks/useHederaId';
import { Wallet } from 'lucide-react';

export default function CustomWalletButton() {
  const { address, isConnected } = useAccount();
  const { open } = useAppKit();
  const hederaId = useHederaId(address);

  const truncateAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  if (isConnected && address) {
    return (
      <button 
        onClick={() => open()}
        className="group relative px-5 py-2.5 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-3 transition-all hover:bg-white/10 active:scale-95 purple-glow"
      >
        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
        <span className="text-[11px] font-black uppercase tracking-widest text-white/80 font-mono">
          {hederaId || truncateAddress(address)}
        </span>
      </button>
    );
  }

  return (
    <button 
      onClick={() => open()}
      className="group relative px-6 py-2.5 bg-soft-purple text-white rounded-2xl flex items-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-lg purple-glow"
    >
      <Wallet size={14} className="group-hover:rotate-12 transition-transform" />
      <span className="text-[11px] font-black uppercase tracking-[0.2em]">
        Connect Wallet
      </span>
    </button>
  );
}
