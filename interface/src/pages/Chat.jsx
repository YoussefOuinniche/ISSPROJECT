import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, User as UserIcon, Bot, AlertCircle } from 'lucide-react';
import api from '../api';

export default function Chat() {
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem('skillpulse_chat_history');
    return saved ? JSON.parse(saved) : [{
      id: 'welcome-msg',
      role: 'ai',
      content: "Hello! I am SkillPulse AI. I can help you with career advice, skill gap analysis, or generate learning roadmaps. How can I assist you today?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }];
  });
  
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  
  // Persist messages
  useEffect(() => {
    localStorage.setItem('skillpulse_chat_history', JSON.stringify(messages));
  }, [messages]);

  // Auto-scroll
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!inputValue.trim() || isTyping) return;

    const userMsg = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);
    setError(null);

    try {
      const response = await api.post('/api/user/ai/chat', { message: userMsg.content });
      
      const aiContent = response.data?.answer || response.data?.message || response.data?.reply || "I'm sorry, I couldn't process that request properly.";
      
      const aiMsg = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: aiContent,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      
      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      console.error("Chat API error:", err);
      setError("Failed to get a response. Please try again.");
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="h-[calc(100vh-140px)] w-full flex flex-col pt-24 px-4 pb-4 md:px-8 max-w-4xl mx-auto">
      
      <div className="mb-6 flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-white tracking-tight">AI Assistant</h1>
        <p className="text-slate-400 text-sm">Ask about skills, roadmaps, or technical career advice.</p>
      </div>

      <div className="flex-1 flex flex-col bg-[#0f172a] rounded-2xl border border-slate-800 shadow-2xl overflow-hidden">
        
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex max-w-[85%] sm:max-w-[75%] gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  
                  {/* Avatar */}
                  <div className="flex-shrink-0 mt-1">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                      msg.role === 'user' 
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' 
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}>
                      {msg.role === 'user' ? <UserIcon size={16} /> : <Bot size={16} />}
                    </div>
                  </div>

                  {/* Bubble */}
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className={`px-4 py-3 rounded-2xl whitespace-pre-wrap leading-relaxed text-[15px] shadow-sm ${
                      msg.role === 'user' 
                        ? 'bg-cyan-600/20 text-cyan-50 border border-cyan-500/20 rounded-tr-sm' 
                        : 'bg-slate-800/80 text-gray-200 border border-slate-700/50 rounded-tl-sm'
                    }`}>
                      {msg.content}
                    </div>
                    <span className={`text-[11px] text-slate-500 ${msg.role === 'user' ? 'text-right' : 'text-left'} px-1`}>
                      {msg.timestamp}
                    </span>
                  </div>

                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex justify-center my-4"
            >
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2 rounded-lg flex items-center text-sm gap-2">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            </motion.div>
          )}

          {/* Typing Indicator */}
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex w-full justify-start"
            >
              <div className="flex gap-3 flex-row px-2">
                 <div className="flex-shrink-0 mt-1">
                    <div className="h-8 w-8 rounded-full flex items-center justify-center bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      <Bot size={16} />
                    </div>
                  </div>
                  <div className="bg-slate-800/80 border border-slate-700/50 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
                    <div className="flex space-x-1.5">
                      <motion.div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" animate={{ y: [0, -5, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0 }} />
                      <motion.div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" animate={{ y: [0, -5, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }} />
                      <motion.div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" animate={{ y: [0, -5, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }} />
                    </div>
                    <span className="text-xs text-slate-400 ml-2 font-medium">AI is thinking...</span>
                  </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-slate-800/80 bg-[#0f172a]/95 backdrop-blur">
          <form onSubmit={handleSend} className="flex gap-3 relative items-end">
            <div className="w-full relative">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Ask a question..."
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 placeholder-slate-500 rounded-xl px-4 py-3.5 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 resize-none min-h-[52px] max-h-[160px] max-h-[120px] transition-all"
                rows={1}
              />
              <div className="absolute right-2 bottom-2 text-[10px] text-slate-500 pointer-events-none hidden sm:block">
                Press Enter to send
              </div>
            </div>
            
            <button
              type="submit"
              disabled={!inputValue.trim() || isTyping}
              className={`flex-shrink-0 h-[52px] w-[52px] flex items-center justify-center rounded-xl transition-all duration-200 ${
                !inputValue.trim() || isTyping
                  ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                  : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-900/20 active:scale-95'
              }`}
            >
              <Send size={20} className={inputValue.trim() && !isTyping ? "translate-x-0.5 -translate-y-0.5" : ""} />
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
