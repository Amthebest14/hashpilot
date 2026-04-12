export default function Navbar() {
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
        <appkit-button />
      </div>
    </nav>
  );
}
