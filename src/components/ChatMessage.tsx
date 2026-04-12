type ChatMessageProps = {
  role: 'user' | 'ai';
  content: string;
};

export default function ChatMessage({ role, content }: ChatMessageProps) {
  const isAI = role === 'ai';
  
  return (
    <div className={`flex w-full mb-8 ${isAI ? 'justify-start' : 'justify-end'}`}>
      <div className={`flex flex-col max-w-[85%] md:max-w-[70%] ${isAI ? 'items-start' : 'items-end'}`}>
        {isAI && (
          <div className="flex items-center gap-2 mb-2 ml-1">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-soft-purple to-main-blue flex items-center justify-center p-[1px]">
               <div className="w-full h-full bg-main-blue rounded-full flex items-center justify-center">
                 <span className="text-[10px] font-bold text-soft-purple">H</span>
               </div>
            </div>
            <span className="text-[11px] uppercase tracking-widest font-bold text-soft-purple/80">Hashpilot</span>
          </div>
        )}
        
        <div 
          className={`px-5 py-4 rounded-3xl shadow-xl transition-all duration-300 ${
            isAI 
              ? 'glass-panel text-white rounded-tl-sm' 
              : 'bg-soft-purple text-white rounded-tr-sm purple-glow'
          }`}
        >
          <p className="text-sm md:text-base leading-relaxed md:leading-loose whitespace-pre-wrap font-medium">
            {content}
          </p>
        </div>
      </div>
    </div>
  );
}
