import Navbar from './components/Navbar'
import ChatBox from './components/ChatBox'
import HistorySidebar, { useHistory } from './components/HistorySidebar'

function App() {
  const { sessions, activeSessionId, setActiveSessionId, createNewSession, updateActiveSession } = useHistory();

  const activeSession = sessions.find(s => s.id === activeSessionId);

  return (
    <div className="min-h-screen w-full bg-deep-obsidian text-electric-cyan relative overflow-hidden selection:bg-electric-cyan selection:text-deep-obsidian flex">
      {/* Dynamic Background Grid */}
      <div className="fixed inset-0 bg-grid-hashgraph pointer-events-none z-0 opacity-20"></div>
      
      {/* 20% Sidebar */}
      <div className="w-1/5 relative z-10 hidden md:block">
        <HistorySidebar 
          sessions={sessions} 
          activeSessionId={activeSessionId} 
          onSelectSession={setActiveSessionId}
          onNewSession={createNewSession}
        />
      </div>

      {/* 80% Main Terminal */}
      <div className="flex-1 relative z-10 flex flex-col h-screen overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-hidden">
          {activeSession && (
            <ChatBox 
              key={activeSession.id} // Re-mount when session changes
              session={activeSession} 
              onUpdateSession={updateActiveSession} 
            />
          )}
        </main>
      </div>
    </div>
  )
}

export default App
