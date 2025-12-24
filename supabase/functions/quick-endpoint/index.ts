
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const apikey = url.searchParams.get('apikey')

  const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')
  const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  
  // This must match EXACTLY what was sent to Google in bright-responder
  const CALLBACK_URL = `https://hckjalcigpjdqcqhglhl.supabase.co/functions/v1/quick-endpoint?apikey=${apikey}`
  
  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

  if (code && state) {
    let origRedirect = "";
    try {
      const decodedState = JSON.parse(atob(state));
      const { userId } = decodedState;
      origRedirect = decodedState.origRedirect;

      // 1. Exchange code for tokens
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: GOOGLE_CLIENT_ID!,
          client_secret: GOOGLE_CLIENT_SECRET!,
          redirect_uri: CALLBACK_URL,
          grant_type: 'authorization_code',
        }),
      })

      const tokens = await tokenRes.json()
      if (!tokens.access_token) throw new Error('Token exchange failed')

      // 2. Get YouTube Info
      const channelRes = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      })
      const channelData = await channelRes.json()
      const channel = channelData.items?.[0]
      if (!channel) throw new Error('No channel found')

      // 3. Upsert social account
      const { error: dbError } = await supabase.from('social_accounts').upsert({
        user_id: userId,
        platform: 'youtube',
        platform_account_id: channel.id,
        account_name: channel.snippet.title,
        username: channel.snippet.customUrl || channel.snippet.title,
        avatar_url: channel.snippet.thumbnails.high.url,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
        status: 'active'
      }, { onConflict: 'user_id,platform,platform_account_id' })

      if (dbError) throw dbError;

      // 4. Final Redirect
      const separator = origRedirect.includes('?') ? '&' : '?';
      return Response.redirect(`${decodeURIComponent(origRedirect)}${separator}auth_success=true`, 302)
    } catch (err: any) {
      console.error("OAuth Error:", err);
      const separator = origRedirect.includes('?') ? '&' : '?';
      return Response.redirect(`${decodeURIComponent(origRedirect)}${separator}auth_error=true`, 302)
    }
  }

  return new Response("Invalid Callback", { status: 400 })
}, { verifyJwt: false })
