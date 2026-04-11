type ChatMessageProps = {
  role: 'user' | 'ai';
  content: string;
};

export default function ChatMessage({ role, content }: ChatMessageProps) {
  const isAI = role === 'ai';
  
  return (
    <div className={`flex w-full mb-6 ${isAI ? 'justify-start' : 'justify-end'}`}>
      <div 
        className={`max-w-[80%] px-6 py-4 rounded-2xl glass-panel shadow-2xl relative ${
          isAI 
            ? 'rounded-tl-none border-l-2 border-l-electric-cyan' 
            : 'rounded-tr-none border-r-2 border-r-hedara-purple text-right bg-white/5'
        }`}
      >
        <p className={`text-sm md:text-base leading-relaxed ${isAI ? 'text-zinc-200' : 'text-white'}`}>
          {content}
        </p>
        
        {/* Subtle glow effect for AI messages */}
        {isAI && (
          <div className="absolute -inset-1 bg-electric-cyan/10 blur-xl -z-10 rounded-full opacity-50"></div>
        )}
      </div>
    </div>
  );
}
