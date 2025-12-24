
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Sidebar } from '../components/Sidebar';
import { AppView, UserProfile } from '../types';
import { 
  Menu, Bell, Sparkles, Trash2, ChevronDown, Loader2, AlertTriangle, 
  ExternalLink, Send, Bot, User, Share2, Youtube, Instagram, Facebook, 
  Music2, Calendar, Clock, PlusCircle, PenLine, Info, History as LogsIcon,
  Mic, Radio, Power, AudioLines, ShieldCheck
} from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input, TextArea } from '../components/Input';
import { generateContentScript, generateCoachingAdvice, getChatResponse } from '../lib/gemini';
// Fix: Added 'Content' to imports to support the messages state type in ChatbotView
import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration, Content } from "@google/genai";

interface DashboardProps {
  user: any; 
  onLogout: () => void;
}

// Utility functions for Audio Processing (as per GenAI SDK requirements)
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

  useEffect(() => {
    const fetchProfile = async () => {
      const { data } = await supabase.from('users').select('*').eq('id', user.id).single();
      if (data) setProfile(data);
    };
    fetchProfile();
  }, [user]);

  // --- LIVE COACHING VIEW ---
  const LiveCoachingView = () => {
    const [isActive, setIsActive] = useState(false);
    const [transcription, setTranscription] = useState<string[]>([]);
    const [liveNotes, setLiveNotes] = useState<{note: string, category: string}[]>([]);
    const [isConnecting, setIsConnecting] = useState(false);
    
    const sessionRef = useRef<any>(null);
    const inputAudioCtxRef = useRef<AudioContext | null>(null);
    const outputAudioCtxRef = useRef<AudioContext | null>(null);
    const nextStartTimeRef = useRef(0);
    const sourcesRef = useRef(new Set<AudioBufferSourceNode>());

    const startSession = async () => {
      setIsConnecting(true);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Define the "Function" we want to connect to our app
      const saveNoteFunction: FunctionDeclaration = {
        name: 'saveLiveCoachingNote',
        parameters: {
          type: Type.OBJECT,
          description: 'Save a coaching observation or note during a live session.',
          properties: {
            note: { type: Type.STRING, description: 'The text of the coaching note.' },
            category: { type: Type.STRING, description: 'Category: Pace, Tone, Clarity, or Confidence.' },
          },
          required: ['note', 'category'],
        },
      };

      inputAudioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            setIsActive(true);
            setIsConnecting(false);
            const source = inputAudioCtxRef.current!.createMediaStreamSource(stream);
            const scriptProcessor = inputAudioCtxRef.current!.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
              
              sessionPromise.then(session => {
                session.sendRealtimeInput({
                  media: { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' }
                });
              });
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioCtxRef.current!.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle Tool/Function Calls
            if (message.toolCall) {
              for (const fc of message.toolCall.functionCalls) {
                if (fc.name === 'saveLiveCoachingNote') {
                  const { note, category } = fc.args as any;
                  setLiveNotes(prev => [{ note, category }, ...prev]);
                  
                  // Connect to Backend (Supabase)
                  await supabase.from('ai_requests').insert({
                    user_id: user.id,
                    request_type: 'live_note',
                    prompt: `Live Coaching Category: ${category}`,
                    response: note
                  });

                  sessionPromise.then(s => s.sendToolResponse({
                    functionResponses: { id: fc.id, name: fc.name, response: { result: "Note saved successfully" } }
                  }));
                }
              }
            }

            // Handle Audio
            const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData && outputAudioCtxRef.current) {
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioCtxRef.current.currentTime);
              const buffer = await decodeAudioData(decode(audioData), outputAudioCtxRef.current, 24000, 1);
              const source = outputAudioCtxRef.current.createBufferSource();
              source.buffer = buffer;
              source.connect(outputAudioCtxRef.current.destination);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(source);
              source.onended = () => sourcesRef.current.delete(source);
            }

            // Handle Transcription
            if (message.serverContent?.outputTranscription) {
               const text = message.serverContent.outputTranscription.text;
               setTranscription(prev => [...prev.slice(-4), text]);
            }
          },
          onclose: () => stopSession(),
          onerror: (e) => { console.error(e); stopSession(); }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: 'You are an elite speech coach. Listen to the user talk. Provide short, constructive verbal feedback. If you notice a specific habit (filler words, too fast, great energy), use the saveLiveCoachingNote function to record it.',
          tools: [{ functionDeclarations: [saveNoteFunction] }],
          outputAudioTranscription: {},
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } }
        }
      });

      sessionRef.current = await sessionPromise;
    };

    const stopSession = () => {
      setIsActive(false);
      setIsConnecting(false);
      sessionRef.current?.close();
      inputAudioCtxRef.current?.close();
      outputAudioCtxRef.current?.close();
      sourcesRef.current.forEach(s => s.stop());
      sourcesRef.current.clear();
    };

    return (
      <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
        <header className="flex justify-between items-center">
          <div className="space-y-1">
            <h2 className="text-4xl font-black text-white flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-rose-500/20 text-rose-400 shadow-lg shadow-rose-500/10">
                <Radio size={32} />
              </div>
              Live Studio
            </h2>
            <p className="text-slate-500 font-medium ml-1">Real-time verbal coaching with automatic milestone logging.</p>
          </div>
          <Button 
            onClick={isActive ? stopSession : startSession} 
            variant={isActive ? 'danger' : 'primary'}
            isLoading={isConnecting}
            className="!px-10 !py-5 text-lg font-black rounded-3xl shadow-2xl"
          >
            {isActive ? <Power size={20} className="mr-2" /> : <Sparkles size={20} className="mr-2" />}
            {isActive ? 'End Session' : 'Start Session'}
          </Button>
        </header>

        <div className="grid lg:grid-cols-3 gap-8 h-[600px]">
          {/* Main Visualizer */}
          <Card className="lg:col-span-2 flex flex-col items-center justify-center relative overflow-hidden bg-slate-900/40 border-white/5">
            {!isActive && !isConnecting && (
              <div className="text-center space-y-4 max-w-sm">
                <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mx-auto border border-white/5">
                  <Mic size={40} className="text-slate-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-400">Ready to speak?</h3>
                <p className="text-sm text-slate-500">Enable your microphone to start a conversational coaching session with SpeakCoaching AI.</p>
              </div>
            )}

            {(isActive || isConnecting) && (
              <div className="flex flex-col items-center gap-12 w-full">
                {/* Voice Orb */}
                <div className="relative">
                  <div className={`absolute inset-0 bg-indigo-500/30 blur-[60px] rounded-full transition-all duration-300 ${isActive ? 'scale-125 animate-pulse' : 'scale-0'}`}></div>
                  <div className={`w-48 h-48 rounded-full border-4 border-white/10 flex items-center justify-center bg-slate-900 relative z-10 overflow-hidden shadow-2xl`}>
                     <AudioLines className={`text-indigo-400 w-20 h-20 transition-all duration-500 ${isActive ? 'scale-110 rotate-12' : 'scale-50 opacity-20'}`} />
                  </div>
                </div>

                <div className="text-center space-y-4 w-full px-12">
                   <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400 animate-pulse">Live Transcription Feed</p>
                   <div className="h-24 flex flex-col justify-center items-center gap-2">
                     {transcription.map((t, i) => (
                       <p key={i} className={`text-sm font-medium transition-all duration-700 ${i === transcription.length - 1 ? 'text-white scale-105' : 'text-slate-500 opacity-50 text-xs'}`}>{t}</p>
                     ))}
                   </div>
                </div>
              </div>
            )}
          </Card>

          {/* AI Log (Connected Function Data) */}
          <Card className="bg-slate-800/20 flex flex-col border-white/5 shadow-2xl">
             <div className="flex items-center gap-3 mb-6 p-2">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                   <ShieldCheck size={20} />
                </div>
                <div>
                   <h4 className="text-sm font-black text-white uppercase tracking-wider">Session Analytics</h4>
                   <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Real-time function calls</p>
                </div>
             </div>

             <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-2">
                {liveNotes.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
                    <LogsIcon size={40} className="text-slate-800" />
                    <p className="text-xs text-slate-600 font-bold uppercase tracking-widest">No notes yet.<br/>Speak to trigger analysis.</p>
                  </div>
                ) : (
                  liveNotes.map((note, i) => (
                    <div key={i} className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 animate-slide-up">
                       <div className="flex justify-between items-center mb-2">
                          <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{note.category}</span>
                          <div className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></div>
                       </div>
                       <p className="text-xs text-slate-300 font-medium leading-relaxed italic">"{note.note}"</p>
                    </div>
                  ))
                )}
             </div>

             <div className="mt-6 pt-6 border-t border-white/5">
                <div className="flex items-center justify-between text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">
                   <span>Auto-Synced to DB</span>
                   <span className="text-emerald-400 flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div> Connected</span>
                </div>
             </div>
          </Card>
        </div>
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
          <Card className="bg-slate-900/50">
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
            <input type="text" value={input} onChange={e => setInput(e.target.value)} placeholder="Ask anything about public speaking..." className="w-full bg-slate-950 border border-slate-700 rounded-xl py-4 pl-5 pr-14 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none" />
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
          {currentView === AppView.DASHBOARD_LIVE_COACHING && <LiveCoachingView />}
          {currentView === AppView.DASHBOARD_CHATBOT && <ChatbotView />}
          {currentView === AppView.DASHBOARD_SOCIAL && <div className="text-center py-20 text-slate-500 font-black uppercase tracking-widest text-xs">Social Scheduler Section</div>}
          {currentView === AppView.DASHBOARD_HISTORY && <div className="text-center py-20 text-slate-500 font-black uppercase tracking-widest text-xs">History Section</div>}
          {currentView === AppView.DASHBOARD_LANDING_BUILDER && <div className="text-center py-20 text-slate-500 font-black uppercase tracking-widest text-xs">Landing Builder Section</div>}
          {currentView === AppView.DASHBOARD_PROFILE && <div className="text-center py-20 text-slate-500 font-black uppercase tracking-widest text-xs">Profile Settings Section</div>}
          {currentView === AppView.DASHBOARD_CONTACT && <div className="text-center py-20 text-slate-500 font-black uppercase tracking-widest text-xs">Support Contact Channel</div>}
        </main>
      </div>
    </div>
  );
};
