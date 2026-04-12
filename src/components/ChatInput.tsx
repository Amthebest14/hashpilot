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
        <div className="absolute -inset-[1px] bg-gradient-to-r from-soft-purple to-main-blue rounded-[2rem] blur opacity-20 group-focus-within:opacity-60 transition duration-500"></div>
        <div className="relative glass-panel rounded-[2rem] flex items-center overflow-hidden purple-glow transition-all duration-300 group-focus-within:border-soft-purple/30">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={disabled}
            placeholder="Type your message to Hashpilot..."
            className="flex-1 bg-transparent border-none text-white outline-none px-8 py-5 text-base md:text-lg placeholder-white/30 selection:bg-soft-purple selection:text-white"
            autoFocus
          />
          <button 
            type="submit" 
            disabled={!input.trim() || disabled}
            className="mr-3 p-3 bg-soft-purple text-white rounded-full hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale disabled:scale-100"
          >
            <Send size={20} fill={input.trim() ? "currentColor" : "none"} />
          </button>
        </div>
      </form>
    </div>
  );
}
