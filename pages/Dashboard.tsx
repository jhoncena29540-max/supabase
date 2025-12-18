

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Sidebar } from '../components/Sidebar';
import { AppView, UserProfile, AIRequest, LandingPage } from '../types';
import { Menu, Search, Bell, Sparkles, Copy, Trash2, Check, ChevronDown, ChevronUp, ChevronRight, Loader2, AlertTriangle, ExternalLink, Globe, Code, Layout, Save, Plus, ArrowLeft, RefreshCw, Monitor, Smartphone, Link as LinkIcon, Send, Bot, User, Tablet, Wand2, Layers, History as HistoryIcon, Eye, Maximize2, MoreHorizontal, PenLine, FileText, Users, Target, Rocket, CheckCircle, X, Bookmark, Share2 } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input, TextArea } from '../components/Input';
import { generateContentScript, generateCoachingAdvice, generateLandingPageCode, refineLandingPageCode, getChatResponse } from '../lib/gemini';
import { Content } from "@google/genai";

interface DashboardProps {
  user: any; // Supabase auth user
  onLogout: () => void;
}

// --- Helper Components ---

const CopyButton = ({ text, label = 'Copy' }: { text: string, label?: string }) => {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  return (
    <button 
      onClick={handleCopy} 
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border shadow-sm ${
          copied 
          ? 'bg-green-500/20 text-green-400 border-green-500/50' 
          : 'bg-slate-700 hover:bg-indigo-600 text-white border-slate-600 hover:border-indigo-500'
      }`}
      title="Copy to clipboard"
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
      {copied ? <span>Copied!</span> : label}
    </button>
  );
};

const highlightSyntax = (code: string) => {
    let html = code
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    html = html.replace(/\b(const|let|var|function|return|if|else|for|while|import|export|from|class|interface|type|async|await|try|catch|switch|case|break|continue|default)\b/g, '<span style="color: #c084fc; font-weight: bold;">$1</span>');
    html = html.replace(/(['"`])(.*?)\1/g, '<span style="color: #4ade80;">$1</span>');
    html = html.replace(/\b(\d+|true|false|null|undefined)\b/g, '<span style="color: #fb923c;">$1</span>');
    html = html.replace(/(\/\/.*)/g, '<span style="color: #94a3b8; font-style: italic;">$1</span>');
    html = html.replace(/(&lt;\/?)(\w+)(.*?)(\/?&gt;)/g, '$1<span style="color: #f472b6;">$2</span>$3$4');
    html = html.replace(/(\w+)(?=\()/g, '<span style="color: #60a5fa;">$1</span>');
    return html;
};

const MarkdownRenderer = ({ content }: { content: string }) => {
  const parts = content.split(/(```[\s\S]*?```)/g);
  const formatText = (text: string) => {
     let html = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/^### (.*$)/gm, '<h3 class="text-lg font-bold text-indigo-300 mt-6 mb-3">$1</h3>')
        .replace(/^## (.*$)/gm, '<h2 class="text-xl font-bold text-white mt-8 mb-4 border-b border-indigo-500/20 pb-2">$1</h2>')
        .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold text-white mt-8 mb-6 border-b border-indigo-500/30 pb-2">$1</h1>')
        .replace(/\*\*(.*?)\*\*/g, '<strong class="text-indigo-200 font-bold">$1</strong>')
        .replace(/\*(.*?)\*/g, '<em class="text-slate-400 italic">$1</em>')
        .replace(/^\* (.*$)/gm, '<div class="flex gap-2 mb-2 ml-1"><span class="text-indigo-400 mt-1.5">•</span><span class="flex-1 text-slate-300">$1</span></div>')
        .replace(/^- (.*$)/gm, '<div class="flex gap-2 mb-2 ml-1"><span class="text-indigo-400 mt-1.5">•</span><span class="flex-1 text-slate-300">$1</span></div>')
        .replace(/\n/g, '<div class="h-2"></div>'); 
     return html;
  };

  return (
    <div className="text-slate-200 leading-relaxed font-normal">
      {parts.map((part, index) => {
        if (part.startsWith('```')) {
          const match = part.match(/^```(\w+)?\n([\s\S]*?)```$/);
          const code = match ? match[2] : part.replace(/^```\w*\n?|```$/g, '');
          return (
            <div key={index} className="my-6 rounded-xl overflow-hidden border border-slate-700 bg-[#0f172a] shadow-xl group">
               <div className="bg-slate-800/80 px-4 py-2.5 text-xs font-mono text-slate-400 border-b border-slate-700 flex justify-between items-center backdrop-blur-sm">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50"></div>
                  </div>
                  <CopyButton text={code} label="Copy Code" />
               </div>
               <div className="relative">
                 <pre className="p-5 overflow-x-auto text-sm font-mono text-indigo-100/90 whitespace-pre bg-[#0f172a] leading-relaxed">
                   <code dangerouslySetInnerHTML={{ __html: highlightSyntax(code) }} />
                 </pre>
               </div>
            </div>
          );
        }
        return <div key={index} dangerouslySetInnerHTML={{ __html: formatText(part) }} />;
      })}
    </div>
  );
};

const FormattedResponse = ({ content, title = "Generated Result" }: { content: string, title?: string }) => {
    const headerRegex = /^(#{2,3})\s+(.*$)/gm;
    const hasHeaders = (content.match(headerRegex) || []).length >= 2;
    const [isExpanded, setIsExpanded] = useState(true);
    const [openSections, setOpenSections] = useState<number[]>([0]);
    const isLong = content.length > 800;
    const contentId = React.useId();

    const toggleSection = (index: number) => {
        setOpenSections(prev => prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]);
    };

    const renderAccordion = () => {
        const parts = content.split(/^(#{2,3} .*$)/gm);
        const sections = [];
        let currentPreamble = !parts[0].match(/^#{2,3} /) ? parts[0] : "";
        for (let i = 0; i < parts.length; i++) {
            if (parts[i].match(/^#{2,3} /)) {
                sections.push({ title: parts[i].replace(/^#{2,3} /, '').trim(), content: parts[i + 1] || "" });
                i++;
            }
        }
        return (
            <div className="space-y-3">
                {currentPreamble.trim() && (
                    <div className="mb-4 prose prose-invert max-w-none">
                        <MarkdownRenderer content={currentPreamble} />
                    </div>
                )}
                {sections.map((section, idx) => (
                    <div key={idx} className="border border-indigo-500/20 rounded-xl bg-slate-800/30 overflow-hidden transition-all duration-300">
                        <button onClick={() => toggleSection(idx)} className={`w-full flex items-center justify-between p-4 text-left transition-colors ${openSections.includes(idx) ? 'bg-indigo-900/20 text-indigo-300' : 'hover:bg-slate-700/30 text-slate-300'}`}>
                            <h4 className="font-bold text-lg flex items-center gap-2">
                                {openSections.includes(idx) ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                {section.title}
                            </h4>
                        </button>
                        {openSections.includes(idx) && (
                            <div className="p-5 border-t border-slate-700/50 bg-slate-900/20 animate-fade-in">
                                <MarkdownRenderer content={section.content} />
                            </div>
                        )}
                    </div>
                ))}
            </div>
        );
    };

    return (
        <Card className="animate-fade-in border border-indigo-500/30 bg-[#1e293b]/40 backdrop-blur-md shadow-2xl">
            <div className="flex justify-between items-center mb-6 border-b border-slate-700/50 pb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
                        <Sparkles size={18} aria-hidden="true" />
                    </div>
                    {title}
                </h3>
                <div className="flex items-center gap-2">
                    <CopyButton text={content} label="Copy All" />
                    {!hasHeaders && isLong && (
                         <button onClick={() => setIsExpanded(!isExpanded)} className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500" title={isExpanded ? "Collapse" : "Expand"}>
                         {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                       </button>
                    )}
                </div>
            </div>
            <div id={contentId} role="region" aria-label={`${title} content`}>
                {hasHeaders ? renderAccordion() : (
                    <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isExpanded ? 'max-h-full opacity-100' : 'max-h-64 opacity-80 relative'}`}>
                        <div className="prose prose-invert max-w-none">
                            <MarkdownRenderer content={content} />
                        </div>
                        {isLong && !isExpanded && (
                            <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-slate-900 to-transparent flex items-end justify-center pb-4">
                                <button onClick={() => setIsExpanded(true)} className="text-sm font-medium text-white hover:text-indigo-200 bg-indigo-600/90 hover:bg-indigo-600 px-6 py-2 rounded-full backdrop-blur-sm shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 pointer-events-auto">
                                    Show full response
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </Card>
    );
};

const ResponseSkeleton = () => (
    <Card className="animate-pulse border-white/5">
        <div className="flex items-center gap-2 mb-6">
             <div className="w-5 h-5 bg-slate-800 rounded-full"></div>
             <div className="h-6 w-1/3 bg-slate-800 rounded"></div>
        </div>
        <div className="space-y-4">
            <div className="h-4 w-full bg-slate-800/50 rounded"></div>
            <div className="h-4 w-11/12 bg-slate-800/50 rounded"></div>
            <div className="h-4 w-4/5 bg-slate-800/50 rounded"></div>
            <div className="h-32 w-full bg-slate-800/30 rounded mt-4"></div>
        </div>
    </Card>
);

const HistorySkeleton = () => (
    <div className="space-y-4">
        {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse border-white/5 opacity-70">
                <div className="flex justify-between mb-3">
                    <div className="h-4 w-20 bg-slate-800 rounded"></div>
                    <div className="h-4 w-24 bg-slate-800 rounded"></div>
                </div>
                <div className="h-4 w-3/4 bg-slate-800 rounded mb-2"></div>
                <div className="h-10 w-full bg-slate-800/50 rounded"></div>
            </Card>
        ))}
    </div>
);

// --- Main Dashboard Component ---

export const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
  const [currentView, setView] = useState<AppView>(AppView.DASHBOARD_HOME);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      setLoadingProfile(true);
      try {
        const { data, error } = await supabase.from('users').select('*').eq('id', user.id).single();
        if (error) {
            if (error.code === 'PGRST116') {
                const { data: newProfile } = await supabase.from('users').insert({ id: user.id, email: user.email, name: user.user_metadata?.name || user.email?.split('@')[0] }).select().single();
                if (newProfile) setProfile(newProfile);
            }
        } else if (data) {
            setProfile(data);
        }
      } catch (err) { console.error(err); } finally { setLoadingProfile(false); }
    };
    fetchProfile();
  }, [user]);

  const HistoryView = ({ limit }: { limit?: number }) => {
    const [history, setHistory] = useState<AIRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<'ALL' | 'content' | 'coaching' | 'chat'>('ALL');

    useEffect(() => {
      const fetchHistory = async () => {
        let query = supabase.from('ai_requests').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
        if (limit) query = query.limit(limit);
        const { data } = await query;
        if (data) setHistory(data);
        setLoading(false);
      };
      fetchHistory();
    }, [limit, user.id]);

    const filteredHistory = history.filter(item => {
        const term = searchTerm.toLowerCase();
        const matchesSearch = item.prompt.toLowerCase().includes(term) || item.response.toLowerCase().includes(term);
        const matchesType = filterType === 'ALL' || item.request_type === filterType;
        return matchesSearch && matchesType;
    });

    if (loading) return <HistorySkeleton />;
    if (history.length === 0) return <div className="text-center py-10 bg-slate-800/30 rounded-xl border border-dashed border-slate-700"><p className="text-slate-500">No history found.</p></div>;

    return (
      <div className="space-y-4 animate-fade-in">
        {!limit && (
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input type="text" placeholder="Search history..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-slate-900/50 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-slate-200 focus:outline-none focus:border-indigo-500 transition-all" />
                </div>
                <div className="flex bg-slate-900/50 p-1 rounded-lg border border-slate-700">
                    {(['ALL', 'content', 'coaching', 'chat'] as const).map((type) => (
                        <button key={type} onClick={() => setFilterType(type)} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${filterType === type ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}>{type === 'ALL' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}</button>
                    ))}
                </div>
            </div>
        )}
        {filteredHistory.map((item) => (
            <Card key={item.id} className="group transition-all hover:bg-slate-800/60 hover:border-indigo-500/30">
                <div className="flex justify-between items-start mb-2">
                <span className={`px-2 py-1 rounded text-xs font-medium uppercase tracking-wider ${item.request_type === 'content' ? 'bg-purple-500/20 text-purple-300' : item.request_type === 'chat' ? 'bg-green-500/20 text-green-300' : 'bg-indigo-500/20 text-indigo-300'}`}>{item.request_type}</span>
                <span className="text-xs text-slate-500">{new Date(item.created_at).toLocaleDateString()}</span>
                </div>
                <p className="text-slate-200 font-medium line-clamp-1 mb-2">Prompt: {item.prompt.replace(/^Format: \w+, Topic: /, '')}</p>
                <div className="bg-black/20 p-3 rounded-lg text-sm text-slate-400 line-clamp-2 font-mono border border-white/5">{item.response}</div>
            </Card>
        ))}
        {limit && history.length > 0 && <Button variant="ghost" onClick={() => setView(AppView.DASHBOARD_HISTORY)} className="w-full text-sm">View All History</Button>}
      </div>
    );
  };

  const HomeView = () => (
    <div className="space-y-6 animate-fade-in">
      <header className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Hello, {profile?.name || 'Speaker'} 👋</h2>
        <p className="text-slate-400">Ready to elevate your communication today?</p>
      </header>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-indigo-900/40 to-slate-800/40 border-indigo-500/20 group hover:border-indigo-500/40 transition-all">
          <h3 className="text-lg font-semibold text-white mb-2">Generate Script</h3>
          <p className="text-sm text-slate-400 mb-4">Create speeches, presentation notes, and more.</p>
          <Button onClick={() => setView(AppView.DASHBOARD_CONTENT)} className="w-full">Open Studio</Button>
        </Card>
        <Card className="bg-gradient-to-br from-purple-900/40 to-slate-800/40 border-purple-500/20 group hover:border-purple-500/40 transition-all">
          <h3 className="text-lg font-semibold text-white mb-2">Get Coaching</h3>
          <p className="text-sm text-slate-400 mb-4">Get AI feedback on tone, clarity, and confidence.</p>
          <Button onClick={() => setView(AppView.DASHBOARD_COACHING)} variant="secondary" className="w-full">Start Practice</Button>
        </Card>
        <Card className="bg-gradient-to-br from-blue-900/40 to-slate-800/40 border-blue-500/20 group hover:border-blue-500/40 transition-all">
          <h3 className="text-lg font-semibold text-white mb-2">Landing Builder</h3>
          <p className="text-sm text-slate-400 mb-4">Generate and deploy website landing pages.</p>
          <Button onClick={() => setView(AppView.DASHBOARD_LANDING_BUILDER)} variant="secondary" className="w-full">Create Page</Button>
        </Card>
      </div>
      <div className="mt-8"><h3 className="text-xl font-semibold text-white mb-4">Recent Activity</h3><HistoryView limit={3} /></div>
    </div>
  );

  const ContentView = () => {
    const [topic, setTopic] = useState('');
    const [format, setFormat] = useState<'speech' | 'landing_page' | 'presentation'>('speech');
    const [result, setResult] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = async () => {
      if (!topic) return;
      setLoading(true);
      setResult('');
      setError(null);
      try {
        const text = await generateContentScript(topic, format);
        if (text) {
          setResult(text);
          await supabase.from('ai_requests').insert({ user_id: user.id, request_type: 'content', prompt: `Format: ${format}, Topic: ${topic}`, response: text });
        }
      } catch (err: any) { setError(err.message || "Error generating content."); } finally { setLoading(false); }
    };

    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Sparkles className="text-purple-400" /> AI Content Studio</h2>
        <Card>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Content Type</label>
              <div className="flex flex-wrap gap-2">
                {(['speech', 'landing_page', 'presentation'] as const).map(f => (
                  <button key={f} onClick={() => setFormat(f)} className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${format === f ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}>{f.replace('_', ' ').toUpperCase()}</button>
                ))}
              </div>
            </div>
            <Input label="Topic or Goal" placeholder="e.g., A keynote about the future of AI in education" value={topic} onChange={(e) => setTopic(e.target.value)} disabled={loading} />
            {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg flex items-center gap-2"><AlertTriangle size={16} />{error}</div>}
            <Button onClick={handleGenerate} isLoading={loading} disabled={!topic || loading}>{loading ? 'Generating...' : 'Generate Content'}</Button>
          </div>
        </Card>
        {loading && <ResponseSkeleton />}
        {result && !loading && <FormattedResponse content={result} />}
      </div>
    );
  };

  const CoachingView = () => {
    const [input, setInput] = useState('');
    const [advice, setAdvice] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleCoach = async () => {
      if (!input) return;
      setLoading(true);
      setAdvice('');
      setError(null);
      try {
        const text = await generateCoachingAdvice(input);
        if (text) {
          setAdvice(text);
           await supabase.from('ai_requests').insert({ user_id: user.id, request_type: 'coaching', prompt: input, response: text });
        }
      } catch (err: any) { setError(err.message || "Error analyzing content."); } finally { setLoading(false); }
    };

    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Sparkles className="text-indigo-400" /> AI Speak Coaching</h2>
        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="h-full flex flex-col">
            <TextArea label="Enter your text or speech draft" placeholder="Paste your speech here..." rows={12} value={input} onChange={(e) => setInput(e.target.value)} className="flex-1 min-h-[300px]" disabled={loading} />
            <div className="mt-4"><Button onClick={handleCoach} isLoading={loading} disabled={!input || loading} className="w-full">{loading ? 'Analyzing...' : 'Analyze & Coach Me'}</Button></div>
          </Card>
          <div className="space-y-4">
             {loading && <ResponseSkeleton />}
             {!loading && advice && <FormattedResponse content={advice} title="Coaching Feedback" />}
             {!loading && !advice && <Card className="h-full bg-slate-800/30 border-dashed border-slate-700 flex flex-col items-center justify-center text-center p-8 min-h-[400px]"><div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4"><Sparkles size={32} className="text-slate-600" /></div><h3 className="text-lg font-medium text-slate-300 mb-2">Ready to Coach</h3><p className="text-slate-500 max-w-xs">Enter text on the left to get instant feedback.</p></Card>}
          </div>
        </div>
      </div>
    );
  };

  const ChatbotView = () => {
      const [messages, setMessages] = useState<Content[]>([]);
      const [input, setInput] = useState('');
      const [loading, setLoading] = useState(false);
      const [savingMsgIndex, setSavingMsgIndex] = useState<number | null>(null);
      const messagesEndRef = useRef<HTMLDivElement>(null);

      const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); };
      useEffect(() => { scrollToBottom(); }, [messages]);

      const handleSend = async (e?: React.FormEvent) => {
          e?.preventDefault();
          if(!input.trim() || loading) return;
          const userMessage = input;
          setInput('');
          setLoading(true);
          const newHistory = [...messages, { role: 'user', parts: [{ text: userMessage }] }];
          setMessages(newHistory);
          try {
              const aiText = await getChatResponse(newHistory, userMessage);
              setMessages(prev => [...prev, { role: 'model', parts: [{ text: aiText || "I'm sorry, I couldn't process that." }] }]);
          } catch (err) { console.error(err); } finally { setLoading(false); }
      };

      const handleSaveToHistory = async (content: string, index: number) => {
          setSavingMsgIndex(index);
          try {
             const prompt = index > 0 && messages[index - 1].role === 'user' ? messages[index - 1].parts[0].text : "Chat Conversation";
             await supabase.from('ai_requests').insert({ user_id: user.id, request_type: 'chat', prompt: prompt, response: content });
          } catch (error) { console.error(error); } finally { setSavingMsgIndex(null); }
      };

      return (
          <div className="h-[calc(100vh-140px)] max-w-4xl mx-auto flex flex-col animate-fade-in">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2"><Bot className="text-green-400" /> AI Assistant</h2>
              <Card className="flex-1 flex flex-col overflow-hidden !p-0 border-indigo-500/20">
                  <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-900/50">
                      {messages.map((msg, idx) => {
                          const isUser = msg.role === 'user';
                          const contentText = msg.parts[0].text;
                          return (
                              <div key={idx} className={`flex gap-4 ${isUser ? 'flex-row-reverse' : ''}`}>
                                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isUser ? 'bg-indigo-600' : 'bg-green-600'}`}>
                                      {isUser ? <User size={20} className="text-white" /> : <Bot size={20} className="text-white" />}
                                  </div>
                                  <div className={`max-w-[80%] p-4 rounded-2xl ${isUser ? 'bg-indigo-600/20 border border-indigo-500/30 rounded-tr-none text-indigo-100' : 'bg-slate-800 border border-slate-700 rounded-tl-none text-slate-200'}`}>
                                      {isUser ? <div className="leading-relaxed whitespace-pre-wrap">{contentText}</div> : <>
                                            <MarkdownRenderer content={contentText} />
                                            <div className="mt-2 pt-2 border-t border-slate-700 flex justify-end gap-2">
                                                 <button onClick={() => handleSaveToHistory(contentText, idx)} disabled={savingMsgIndex === idx} className="text-xs flex items-center gap-1 text-slate-400 hover:text-white disabled:opacity-50"><Bookmark size={12} />{savingMsgIndex === idx ? "Saving..." : "Save"}</button>
                                            </div>
                                        </>}
                                  </div>
                              </div>
                          );
                      })}
                      <div ref={messagesEndRef} />
                  </div>
                  <div className="p-4 bg-slate-900 border-t border-white/5">
                      <form onSubmit={handleSend} className="relative flex items-center gap-2">
                          <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type your question..." className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 pl-4 pr-12 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
                          <button type="submit" disabled={!input.trim() || loading} className="absolute right-2 p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg disabled:opacity-50"><Send size={18} /></button>
                      </form>
                  </div>
              </Card>
          </div>
      );
  };

  const LandingBuilderView = () => {
    const [pages, setPages] = useState<LandingPage[]>([]);
    const [selectedPage, setSelectedPage] = useState<LandingPage | null>(null);
    const [loadingPages, setLoadingPages] = useState(true);
    const [activeTool, setActiveTool] = useState<'new' | 'list'>('new');
    const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
    const [generating, setGenerating] = useState(false);
    const [saving, setSaving] = useState(false);
    const [copiedPreview, setCopiedPreview] = useState(false);
    const [title, setTitle] = useState('');
    const [prompt, setPrompt] = useState('');
    const [refinePrompt, setRefinePrompt] = useState('');
    const [code, setCode] = useState('');
    const [slug, setSlug] = useState('');

    useEffect(() => { fetchPages(); }, [user.id]);
    useEffect(() => {
        if(selectedPage) {
            setTitle(selectedPage.title);
            setSlug(selectedPage.slug);
            setCode(selectedPage.html_content);
            setActiveTool('new');
        }
    }, [selectedPage]);

    const fetchPages = async () => {
        const { data } = await supabase.from('landing_pages').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
        if (data) setPages(data);
        setLoadingPages(false);
    };

    const generateSlug = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const resetForm = () => { setTitle(''); setPrompt(''); setRefinePrompt(''); setCode(''); setSlug(''); setSelectedPage(null); };

    const handleGenerate = async () => {
        if(!prompt || !title) return alert("Missing name or description.");
        setGenerating(true);
        try {
            const html = await generateLandingPageCode(prompt);
            setCode(html);
            if (!slug) setSlug(generateSlug(title));
        } catch(e) { console.error(e); } finally { setGenerating(false); }
    };

    const handleRefine = async () => {
        if (!refinePrompt || !code) return;
        setGenerating(true);
        try {
            const updatedHtml = await refineLandingPageCode(code, refinePrompt);
            setCode(updatedHtml);
            setRefinePrompt('');
        } catch(e) { console.error(e); } finally { setGenerating(false); }
    }

    const handleSave = async (deploy: boolean = false) => {
        if(!title || !slug || !code) return alert("Incomplete page data.");
        setSaving(true);
        try {
            const storagePath = `landing-pages/${user.id}/${slug}.html`;
            
            // 1. Upload to Storage Bucket 'app'
            const { error: storageError } = await supabase.storage
                .from('app')
                .upload(storagePath, new Blob([code], { type: 'text/html' }), {
                    upsert: true,
                    contentType: 'text/html'
                });

            if (storageError) {
                if (storageError.message.includes("violates row-level security policy")) {
                   throw new Error("Storage RLS Policy missing. Ask the AI Assistant: 'How do I fix the Storage RLS error?' to get the SQL setup code.");
                }
                throw new Error("Storage Upload Failed: " + storageError.message);
            }

            // 2. Save Metadata and Content to Database
            const pageData = { 
                user_id: user.id, 
                title, 
                slug, 
                html_content: code, 
                storage_path: storagePath,
                is_published: deploy, 
                updated_at: new Date().toISOString() 
            };
            
            const { error } = selectedPage 
                ? await supabase.from('landing_pages').update(pageData).eq('id', selectedPage.id) 
                : await supabase.from('landing_pages').insert(pageData);
            
            if(error) throw error;
            
            await fetchPages();
            if (deploy) alert("Successfully Published to Database and Storage Bucket!");
            
            const { data } = await supabase.from('landing_pages').select('*').eq('slug', slug).single();
            if(data) setSelectedPage(data);
        } catch(e: any) { 
            alert(e.message); 
            console.error(e);
        } finally { 
            setSaving(false); 
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if(!confirm("Delete?")) return;
        
        // Find the page to get the storage path
        const pageToDelete = pages.find(p => p.id === id);
        if (pageToDelete?.storage_path) {
            await supabase.storage.from('app').remove([pageToDelete.storage_path]);
        }

        await supabase.from('landing_pages').delete().eq('id', id);
        fetchPages();
        if(selectedPage?.id === id) resetForm();
    };

    const handleCopyPreview = async () => {
        if (!selectedPage) return;
        const url = `${window.location.origin}/#/p/${selectedPage.slug}?preview=true`;
        try { await navigator.clipboard.writeText(url); setCopiedPreview(true); setTimeout(() => setCopiedPreview(false), 2000); } catch(err) {}
    };

    const liveUrl = `${window.location.origin}/#/p/${slug}`;

    return (
        <div className="h-[calc(100vh-140px)] flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <button onClick={() => { setActiveTool('new'); resetForm(); }} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${activeTool === 'new' && !selectedPage ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'}`}><PenLine size={16} /> Create New</button>
                    <button onClick={() => setActiveTool('list')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${activeTool === 'list' ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'}`}><Layout size={16} /> My Pages</button>
                </div>
                {code && (
                    <div className="flex items-center gap-3">
                         <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 mr-2">
                            <span className={`w-2 h-2 rounded-full ${selectedPage?.is_published ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                            <span className="text-xs font-bold uppercase text-slate-400">{selectedPage?.is_published ? 'Live' : 'Draft'}</span>
                        </div>
                        <button onClick={() => handleSave(false)} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700"><Save size={16}/> Save Draft</button>
                        <Button onClick={() => handleSave(true)} isLoading={saving} className="!bg-indigo-600 hover:!bg-indigo-500 !py-2 !px-6 !text-sm !font-bold shadow-xl shadow-indigo-600/20"><Globe size={18} /> Publish Live</Button>
                    </div>
                )}
            </div>

            <div className="flex-1 min-h-0 flex gap-6">
                <div className="w-80 lg:w-96 shrink-0 flex flex-col bg-slate-900/40 rounded-3xl border border-white/5 overflow-hidden shadow-xl">
                    {activeTool === 'list' ? (
                        <div className="p-6 overflow-y-auto space-y-4">
                            <h3 className="text-white font-bold flex items-center gap-2"><Layers size={18}/> Manage Pages</h3>
                            {pages.map(page => (
                                <div key={page.id} onClick={() => setSelectedPage(page)} className={`p-4 rounded-2xl border transition-all cursor-pointer group ${selectedPage?.id === page.id ? 'bg-indigo-600/10 border-indigo-500/50' : 'bg-slate-800/50 border-slate-700 hover:border-slate-500'}`}>
                                    <div className="flex justify-between items-start">
                                        <h4 className="font-bold text-white truncate">{page.title}</h4>
                                        <button onClick={(e) => handleDelete(page.id, e)} className="text-slate-500 hover:text-red-400 p-1"><Trash2 size={16}/></button>
                                    </div>
                                    <div className="text-xs text-slate-500 mt-1 font-mono">/{page.slug}</div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col h-full overflow-y-auto p-6 space-y-6">
                             {!code ? (
                                <div className="space-y-6 animate-fade-in">
                                    <div className="bg-indigo-600/20 w-12 h-12 rounded-2xl flex items-center justify-center mb-2"><Sparkles className="text-indigo-400" size={24} /></div>
                                    <h3 className="text-xl font-bold text-white leading-tight">Build with AI</h3>
                                    <div className="space-y-4">
                                        <Input label="Page Title" placeholder="e.g. My New Startup" value={title} onChange={(e) => setTitle(e.target.value)} />
                                        <TextArea label="What is your site about?" placeholder="Describe the purpose, style, and content..." value={prompt} onChange={(e) => setPrompt(e.target.value)} className="min-h-[180px]" />
                                        <Button className="w-full !py-4" onClick={handleGenerate} isLoading={generating} disabled={!prompt || !title || generating}><Wand2 size={20} /> Build Page Now</Button>
                                    </div>
                                </div>
                             ) : (
                                <div className="space-y-6 animate-fade-in">
                                     <div className="bg-slate-800/80 rounded-2xl p-4 border border-slate-700">
                                        <h4 className="text-sm font-bold text-slate-400 mb-1">Page URL</h4>
                                        <div className="flex items-center gap-2 group">
                                            <code className="text-xs font-mono text-indigo-300 truncate">{liveUrl}</code>
                                            {selectedPage && (
                                                <button onClick={handleCopyPreview} className="text-slate-500 hover:text-white transition-colors"><LinkIcon size={14}/></button>
                                            )}
                                        </div>
                                     </div>
                                     <div className="pt-2">
                                        <label className="block text-sm font-bold text-white mb-3 flex items-center gap-2"><Sparkles size={16} className="text-purple-400"/> Refine Design</label>
                                        <TextArea value={refinePrompt} onChange={(e) => setRefinePrompt(e.target.value)} placeholder="e.g. Change the theme to dark mode, use green accents, add more hero text..." className="min-h-[140px] text-sm !bg-slate-950/50" />
                                        <Button variant="secondary" className="w-full mt-4 !py-3 font-bold border-indigo-500/20 hover:border-indigo-500/50" onClick={handleRefine} isLoading={generating} disabled={!refinePrompt || generating}><RefreshCw size={16} className="mr-2"/> Update Site</Button>
                                     </div>
                                     <div className="pt-8 border-t border-slate-800">
                                        <Button variant="ghost" className="w-full text-xs text-slate-500 hover:text-red-400" onClick={() => { setCode(''); setPrompt(''); resetForm(); }}><Trash2 size={14} className="mr-2"/> Discard & Start Over</Button>
                                     </div>
                                </div>
                             )}
                        </div>
                    )}
                </div>

                <div className="flex-1 bg-slate-950/50 rounded-[40px] border border-white/5 flex flex-col overflow-hidden shadow-inner relative group">
                     <div className="h-16 bg-slate-900/80 border-b border-white/5 flex items-center justify-between px-8 z-10">
                         <div className="flex gap-2">
                             <div className="w-3 h-3 rounded-full bg-slate-700"></div>
                             <div className="w-3 h-3 rounded-full bg-slate-700"></div>
                             <div className="w-3 h-3 rounded-full bg-slate-700"></div>
                         </div>
                         <div className="flex bg-slate-950/80 rounded-2xl p-1 gap-1 border border-white/5">
                             <button onClick={() => setDevice('desktop')} className={`p-2 rounded-xl transition-all ${device === 'desktop' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-500 hover:text-slate-300'}`}><Monitor size={16}/></button>
                             <button onClick={() => setDevice('tablet')} className={`p-2 rounded-xl transition-all ${device === 'tablet' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-500 hover:text-slate-300'}`}><Tablet size={16}/></button>
                             <button onClick={() => setDevice('mobile')} className={`p-2 rounded-xl transition-all ${device === 'mobile' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-500 hover:text-slate-300'}`}><Smartphone size={16}/></button>
                         </div>
                         <div className="w-20 flex justify-end">
                            {code && selectedPage?.is_published && (
                                <a href={liveUrl} target="_blank" className="p-2 text-slate-500 hover:text-white transition-colors" title="View Published Site"><ExternalLink size={20}/></a>
                            )}
                         </div>
                     </div>

                     <div className="flex-1 relative flex justify-center items-center p-8 overflow-hidden bg-[radial-gradient(circle_at_center,_rgba(99,102,241,0.05)_0%,_transparent_70%)]">
                        {!code ? (
                            <div className="flex flex-col items-center text-center animate-pulse">
                                <div className="w-24 h-24 rounded-3xl bg-indigo-500/10 flex items-center justify-center mb-6"><Monitor size={48} className="text-indigo-400/50" /></div>
                                <h3 className="text-xl font-bold text-slate-500">Live Preview Container</h3>
                                <p className="text-sm text-slate-600 max-w-xs mt-2">Generate a page to see the production-ready preview in real-time.</p>
                            </div>
                        ) : (
                             <div className={`transition-all duration-500 bg-white shadow-[0_0_100px_rgba(0,0,0,0.5)] overflow-hidden shrink-0 ring-1 ring-white/10 ${
                                device === 'mobile' ? 'w-[375px] h-[667px] rounded-[32px] border-[12px] border-slate-900' 
                                : device === 'tablet' ? 'w-[768px] h-[1024px] rounded-[24px] border-[12px] border-slate-900'
                                : 'w-full h-full rounded-none border-0'
                            }`}>
                               {generating && (
                                   <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm flex flex-col items-center justify-center z-50 animate-fade-in">
                                        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-2xl mb-4 animate-bounce"><Sparkles className="text-indigo-600" size={32} /></div>
                                        <p className="text-white font-bold tracking-widest text-sm uppercase">Updating Design...</p>
                                   </div>
                               )}
                               <iframe srcDoc={code} className="w-full h-full bg-white" title="Preview" sandbox="allow-scripts" />
                            </div>
                        )}
                     </div>
                </div>
            </div>
        </div>
    );
  };

  const ProfileView = () => {
    const [name, setName] = useState(profile?.name || '');
    const [saving, setSaving] = useState(false);
    useEffect(() => { if (profile?.name) setName(profile.name); }, [profile]);
    const handleUpdate = async () => {
        setSaving(true);
        try {
            const { error } = await supabase.from('users').update({ name }).eq('id', user.id);
            if(error) throw error;
            setProfile(prev => prev ? {...prev, name} : null);
        } catch (e) { console.error(e); } finally { setSaving(false); }
    };
    if (loadingProfile) return <div className="max-w-xl mx-auto animate-pulse"><div className="h-8 w-48 bg-slate-800 rounded mb-6"></div><Card><div className="space-y-6"><div className="flex items-center gap-4"><div className="w-20 h-20 rounded-full bg-slate-800"></div><div className="h-4 w-40 bg-slate-800 rounded"></div></div></div></Card></div>;
    return (
        <div className="max-w-xl mx-auto animate-fade-in">
            <h2 className="text-2xl font-bold text-white mb-6">Profile Settings</h2>
            <Card className="!bg-slate-900/40 border-white/5 shadow-2xl">
                <div className="space-y-8">
                    <div className="flex items-center gap-6">
                        <div className="w-24 h-24 rounded-[32px] bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-4xl font-black text-white shadow-2xl ring-4 ring-indigo-500/20">{profile?.name?.charAt(0) || 'U'}</div>
                        <div className="space-y-1"><div className="text-slate-500 text-xs font-bold uppercase tracking-widest">Connected Email</div><div className="text-white text-lg font-medium">{user.email}</div></div>
                    </div>
                    <div className="space-y-4">
                        <Input label="Display Name" value={name} onChange={(e) => setName(e.target.value)} disabled={saving} className="!bg-slate-950/50" />
                        <Button onClick={handleUpdate} isLoading={saving} className="w-full !py-4 font-bold shadow-indigo-600/10">Update Profile</Button>
                    </div>
                </div>
            </Card>
        </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 relative selection:bg-indigo-500/30">
      <Sidebar currentView={currentView} setView={setView} onLogout={onLogout} isOpen={isSidebarOpen} setIsOpen={setSidebarOpen} />
      <div className="lg:ml-72 min-h-screen flex flex-col">
        <header className="h-20 border-b border-white/5 bg-[#020617]/80 backdrop-blur-2xl sticky top-0 z-40 px-8 flex items-center justify-between">
          <button className="lg:hidden text-slate-400 hover:text-white" onClick={() => setSidebarOpen(true)}><Menu /></button>
          <div className="flex-1"></div>
          <div className="flex items-center gap-6">
            <button className="text-slate-400 hover:text-white transition-colors"><Bell size={22} /></button>
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center text-sm font-bold text-indigo-400 shadow-lg">{profile?.name?.charAt(0) || 'U'}</div>
          </div>
        </header>
        <main className="flex-1 p-8 lg:p-12 overflow-y-auto">
          {currentView === AppView.DASHBOARD_HOME && <HomeView />}
          {currentView === AppView.DASHBOARD_CONTENT && <ContentView />}
          {currentView === AppView.DASHBOARD_COACHING && <CoachingView />}
          {currentView === AppView.DASHBOARD_LANDING_BUILDER && <LandingBuilderView />}
          {currentView === AppView.DASHBOARD_CHATBOT && <ChatbotView />}
          {currentView === AppView.DASHBOARD_HISTORY && <div className="max-w-4xl mx-auto animate-fade-in"><h2 className="text-3xl font-bold mb-8 text-white">Activity Logs</h2><HistoryView /></div>}
          {currentView === AppView.DASHBOARD_PROFILE && <ProfileView />}
        </main>
      </div>
    </div>
  );
};
