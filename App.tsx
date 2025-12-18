
import React, { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { Landing } from './pages/Landing';
import { Auth } from './pages/Auth';
import { Dashboard } from './pages/Dashboard';
import { PublicPage } from './pages/PublicPage';
import { AppView } from './types';
import { HashRouter, useLocation } from 'react-router-dom';

const AppContent: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [view, setView] = useState<AppView>(AppView.LANDING);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  // Check if we are trying to access a public landing page
  const isPublicPage = location.pathname.startsWith('/p/');

  useEffect(() => {
    let mounted = true;

    // Check current session state on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) {
        setSession(session);
        if (session) {
          setView(AppView.DASHBOARD_HOME);
        }
        setLoading(false);
      }
    }).catch(err => {
      console.error("Supabase Session Error:", err);
      if (mounted) setLoading(false);
    });

    // Handle authentication state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setSession(session);
        if (session) {
          // If logged in, ensure we are in a dashboard view
          if (!view.startsWith('DASHBOARD_')) {
            setView(AppView.DASHBOARD_HOME);
          }
        } else {
          // If logged out, reset to landing if not on an auth page
          if (view !== AppView.LOGIN && view !== AppView.SIGNUP) {
            setView(AppView.LANDING);
          }
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [view]);

  // Production-level check: Handle Public Pages first
  if (isPublicPage) {
    return <PublicPage />;
  }

  // Show a high-quality loading state while determining auth status
  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <div className="mt-6 text-slate-500 font-bold tracking-widest text-xs uppercase animate-pulse">
          Securely Loading...
        </div>
      </div>
    );
  }

  // Render Dashboard if user is authenticated
  if (session) {
    return <Dashboard user={session.user} onLogout={() => supabase.auth.signOut()} />;
  }

  // Auth Routing Fallback for Unauthenticated Users
  switch (view) {
    case AppView.LOGIN:
    case AppView.SIGNUP:
      return <Auth view={view} onNavigate={setView} />;
    case AppView.LANDING:
    default:
      return <Landing onNavigate={setView} />;
  }
};

// Root component with HashRouter and Error Boundary protection
const App: React.FC = () => {
  return (
    <HashRouter>
      <AppContent />
    </HashRouter>
  );
};

export default App;
