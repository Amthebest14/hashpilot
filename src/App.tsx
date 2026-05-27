import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import SplashPage from './pages/SplashPage';
import LeaderboardPage from './pages/LeaderboardPage';
import HistorySidebar, { useHistory } from './components/HistorySidebar';
import { resolveHederaAddress } from './services/hederaService';
import ChatBox from './components/ChatBox';

import { Toaster } from 'react-hot-toast';

import { X } from 'lucide-react';
import Navbar from './components/Navbar';

function App() {
  const [showApp, setShowApp] = useState(false);
  const [activeTab, setActiveTab] = useState<'copilot' | 'leaderboard'>('copilot');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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
      
      {/* Sidebar - Always Mounted Desktop */}
      <div className="w-64 shrink-0 h-screen relative z-30 hidden md:block border-r border-[#222631] bg-[#090A0F]">
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

      {/* Sidebar - Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="relative w-4/5 max-w-sm h-full bg-[#090A0F] shadow-2xl flex flex-col">
            <button 
              onClick={() => setIsMobileMenuOpen(false)}
              className="absolute top-6 right-6 z-50 p-2 bg-[#1A1D27] rounded-full border border-[#222631] text-[#E2E8F0]"
            >
              <X size={18} />
            </button>
            <HistorySidebar 
              sessions={sessions} 
              activeSessionId={activeSessionId} 
              onSelectSession={setActiveSessionId}
              onNewSession={createNewSession}
              isLoading={isLoading}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onCloseMobile={() => setIsMobileMenuOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main Area */}
      <div className="flex-1 h-screen relative z-10 flex flex-col overflow-hidden bg-[#090A0F]">
        {/* Unified Top Navbar */}
        <Navbar 
          hederaId={localHederaId} 
          activeTab={activeTab} 
          onOpenMenu={() => setIsMobileMenuOpen(true)} 
        />

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
