/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Send, Globe, Loader2, Sparkles, AlertCircle, LayoutTemplate, Search } from 'lucide-react';

// Initialize Gemini API
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SUGGESTED_QUESTIONS_POOL = [
  "How can I improve the Core Web Vitals?",
  "What are the biggest accessibility issues?",
  "How is the mobile responsiveness?",
  "Suggest a better heading structure.",
  "What are the top 3 SEO quick wins for this site?",
  "How can I optimize the images on this page?",
  "Is the color contrast sufficient for accessibility?",
  "How can I improve the call-to-action (CTA) visibility?",
  "Are there any missing meta tags?",
  "How can I improve the page load speed?",
  "What is the keyword density like?",
  "How can I enhance the user navigation?",
  "Are there any broken links or missing resources?",
  "How can I improve the typography for readability?",
  "What schema markup would benefit this site?"
];

type Message = {
  id: string;
  role: 'user' | 'model';
  text: string;
  isStreaming?: boolean;
};

export default function App() {
  const [url, setUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [chatSession, setChatSession] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const refreshSuggestedQuestions = () => {
    const shuffled = [...SUGGESTED_QUESTIONS_POOL].sort(() => 0.5 - Math.random());
    setSuggestedQuestions(shuffled.slice(0, 4));
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const startAnalysis = async () => {
    if (!url) return;
    
    // Basic URL validation
    let targetUrl = url;
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl;
      setUrl(targetUrl);
    }

    setIsAnalyzing(true);
    setError(null);
    setMessages([]);

    try {
      const chat = ai.chats.create({
        model: 'gemini-3-flash-preview',
        config: {
          systemInstruction: `You are an expert Web Developer and SEO consultant. Your code is clean, semantic, and heavily commented to explain best practices to junior developers. 
Your goal is to analyze websites and provide actionable, industry-standard advice on web design theory, UX/UI, and Search Engine Optimization (SEO).
When a user provides a URL, analyze its structure, content, and design based on the URL context. 
Provide specific, prioritized recommendations. Be encouraging and guide the user step-by-step as they work to rank their site.`,
          tools: [{ urlContext: {} }],
        },
      });
      setChatSession(chat);

      const initialPrompt = `Please analyze this website: ${targetUrl}. Provide a comprehensive initial audit focusing on Web Design best practices and SEO. Identify key areas for improvement.`;
      
      setMessages([{ id: Date.now().toString(), role: 'user', text: initialPrompt }]);

      const responseStream = await chat.sendMessageStream({ message: initialPrompt });
      
      let fullText = '';
      const modelMessageId = (Date.now() + 1).toString();
      
      setMessages(prev => [...prev, { id: modelMessageId, role: 'model', text: '', isStreaming: true }]);

      for await (const chunk of responseStream) {
        fullText += chunk.text;
        setMessages(prev => prev.map(msg => 
          msg.id === modelMessageId ? { ...msg, text: fullText } : msg
        ));
      }

      setMessages(prev => prev.map(msg => 
        msg.id === modelMessageId ? { ...msg, isStreaming: false } : msg
      ));
      refreshSuggestedQuestions();

    } catch (err: any) {
      console.error('Analysis error:', err);
      setError(err.message || 'Failed to analyze the website. Please check the URL and try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const sendMessage = async (e?: React.FormEvent, textOverride?: string) => {
    if (e) e.preventDefault();
    
    const textToSend = textOverride || input.trim();
    if (!textToSend || !chatSession || isAnalyzing) return;

    setInput('');
    const userMessageId = Date.now().toString();
    setMessages(prev => [...prev, { id: userMessageId, role: 'user', text: textToSend }]);
    setIsAnalyzing(true);
    setError(null);

    try {
      const responseStream = await chatSession.sendMessageStream({ message: textToSend });
      
      let fullText = '';
      const modelMessageId = (Date.now() + 1).toString();
      
      setMessages(prev => [...prev, { id: modelMessageId, role: 'model', text: '', isStreaming: true }]);

      for await (const chunk of responseStream) {
        fullText += chunk.text;
        setMessages(prev => prev.map(msg => 
          msg.id === modelMessageId ? { ...msg, text: fullText } : msg
        ));
      }

      setMessages(prev => prev.map(msg => 
        msg.id === modelMessageId ? { ...msg, isStreaming: false } : msg
      ));
      refreshSuggestedQuestions();
    } catch (err: any) {
      console.error('Chat error:', err);
      setError(err.message || 'Failed to send message.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="flex h-screen bg-neutral-50 font-sans text-neutral-900 overflow-hidden">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-neutral-200 flex flex-col shrink-0">
        <div className="p-6 border-b border-neutral-200">
          <h1 className="text-lg font-semibold flex items-center gap-2 leading-tight">
            <Sparkles className="w-5 h-5 text-indigo-600 shrink-0" />
            So Stoked Cali LLC - Web Design and SEO AI
          </h1>
          <p className="text-sm text-neutral-500 mt-2">
            Expert consultation for your web projects.
          </p>
        </div>
        
        <div className="p-6 flex-1 overflow-y-auto">
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            Target Website URL
          </label>
          <div className="relative mb-3">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input 
              type="url" 
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isAnalyzing) {
                  startAnalysis();
                }
              }}
              placeholder="example.com"
              className="w-full pl-9 pr-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
              disabled={isAnalyzing && messages.length === 0}
            />
          </div>
          <button
            onClick={startAnalysis}
            disabled={!url || (isAnalyzing && messages.length === 0)}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
          >
            {isAnalyzing && messages.length === 0 ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</>
            ) : (
              'Start Audit'
            )}
          </button>

          {/* Suggested Questions */}
          {messages.length > 0 && (
            <div className="mt-8">
              <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">
                Suggested Questions
              </h3>
              <div className="space-y-2">
                {suggestedQuestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(undefined, q)}
                    disabled={isAnalyzing}
                    className="block w-full text-left text-sm p-3 rounded-lg border border-neutral-200 hover:border-indigo-300 hover:bg-indigo-50 transition-colors text-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-neutral-50 relative min-w-0">
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="flex gap-4 mb-8">
              <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center shadow-sm">
                <LayoutTemplate className="w-8 h-8 text-indigo-600" />
              </div>
              <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center shadow-sm">
                <Search className="w-8 h-8 text-emerald-600" />
              </div>
            </div>
            <h2 className="text-2xl font-semibold text-neutral-800 mb-3">
              Enter a URL to begin your consultation
            </h2>
            <p className="text-neutral-500 max-w-md leading-relaxed">
              I'll analyze the website and provide actionable advice on web design theory, UX/UI, and SEO best practices to help you rank higher.
            </p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-3xl rounded-2xl p-6 ${
                    msg.role === 'user' 
                      ? 'bg-indigo-600 text-white rounded-tr-sm' 
                      : 'bg-white border border-neutral-200 shadow-sm rounded-tl-sm text-neutral-800'
                  }`}>
                    {msg.role === 'user' ? (
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    ) : (
                      <div className="prose prose-sm md:prose-base prose-neutral max-w-none prose-pre:bg-neutral-900 prose-pre:text-neutral-100 prose-a:text-indigo-600 hover:prose-a:text-indigo-700">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.text}
                        </ReactMarkdown>
                        {msg.isStreaming && (
                          <span className="inline-block w-2 h-4 bg-indigo-400 animate-pulse ml-1 align-middle"></span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {error && (
                <div className="flex justify-center">
                  <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg border border-red-100 flex items-center gap-2 text-sm max-w-2xl">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <p>{error}</p>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-neutral-200">
              <form onSubmit={(e) => sendMessage(e)} className="max-w-4xl mx-auto relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask a follow-up question..."
                  className="w-full pl-4 pr-12 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  disabled={isAnalyzing}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isAnalyzing}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-50 disabled:hover:bg-transparent"
                >
                  {isAnalyzing && messages.length > 0 ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

