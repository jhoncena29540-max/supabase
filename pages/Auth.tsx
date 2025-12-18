import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Card } from '../components/Card';
import { AppView } from '../types';
import { ArrowLeft, Mic, CheckCircle } from 'lucide-react';

interface AuthProps {
  view: AppView; // LOGIN or SIGNUP
  onNavigate: (view: AppView) => void;
}

export const Auth: React.FC<AuthProps> = ({ view, onNavigate }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isLogin = view === AppView.LOGIN;

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: name,
            },
          },
        });
        if (error) throw error;

        // If signup is successful but no session, email confirmation is required by Supabase settings
        if (data.user && !data.session) {
          setSuccessMessage("Account created successfully! Please check your email to confirm your account before logging in.");
          return;
        }
      }
    } catch (err: any) {
      // Handle the specific "Email not confirmed" error from Supabase
      if (err.message && (err.message.includes("Email not confirmed") || err.message.includes("Invalid login credentials"))) {
        setError("Please verify your email address. Check your inbox for the confirmation link, or ensure your credentials are correct.");
      } else {
        setError(err.message || "An unexpected error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Decorative Background */}
        <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600 rounded-full mix-blend-screen filter blur-[100px] animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600 rounded-full mix-blend-screen filter blur-[100px] animate-pulse delay-1000"></div>
        </div>

      <div className="w-full max-w-md relative z-10">
        <button 
          onClick={() => onNavigate(AppView.LANDING)}
          className="mb-6 flex items-center text-slate-400 hover:text-white transition-colors text-sm"
        >
          <ArrowLeft size={16} className="mr-1" /> Back to Home
        </button>

        <Card className="p-8 backdrop-blur-2xl">
          <div className="text-center mb-8">
            <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-4">
              <Mic className="text-white w-6 h-6" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </h2>
            <p className="text-slate-400 text-sm">
              {isLogin ? 'Enter your credentials to access your dashboard' : 'Join thousands of confident speakers today'}
            </p>
          </div>

          {successMessage ? (
            <div className="text-center space-y-4 animate-fade-in">
              <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-4 rounded-lg flex flex-col items-center gap-2">
                <CheckCircle size={32} />
                <p className="text-sm">{successMessage}</p>
              </div>
              <Button onClick={() => {
                setSuccessMessage(null);
                onNavigate(AppView.LOGIN);
              }} variant="secondary" className="w-full">
                Go to Login
              </Button>
            </div>
          ) : (
            <form onSubmit={handleAuth} className="space-y-5">
              {!isLogin && (
                <Input 
                  label="Full Name" 
                  placeholder="John Doe" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              )}
              <Input 
                label="Email Address" 
                type="email" 
                placeholder="you@example.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Input 
                label="Password" 
                type="password" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full" isLoading={loading}>
                {isLogin ? 'Sign In' : 'Create Account'}
              </Button>
            </form>
          )}

          <div className="mt-6 text-center text-sm text-slate-400">
            {!successMessage && (
              <>
                {isLogin ? "Don't have an account? " : "Already have an account? "}
                <button 
                  onClick={() => {
                    setError(null);
                    setSuccessMessage(null);
                    onNavigate(isLogin ? AppView.SIGNUP : AppView.LOGIN);
                  }}
                  className="text-indigo-400 hover:text-indigo-300 font-medium"
                >
                  {isLogin ? 'Sign up' : 'Log in'}
                </button>
              </>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};