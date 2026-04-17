import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import SplashPage from './pages/SplashPage';
import TerminalPage from './pages/TerminalPage';
import LeaderboardPage from './pages/LeaderboardPage';
import HistorySidebar, { useHistory } from './components/HistorySidebar';
import { resolveHederaAddress } from './services/hederaService';
import ChatBox from './components/ChatBox';

function App() {
  const [showApp, setShowApp] = useState(false);
  const [activeTab, setActiveTab] = useState<'terminal' | 'leaderboard'>('terminal');
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
        <main className="flex-1 overflow-hidden flex flex-col">
          {activeTab === 'terminal' ? (
            <div className="flex-1 overflow-hidden flex flex-col">
              {activeSession ? (
                <ChatBox 
                  key={activeSession.id} 
                  session={activeSession} 
                  onUpdateSession={updateActiveSession} 
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
