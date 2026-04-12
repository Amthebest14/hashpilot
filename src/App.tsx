import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import Navbar from './components/Navbar';
import ChatBox from './components/ChatBox';
import HistorySidebar, { useHistory } from './components/HistorySidebar';
import { resolveHederaAddress } from './services/hederaService';

function App() {
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

  return (
    <div className="min-h-screen w-full bg-main-blue text-white relative overflow-hidden selection:bg-soft-purple selection:text-white flex font-sans">
      {/* Dynamic Aura Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-soft-purple/5 blur-[120px] rounded-full animate-float"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-soft-purple/5 blur-[120px] rounded-full animate-float" style={{ animationDelay: '-3s' }}></div>
      </div>
      
      {/* 20% Sidebar */}
      <div className="w-1/5 relative z-10 hidden md:block border-r border-white/5">
        <HistorySidebar 
          sessions={sessions} 
          activeSessionId={activeSessionId} 
          onSelectSession={setActiveSessionId}
          onNewSession={createNewSession}
          isLoading={isLoading}
        />
      </div>

      {/* 80% Main Area */}
      <div className="flex-1 relative z-10 flex flex-col h-screen overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-hidden">
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
        </main>
      </div>
    </div>
  );
}

export default App;
