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
    <div className="fixed inset-x-0 bottom-0 py-10 px-4 bg-gradient-to-t from-deep-obsidian via-deep-obsidian to-transparent z-30">
      <form 
        onSubmit={handleSubmit}
        className="w-full max-w-4xl mx-auto relative group"
      >
        <div className="absolute -inset-1 bg-gradient-to-r from-electric-cyan to-hedara-purple rounded-2xl blur opacity-25 group-focus-within:opacity-100 transition duration-500"></div>
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={disabled}
            placeholder="What would you like to execute on Hedera today?"
            className="w-full bg-[#0a0a0a] border border-white/10 text-white rounded-2xl py-5 px-8 pr-16 focus:outline-none focus:border-electric-cyan/50 transition-all font-medium text-lg placeholder-zinc-600"
          />
          <button 
            type="submit"
            disabled={!input.trim() || disabled}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-3 bg-electric-cyan text-deep-obsidian rounded-xl hover:bg-white transition-all disabled:opacity-50 disabled:grayscale"
          >
            <Send size={22} />
          </button>
        </div>
      </form>
    </div>
  );
}
