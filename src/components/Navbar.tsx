export default function Navbar() {
  return (
    <nav className="flex justify-between items-center px-8 py-6 w-full sticky top-0 z-50 border-b border-[#00F2FF]/20 bg-[#0A0A0A]/80 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-sm bg-transparent flex items-center justify-center border border-[#00F2FF] border-glow-cyan">
          <span className="text-[#00F2FF] font-mono font-black text-xl">H_</span>
        </div>
        <h1 className="text-2xl font-mono font-black tracking-widest uppercase text-[#00F2FF] glow-cyan">
          Hashpilot
        </h1>
      </div>
      
      <div className="flex items-center gap-4">
        <appkit-button />
      </div>
    </nav>
  );
}
