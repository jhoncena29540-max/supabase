
import React, { useState } from 'react';
import { LayoutDashboard, PenTool, Mic, History, User, LogOut, Menu, X, Loader2, Globe, MessageSquare } from 'lucide-react';
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
    { view: AppView.DASHBOARD_HOME, label: 'Overview', icon: LayoutDashboard },
    { view: AppView.DASHBOARD_CHATBOT, label: 'AI Assistant', icon: MessageSquare },
    { view: AppView.DASHBOARD_CONTENT, label: 'Content Studio', icon: PenTool },
    { view: AppView.DASHBOARD_COACHING, label: 'Speak Coaching', icon: Mic },
    { view: AppView.DASHBOARD_LANDING_BUILDER, label: 'Landing Builder', icon: Globe },
    { view: AppView.DASHBOARD_HISTORY, label: 'History', icon: History },
    { view: AppView.DASHBOARD_PROFILE, label: 'Profile', icon: User },
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
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside className={`
        fixed top-0 left-0 h-full w-72 bg-slate-900/95 backdrop-blur-2xl border-r border-white/5 z-50 transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <Mic className="text-white w-5 h-5" />
              </div>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                SpeakCoaching
              </h1>
            </div>
            <button onClick={() => setIsOpen(false)} className="lg:hidden text-slate-400 hover:text-white">
              <X size={24} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-1">
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
                    w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium
                    ${isActive 
                      ? 'bg-indigo-600/10 text-indigo-400 shadow-sm border border-indigo-500/20' 
                      : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}
                  `}
                >
                  <Icon size={20} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Footer / Logout */}
          <div className="p-4 border-t border-white/5">
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoggingOut ? <Loader2 size={20} className="animate-spin" /> : <LogOut size={20} />}
              {isLoggingOut ? 'Signing Out...' : 'Sign Out'}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
