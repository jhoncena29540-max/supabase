
// This is a production-ready Supabase Edge Function to handle multi-platform OAuth.
// To deploy: supabase functions deploy social-auth-redirect

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// These are declared for linter compatibility in non-Deno environments
declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const platform = url.searchParams.get('platform')
  const userId = url.searchParams.get('user_id')
  const redirectUriParam = url.searchParams.get('redirect_uri')
  const state = url.searchParams.get('state')

  // SECURE CONFIGURATION
  // These secrets must be set in your Supabase Dashboard -> Edge Functions -> Secrets
  const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
  const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // --- PHASE 1: INITIAL REDIRECT TO GOOGLE ---
  if (!code && platform === 'youtube' && userId) {
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', url.origin + url.pathname); // Callback to this same function
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');
    authUrl.searchParams.set('scope', [
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube.readonly',
      'https://www.googleapis.com/auth/userinfo.profile'
    ].join(' '));
    
    // Pack user details into state to recover them on callback
    const statePayload = btoa(JSON.stringify({
      userId,
      platform: 'youtube',
      origRedirect: redirectUriParam
    }));
    authUrl.searchParams.set('state', statePayload);

    return Response.redirect(authUrl.toString(), 302);
  }

  // --- PHASE 2: HANDLE CALLBACK & EXCHANGE CODE ---
  if (code && state) {
    try {
      const { userId: uid, platform: plat, origRedirect } = JSON.parse(atob(state));

      if (plat === 'youtube') {
        // 1. Exchange Code for Access/Refresh Tokens
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code,
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            redirect_uri: url.origin + url.pathname,
            grant_type: 'authorization_code',
          }),
        });

        const tokens = await tokenRes.json();
        if (!tokens.access_token) throw new Error('Failed to exchange code for tokens');

        // 2. Fetch YouTube Channel Details
        const channelRes = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true', {
          headers: { Authorization: `Bearer ${tokens.access_token}` },
        });

        const channelData = await channelRes.json();
        const channel = channelData.items?.[0];
        if (!channel) throw new Error('No YouTube channel found for this account');

        // 3. Persist to social_accounts table
        const { error: upsertError } = await supabase.from('social_accounts').upsert({
          user_id: uid,
          platform: 'youtube',
          platform_account_id: channel.id,
          account_name: channel.snippet.title,
          username: channel.snippet.customUrl || channel.snippet.title,
          avatar_url: channel.snippet.thumbnails.high.url,
          metrics: {
            followers: parseInt(channel.statistics.subscriberCount) || 0,
            engagement: 0,
            views: parseInt(channel.statistics.viewCount) || 0
          },
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
          status: 'active'
        }, { onConflict: 'user_id,platform,platform_account_id' });

        if (upsertError) throw upsertError;

        // 4. Redirect home with success flag
        return Response.redirect(`${decodeURIComponent(origRedirect)}?auth_success=true`, 302);
      }
    } catch (err) {
      console.error('OAuth Exchange Error:', err);
      return new Response(JSON.stringify({ error: err.message }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
  }

  return new Response(JSON.stringify({ error: 'Invalid Request' }), { 
    status: 400, 
    headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
  });
})
