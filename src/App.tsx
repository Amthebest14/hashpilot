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
    <div className="min-h-screen w-full bg-[#090A0F] text-[#E2E8F0] relative overflow-hidden flex font-sans selection:bg-[#5C54E6] selection:text-white">
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: '#12141C', 
            color: '#E2E8F0',
            border: '1px solid #222631', 
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
      
      {/* Sidebar - Always Mounted */}
      <div className="w-1/5 h-screen relative z-30 hidden md:block border-r border-[#222631] bg-[#090A0F]">
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
      <div className="flex-1 h-screen relative z-10 flex flex-col overflow-hidden bg-[#090A0F]">
        {/* Top Navbar */}
        <header className="h-20 shrink-0 border-b border-[#222631] flex items-center justify-between px-10 relative z-40 bg-[#12141C]">
           <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#5C54E6]">Hedera Network</span>
              <h1 className="text-xl font-black italic tracking-tighter uppercase text-[#E2E8F0]">{activeTab}</h1>
           </div>
           
           <div className="flex items-center gap-6">
              <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-[#1A1D27] rounded-full border border-[#222631]">
                 <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                 <span className="text-[9px] font-black uppercase tracking-widest text-[#8B95A5]">Testnet Node Active</span>
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
                  <div className="animate-pulse text-[#8B95A5] font-black tracking-widest uppercase">Initialising Sync...</div>
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
