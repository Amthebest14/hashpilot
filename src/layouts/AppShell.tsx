import { Outlet, NavLink, Link } from 'react-router-dom';

export default function AppShell() {
  return (
    <div className="min-h-screen w-full bg-main-blue text-white flex flex-col font-sans overflow-hidden">
      {/* Global Background Bloom */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-soft-purple/5 blur-[120px] rounded-full animate-float"></div>
      </div>

      {/* Top Navbar */}
      <header className="h-16 border-b border-white/5 bg-main-blue/80 backdrop-blur-md flex items-center px-6 justify-between relative z-50">
        <div className="flex items-center gap-8">
          <Link to="/app/terminal" className="flex items-center gap-2 group">
            <div className="w-6 h-6 bg-soft-purple rounded-lg flex items-center justify-center p-1 group-hover:scale-110 transition-transform">
              <div className="w-full h-full border-2 border-white rounded-[2px]"></div>
            </div>
            <span className="font-black italic tracking-tighter text-xl group-hover:text-soft-purple transition-colors">HASHPILOT</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1 font-black text-[10px] uppercase tracking-[0.2em]">
            <NavLink 
              to="/app/terminal" 
              className={({ isActive }) => 
                `px-4 py-2 rounded-xl transition-all ${isActive ? 'text-white bg-white/10 ring-1 ring-white/10' : 'text-white/40 hover:text-white/60'}`
              }
            >
              [ Terminal ]
            </NavLink>
            <NavLink 
              to="/app/leaderboard" 
              className={({ isActive }) => 
                `px-4 py-2 rounded-xl transition-all ${isActive ? 'text-white bg-white/10 ring-1 ring-white/10' : 'text-white/40 hover:text-white/60'}`
              }
            >
              [ Leaderboard ]
            </NavLink>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-3 px-3 py-1.5 bg-white/5 border border-white/5 rounded-full mr-2">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-[9px] font-black uppercase tracking-widest text-white/50">Testnet Online</span>
          </div>
          <appkit-button />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 relative z-10 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
