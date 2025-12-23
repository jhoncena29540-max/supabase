
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Sidebar } from '../components/Sidebar';
import { AppView, UserProfile } from '../types';
import { 
  Menu, Bell, Sparkles, Trash2, ChevronDown, Loader2, AlertTriangle, 
  ExternalLink, Send, Bot, User, Share2, Youtube, Instagram, Facebook, 
  Music2, Calendar, Clock, PlusCircle, PenLine, Info, History as LogsIcon,
  Mic
} from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input, TextArea } from '../components/Input';
import { generateContentScript, generateCoachingAdvice, getChatResponse } from '../lib/gemini';
import { Content } from "@google/genai";

interface DashboardProps {
  user: any; 
  onLogout: () => void;
}

const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    scheduled: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    published: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    failed: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    publishing: 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse',
    active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    disconnected: 'bg-slate-800 text-slate-500 border-slate-700',
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${styles[status.toLowerCase()] || 'bg-slate-800 text-slate-400'}`}>
      {status}
    </span>
  );
};

export const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
  const [currentView, setView] = useState<AppView>(AppView.DASHBOARD_HOME);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data } = await supabase.from('users').select('*').eq('id', user.id).single();
      if (data) setProfile(data);
    };
    fetchProfile();
  }, [user]);

  // --- SOCIAL SCHEDULER ---
  const SocialSchedulerView = () => {
    const [activeTab, setActiveTab] = useState<'accounts' | 'composer' | 'queue' | 'logs'>('accounts');
    const [accounts, setAccounts] = useState<any[]>([]);
    const [posts, setPosts] = useState<any[]>([]);
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Form
    const [selectedAccountId, setSelectedAccountId] = useState('');
    const [postContent, setPostContent] = useState('');
    const [scheduleTime, setScheduleTime] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
      fetchSocialData();
      const params = new URLSearchParams(window.location.search);
      if (params.get('auth_success') === 'true') {
        window.history.replaceState({}, document.title, window.location.pathname);
        fetchSocialData();
      }
    }, []);

    const fetchSocialData = async () => {
      setLoading(true);
      try {
        const { data: accs } = await supabase.from('social_accounts').select('*').eq('user_id', user.id);
        const { data: pst } = await supabase.from('social_posts').select('*, social_accounts(account_name, platform, avatar_url)').eq('user_id', user.id).order('scheduled_at', { ascending: true });
        const { data: lgs } = await supabase.from('social_publish_logs').select('*, social_posts(content, platform_post_url)').order('created_at', { ascending: false });
        if (accs) setAccounts(accs);
        if (pst) setPosts(pst);
        if (lgs) setLogs(lgs);
      } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const handleOAuth = (platform: string) => {
      const functionUrl = `https://hckjalcigpjdqcqhglhl.supabase.co/functions/v1/social-auth-redirect`;
      const redirectUri = encodeURIComponent(`${window.location.origin}${window.location.pathname}`);
      window.location.href = `${functionUrl}?platform=${platform.toLowerCase()}&user_id=${user.id}&redirect_uri=${redirectUri}`;
    };

    const handleSchedule = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedAccountId || !postContent || !scheduleTime) return;
      setIsSubmitting(true);
      try {
        const { error } = await supabase.from('social_posts').insert({
          user_id: user.id,
          account_id: selectedAccountId,
          content: postContent,
          scheduled_at: new Date(scheduleTime).toISOString(),
          status: 'scheduled'
        });
        if (error) throw error;
        setPostContent('');
        setScheduleTime('');
        await fetchSocialData();
        setActiveTab('queue');
      } catch (err) { alert("Failed to schedule post."); } finally { setIsSubmitting(false); }
    };

    const getIcon = (p: string) => {
      switch (p.toLowerCase()) {
        case 'youtube': return <Youtube size={20} className="text-red-500" />;
        case 'facebook': return <Facebook size={20} className="text-blue-600" />;
        case 'instagram': return <Instagram size={20} className="text-pink-500" />;
        case 'tiktok': return <Music2 size={20} className="text-emerald-400" />;
        default: return <Share2 size={20} />;
      }
    };

    return (
      <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-1">
            <h2 className="text-4xl font-black text-white flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-pink-500/20 text-pink-400 shadow-lg shadow-pink-500/10">
                <Share2 size={32} />
              </div>
              Social Scheduler
            </h2>
            <p className="text-slate-500 font-medium ml-1">Real-time multi-platform publishing engine.</p>
          </div>
          <div className="flex bg-slate-900/60 p-1.5 rounded-[20px] border border-white/5 backdrop-blur-xl">
            {(['accounts', 'composer', 'queue', 'logs'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 py-2.5 rounded-[14px] text-xs font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
                {tab}
              </button>
            ))}
          </div>
        </header>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Syncing API Streams...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {activeTab === 'accounts' && (
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {['YouTube', 'Facebook', 'Instagram', 'TikTok'].map(platform => {
                  const acc = accounts.find(a => a.platform.toLowerCase() === platform.toLowerCase());
                  return (
                    <Card key={platform} className={`relative overflow-hidden transition-all duration-500 hover:translate-y-[-4px] ${acc ? 'border-indigo-500/30 bg-indigo-500/[0.03]' : 'border-white/5'}`}>
                      <div className="flex items-center justify-between mb-8">
                        <div className={`p-3.5 rounded-2xl ${acc ? 'bg-indigo-500/20' : 'bg-slate-800'}`}>
                          {getIcon(platform)}
                        </div>
                        <StatusBadge status={acc ? acc.status : 'Disconnected'} />
                      </div>
                      {acc ? (
                        <div className="space-y-6">
                          <div className="flex items-center gap-4">
                            <img src={acc.avatar_url} className="w-14 h-14 rounded-2xl bg-slate-800 border-2 border-white/5 shadow-xl" alt="DP" />
                            <div className="min-w-0">
                              <p className="text-white font-black truncate text-lg leading-tight">{acc.account_name}</p>
                              <p className="text-slate-500 text-sm font-medium">@{acc.username}</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/5">
                            <div className="space-y-1">
                              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Followers</p>
                              <p className="text-white font-black text-xl">{(acc.metrics?.followers || 0).toLocaleString()}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Engmnt</p>
                              <p className="text-white font-black text-xl">{(acc.metrics?.engagement || 0).toFixed(1)}%</p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          <p className="text-sm text-slate-400 font-medium">Connect your official {platform} account via secure OAuth.</p>
                          <Button onClick={() => handleOAuth(platform)} className="w-full !py-4 font-black">Authorize</Button>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}

            {activeTab === 'composer' && (
              <div className="grid lg:grid-cols-3 gap-8 items-start">
                <Card className="lg:col-span-2 shadow-2xl bg-slate-800/30 backdrop-blur-3xl">
                  <form onSubmit={handleSchedule} className="space-y-8">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Destination</label>
                      <select value={selectedAccountId} onChange={(e) => setSelectedAccountId(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-5 py-4 text-white font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all cursor-pointer" required>
                        <option value="">Choose active account...</option>
                        {accounts.filter(a => a.status === 'active').map(acc => (
                          <option key={acc.id} value={acc.id}>{acc.platform.toUpperCase()} — {acc.account_name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Post Content</label>
                      <TextArea placeholder="Paste your AI-generated script here..." rows={8} value={postContent} onChange={(e) => setPostContent(e.target.value)} className="!bg-slate-900 !border-slate-700 font-medium" required />
                    </div>
                    <div className="grid md:grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-2"><Calendar size={12} className="text-indigo-500" /> Schedule</label>
                        <input type="datetime-local" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-5 py-4 text-white font-bold focus:ring-2 focus:ring-indigo-500 outline-none" required />
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-2"><PlusCircle size={12} className="text-indigo-500" /> Media</label>
                        <div className="h-[58px] border-2 border-dashed border-slate-700 rounded-2xl flex items-center justify-center text-slate-500 text-xs font-bold uppercase tracking-widest hover:border-indigo-500 transition-all cursor-pointer bg-slate-900/40">Select Assets</div>
                      </div>
                    </div>
                    <div className="pt-6 flex gap-4">
                      <Button type="submit" isLoading={isSubmitting} className="flex-1 !py-5 text-lg font-black shadow-2xl shadow-indigo-600/20"><Send size={20} className="mr-2" /> Schedule Now</Button>
                      <Button variant="secondary" type="button" className="!py-5 px-8 font-black uppercase tracking-widest text-xs border-white/5">Save Draft</Button>
                    </div>
                  </form>
                </Card>
                <div className="space-y-6">
                  <Card className="bg-gradient-to-br from-indigo-600/20 to-purple-600/20 border-white/10 p-8">
                    <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mb-6 text-white shadow-xl"><Bot size={30} /></div>
                    <h3 className="text-xl font-black text-white mb-3">Optimize Hooks</h3>
                    <p className="text-slate-400 text-sm font-medium mb-6 leading-relaxed">Let AI refine your caption for maximum reach on specifically chosen platforms.</p>
                    <Button variant="secondary" className="w-full font-black border-white/10" onClick={() => setView(AppView.DASHBOARD_CHATBOT)}>Analyze Script</Button>
                  </Card>
                </div>
              </div>
            )}

            {activeTab === 'queue' && (
              <Card className="!p-0 overflow-hidden border-white/5 shadow-2xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-900 border-b border-white/5">
                        <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Platform</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Content</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Time</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Status</th>
                        <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {posts.length === 0 ? (
                        <tr><td colSpan={5} className="px-8 py-20 text-center text-slate-600 font-bold uppercase tracking-widest text-sm">No pending posts.</td></tr>
                      ) : (
                        posts.map(post => (
                          <tr key={post.id} className="hover:bg-white/[0.01] transition-colors group">
                            <td className="px-8 py-6">
                              <div className="flex items-center gap-4">
                                <img src={post.social_accounts?.avatar_url} className="w-10 h-10 rounded-xl bg-slate-800" alt="Av" />
                                <div className="flex flex-col">
                                  <span className="text-sm font-black text-white">{post.social_accounts?.account_name}</span>
                                  <span className="text-[10px] text-indigo-400 font-black uppercase tracking-widest">{post.social_accounts?.platform}</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-8 py-6"><p className="text-xs text-slate-300 font-medium line-clamp-1 max-w-xs">{post.content}</p></td>
                            <td className="px-8 py-6">
                              <div className="flex items-center gap-2 text-slate-400 text-xs font-bold">
                                <Clock size={12} className="text-indigo-500" /> {new Date(post.scheduled_at).toLocaleString()}
                              </div>
                            </td>
                            <td className="px-8 py-6"><StatusBadge status={post.status} /></td>
                            <td className="px-8 py-6 text-right">
                              <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-xl transition-all"><PenLine size={16}/></button>
                                <button className="p-2.5 bg-slate-800 hover:bg-red-500/20 text-red-400 rounded-xl transition-all"><Trash2 size={16}/></button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {activeTab === 'logs' && (
              <div className="space-y-5">
                {logs.length === 0 ? (
                  <div className="text-center py-24 bg-slate-900/30 rounded-[40px] border-2 border-dashed border-white/5">
                    <LogsIcon size={56} className="text-slate-800 mx-auto mb-6" />
                    <p className="text-slate-500 font-black uppercase tracking-[0.3em] text-xs">Audit trail empty.</p>
                  </div>
                ) : (
                  logs.map(log => (
                    <Card key={log.id} className="flex flex-col md:flex-row md:items-center justify-between gap-8 hover:border-indigo-500/20 transition-all border-white/5 group bg-slate-800/20 shadow-xl">
                      <div className="flex-1 space-y-4">
                        <div className="flex items-center gap-4">
                          <StatusBadge status={log.status} />
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{new Date(log.created_at).toLocaleString()}</span>
                        </div>
                        <p className="text-sm text-slate-300 font-medium line-clamp-2 italic font-mono bg-black/30 p-4 rounded-2xl border border-white/5">"{log.social_posts?.content}"</p>
                        {log.error_details && <div className="flex items-center gap-2 text-xs font-bold text-red-400 bg-red-400/5 p-3 rounded-xl border border-red-400/10"><AlertTriangle size={14} /> Error: {log.error_details} (HTTP {log.http_status})</div>}
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        {log.social_posts?.platform_post_url && <a href={log.social_posts.platform_post_url} target="_blank" className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-2xl text-xs font-black text-white shadow-xl transition-all"><ExternalLink size={16} /> View Post</a>}
                        <button className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 rounded-2xl text-xs font-black text-slate-300 border border-white/5 transition-all"><Info size={16} className="text-indigo-400" /> API Trace</button>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // --- VIEWS ---

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
        <Card className="bg-gradient-to-br from-pink-900/40 to-slate-800/40 border-pink-500/20 group hover:border-pink-500/40 transition-all">
          <h3 className="text-lg font-semibold text-white mb-2">Social Scheduler</h3>
          <p className="text-sm text-slate-400 mb-4">Plan and publish your content across all socials.</p>
          <Button onClick={() => setView(AppView.DASHBOARD_SOCIAL)} variant="secondary" className="w-full">Open Scheduler</Button>
        </Card>
      </div>
    </div>
  );

  const ContentView = () => {
    const [topic, setTopic] = useState('');
    const [format, setFormat] = useState<'speech' | 'landing_page' | 'presentation'>('speech');
    const [result, setResult] = useState('');
    const [loading, setLoading] = useState(false);

    const handleGenerate = async () => {
      if (!topic) return;
      setLoading(true);
      try {
        const text = await generateContentScript(topic, format);
        setResult(text || '');
        await supabase.from('ai_requests').insert({ user_id: user.id, request_type: 'content', prompt: topic, response: text || '' });
      } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Sparkles className="text-purple-400" /> Content Studio</h2>
        <Card className="space-y-4">
          <div className="flex gap-2">
            {(['speech', 'landing_page', 'presentation'] as const).map(f => (
              <button key={f} onClick={() => setFormat(f)} className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all ${format === f ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>{f.replace('_', ' ')}</button>
            ))}
          </div>
          <Input label="Topic" value={topic} onChange={e => setTopic(e.target.value)} placeholder="Enter a topic..." />
          <Button onClick={handleGenerate} isLoading={loading} disabled={!topic}>Generate Script</Button>
        </Card>
        {result && <Card className="prose prose-invert max-w-none text-sm text-slate-300 whitespace-pre-wrap">{result}</Card>}
      </div>
    );
  };

  const CoachingView = () => {
    const [input, setInput] = useState('');
    const [advice, setAdvice] = useState('');
    const [loading, setLoading] = useState(false);

    const handleCoach = async () => {
      if (!input) return;
      setLoading(true);
      try {
        const text = await generateCoachingAdvice(input);
        setAdvice(text || '');
      } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Mic size={24} className="text-indigo-400" /> Speak Coaching</h2>
        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="flex flex-col gap-4">
            <TextArea label="Your Speech" value={input} onChange={e => setInput(e.target.value)} rows={12} placeholder="Paste draft here..." className="flex-1" />
            <Button onClick={handleCoach} isLoading={loading} disabled={!input}>Analyze Delivery</Button>
          </Card>
          <Card className="bg-slate-900/50">
             {advice ? <div className="prose prose-invert max-w-none text-sm text-slate-300 whitespace-pre-wrap">{advice}</div> : <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center px-12 italic">Enter text on the left to receive AI coaching feedback.</div>}
          </Card>
        </div>
      </div>
    );
  };

  const ChatbotView = () => {
    const [messages, setMessages] = useState<Content[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const endRef = useRef<HTMLDivElement>(null);

    useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    const handleSend = async (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!input.trim() || loading) return;
      const userMsg = input;
      setInput('');
      setLoading(true);
      const hist = [...messages, { role: 'user', parts: [{ text: userMsg }] }];
      setMessages(hist);
      try {
        const res = await getChatResponse(hist, userMsg);
        setMessages(prev => [...prev, { role: 'model', parts: [{ text: res || "Could not generate response." }] }]);
      } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    return (
      <div className="h-[calc(100vh-140px)] max-w-4xl mx-auto flex flex-col">
        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2"><Bot className="text-emerald-400" /> AI Assistant</h2>
        <Card className="flex-1 flex flex-col overflow-hidden !p-0">
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-900/50">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-4 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${m.role === 'user' ? 'bg-indigo-600' : 'bg-emerald-600'}`}>
                  {m.role === 'user' ? <User size={20} /> : <Bot size={20} />}
                </div>
                <div className={`max-w-[80%] p-4 rounded-2xl ${m.role === 'user' ? 'bg-indigo-600/20 border border-indigo-500/20 text-indigo-100' : 'bg-slate-800 border border-slate-700 text-slate-200'}`}>
                  <div className="text-sm whitespace-pre-wrap">{m.parts[0].text}</div>
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>
          <form onSubmit={handleSend} className="p-4 bg-slate-900 border-t border-white/5 relative">
            <input type="text" value={input} onChange={e => setInput(e.target.value)} placeholder="Type a message..." className="w-full bg-slate-950 border border-slate-700 rounded-xl py-4 pl-5 pr-14 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none" />
            <button type="submit" disabled={!input.trim() || loading} className="absolute right-6 top-1/2 -translate-y-1/2 p-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg disabled:opacity-50"><Send size={18} /></button>
          </form>
        </Card>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200">
      <Sidebar currentView={currentView} setView={setView} onLogout={onLogout} isOpen={isSidebarOpen} setIsOpen={setSidebarOpen} />
      <div className="lg:ml-72 min-h-screen flex flex-col">
        <header className="h-20 border-b border-white/5 bg-[#020617]/80 backdrop-blur-2xl sticky top-0 z-40 px-8 flex items-center justify-between">
          <button className="lg:hidden text-slate-400 hover:text-white" onClick={() => setSidebarOpen(true)}><Menu /></button>
          <div className="flex-1"></div>
          <div className="flex items-center gap-6">
            <button className="text-slate-400 hover:text-white transition-colors"><Bell size={22} /></button>
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center text-sm font-bold text-indigo-400">{profile?.name?.charAt(0) || 'U'}</div>
          </div>
        </header>
        <main className="flex-1 p-8 lg:p-12">
          {currentView === AppView.DASHBOARD_HOME && <HomeView />}
          {currentView === AppView.DASHBOARD_CONTENT && <ContentView />}
          {currentView === AppView.DASHBOARD_COACHING && <CoachingView />}
          {currentView === AppView.DASHBOARD_CHATBOT && <ChatbotView />}
          {currentView === AppView.DASHBOARD_SOCIAL && <SocialSchedulerView />}
          {currentView === AppView.DASHBOARD_LANDING_BUILDER && <div className="text-center py-20 text-slate-500 font-black uppercase tracking-widest text-xs">Landing Builder maintained in App.tsx</div>}
          {currentView === AppView.DASHBOARD_PROFILE && <div className="text-center py-20 text-slate-500 font-black uppercase tracking-widest text-xs">Profile Settings Section</div>}
          {currentView === AppView.DASHBOARD_CONTACT && <div className="text-center py-20 text-slate-500 font-black uppercase tracking-widest text-xs">Support Contact Channel</div>}
        </main>
      </div>
    </div>
  );
};
