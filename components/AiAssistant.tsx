import React, { useState, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2, Sparkles } from 'lucide-react';
import { generateGeminiResponse } from '../services/geminiService'; // Updated import

interface AiAssistantProps {
  systemInstruction: string;
  initialMessage: string;
  triggerButtonLabel?: string;
  isOpenInitially?: boolean; // New prop for controlling initial open state
  chatPrompt?: string; // Optional: A prompt to send to the AI when the chat opens
}

const AiAssistant: React.FC<AiAssistantProps> = ({ 
  systemInstruction, 
  initialMessage, 
  triggerButtonLabel = 'Ask AI',
  isOpenInitially = false,
  chatPrompt,
}) => {
  const [isOpen, setIsOpen] = useState(isOpenInitially);
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>(
    [{ role: 'ai', text: initialMessage }]
  );
  const [loading, setLoading] = useState(false);

  // Auto-send initial chat prompt if provided
  useEffect(() => {
    if (isOpen && chatPrompt && messages.length === 1 && messages[0].text === initialMessage) {
      handleSend(chatPrompt);
    }
  }, [isOpen, chatPrompt, messages, initialMessage]);


  const handleSend = async (userQuery?: string) => {
    const textToSend = userQuery || query;
    if (!textToSend.trim()) return;

    setQuery('');
    setMessages(prev => [...prev, { role: 'user', text: textToSend }]);
    setLoading(true);

    const aiResponse = await generateGeminiResponse(textToSend, systemInstruction);
    
    setMessages(prev => [...prev, { role: 'ai', text: aiResponse }]);
    setLoading(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {/* Trigger Button */}
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white p-4 rounded-full shadow-xl transition-all hover:scale-105 flex items-center gap-2"
        >
          <Sparkles className="w-6 h-6" />
          <span className="font-medium pr-2">{triggerButtonLabel}</span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="bg-white rounded-2xl shadow-2xl w-80 md:w-96 flex flex-col border border-gray-100 overflow-hidden animate-in slide-in-from-bottom-10 duration-300">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-4 flex justify-between items-center">
            <div className="flex items-center gap-2 text-white">
              <Sparkles className="w-5 h-5" />
              <h3 className="font-semibold">{triggerButtonLabel}</h3>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 h-80 p-4 overflow-y-auto bg-gray-50 space-y-4">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div 
                  className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-blue-500 text-white rounded-tr-none' 
                      : 'bg-white text-gray-700 shadow-sm border border-gray-100 rounded-tl-none'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white p-3 rounded-2xl rounded-tl-none shadow-sm border border-gray-100 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                  <span className="text-xs text-gray-500">Thinking...</span>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-3 bg-white border-t border-gray-100 flex gap-2">
            <input 
              type="text" 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type your question..." 
              className="flex-1 bg-gray-100 border-0 rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
            />
            <button 
              onClick={() => handleSend()}
              disabled={loading || !query.trim()}
              className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-300 text-white p-2 rounded-full transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AiAssistant;