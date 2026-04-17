type SplashPageProps = {
  onEnter: () => void;
};

export default function SplashPage({ onEnter }: SplashPageProps) {
  return (
    <div className="min-h-screen w-full bg-main-blue text-white relative overflow-hidden flex flex-col items-center justify-center font-sans selection:bg-soft-purple selection:text-white">
      {/* Dynamic Aura Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-soft-purple/10 blur-[120px] rounded-full animate-float"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-soft-purple/10 blur-[120px] rounded-full animate-float" style={{ animationDelay: '-3s' }}></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 text-center animate-in fade-in zoom-in duration-1000">
        <div className="mb-2">
          <span className="text-[10px] font-black uppercase tracking-[0.5em] text-soft-purple">Hedera AI Protocol</span>
        </div>
        <h1 className="text-7xl md:text-9xl font-black tracking-tighter mb-6 bg-gradient-to-b from-white to-white/40 bg-clip-text text-transparent italic">
          HASHPILOT
        </h1>
        <p className="text-white/40 text-sm md:text-base font-medium tracking-[0.2em] mb-12 uppercase max-w-md mx-auto leading-relaxed">
          The ultimate intent-based gateway to the Hedera network.
        </p>

        <button 
          onClick={onEnter}
          className="group relative px-12 py-5 bg-soft-purple rounded-2xl overflow-hidden transition-all hover:scale-105 active:scale-95 purple-glow"
        >
          <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
          <span className="relative z-10 text-[11px] font-black uppercase tracking-[0.3em]">
            [ Launch Copilot ]
          </span>
        </button>
      </div>

      {/* Bottom Footer Decor */}
      <div className="absolute bottom-10 left-0 right-0 flex justify-center gap-8 opacity-20 relative z-10">
        <span className="text-[8px] font-black uppercase tracking-widest">Protocol v0.9.0</span>
        <span className="text-[8px] font-black uppercase tracking-widest">Testnet Active</span>
        <span className="text-[8px] font-black uppercase tracking-widest">Neural Link Syncing</span>
      </div>
    </div>
  );
}
