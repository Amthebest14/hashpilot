type ChatMessageProps = {
  role: 'user' | 'ai';
  content: string;
};

export default function ChatMessage({ role, content }: ChatMessageProps) {
  const isAI = role === 'ai';
  
  return (
    <div className={`flex w-full mb-2 font-mono text-sm md:text-base`}>
      {isAI ? (
        <div className="flex gap-4 text-[#00F2FF]">
          <span className="opacity-50 select-none">[SYSTEM_LOG]</span>
          <p className="leading-relaxed whitespace-pre-wrap">{content}</p>
        </div>
      ) : (
        <div className="flex gap-4 text-[#00F2FF]">
          <span className="opacity-80 select-none font-bold">{">"}</span>
          <p className="leading-relaxed whitespace-pre-wrap opacity-90">{content}</p>
        </div>
      )}
    </div>
  );
}
