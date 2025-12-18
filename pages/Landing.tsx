import React from 'react';
import { Mic, PenTool, BarChart3, ChevronRight, ArrowRight, Play, CheckCircle } from 'lucide-react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { AppView } from '../types';

interface LandingProps {
  onNavigate: (view: AppView) => void;
}

export const Landing: React.FC<LandingProps> = ({ onNavigate }) => {
  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-hidden selection:bg-purple-500/30">
      {/* Navbar */}
      <nav className="fixed w-full z-50 bg-slate-950/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Mic className="text-white w-5 h-5" />
            </div>
            <span className="text-xl font-bold tracking-tight">SpeakCoaching AI</span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => onNavigate(AppView.LOGIN)} className="hidden sm:block text-sm font-medium text-slate-300 hover:text-white transition-colors">
              Sign In
            </button>
            <Button onClick={() => onNavigate(AppView.SIGNUP)} className="!py-2 !px-4 text-sm">
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-4 sm:px-6 lg:px-8">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full opacity-30 pointer-events-none">
          <div className="absolute top-20 left-20 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
          <div className="absolute top-20 right-20 w-72 h-72 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
        </div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-indigo-300 text-sm mb-8 backdrop-blur-sm">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            AI-Powered Coaching Engine v2.0
          </div>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8 bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-slate-400">
            Confident Communication, <br />
            <span className="text-indigo-400">Mastered by AI.</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Elevate your public speaking, generate high-impact scripts, and get real-time coaching feedback—all in one intelligent platform.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button onClick={() => onNavigate(AppView.SIGNUP)} className="w-full sm:w-auto !text-lg !px-8 !py-4">
              Start Coaching Free
              <ArrowRight size={20} />
            </Button>
            <Button variant="ghost" className="w-full sm:w-auto !text-lg !px-8 !py-4 border border-white/10 hover:bg-white/5">
              <Play size={20} className="mr-2" />
              Watch Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 relative bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="hover:border-indigo-500/50 transition-colors group">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Mic className="text-indigo-400" size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-3">AI Speech Coaching</h3>
              <p className="text-slate-400 leading-relaxed">
                Get instant feedback on your tone, clarity, and confidence levels. Improve your delivery with actionable AI insights.
              </p>
            </Card>
            
            <Card className="hover:border-purple-500/50 transition-colors group">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <PenTool className="text-purple-400" size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-3">Script Generation</h3>
              <p className="text-slate-400 leading-relaxed">
                Writer's block is history. Generate speeches, presentation talking points, and landing page copy in seconds.
              </p>
            </Card>

            <Card className="hover:border-blue-500/50 transition-colors group">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <BarChart3 className="text-blue-400" size={24} />
              </div>
              <h3 className="text-xl font-semibold mb-3">Progress Tracking</h3>
              <p className="text-slate-400 leading-relaxed">
                Keep a history of your improvements and generated content. Analyze your growth as a speaker over time.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Trusted by Modern Speakers</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <Card>
              <p className="text-lg text-slate-300 italic mb-6">"SpeakCoaching AI transformed my keynote preparation. The script generation gave me a solid foundation, and the coaching tips helped me refine my delivery."</p>
              <div className="flex items-center gap-4">
                <img src="https://picsum.photos/100/100" alt="User" className="w-12 h-12 rounded-full border border-white/10" />
                <div>
                  <div className="font-semibold">Sarah Jenkins</div>
                  <div className="text-sm text-slate-500">Tech Entrepreneur</div>
                </div>
              </div>
            </Card>
            <Card>
              <p className="text-lg text-slate-300 italic mb-6">"I used to struggle with tone consistency. The AI feedback is spot on and surprisingly human-like. A must-have tool for communicators."</p>
              <div className="flex items-center gap-4">
                <img src="https://picsum.photos/101/101" alt="User" className="w-12 h-12 rounded-full border border-white/10" />
                <div>
                  <div className="font-semibold">David Chen</div>
                  <div className="text-sm text-slate-500">Marketing Director</div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-white/5 py-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Mic className="text-indigo-500 w-6 h-6" />
            <span className="text-xl font-bold">SpeakCoaching AI</span>
          </div>
          <p className="text-slate-500 text-sm">© 2024 SpeakCoaching AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};
