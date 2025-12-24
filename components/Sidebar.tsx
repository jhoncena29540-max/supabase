
import React, { useState } from 'react';
import { LayoutDashboard, PenTool, Mic, History as HistoryIcon, User, LogOut, X, Loader2, Globe, MessageSquare, Sparkles, Mail, Share2, Radio } from 'lucide-react';
import { AppView } from '../types';

interface SidebarProps {
  currentView: AppView;
  setView: (view: AppView) => void;
  onLogout: () => Promise<void> | void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, onLogout, isOpen, setIsOpen }) => {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  const navItems = [
    { view: AppView.DASHBOARD_HOME, label: 'Overview', icon: LayoutDashboard, color: 'from-blue-500 to-indigo-500' },
    { view: AppView.DASHBOARD_LIVE_COACHING, label: 'Live Session', icon: Radio, color: 'from-rose-500 to-orange-500' },
    { view: AppView.DASHBOARD_CHATBOT, label: 'AI Assistant', icon: MessageSquare, color: 'from-green-400 to-emerald-600' },
    { view: AppView.DASHBOARD_CONTENT, label: 'Content Studio', icon: PenTool, color: 'from-purple-500 to-pink-500' },
    { view: AppView.DASHBOARD_COACHING, label: 'Analysis Lab', icon: Mic, color: 'from-indigo-400 to-blue-500' },
    { view: AppView.DASHBOARD_SOCIAL, label: 'Social Scheduler', icon: Share2, color: 'from-pink-500 to-rose-600' },
    { view: AppView.DASHBOARD_LANDING_BUILDER, label: 'Landing Builder', icon: Globe, color: 'from-cyan-400 to-blue-600' },
    { view: AppView.DASHBOARD_HISTORY, label: 'History', icon: HistoryIcon, color: 'from-slate-400 to-slate-600' },
    { view: AppView.DASHBOARD_PROFILE, label: 'Profile', icon: User, color: 'from-indigo-400 to-purple-500' },
    { view: AppView.DASHBOARD_CONTACT, label: 'Support', icon: Mail, color: 'from-amber-400 to-orange-500' },
  ];

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await onLogout();
    } catch (error) {
      console.error("Logout failed", error);
      setIsLoggingOut(false);
    }
  };

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside className={`
        fixed top-0 left-0 h-full w-72 bg-[#0a0f1d] border-r border-white/5 z-50 transform transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
      `}>
        <div className="flex flex-col h-full">
          <div className="p-8 flex items-center justify-between">
            <div className="flex items-center gap-3 group cursor-pointer" onClick={() => setView(AppView.DASHBOARD_HOME)}>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-110 transition-transform duration-300">
                <Mic className="text-white w-6 h-6" />
              </div>
              <div>
                <h1 className="text-lg font-black tracking-tight text-white leading-none">SPEAK</h1>
                <span className="text-[10px] font-bold tracking-[0.2em] text-indigo-400 uppercase">Coaching AI</span>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="lg:hidden p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>

          <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto custom-scrollbar">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.view;
              return (
                <button
                  key={item.view}
                  onClick={() => {
                    setView(item.view);
                    setIsOpen(false);
                  }}
                  className={`
                    w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all duration-300 group
                    ${isActive 
                      ? 'bg-indigo-600/10 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] border border-indigo-500/20' 
                      : 'text-slate-400 hover:bg-white/[0.03] hover:text-slate-200'}
                  `}
                >
                  <div className={`
                    w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300
                    ${isActive 
                      ? `bg-gradient-to-br ${item.color} shadow-lg shadow-indigo-500/20 scale-105` 
                      : 'bg-slate-800/50 group-hover:bg-slate-800 group-hover:scale-105'}
                  `}>
                    <Icon size={20} className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'} />
                  </div>
                  <span className={`text-sm font-semibold tracking-wide ${isActive ? 'text-indigo-100' : ''}`}>
                    {item.label}
                  </span>
                  {isActive && <Sparkles size={12} className="ml-auto text-indigo-400 animate-pulse" />}
                </button>
              );
            })}
          </nav>

          <div className="p-6 mt-auto">
             <div className="bg-slate-900/50 rounded-3xl p-4 border border-white/5 mb-4 hidden lg:block">
                <div className="flex items-center gap-3 mb-3">
                   <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center">
                      <Sparkles size={14} className="text-indigo-400" />
                   </div>
                   <span className="text-xs font-bold text-slate-300">Pro Plan Active</span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                   <div className="h-full w-3/4 bg-indigo-500 rounded-full"></div>
                </div>
             </div>
            
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all duration-300 border border-transparent hover:border-red-500/20 font-bold text-sm uppercase tracking-widest disabled:opacity-50"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-800/50 flex items-center justify-center">
                {isLoggingOut ? <Loader2 size={20} className="animate-spin" /> : <LogOut size={20} />}
              </div>
              {isLoggingOut ? 'Leaving...' : 'Sign Out'}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
