import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Plus, MessageSquare, Zap } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

export type ChatSession = {
  id: string;
  wallet_address: string; // Match DB schema
  title: string;
  messages: { role: 'user' | 'ai'; content: string }[];
  created_at?: string;
};

export function useHistory(walletId: string | undefined) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 1. Fetch from Cloud or Local
  useEffect(() => {
    const loadHistory = async () => {
      setIsLoading(true);
      if (walletId) {
        // Fetch from Supabase
        console.log(`[CLOUD_SYNC] Fetching history for ${walletId}...`);
        try {
          const { data, error } = await supabase
            .from('chat_sessions')
            .select('*')
            .eq('wallet_address', walletId)
            .order('created_at', { ascending: false });

          if (error) {
            console.error('[CLOUD_SYNC] Error fetching sessions:', error);
            loadLocalFallback();
          } else if (data && data.length > 0) {
            setSessions(data);
            setActiveSessionId(data[0].id);
          } else {
            // New user, create first session in cloud
            const newSession: ChatSession = {
              id: uuidv4(),
              wallet_address: walletId,
              title: 'New Conversation',
              messages: [{ role: 'ai', content: "Hello! I'm Hashpilot, your Hedera copilot. How can I assist you today?" }]
            };
            await supabase.from('chat_sessions').insert([newSession]);
            setSessions([newSession]);
            setActiveSessionId(newSession.id);
          }
        } catch (err) {
          console.error('[CLOUD_SYNC] Unexpected error:', err);
          loadLocalFallback();
        }
      } else {
        loadLocalFallback();
      }
      setIsLoading(false);
    };

    const loadLocalFallback = () => {
      const stored = localStorage.getItem('hashpilot_sessions');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed.length > 0) {
            setSessions(parsed);
            setActiveSessionId(parsed[0].id);
            return;
          }
        } catch { /* ignore */ }
      }
      // Nothing in storage either — create a default guest session
      const guestSession: ChatSession = {
        id: uuidv4(),
        wallet_address: 'guest',
        title: 'New Conversation',
        messages: [{ role: 'ai', content: "Hello! I'm Hashpilot, your Hedera copilot. How can I assist you today?" }]
      };
      setSessions([guestSession]);
      setActiveSessionId(guestSession.id);
      localStorage.setItem('hashpilot_sessions', JSON.stringify([guestSession]));
    };

    loadHistory();
  }, [walletId]);

  const createNewSession = async () => {
    const newSession: ChatSession = {
      id: uuidv4(),
      wallet_address: walletId || 'guest',
      title: 'New Conversation',
      messages: [{ role: 'ai', content: "Hello! I'm Hashpilot, your Hedera copilot. How can I assist you today?" }]
    };

    if (walletId) {
      // Save to Supabase
      const { error } = await supabase.from('chat_sessions').insert([newSession]);
      if (error) console.error('[CLOUD_SYNC] Error creating cloud session:', error);
    }

    const updated = [newSession, ...sessions];
    setSessions(updated);
    setActiveSessionId(newSession.id);
    if (!walletId) localStorage.setItem('hashpilot_sessions', JSON.stringify(updated));
  };

  const updateActiveSession = useCallback(async (messages: { role: 'user' | 'ai'; content: string }[], newTitle?: string) => {
    const active = sessions.find(s => s.id === activeSessionId);
    if (!active) return;

    const updatedTitle = newTitle || (messages.length > 1 ? messages[1].content.slice(0, 30) : active.title);
    
    // Optimistic UI Update
    const updatedSessions = sessions.map(s => 
      s.id === activeSessionId ? { ...s, messages, title: updatedTitle } : s
    );
    setSessions(updatedSessions);

    if (walletId) {
      // Upsert to Supabase
      const { error } = await supabase
        .from('chat_sessions')
        .upsert({ 
          id: activeSessionId, 
          wallet_address: walletId, 
          messages, 
          title: updatedTitle 
        });
      if (error) console.error('[CLOUD_SYNC] Error upserting cloud binary:', error);
    } else {
      localStorage.setItem('hashpilot_sessions', JSON.stringify(updatedSessions));
    }
  }, [activeSessionId, sessions, walletId]);

  return { sessions, activeSessionId, setActiveSessionId, createNewSession, updateActiveSession, isLoading };
}

export default function HistorySidebar({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  isLoading
}: {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  isLoading?: boolean;
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
        <div className="text-[11px] uppercase text-white/30 mb-5 tracking-[0.2em] font-black ml-2 flex justify-between">
          <span>Recent Protocols</span>
          {isLoading && <span className="animate-pulse">Syncing...</span>}
        </div>
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
              <span className="text-xs font-bold text-white">Cloud Synced</span>
              <span className="text-[10px] text-white/40">Secured via Supabase</span>
           </div>
        </div>
      </div>
    </aside>
  );
}
