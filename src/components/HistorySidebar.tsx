import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

export type ChatSession = {
  id: string;
  title: string;
  createdAt: number;
  messages: { role: 'user' | 'ai'; content: string }[];
};

export function useHistory() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('hashpilot_sessions');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSessions(parsed);
        if (parsed.length > 0) {
          setActiveSessionId(parsed[0].id);
        } else {
          createNewSession();
        }
      } catch {
        createNewSession();
      }
    } else {
      createNewSession();
    }
  }, []);

  const saveToStorage = (updatedSessions: ChatSession[]) => {
    setSessions(updatedSessions);
    localStorage.setItem('hashpilot_sessions', JSON.stringify(updatedSessions));
  };

  const createNewSession = () => {
    const newSession: ChatSession = {
      id: uuidv4(),
      title: 'New Protocol instance',
      createdAt: Date.now(),
      messages: [{ role: 'ai', content: '[SYSTEM_LOG] New terminal session initialized. Awaiting user input.' }]
    };
    saveToStorage([newSession, ...sessions]);
    setActiveSessionId(newSession.id);
  };

  const updateActiveSession = (messages: { role: 'user' | 'ai'; content: string }[], newTitle?: string) => {
    const updated = sessions.map(s => {
      if (s.id === activeSessionId) {
        return { 
          ...s, 
          messages, 
          title: newTitle || (messages.length > 1 ? messages[1].content.slice(0, 20) + '...' : s.title)
        };
      }
      return s;
    });
    saveToStorage(updated);
  };

  return { sessions, activeSessionId, setActiveSessionId, createNewSession, updateActiveSession };
}

export default function HistorySidebar({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession
}: {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
}) {
  return (
    <aside className="w-full h-full border-r border-[#00F2FF]/20 flex flex-col pt-6 p-4">
      <button 
        onClick={onNewSession}
        className="terminal-panel w-full py-3 mb-6 font-mono text-sm uppercase tracking-widest hover:bg-[#00F2FF]/10 transition-all font-bold"
      >
        + New Session
      </button>

      <div className="flex-1 overflow-y-auto space-y-2">
        <div className="text-[10px] uppercase text-[#00F2FF]/50 mb-3 tracking-widest font-mono">History Log</div>
        {sessions.map(s => (
          <button
            key={s.id}
            onClick={() => onSelectSession(s.id)}
            className={`w-full text-left px-3 py-2 text-xs font-mono truncate transition-all ${
              activeSessionId === s.id 
                ? 'bg-[#00F2FF]/10 border-l-2 border-[#00F2FF] text-[#00F2FF]' 
                : 'text-[#00F2FF]/60 hover:text-[#00F2FF] hover:bg-white/5'
            }`}
          >
           {"> "} {s.title}
          </button>
        ))}
      </div>
    </aside>
  );
}
