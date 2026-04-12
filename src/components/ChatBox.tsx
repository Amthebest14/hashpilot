import { useState, useRef, useEffect } from 'react';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import { queryAI } from '../services/aiService';
import { useActionRouter } from '../services/ActionRouter';
import type { ChatSession } from './HistorySidebar';

type ChatBoxProps = {
  session: ChatSession;
  onUpdateSession: (messages: { role: 'user' | 'ai'; content: string }[], newTitle?: string) => void;
};

export default function ChatBox({ session, onUpdateSession }: ChatBoxProps) {
  const [isThinking, setIsThinking] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { handleIntent } = useActionRouter();

  const scrollToBottom = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [session.messages, isThinking]);

  const handleSend = async (text: string) => {
    const newMessages = [...session.messages, { role: 'user' as const, content: text }];
    onUpdateSession(newMessages); // optimistic update
    setIsThinking(true);

    try {
      const response = await queryAI(text);
      
      const updatedAiMessages = [...newMessages, { role: 'ai' as const, content: response.reply }];
      onUpdateSession(updatedAiMessages); // update with AI reply text first
      
      // Attempt action routing if intent is anything other than conversational
      if (response.intent !== 'conversational') {
        try {
          const txResponse = await handleIntent(response);
          if (txResponse) {
             onUpdateSession([...updatedAiMessages, { role: 'ai' as const, content: `[ACTION_SUCCESS] Hash: ${txResponse}` }]);
          }
        } catch (actionErr: any) {
           onUpdateSession([...updatedAiMessages, { role: 'ai' as const, content: `[ACTION_FAILED] ${actionErr.message}` }]);
        }
      }
    } catch (error) {
      onUpdateSession([...newMessages, { role: 'ai' as const, content: "[SYSTEM_ERROR] Neural link disconnected." }]);
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full pl-6 pr-4 relative">
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto pt-6 pb-20 no-scrollbar space-y-1"
      >
        {session.messages.map((msg, idx) => (
          <ChatMessage key={idx} role={msg.role} content={msg.content} />
        ))}
        
        {isThinking && (
          <div className="flex w-full mb-2 font-mono text-sm md:text-base text-[#00F2FF]">
            <span className="opacity-50 select-none mr-4">[SYSTEM_LOG]</span>
            <span className="animate-pulse">Processing...</span>
          </div>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0">
        <ChatInput onSend={handleSend} disabled={isThinking} />
      </div>
    </div>
  );
}
