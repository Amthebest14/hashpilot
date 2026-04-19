import React, { useState } from 'react';
import { Send } from 'lucide-react';

type ChatInputProps = {
  onSend: (message: string) => void;
  disabled?: boolean;
};

export default function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !disabled) {
      onSend(input);
      setInput('');
    }
  };

  return (
    <div className="w-full px-4 pt-4 pb-8 bg-transparent">
      <form 
        onSubmit={handleSubmit}
        className="w-full max-w-4xl mx-auto relative group"
      >
        <div className="relative bg-[#12141C] border border-[#222631] rounded-[2rem] flex items-center overflow-hidden transition-all duration-300 group-focus-within:border-[#5C54E6]/50 shadow-sm">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={disabled}
            placeholder="Type your message to Hashpilot..."
            className="flex-1 bg-transparent border-none text-[#E2E8F0] outline-none px-8 py-5 text-base md:text-lg placeholder-[#8B95A5] selection:bg-[#5C54E6] selection:text-white"
            autoFocus
          />
          <button 
            type="submit" 
            disabled={!input.trim() || disabled}
            className="mr-3 p-3 bg-[#5C54E6] text-white rounded-full hover:bg-[#6F68F4] active:scale-95 transition-all disabled:opacity-50 disabled:grayscale disabled:scale-100"
          >
            <Send size={20} fill={input.trim() ? "currentColor" : "none"} />
          </button>
        </div>
      </form>
    </div>
  );
}
