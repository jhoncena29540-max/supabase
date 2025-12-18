
import React, { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { Landing } from './pages/Landing';
import { Auth } from './pages/Auth';
import { Dashboard } from './pages/Dashboard';
import { PublicPage } from './pages/PublicPage';
import { AppView } from './types';
import { HashRouter, useLocation } from 'react-router-dom';

const App: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [view, setView] = useState<AppView>(AppView.LANDING);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  // Check if we are trying to access a public page
  const isPublicPage = location.pathname.startsWith('/p/');

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) setView(AppView.DASHBOARD_HOME);
      setLoading(false);
    });

    // Listen for changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        setView(AppView.DASHBOARD_HOME);
      } else if (view !== AppView.LOGIN && view !== AppView.SIGNUP) {
        setView(AppView.LANDING);
      }
    });

    return () => subscription.unsubscribe();
  }, [view]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setView(AppView.LANDING);
  };

  if (isPublicPage) {
      return <PublicPage />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // If logged in, show Dashboard
  if (session) {
    return <Dashboard user={session.user} onLogout={handleLogout} />;
  }

  // View Routing
  return (
    <>
      {view === AppView.LANDING && <Landing onNavigate={setView} />}
      {(view === AppView.LOGIN || view === AppView.SIGNUP) && (
        <Auth view={view} onNavigate={setView} />
      )}
    </>
  );
};

// Wrap in HashRouter
const Root = () => (
    <HashRouter>
        <App />
    </HashRouter>
);

export default Root;
