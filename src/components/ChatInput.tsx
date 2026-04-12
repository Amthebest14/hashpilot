import React, { useState } from 'react';

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
    <div className="w-full px-4 pt-4 pb-6 bg-[#0A0A0A] z-30 border-t border-[#00F2FF]/20">
      <form 
        onSubmit={handleSubmit}
        className="w-full flex items-center font-mono text-sm md:text-base text-[#00F2FF]"
      >
        <span className="opacity-80 select-none mr-3 font-bold">{">"}</span>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={disabled}
          placeholder="Enter command..."
          className="flex-1 bg-transparent border-none text-[#00F2FF] outline-none placeholder-[#00F2FF]/30 selection:bg-[#00F2FF] selection:text-[#0A0A0A]"
          autoFocus
        />
        {/* Invisible button to handle enter press properly */}
        <button type="submit" className="hidden" disabled={!input.trim() || disabled}>Send</button>
      </form>
    </div>
  );
}
