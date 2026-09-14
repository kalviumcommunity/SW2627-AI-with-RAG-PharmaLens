import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Bot, User, ShieldAlert, FileText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { streamPrompt } from '../services/api';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'error';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  sources?: { documentId: string; filename: string; text: string; score: number }[];
  isRefusal?: boolean;
}

interface ChatInterfaceProps {
  documentId?: string | null;
}

export const ChatInterface = ({ documentId }: ChatInterfaceProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-msg',
      role: 'assistant',
      content: '**Welcome to PharmaLens!** 🔬\n\n**The Problem:** Reading hundreds of pages of dense clinical trial data and FDA reports is time-consuming, and standard keyword search often misses the true context of medical questions.\n\n**The Solution:** I am an AI-powered Medical Assistant using RAG (Retrieval-Augmented Generation). Upload your documents above and ask me questions in plain English. I will read the entire document, understand your question, and give you hallucination-free answers backed by **exact citations**.\n\nHow can I help you analyze your pharmaceutical documents today?',
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const assistantId = crypto.randomUUID();
      const initialAssistantMessage: Message = {
        id: assistantId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        isStreaming: true,
      };
      
      setMessages((prev) => [...prev, initialAssistantMessage]);
      setIsLoading(false); // Stop main loading spinner, rely on message isStreaming

      const response = await streamPrompt(userMessage.content, sessionId, documentId || undefined, (chunk) => {
        setMessages((prev) => 
          prev.map((msg) => 
            msg.id === assistantId ? { ...msg, content: msg.content + chunk } : msg
          )
        );
      });
      
      setMessages((prev) => 
        prev.map((msg) => 
          msg.id === assistantId ? { 
            ...msg, 
            content: response.answer || "I couldn't generate a response.", 
            isStreaming: false,
            sources: response.sources,
            isRefusal: response.isRefusal
          } : msg
        )
      );
    } catch (error: any) {
      let friendlyMessage = error.message || 'An error occurred while connecting to the server.';
      
      // We can customize the friendly message if it's one of our typed errors
      if (friendlyMessage.startsWith('NetworkError:')) friendlyMessage = friendlyMessage.replace('NetworkError: ', '');
      if (friendlyMessage.startsWith('TokenLimitError:')) friendlyMessage = friendlyMessage.replace('TokenLimitError: ', '');
      if (friendlyMessage.startsWith('TimeoutError:')) friendlyMessage = friendlyMessage.replace('TimeoutError: ', '');

      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: 'error',
        content: friendlyMessage,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center shadow-sm z-10">
        <div className="bg-blue-600 p-2 rounded-lg mr-3">
          <Bot className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800">PharmaLens Assistant</h1>
          <p className="text-xs text-slate-500 font-medium tracking-wide">AI-POWERED CLINICAL RESEARCH</p>
        </div>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex max-w-[85%] sm:max-w-[75%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              
              {/* Avatar */}
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-1 
                ${msg.role === 'user' ? 'bg-slate-200 ml-3' : 
                  msg.role === 'error' ? 'bg-red-100 mr-3' : 'bg-blue-100 mr-3'}`}>
                {msg.role === 'user' && <User className="w-5 h-5 text-slate-600" />}
                {msg.role === 'assistant' && <Bot className="w-5 h-5 text-blue-600" />}
                {msg.role === 'error' && <ShieldAlert className="w-5 h-5 text-red-600" />}
              </div>

              {/* Message Bubble */}
              <div className={`px-5 py-3.5 rounded-2xl shadow-sm border
                ${msg.role === 'user' ? 'bg-blue-600 text-white border-blue-700 rounded-tr-sm' : 
                  msg.role === 'error' ? 'bg-red-50 text-red-800 border-red-200 rounded-tl-sm' : 
                  msg.isRefusal ? 'bg-amber-50 text-amber-900 border-amber-200 rounded-tl-sm' :
                  'bg-white text-slate-800 border-slate-200 rounded-tl-sm'} 
                ${msg.isStreaming ? 'bg-slate-50' : ''}`}
              >
                <div className={`prose max-w-none ${msg.role === 'user' ? 'prose-invert prose-p:text-white' : 'prose-slate'} prose-sm`}>
                  {msg.role === 'user' || msg.role === 'error' ? (
                    msg.content.split('\n').map((line, i) => (
                      <p key={i} className="mb-1 last:mb-0">{line}</p>
                    ))
                  ) : (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content + (msg.isStreaming ? ' ▍' : '')}
                    </ReactMarkdown>
                  )}
                </div>

                {/* Sources Display */}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-200/60">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center">
                      <FileText className="w-3 h-3 mr-1" /> Citations
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {msg.sources.map((source, idx) => (
                        <div key={idx} className="group relative">
                          <div className="flex items-center px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-medium rounded-md border border-slate-200 cursor-help transition-colors">
                            {source.filename}
                            <span className="ml-1.5 px-1 py-0.5 bg-white rounded text-[9px] text-slate-400 font-bold">
                              {(source.score * 100).toFixed(0)}%
                            </span>
                          </div>
                          
                          {/* Hover Tooltip showing the exact text snippet */}
                          <div className="absolute bottom-full left-0 mb-2 w-72 p-3 bg-slate-800 text-slate-100 text-xs rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 pointer-events-none">
                            <div className="font-semibold mb-1 text-slate-300 flex justify-between items-center">
                              <span>Source Snippet</span>
                            </div>
                            <div className="italic text-slate-300 line-clamp-6 leading-relaxed">
                              "{source.text}"
                            </div>
                            <div className="mt-2 text-[10px] text-slate-400 text-right">
                              ID: {source.documentId.split('-')[0]}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className={`text-[10px] mt-2 font-medium ${msg.role === 'user' ? 'text-blue-200' : 'text-slate-400'}`}>
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex max-w-[75%] flex-row">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 mr-3 flex items-center justify-center mt-1">
                <Bot className="w-5 h-5 text-blue-600" />
              </div>
              <div className="px-5 py-4 rounded-2xl bg-white border border-slate-200 rounded-tl-sm shadow-sm flex items-center">
                <Loader2 className="w-5 h-5 text-blue-500 animate-spin mr-2" />
                <span className="text-sm text-slate-500 font-medium">Analyzing documents...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-slate-200 p-4 sm:p-6">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about the clinical trials..."
            className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-5 pr-14 py-4 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none h-[60px] max-h-[200px] overflow-y-auto transition-all shadow-inner"
            rows={1}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-2 top-2 p-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors shadow-sm"
            aria-label="Send message"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
          <div className="text-center mt-2">
            <p className="text-[11px] text-slate-400 font-medium">
              PharmaLens AI can make mistakes. Consider verifying important clinical information.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};
