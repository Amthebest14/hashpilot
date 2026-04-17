import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import ChatBox from '../components/ChatBox';
import HistorySidebar, { useHistory } from '../components/HistorySidebar';
import { resolveHederaAddress } from '../services/hederaService';

export default function TerminalPage() {
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
    <div className="flex h-full w-full">
      {/* 20% Sidebar */}
      <div className="w-1/5 h-full relative z-10 hidden md:block border-r border-white/5">
        <HistorySidebar 
          sessions={sessions} 
          activeSessionId={activeSessionId} 
          onSelectSession={setActiveSessionId}
          onNewSession={createNewSession}
          isLoading={isLoading}
        />
      </div>

      {/* 80% Main Chat Area */}
      <div className="flex-1 h-full relative z-10 flex flex-col overflow-hidden">
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
      </div>
    </div>
  );
}
