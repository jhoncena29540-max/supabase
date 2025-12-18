
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Loader2, AlertTriangle } from 'lucide-react';
import { useLocation } from 'react-router-dom';

export const PublicPage: React.FC = () => {
  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();

  useEffect(() => {
    // Extract slug from path: /p/:slug
    // HashRouter format: #/p/:slug
    const pathParts = location.pathname.split('/');
    const slugIndex = pathParts.indexOf('p');
    const slug = slugIndex !== -1 && pathParts[slugIndex + 1] ? pathParts[slugIndex + 1] : null;

    // Check query params for preview mode
    const searchParams = new URLSearchParams(location.search);
    const isPreview = searchParams.get('preview') === 'true';

    if (!slug) {
      setError("Page not found");
      setLoading(false);
      return;
    }

    const fetchPage = async () => {
      try {
        const { data, error } = await supabase
          .from('landing_pages')
          .select('html_content, is_published')
          .eq('slug', slug)
          .single();

        if (error || !data) {
          setError("Page not found or unavailable.");
        } else if (!data.is_published && !isPreview) {
            setError("This page is not currently published.");
        } else {
          setHtml(data.html_content);
        }
      } catch (err) {
        console.error(err);
        setError("An unexpected error occurred.");
      } finally {
        setLoading(false);
      }
    };

    fetchPage();
  }, [location]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md">
            <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={32} />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 mb-2">Unavailable</h1>
            <p className="text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <iframe 
        title="Live Page"
        srcDoc={html || ''}
        className="fixed inset-0 w-full h-full border-0 bg-white"
        sandbox="allow-scripts allow-same-origin allow-forms" 
    />
  );
};
