export default function Navbar() {
  return (
    <nav className="flex justify-between items-center px-8 py-6 w-full glass-panel sticky top-0 z-50 border-b border-white/5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-electric-cyan to-hedara-purple flex items-center justify-center border-glow-cyan">
          <span className="text-white font-black text-xl italic tracking-tighter">H</span>
        </div>
        <h1 className="text-2xl font-black tracking-widest uppercase text-electric-cyan glow-cyan">
          Hashpilot
        </h1>
      </div>
      
      <div className="flex items-center gap-4">
        <appkit-button />
      </div>
    </nav>
  );
}
