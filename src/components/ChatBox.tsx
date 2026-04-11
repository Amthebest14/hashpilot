import { useState, useRef, useEffect } from 'react';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import TransactionPreviewCard from './TransactionPreviewCard';
import { queryAI } from '../services/aiService';
import type { AIResponse } from '../services/aiService';

export default function ChatBox() {
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; content: string }[]>([
    { role: 'ai', content: "System initialized. I am Hashpilot. Deploying intent-based protocols... How may I assist your Hedera journey today?" }
  ]);
  const [isThinking, setIsThinking] = useState(false);
  const [activeIntent, setActiveIntent] = useState<AIResponse['intent'] | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

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
  }, [messages, isThinking]);

  const handleSend = async (text: string) => {
    // Add user message
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setIsThinking(true);
    setActiveIntent(null);

    try {
      const response = await queryAI(text);
      setMessages((prev) => [...prev, { role: 'ai', content: response.text }]);
      
      if (response.intent) {
        setActiveIntent(response.intent);
      }
    } catch (error) {
      setMessages((prev) => [...prev, { role: 'ai', content: "Error connecting to neural link. Please try again." }]);
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] w-full max-w-5xl mx-auto px-4 relative">
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto pt-10 pb-40 no-scrollbar space-y-2"
      >
        {messages.map((msg, idx) => (
          <ChatMessage key={idx} role={msg.role} content={msg.content} />
        ))}
        
        {isThinking && (
          <div className="flex justify-start mb-6 animate-pulse">
            <div className="px-6 py-4 rounded-2xl glass-panel text-electric-cyan font-bold tracking-widest text-xs uppercase flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-electric-cyan rounded-full animate-bounce"></span>
              <span className="w-1.5 h-1.5 bg-electric-cyan rounded-full animate-bounce [animation-delay:0.2s]"></span>
              <span className="w-1.5 h-1.5 bg-electric-cyan rounded-full animate-bounce [animation-delay:0.4s]"></span>
              Thinking
            </div>
          </div>
        )}
      </div>

      <TransactionPreviewCard 
        intent={activeIntent || null} 
        onConfirm={() => {
          setMessages(prev => [...prev, { role: 'ai', content: "Transaction submitted to Hedera Hashgraph. Awaiting consensus..." }]);
          setActiveIntent(null);
        }}
        onCancel={() => setActiveIntent(null)}
      />

      <ChatInput onSend={handleSend} disabled={isThinking} />
    </div>
  );
}
