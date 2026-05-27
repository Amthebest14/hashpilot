import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type ChatMessageProps = {
  role: 'user' | 'ai';
  content: string;
};

export default function ChatMessage({ role, content }: ChatMessageProps) {
  const isAI = role === 'ai';
  
  return (
    <div className={`flex w-full mb-8 ${isAI ? 'justify-start' : 'justify-end'}`}>
      <div className={`flex flex-col max-w-[95%] md:max-w-[85%] ${isAI ? 'items-start' : 'items-end'}`}>
        {isAI && (
          <div className="flex items-center gap-2 mb-2 ml-1">
            <div className="w-5 h-5 rounded-sm bg-[#5C54E6] flex items-center justify-center">
               <span className="text-[10px] font-bold text-white">H</span>
            </div>
            <span className="text-[11px] uppercase tracking-widest font-bold text-[#8B95A5]">Hashpilot</span>
          </div>
        )}
        
        <div 
          className={`transition-all duration-300 w-full ${
            isAI 
              ? 'py-2 border-l-2 border-[#5C54E6] pl-4 text-[#E2E8F0]' 
              : 'px-5 py-4 bg-[#1A1D27] text-[#E2E8F0] rounded-lg shadow-sm'
          }`}
        >
          {isAI ? (
            <div className="prose prose-invert prose-sm md:prose-base max-w-none prose-pre:bg-[#1A1D27] prose-pre:border prose-pre:border-[#222631] prose-a:text-[#5C54E6] prose-a:no-underline hover:prose-a:underline prose-headings:font-bold prose-headings:text-white">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content}
              </ReactMarkdown>
            </div>
          ) : (
            <p className="text-sm md:text-base leading-relaxed whitespace-pre-wrap font-medium">
              {content}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
