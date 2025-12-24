
import React, { useEffect, useState, ErrorInfo, ReactNode, Component } from 'react';
import { supabase } from './lib/supabase';
import { Landing } from './pages/Landing';
import { Auth } from './pages/Auth';
import { Dashboard } from './pages/Dashboard';
import { PublicPage } from './pages/PublicPage';
import { AppView } from './types';
import { HashRouter, useLocation } from 'react-router-dom';
import { AlertTriangle, RefreshCw } from 'lucide-react';

// Production-ready Error Boundary
interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Fix: Removed 'override' modifiers and used explicit 'Component' import to resolve 
 * compilation errors where the base class was not being correctly recognized.
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // Fix: Removed override modifier (Error line 24)
  public state: ErrorBoundaryState = { hasError: false, error: null };

  constructor(props: ErrorBoundaryProps) {
    super(props);
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  // Fix: Removed override modifier (Error line 34)
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("App Crash:", error, errorInfo);
  }

  // Fix: Removed override modifier (Error line 38)
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 text-center">
          <div className="max-w-md bg-slate-900 border border-red-500/20 rounded-3xl p-8 shadow-2xl">
            <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 text-red-500">
              <AlertTriangle size={32} />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Something went wrong</h1>
            <p className="text-slate-400 mb-8">{this.state.error?.message || "An unexpected error occurred in the component tree."}</p>
            <button 
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold mx-auto transition-all"
            >
              <RefreshCw size={18} />
              Reload Application
            </button>
          </div>
        </div>
      );
    }
    // Fix: Inheritance properly recognized so this.props exists (Error line 59)
    return this.props.children;
  }
}

const AppContent: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [view, setView] = useState<AppView>(AppView.LANDING);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  const isPublicPage = location.pathname.startsWith('/p/');

  useEffect(() => {
    let mounted = true;

    const timeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn("Auth initialization timed out.");
        setLoading(false);
      }
    }, 5000);

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) {
        setSession(session);
        if (session) {
          setView(AppView.DASHBOARD_HOME);
        }
        setLoading(false);
        clearTimeout(timeout);
      }
    }).catch(err => {
      console.error("Supabase Session Error:", err);
      if (mounted) {
        setLoading(false);
        clearTimeout(timeout);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setSession(session);
        if (session) {
          if (!view.startsWith('DASHBOARD_')) {
            setView(AppView.DASHBOARD_HOME);
          }
        } else {
          if (view !== AppView.LOGIN && view !== AppView.SIGNUP) {
            setView(AppView.LANDING);
          }
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [view, loading]);

  if (isPublicPage) {
    return <PublicPage />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <div className="mt-6 text-slate-500 font-bold tracking-widest text-[10px] uppercase animate-pulse">
          SpeakCoaching AI Initializing...
        </div>
      </div>
    );
  }

  if (session) {
    return <Dashboard user={session.user} onLogout={() => supabase.auth.signOut()} />;
  }

  switch (view) {
    case AppView.LOGIN:
    case AppView.SIGNUP:
      return <Auth view={view} onNavigate={setView} />;
    case AppView.LANDING:
    default:
      return <Landing onNavigate={setView} />;
  }
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <HashRouter>
        <AppContent />
      </HashRouter>
    </ErrorBoundary>
  );
};

export default App;
