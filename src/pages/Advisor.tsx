import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, GenerateContentResponse } from '@google/genai';
import { useStore } from '../store/useStore';
import { Send, Sparkles, User, Bot, Loader2 } from 'lucide-react';
import Markdown from 'react-markdown';
import { toast } from 'sonner';

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
}

export default function Advisor() {
  const { bills, debts, subscriptions, goals, transactions } = useStore();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'model',
      text: "Hello! I'm your AI Financial Advisor. I've reviewed your dashboard data. How can I help you manage your bills, debts, or financial goals today?",
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<any>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Initialize chat with current store context
    const systemInstruction = `You are an expert AI financial advisor, bill planner, and debt strategist.
You must ONLY answer questions related to personal finance, budgeting, debt payoff, and the user's financial data.
If the user asks about anything else, politely decline and steer the conversation back to finance.

Here is the user's current financial context from their dashboard:
- Bills: ${JSON.stringify(bills)}
- Debts: ${JSON.stringify(debts)}
- Subscriptions: ${JSON.stringify(subscriptions)}
- Goals: ${JSON.stringify(goals)}
- Transactions: ${JSON.stringify(transactions)}

Use this data to provide personalized, actionable advice. Format your responses in Markdown. Keep your answers concise, empathetic, and easy to read.`;

    chatRef.current = ai.chats.create({
      model: 'gemini-3.1-pro-preview',
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });
  }, [bills, debts, subscriptions, goals, transactions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    const newMessageId = Date.now().toString();
    
    setMessages(prev => [...prev, { id: newMessageId, role: 'user', text: userMessage }]);
    setIsLoading(true);

    try {
      // Add a placeholder for the model's response
      const modelMessageId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, { id: modelMessageId, role: 'model', text: '' }]);

      const responseStream = await chatRef.current.sendMessageStream({ message: userMessage });
      
      let fullText = '';
      for await (const chunk of responseStream) {
        const c = chunk as GenerateContentResponse;
        if (c.text) {
          fullText += c.text;
          setMessages(prev => 
            prev.map(msg => 
              msg.id === modelMessageId ? { ...msg, text: fullText } : msg
            )
          );
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      toast.error('Failed to get response from AI Advisor.');
      // Remove the empty model message if it failed completely
      setMessages(prev => {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg.role === 'model' && !lastMsg.text) {
          return prev.slice(0, -1);
        }
        return prev;
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] min-h-[500px] bg-[#141414] rounded-lg border border-[#262626] overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[#262626] bg-[#0A0A0A] flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-indigo-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-[#FAFAFA]">AI Financial Advisor</h2>
          <p className="text-sm text-zinc-400">Powered by Gemini</p>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              msg.role === 'user' ? 'bg-indigo-500' : 'bg-[#262626]'
            }`}>
              {msg.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-zinc-300" />}
            </div>
            <div className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-5 py-3 ${
              msg.role === 'user' 
                ? 'bg-indigo-500 text-white rounded-tr-sm' 
                : 'bg-[#1C1C1C] border border-[#262626] text-zinc-200 rounded-tl-sm'
            }`}>
              {msg.role === 'user' ? (
                <p className="whitespace-pre-wrap">{msg.text}</p>
              ) : (
                <div className="prose prose-invert prose-sm sm:prose-base max-w-none prose-p:leading-relaxed prose-pre:bg-[#0A0A0A] prose-pre:border prose-pre:border-[#262626] prose-a:text-indigo-400">
                  <Markdown>{msg.text}</Markdown>
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-[#262626] flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-zinc-300" />
            </div>
            <div className="bg-[#1C1C1C] border border-[#262626] rounded-2xl rounded-tl-sm px-5 py-4 flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
              <span className="text-sm text-zinc-400">Analyzing your finances...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-[#0A0A0A] border-t border-[#262626]">
        <form onSubmit={handleSubmit} className="relative flex items-center max-w-4xl mx-auto">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your budget, debts, or financial goals..."
            className="w-full bg-[#141414] border border-[#262626] text-[#FAFAFA] rounded-full pl-6 pr-14 py-3 sm:py-4 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all placeholder:text-zinc-600"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-2 w-10 h-10 rounded-full bg-indigo-500 hover:bg-indigo-600 disabled:bg-[#262626] disabled:text-zinc-500 text-white flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0A0A0A] focus:ring-indigo-500"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
