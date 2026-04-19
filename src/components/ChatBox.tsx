import { useState, useRef, useEffect } from 'react';
import ChatMessageComponent from './ChatMessage';
import ChatInput from './ChatInput';
import { queryAI } from '../services/aiService';
import { useActionRouter } from '../services/ActionRouter';
import type { ChatSession, ChatMessage } from './HistorySidebar';
import TransactionCard from './TransactionCard';
import { v4 as uuidv4 } from 'uuid';
import { resolveHederaAddress, getHederaBalance } from '../services/hederaService';
import { useAccount } from 'wagmi';

type ChatBoxProps = {
  session: ChatSession;
  onUpdateSession: (messages: ChatMessage[], newTitle?: string) => void;
  hederaId?: string;
};

export default function ChatBox({ session, onUpdateSession, hederaId }: ChatBoxProps) {
  const [isThinking, setIsThinking] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { getExecutableFunction } = useActionRouter();
  const { address } = useAccount();

  const onUpdateTxState = (msgId: string, status: 'idle' | 'pending' | 'success' | 'error', hash?: string | null) => {
    const updatedMessages = session.messages.map(m => 
      m.id === msgId ? { ...m, txStatus: status, txHash: hash } : m
    );
    onUpdateSession(updatedMessages);
  };

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
    const userMsg: ChatMessage = { id: uuidv4(), role: 'user', content: text };
    const newMessages = [...session.messages, userMsg];
    onUpdateSession(newMessages); // optimistic update
    setIsThinking(true);

    try {
      const response = await queryAI(text);
      let aiMessages: ChatMessage[] = [...newMessages, { 
        id: uuidv4(),
        role: 'ai' as const, 
        content: response.reply 
      }];

      if (response.intent !== 'conversational') {
        const intent = response.intent;
        const params = response.parameters;

        if (intent === 'check_balance' || intent === 'analyze_wallet') {
          try {
            const target = params.targetAddress || hederaId || address;
            if (!target) {
              aiMessages.push({ id: uuidv4(), role: 'ai', content: "Please connect your wallet or specify an account to check a balance." });
            } else {
              const nativeId = await resolveHederaAddress(target);
              const balance = await getHederaBalance(nativeId);
              
              let balanceReply = `[COPILOT] Result for ${nativeId}:\n- ${balance.hbar} HBAR`;
              if (balance.formattedTokens.length > 0) {
                balanceReply += `\n- ${balance.formattedTokens.join('\n- ')}`;
              }

              if (intent === 'analyze_wallet') {
                balanceReply = `🚨 PORTFOLIO ORACLE 🚨\n\nResolved ID: ${nativeId}\nPayload Breakdown:\n- ${balance.hbar} HBAR` + 
                                (balance.formattedTokens.length > 0 ? `\n- ${balance.formattedTokens.join('\n- ')}` : "") +
                                `\n\nNet asset diversity looks healthy. Would you like me to analyze any specific token performance?`;
              }
              
              aiMessages.push({
                id: uuidv4(),
                role: 'ai',
                content: balanceReply
              });
            }
          } catch (err) {
            aiMessages.push({ id: uuidv4(), role: 'ai', content: "I couldn't retrieve the wallet data right now." });
          }
        } else if (intent === 'market_query') {
            try {
              // Client-side fetch using user's home IP (Bypasses Vercel/Datacenter blocks)
              const dsRes = await fetch('https://api.dexscreener.com/latest/dex/search?q=saucerswap');
              let lightDataString = "No live market data available.";
              
              if (dsRes.ok) {
                const dsData = await dsRes.json();
                console.log("DexScreener Raw Data:", dsData); // Diagnostic Log
                
                // Compress into a single light string to prevent AI/Edge crashes
                lightDataString = (dsData.pairs || []).slice(0, 6)
                  .map((p: any) => `${p.baseToken?.symbol || '?'}: $${p.priceUsd || '0'} (24h Vol: $${p.volume?.h24 || '0'})`)
                  .join(' | ');
              } else {
                 console.error("DexScreener Fetch Failed. Status:", dsRes.status); // Diagnostic Log
              }

              const summaryRes = await fetch('/api/summarize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: lightDataString, query: text })
              });
              
              const summaryJson = await summaryRes.json();
              console.log("Gemini Edge Response:", summaryJson); // Diagnostic Log
              
              aiMessages.push({
                id: uuidv4(),
                role: 'ai',
                content: summaryJson.summary
              });
            } catch (err) {
              console.error("DexScreener/Summarize Execution Failed:", err); // Diagnostic Log
              aiMessages.push({ id: uuidv4(), role: 'ai', content: "I'm having trouble fetching live market intel right now. SaucerSwap signals are currently faint!" });
            }
        } else {
          // It's a transaction intent (swap, transfer, etc)
          aiMessages.push({
            id: uuidv4(),
            role: 'ai',
            content: '', // Empty content as the card will be the main UI
            isTransaction: true,
            intent: intent,
            parameters: params,
            txStatus: 'idle',
            txHash: null
          });
        }
      }
      
      onUpdateSession(aiMessages);
    } catch (error) {
      onUpdateSession([...newMessages, { 
        id: uuidv4(),
        role: 'ai' as const, 
        content: "I'm sorry, I'm having trouble connecting to my brain right now. Please try again soon!" 
      }]);
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
          <div key={msg.id || idx}>
            {msg.content && (
              <ChatMessageComponent role={msg.role} content={msg.content} />
            )}
            
            {msg.isTransaction && (
              <div className="flex justify-start mb-8 ml-8">
                <TransactionCard 
                  msgId={msg.id}
                  intent={msg.intent!}
                  parameters={msg.parameters}
                  initialStatus={msg.txStatus as any || 'idle'}
                  initialHash={msg.txHash}
                  hederaId={hederaId}
                  onExecute={getExecutableFunction(msg.intent!, msg.parameters)!}
                  onUpdateState={(status, hash) => onUpdateTxState(msg.id, status, hash)}
                />
              </div>
            )}
          </div>
        ))}
        
        {isThinking && (
          <div className="flex items-center gap-3 ml-1 mb-8">
             <div className="flex gap-1">
                 <div className="w-1.5 h-1.5 bg-[#5C54E6] rounded-full animate-bounce [animation-duration:1s]"></div>
                 <div className="w-1.5 h-1.5 bg-[#5C54E6] rounded-full animate-bounce [animation-duration:1s] [animation-delay:0.2s]"></div>
                 <div className="w-1.5 h-1.5 bg-[#5C54E6] rounded-full animate-bounce [animation-duration:1s] [animation-delay:0.4s]"></div>
              </div>
              <span className="text-[10px] uppercase tracking-[0.3em] font-black text-[#5C54E6]/60">Processing Neural Link</span>
          </div>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#090A0F] via-[#090A0F]/80 to-transparent pt-12">
        <ChatInput onSend={handleSend} disabled={isThinking} />
      </div>
    </div>
  );
}
