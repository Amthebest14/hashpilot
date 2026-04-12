import { useAccount } from 'wagmi';
import { useEffect, useState } from 'react';
import { resolveHederaAddress } from '../services/hederaService';

export default function Navbar() {
  const { address, isConnected } = useAccount();
  const [displayAddress, setDisplayAddress] = useState<string>('');

  useEffect(() => {
    const updateAddress = async () => {
      if (isConnected && address) {
        const resolved = await resolveHederaAddress(address);
        setDisplayAddress(resolved);
      } else {
        setDisplayAddress('');
      }
    };
    updateAddress();
  }, [address, isConnected]);

  return (
    <nav className="flex justify-between items-center px-10 py-8 w-full sticky top-0 z-50 bg-main-blue/60 backdrop-blur-xl border-b border-white/5">
      <div className="flex items-center gap-4 group cursor-default">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-soft-purple to-main-blue flex items-center justify-center p-[2px] transition-transform duration-500 group-hover:rotate-12">
          <div className="w-full h-full bg-main-blue rounded-2xl flex items-center justify-center shadow-inner">
            <span className="text-white font-bold text-2xl tracking-tighter text-gradient">H</span>
          </div>
        </div>
        <div className="flex flex-col">
          <h1 className="text-2xl font-black tracking-tight text-white leading-none">
            Hashpilot
          </h1>
          <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-soft-purple/60 mt-1">Hedera Neural Copilot</span>
        </div>
      </div>
      
      <div className="flex items-center gap-6">
        {isConnected && displayAddress && (
          <div className="hidden lg:flex items-center px-4 py-2 glass-panel rounded-xl text-xs font-bold text-white/80 gap-2 border border-white/10">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
            {displayAddress}
          </div>
        )}
        <appkit-button />
      </div>
    </nav>
  );
}
