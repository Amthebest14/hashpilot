import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Plus, MessageSquare, Zap } from 'lucide-react';

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
      title: 'New Conversation',
      createdAt: Date.now(),
      messages: [{ role: 'ai', content: "Hello! I'm Hashpilot, your Hedera copilot. How can I assist you today?" }]
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
          title: newTitle || (messages.length > 1 ? messages[1].content.slice(0, 30) : s.title)
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
    <aside className="w-full h-full bg-main-blue/40 border-r border-white/5 flex flex-col pt-10 p-5">
      <button 
        onClick={onNewSession}
        className="w-full py-4 mb-10 flex items-center justify-center gap-3 bg-soft-purple text-white rounded-2xl font-bold text-sm tracking-wide purple-glow hover:scale-[1.02] active:scale-[0.98] transition-all"
      >
        <Plus size={18} strokeWidth={3} />
        New Chat
      </button>

      <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
        <div className="text-[11px] uppercase text-white/30 mb-5 tracking-[0.2em] font-black ml-2">Recent Protocols</div>
        {sessions.map(s => (
          <button
            key={s.id}
            onClick={() => onSelectSession(s.id)}
            className={`w-full text-left px-5 py-4 rounded-2xl flex items-center gap-4 transition-all duration-300 ${
              activeSessionId === s.id 
                ? 'bg-white/10 text-white font-bold ring-1 ring-white/10' 
                : 'text-white/50 hover:text-white/80 hover:bg-white/5'
            }`}
          >
            <MessageSquare size={16} className={activeSessionId === s.id ? 'text-soft-purple' : 'text-white/20'} />
            <span className="text-sm truncate leading-none mt-[2px]">{s.title}</span>
          </button>
        ))}
      </div>

      <div className="mt-auto pt-6 border-t border-white/5">
        <div className="flex items-center gap-4 p-4 glass-panel rounded-2xl opacity-60">
           <div className="w-8 h-8 rounded-full bg-soft-purple/20 flex items-center justify-center text-soft-purple">
             <Zap size={16} />
           </div>
           <div className="flex flex-col">
              <span className="text-xs font-bold text-white">Advanced Engine</span>
              <span className="text-[10px] text-white/40">Powered by Gemini 2.5 Flash</span>
           </div>
        </div>
      </div>
    </aside>
  );
}
