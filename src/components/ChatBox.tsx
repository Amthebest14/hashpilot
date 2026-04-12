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
      onUpdateSession(updatedAiMessages); 
      
      // Attempt action routing if intent is anything other than conversational
      if (response.intent !== 'conversational') {
        try {
          const txResponse = await handleIntent(response);
          if (txResponse) {
             onUpdateSession([...updatedAiMessages, { role: 'ai' as const, content: `I've successfully submitted the transaction to the network. Track it here: ${txResponse}` }]);
          }
        } catch (actionErr: any) {
           onUpdateSession([...updatedAiMessages, { role: 'ai' as const, content: `I ran into an issue while processing that: ${actionErr.message}. Should we try again?` }]);
        }
      }
    } catch (error) {
      onUpdateSession([...newMessages, { role: 'ai' as const, content: "I'm sorry, I'm having trouble connecting to my brain right now. Please try again soon!" }]);
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full max-w-5xl mx-auto px-6 relative">
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto pt-10 pb-40 no-scrollbar space-y-4"
      >
        {session.messages.map((msg, idx) => (
          <ChatMessage key={idx} role={msg.role} content={msg.content} />
        ))}
        
        {isThinking && (
          <div className="flex items-center gap-3 ml-1 mb-8">
             <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-soft-purple rounded-full animate-bounce [animation-duration:1s]"></div>
                <div className="w-1.5 h-1.5 bg-soft-purple rounded-full animate-bounce [animation-duration:1s] [animation-delay:0.2s]"></div>
                <div className="w-1.5 h-1.5 bg-soft-purple rounded-full animate-bounce [animation-duration:1s] [animation-delay:0.4s]"></div>
             </div>
             <span className="text-[10px] uppercase tracking-[0.3em] font-black text-soft-purple/60">Processing Neural Link</span>
          </div>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-main-blue via-main-blue/80 to-transparent pt-12">
        <ChatInput onSend={handleSend} disabled={isThinking} />
      </div>
    </div>
  );
}
