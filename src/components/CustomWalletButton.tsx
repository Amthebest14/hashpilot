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
        className="group relative px-5 py-2.5 bg-[#1A1D27] border border-[#222631] rounded-2xl flex items-center gap-3 transition-all hover:bg-[#222631] active:scale-95"
      >
        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
        <span className="text-[11px] font-black uppercase tracking-widest text-[#E2E8F0] font-mono">
          {hederaId || truncateAddress(address)}
        </span>
      </button>
    );
  }

  return (
    <button 
      onClick={() => open()}
      className="group relative px-6 py-2.5 bg-[#5C54E6] text-white rounded-2xl flex items-center gap-2 transition-all hover:bg-[#6F68F4] active:scale-95 shadow-sm"
    >
      <Wallet size={14} className="group-hover:rotate-12 transition-transform" />
      <span className="text-[11px] font-black uppercase tracking-[0.2em]">
        Connect Wallet
      </span>
    </button>
  );
}
