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

    // Filter and map history payload, ignoring empty transaction blocks
    const historyPayload = newMessages
      .filter(m => m.content && m.content.trim() !== '')
      .map(m => ({ role: m.role, content: m.content }));

    try {
      const response = await queryAI(historyPayload);
      let aiMessages: ChatMessage[] = [...newMessages, { 
        id: uuidv4(),
        role: 'ai' as const, 
        content: response.reply 
      }];

      if (response.intent !== 'conversational') {
        const intent = response.intent;
        const params = response.parameters;

        if (intent === 'cancel') {
          aiMessages.push({
             id: uuidv4(),
             role: 'ai',
             content: response.reply || "Pending payloads have been aborted.",
             intent: 'cancel'
          });
        } else if (intent === 'check_balance' || intent === 'analyze_wallet') {
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
              // Isolated Binance HBAR Price Fetch
              let hbarPriceLine = "";
              try {
                const bRes = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=HBARUSDT');
                if (bRes.ok) {
                  const bData = await bRes.json();
                  const price = parseFloat(bData.price).toFixed(4);
                  hbarPriceLine = `HBAR is $${price}`;
                }
              } catch (bErr) {
                console.warn("[BINANCE] Isolated fetch failed:", bErr);
              }

              const dsRes = await fetch('https://api.dexscreener.com/latest/dex/search?q=saucerswap');
              let lightDataString = hbarPriceLine ? `${hbarPriceLine} | ` : "";
              
              if (dsRes.ok) {
                const dsData = await dsRes.ok ? await dsRes.json() : { pairs: [] };
                
                // Extract top 5 pairs and format as a compact string
                const topTokens = (dsData.pairs || []).slice(0, 5);
                const dsString = topTokens.map((p: any) => 
                  `${p.baseToken?.symbol || '?'}: $${p.priceUsd || '0'} (24h Vol: $${p.volume?.h24 || '0'})`
                ).join(' | ');
                lightDataString += dsString;
              } else {
                 console.error("DexScreener Fetch Failed. Status:", dsRes.status);
                 if (!lightDataString) lightDataString = "No live market data available.";
              }

              // Feed the lightweight string back into the main AI brain
              const followUpPayload = [
                ...historyPayload, 
                { role: 'model' as const, content: "Fetching market data..." }, 
                { role: 'user' as const, content: `Here is the raw market data based on my request. Please summarize it naturally and concisely:\n\n${lightDataString}` }
              ];
              
              const summaryResponse = await queryAI(followUpPayload);
              
              aiMessages.push({
                id: uuidv4(),
                role: 'ai',
                content: summaryResponse.reply || lightDataString
              });
            } catch (err) {
              console.error("DexScreener Analytics Engine Failed:", err);
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
        {session.messages.map((msg, idx) => {
          let isExpired = false;
          if (msg.isTransaction) {
             const subsequentMessages = session.messages.slice(idx + 1);
             isExpired = subsequentMessages.some(m => m.isTransaction || m.intent === 'cancel');
          }
          
          return (
          <div key={msg.id || idx}>
            {msg.content && (
              <ChatMessageComponent role={msg.role} content={msg.content} />
            )}
            
            {msg.isTransaction && (
              <div className="flex justify-start mb-4 md:mb-8 ml-2 md:ml-8 mr-2 md:mr-0 max-w-full overflow-hidden">
                <TransactionCard 
                  msgId={msg.id}
                  intent={msg.intent!}
                  parameters={msg.parameters}
                  initialStatus={msg.txStatus as any || 'idle'}
                  initialHash={msg.txHash}
                  hederaId={hederaId}
                  isExpired={isExpired}
                  onExecute={getExecutableFunction(msg.intent!, msg.parameters)!}
                  onUpdateState={(status, hash) => onUpdateTxState(msg.id, status, hash)}
                />
              </div>
            )}
          </div>
        )})}
        
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

      <div className="absolute bottom-0 left-0 right-0 bg-[#090A0F]/80 backdrop-blur-md pt-6 border-t border-[#222631]">
        <ChatInput onSend={handleSend} disabled={isThinking} />
      </div>
    </div>
  );
}
