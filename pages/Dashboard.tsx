
import React, { useState, useEffect, useRef } from 'react';
import { supabase, SUPABASE_URL, SUPABASE_KEY } from '../lib/supabase';
import { Sidebar } from '../components/Sidebar';
import { AppView, UserProfile } from '../types';
import { 
  Menu, Bell, Sparkles, Loader2, Send, Bot, User, Share2, Youtube, Instagram, 
  History as HistoryIcon, Mic, Radio, Power, AudioLines, Globe, Calendar, Clock, PlusCircle, 
  AlertCircle, X, CheckCircle2, Link as LinkIcon, Trash2, ExternalLink
} from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input, TextArea } from '../components/Input';
import { generateContentScript, generateCoachingAdvice, getChatResponse } from '../lib/gemini';
import { GoogleGenAI, LiveServerMessage, Modality, Content } from "@google/genai";

interface DashboardProps {
  user: any; 
  onLogout: () => void;
}

// @google/genai compliant Audio Utils
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
  const [currentView, setView] = useState<AppView>(AppView.DASHBOARD_HOME);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authStatus, setAuthStatus] = useState<'success' | 'error' | null>(null);
  const [socialAccounts, setSocialAccounts] = useState<any[]>([]);
  const [isLoadingSocial, setIsLoadingSocial] = useState(false);
  const [scheduledPosts, setScheduledPosts] = useState<any[]>([]);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data } = await supabase.from('users').select('*').eq('id', user.id).single();
      if (data) setProfile(data);
    };
    fetchProfile();
    fetchSocialAccounts();
    fetchScheduledPosts();

    const checkAuthStatus = () => {
      const searchParams = new URLSearchParams(window.location.search);
      const hashParts = window.location.hash.split('?');
      const hashParams = new URLSearchParams(hashParts[1] || "");

      if (searchParams.get('auth_success') === 'true' || hashParams.get('auth_success') === 'true') {
        setAuthStatus('success');
        const cleanHash = hashParts[0];
        window.history.replaceState({}, document.title, window.location.origin + window.location.pathname + cleanHash);
        setTimeout(() => setAuthStatus(null), 6000);
        fetchSocialAccounts();
      } else if (searchParams.get('auth_error') || hashParams.get('auth_error')) {
        setAuthStatus('error');
        setTimeout(() => setAuthStatus(null), 6000);
      }
    };
    checkAuthStatus();
  }, [user]);

  const fetchSocialAccounts = async () => {
    setIsLoadingSocial(true);
    try {
      const { data } = await supabase.from('social_accounts').select('*').eq('user_id', user.id);
      if (data) setSocialAccounts(data);
    } catch (err) {
      console.error("Error fetching social accounts:", err);
    } finally {
      setIsLoadingSocial(false);
    }
  };

  const fetchScheduledPosts = async () => {
    try {
      const { data } = await supabase
        .from('social_posts')
        .select('*, social_accounts(account_name, platform)')
        .eq('user_id', user.id)
        .order('scheduled_at', { ascending: true });
      if (data) setScheduledPosts(data);
    } catch (err) {
      console.error("Error fetching scheduled posts:", err);
    }
  };

  const deletePost = async (id: string) => {
    const { error } = await supabase.from('social_posts').delete().eq('id', id);
    if (!error) fetchScheduledPosts();
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
        <Card className="bg-gradient-to-br from-rose-900/40 to-slate-800/40 border-rose-500/20 group hover:border-rose-500/40 transition-all">
          <h3 className="text-lg font-semibold text-white mb-2">Live Session</h3>
          <p className="text-sm text-slate-400 mb-4">Start a real-time conversational coaching session.</p>
          <Button onClick={() => setView(AppView.DASHBOARD_LIVE_COACHING)} className="w-full">Start Live</Button>
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
        <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Mic size={24} className="text-indigo-400" /> Analysis Lab</h2>
        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="flex flex-col gap-4">
            <TextArea label="Speech Draft" value={input} onChange={e => setInput(e.target.value)} rows={12} placeholder="Paste draft here..." className="flex-1" />
            <Button onClick={handleCoach} isLoading={loading} disabled={!input}>Analyze Content</Button>
          </Card>
          <Card className="bg-slate-900/50 overflow-y-auto max-h-[600px]">
             {advice ? <div className="prose prose-invert max-w-none text-sm text-slate-300 whitespace-pre-wrap">{advice}</div> : <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center px-12 italic">Enter text on the left to receive deep analysis of your written content.</div>}
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

      const userMessage = input.trim();
      setInput('');
      setMessages(prev => [...prev, { role: 'user', parts: [{ text: userMessage }] }]);
      setLoading(true);

      try {
        const response = await getChatResponse(messages, userMessage);
        setMessages(prev => [...prev, { role: 'model', parts: [{ text: response || 'No response.' }] }]);
      } catch (error) {
        console.error("Chat error:", error);
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="max-w-4xl mx-auto h-[calc(100vh-12rem)] flex flex-col gap-4">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Bot size={24} className="text-green-400" /> AI Speaking Assistant</h2>
        <Card className="flex-1 flex flex-col p-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4 opacity-50">
                <Bot size={48} />
                <p>Ask me anything about public speaking or delivery!</p>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${m.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300'}`}>
                  {m.parts[0].text}
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>
          <form onSubmit={handleSend} className="p-4 border-t border-white/5 bg-slate-900/50 flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <Button type="submit" disabled={!input.trim() || loading} className="!p-2.5">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send size={20} />}
            </Button>
          </form>
        </Card>
      </div>
    );
  };

  const LiveCoachingView = () => {
    const [isActive, setIsActive] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [transcription, setTranscription] = useState<{user: string, ai: string}[]>([]);
    
    const sessionRef = useRef<any>(null);
    const audioContextInRef = useRef<AudioContext | null>(null);
    const audioContextOutRef = useRef<AudioContext | null>(null);
    const nextStartTimeRef = useRef(0);
    const sourcesRef = useRef(new Set<AudioBufferSourceNode>());
    
    const currentInputTransRef = useRef('');
    const currentOutputTransRef = useRef('');

    const startSession = async () => {
      setIsConnecting(true);
      setError(null);
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        audioContextInRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        audioContextOutRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        const sessionPromise = ai.live.connect({
          model: 'gemini-2.5-flash-native-audio-preview-09-2025',
          callbacks: {
            onopen: () => {
              setIsConnecting(false);
              setIsActive(true);
              const source = audioContextInRef.current!.createMediaStreamSource(stream);
              const scriptProcessor = audioContextInRef.current!.createScriptProcessor(4096, 1, 1);
              
              scriptProcessor.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);
                const l = inputData.length;
                const int16 = new Int16Array(l);
                for (let i = 0; i < l; i++) int16[i] = inputData[i] * 32768;
                const pcmBlob = {
                  data: encode(new Uint8Array(int16.buffer)),
                  mimeType: 'audio/pcm;rate=16000',
                };
                sessionPromise.then(session => {
                  session.sendRealtimeInput({ media: pcmBlob });
                });
              };
              source.connect(scriptProcessor);
              scriptProcessor.connect(audioContextInRef.current!.destination);
            },
            onmessage: async (message: LiveServerMessage) => {
              const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
              if (base64Audio && audioContextOutRef.current) {
                const ctx = audioContextOutRef.current;
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
                const buffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
                const source = ctx.createBufferSource();
                source.buffer = buffer;
                source.connect(ctx.destination);
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += buffer.duration;
                sourcesRef.current.add(source);
                source.onended = () => sourcesRef.current.delete(source);
              }
              if (message.serverContent?.inputTranscription) {
                currentInputTransRef.current += message.serverContent.inputTranscription.text;
              }
              if (message.serverContent?.outputTranscription) {
                currentOutputTransRef.current += message.serverContent.outputTranscription.text;
              }
              if (message.serverContent?.turnComplete) {
                setTranscription(prev => [...prev, { user: currentInputTransRef.current, ai: currentOutputTransRef.current }]);
                currentInputTransRef.current = '';
                currentOutputTransRef.current = '';
              }
              if (message.serverContent?.interrupted) {
                sourcesRef.current.forEach(s => s.stop());
                sourcesRef.current.clear();
                nextStartTimeRef.current = 0;
              }
            },
            onerror: (e) => setError("Connection Error: " + e),
            onclose: () => setIsActive(false),
          },
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
            systemInstruction: "You are a friendly and expert public speaking coach. Listen to the user speak and provide encouraging, constructive feedback in real-time.",
            inputAudioTranscription: {},
            outputAudioTranscription: {}
          }
        });
        sessionRef.current = await sessionPromise;
      } catch (err: any) {
        setError(err.message || "Failed to start live session");
        setIsConnecting(false);
      }
    };

    const stopSession = () => {
      sessionRef.current?.close();
      audioContextInRef.current?.close();
      audioContextOutRef.current?.close();
      setIsActive(false);
    };

    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Radio className="text-rose-500" /> Live AI Coach</h2>
          {!isActive ? (
            <Button onClick={startSession} isLoading={isConnecting} className="bg-rose-600 hover:bg-rose-500">
              <Power size={20} /> Start Session
            </Button>
          ) : (
            <Button onClick={stopSession} variant="danger">
              <X size={20} /> End Session
            </Button>
          )}
        </header>
        <div className="grid lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1 flex flex-col items-center justify-center p-12 text-center space-y-6">
            <div className={`w-32 h-32 rounded-full border-4 flex items-center justify-center transition-all ${isActive ? 'border-rose-500 animate-pulse bg-rose-500/10' : 'border-slate-800 bg-slate-900/50'}`}>
              <Mic size={48} className={isActive ? 'text-rose-500' : 'text-slate-700'} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">{isActive ? 'Coach is Listening...' : 'Session Inactive'}</h3>
              <p className="text-sm text-slate-500 mt-1">{isActive ? 'Speak naturally to get feedback' : 'Click start to begin'}</p>
            </div>
          </Card>
          <Card className="lg:col-span-2 bg-slate-900/50 flex flex-col min-h-[400px]">
            <div className="p-4 border-b border-white/5 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500">
              <AudioLines size={14} /> Live Transcription
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {transcription.map((t, i) => (
                <div key={i} className="space-y-2">
                  <p className="text-indigo-400 text-sm font-medium">You: <span className="text-slate-300 font-normal">{t.user}</span></p>
                  <p className="text-rose-400 text-sm font-medium">Coach: <span className="text-slate-300 font-normal">{t.ai}</span></p>
                </div>
              ))}
              {isActive && transcription.length === 0 && <div className="text-slate-600 italic">Listening for speech...</div>}
            </div>
          </Card>
        </div>
        {error && <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm">{error}</div>}
      </div>
    );
  };

  const SocialView = () => {
    const [content, setContent] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [isScheduling, setIsScheduling] = useState(false);

    /**
     * FIX: Use lowercase 'apikey' for the Supabase Gateway.
     */
    const handleConnectYouTube = () => {
      const currentUrl = encodeURIComponent(window.location.origin + window.location.pathname + window.location.hash);
      const startUrl = `${SUPABASE_URL}/functions/v1/bright-responder?platform=youtube&user_id=${user.id}&redirect_uri=${currentUrl}&apikey=${SUPABASE_KEY}`;
      window.location.href = startUrl;
    };

    const handleSchedulePost = async () => {
      if (!content || !date || !time || socialAccounts.length === 0) {
        alert("Please provide content, date, time and ensure you have linked accounts.");
        return;
      }
      setIsScheduling(true);
      const scheduledAt = new Date(`${date}T${time}`).toISOString();
      
      try {
        const postsToInsert = socialAccounts.map(acc => ({
          user_id: user.id,
          account_id: acc.id,
          content: content,
          scheduled_at: scheduledAt,
          status: 'scheduled'
        }));

        const { error } = await supabase.from('social_posts').insert(postsToInsert);
        if (error) throw error;
        
        setContent('');
        setDate('');
        setTime('');
        fetchScheduledPosts();
        alert("Posts scheduled successfully!");
      } catch (err: any) {
        console.error("Scheduling error:", err);
        alert("Failed to schedule posts: " + err.message);
      } finally {
        setIsScheduling(false);
      }
    };

    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
        <header className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Share2 size={24} className="text-pink-500" /> Social Scheduler</h2>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-slate-900/50 px-3 py-1.5 rounded-full border border-white/5">
            <LinkIcon size={12} /> {socialAccounts.length} Connected
          </div>
        </header>

        {authStatus === 'success' && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl flex items-center gap-3 animate-slide-down">
            <CheckCircle2 size={20} />
            <p className="text-sm font-medium">YouTube account successfully connected!</p>
            <button onClick={() => setAuthStatus(null)} className="ml-auto text-emerald-400/50 hover:text-emerald-400"><X size={16} /></button>
          </div>
        )}

        {authStatus === 'error' && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center gap-3 animate-slide-down">
            <AlertCircle size={20} />
            <p className="text-sm font-medium">OAuth Connection Failed. Check console or whitelist URIs.</p>
            <button onClick={() => setAuthStatus(null)} className="ml-auto text-red-400/50 hover:text-red-400"><X size={16} /></button>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="space-y-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2"><PlusCircle size={18} className="text-indigo-400" /> Create New Content</h3>
              <TextArea 
                label="Post Draft" 
                placeholder="What are we talking about today?" 
                rows={6} 
                className="bg-slate-950/50"
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <Input label="Schedule Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <Input label="Time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
                </div>
              </div>
              <Button 
                className="w-full !py-4 font-bold uppercase tracking-widest text-xs" 
                onClick={handleSchedulePost}
                isLoading={isScheduling}
                disabled={socialAccounts.length === 0}
              >
                <Calendar size={18} className="mr-2" /> Schedule For All Platforms
              </Button>
            </Card>

            <Card className="bg-slate-900/20 border-white/5">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-6">Queue Status</h3>
              <div className="space-y-4">
                {scheduledPosts.length === 0 ? (
                  <div className="text-center py-8 text-slate-600 italic text-sm">No scheduled posts in the queue.</div>
                ) : (
                  scheduledPosts.map(post => (
                    <div key={post.id} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 group hover:border-white/10 transition-all flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`p-1 rounded bg-slate-800 ${post.social_accounts?.platform === 'youtube' ? 'text-red-500' : 'text-blue-500'}`}>
                            {post.social_accounts?.platform === 'youtube' ? <Youtube size={14} /> : <Share2 size={14} />}
                          </span>
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{post.social_accounts?.platform} • {post.status}</span>
                        </div>
                        <p className="text-sm text-white line-clamp-1">{post.content}</p>
                        <p className="text-[10px] text-slate-500 font-medium">Scheduled for: {new Date(post.scheduled_at).toLocaleString()}</p>
                        {post.platform_post_url && (
                          <a href={post.platform_post_url} target="_blank" rel="noreferrer" className="text-indigo-400 text-[10px] font-bold flex items-center gap-1 hover:underline">
                             View Post <ExternalLink size={10} />
                          </a>
                        )}
                      </div>
                      <button onClick={() => deletePost(post.id)} className="p-2 text-slate-600 hover:text-red-500 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="bg-gradient-to-br from-red-500/10 to-slate-900/50 border-red-500/20">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-red-500/20 flex items-center justify-center text-red-500"><Youtube size={24} /></div>
                <div>
                  <h3 className="font-black text-white leading-none">YouTube</h3>
                  <p className="text-xs text-slate-500 mt-1">Video distribution</p>
                </div>
              </div>
              <Button 
                variant="secondary" 
                className="w-full !py-3 !text-xs font-black uppercase tracking-widest border-red-500/20 hover:bg-red-500/10"
                onClick={handleConnectYouTube}
              >
                Connect Account
              </Button>
            </Card>
            
            <Card className="bg-slate-900/50 border-white/5">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-6">Linked Accounts</h3>
              <div className="space-y-4">
                {isLoadingSocial ? (
                  <div className="flex flex-col items-center justify-center py-6 text-slate-600"><Loader2 className="animate-spin mb-2" /><span className="text-xs">Loading...</span></div>
                ) : socialAccounts.length > 0 ? (
                  socialAccounts.map(acc => (
                    <div key={acc.id} className="flex items-center gap-3 p-2 rounded-xl bg-white/5 border border-white/5">
                       {acc.avatar_url && <img src={acc.avatar_url} className="w-8 h-8 rounded-lg" alt="" />}
                       <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">{acc.account_name}</p>
                          <p className="text-[10px] text-slate-500 uppercase tracking-tighter">{acc.platform}</p>
                       </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-slate-600 text-xs italic">No accounts linked.</div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  };

  const ProfileView = () => (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <header className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">My Profile</h2>
        <p className="text-slate-400">Manage your account settings and preferences.</p>
      </header>
      
      <Card className="space-y-8">
        <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
          <div className="relative group">
            <div className="w-32 h-32 rounded-3xl bg-slate-900 border-2 border-slate-800 flex items-center justify-center overflow-hidden transition-all duration-300 group-hover:border-indigo-500/50">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <User size={48} className="text-slate-700" />
              )}
            </div>
            <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg border-2 border-slate-900 group-hover:scale-110 transition-transform">
              <Sparkles size={14} />
            </div>
          </div>
          
          <div className="flex-1 space-y-4 w-full">
            <div className="grid md:grid-cols-2 gap-4">
              <Input label="Display Name" value={profile?.name || ''} readOnly className="opacity-70" />
              <Input label="Email Address" value={profile?.email || ''} readOnly className="opacity-70" />
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-white/5 grid md:grid-cols-3 gap-6">
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Account Tier</p>
            <p className="text-lg font-bold text-indigo-400 flex items-center gap-2">
              PRO ACCESS <Sparkles size={14} />
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Scripts</p>
            <p className="text-lg font-bold text-white">24</p>
          </div>
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Live Hours</p>
            <p className="text-lg font-bold text-white">12.5</p>
          </div>
        </div>
      </Card>
    </div>
  );

  const renderView = () => {
    switch (currentView) {
      case AppView.DASHBOARD_HOME: return <HomeView />;
      case AppView.DASHBOARD_CONTENT: return <ContentView />;
      case AppView.DASHBOARD_COACHING: return <CoachingView />;
      case AppView.DASHBOARD_CHATBOT: return <ChatbotView />;
      case AppView.DASHBOARD_LIVE_COACHING: return <LiveCoachingView />;
      case AppView.DASHBOARD_PROFILE: return <ProfileView />;
      case AppView.DASHBOARD_SOCIAL: return <SocialView />;
      default: return <HomeView />;
    }
  };

  return (
    <div className="flex h-screen bg-[#020617] overflow-hidden">
      <Sidebar currentView={currentView} setView={setView} onLogout={onLogout} isOpen={isSidebarOpen} setIsOpen={setSidebarOpen} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 border-b border-white/5 flex items-center justify-between px-4 lg:px-8 bg-[#0a0f1d]/50 backdrop-blur-md z-30">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 text-slate-400 hover:text-white"><Menu /></button>
          <div className="flex items-center gap-4 ml-auto">
             <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                   <p className="text-xs font-bold text-white leading-none">{profile?.name || 'User'}</p>
                   <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider mt-1">Pro Account</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center border border-white/5"><User className="text-slate-400" size={20} /></div>
             </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">{renderView()}</main>
      </div>
    </div>
  );
};
