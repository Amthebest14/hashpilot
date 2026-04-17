import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import SplashPage from './pages/SplashPage';
import LeaderboardPage from './pages/LeaderboardPage';
import HistorySidebar, { useHistory } from './components/HistorySidebar';
import { resolveHederaAddress } from './services/hederaService';
import ChatBox from './components/ChatBox';

import { Toaster } from 'react-hot-toast';

import CustomWalletButton from './components/CustomWalletButton';

function App() {
  const [showApp, setShowApp] = useState(false);
  const [activeTab, setActiveTab] = useState<'copilot' | 'leaderboard'>('copilot');
  const { address, isConnected } = useAccount();
  const [localHederaId, setLocalHederaId] = useState<string | undefined>();

  // Resolve the native ID for the cloud-sync key
  useEffect(() => {
    const fetchId = async () => {
      if (isConnected && address) {
        const resolved = await resolveHederaAddress(address);
        setLocalHederaId(resolved);
      } else {
        setLocalHederaId(undefined);
      }
    };
    fetchId();
  }, [address, isConnected]);

  // Pass the Hedera ID to the history hook
  const { sessions, activeSessionId, setActiveSessionId, createNewSession, updateActiveSession, isLoading } = useHistory(localHederaId);

  const activeSession = sessions.find(s => s.id === activeSessionId);

  if (!showApp) {
    return <SplashPage onEnter={() => setShowApp(true)} />;
  }

  return (
    <div className="min-h-screen w-full bg-main-blue text-white relative overflow-hidden flex font-sans selection:bg-soft-purple selection:text-white">
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: '#0a0a1a', // main-blue fallback
            color: '#fff',
            border: '1px solid rgba(139, 92, 246, 0.3)', // soft-purple border
            fontFamily: 'inherit',
            fontSize: '11px',
            fontWeight: '900',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            borderRadius: '16px',
          },
          duration: 3000,
        }}
      />
      
      {/* Dynamic Aura Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-soft-purple/5 blur-[120px] rounded-full animate-float"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-soft-purple/5 blur-[120px] rounded-full animate-float" style={{ animationDelay: '-3s' }}></div>
      </div>
      
      {/* Sidebar - Always Mounted */}
      <div className="w-1/5 h-screen relative z-30 hidden md:block border-r border-white/5">
        <HistorySidebar 
          sessions={sessions} 
          activeSessionId={activeSessionId} 
          onSelectSession={setActiveSessionId}
          onNewSession={createNewSession}
          isLoading={isLoading}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </div>

      {/* Main Area */}
      <div className="flex-1 h-screen relative z-10 flex flex-col overflow-hidden">
        {/* Top Navbar */}
        <header className="h-20 shrink-0 border-b border-white/5 flex items-center justify-between px-10 relative z-40 bg-main-blue/50 backdrop-blur-xl">
           <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-soft-purple">Hedera Network</span>
              <h1 className="text-xl font-black italic tracking-tighter uppercase">{activeTab}</h1>
           </div>
           
           <div className="flex items-center gap-6">
              <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/5">
                 <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                 <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Testnet Node Active</span>
              </div>
              <CustomWalletButton />
           </div>
        </header>

        <main className="flex-1 overflow-hidden flex flex-col">
          {activeTab === 'copilot' ? (
            <div className="flex-1 overflow-hidden flex flex-col">
              {activeSession ? (
                <ChatBox 
                  key={activeSession.id} 
                  session={activeSession} 
                  onUpdateSession={updateActiveSession} 
                  hederaId={localHederaId}
                />
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="animate-pulse text-soft-purple/50 font-black tracking-widest uppercase">Initialising Sync...</div>
                </div>
              )}
            </div>
          ) : (
            <LeaderboardPage />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
