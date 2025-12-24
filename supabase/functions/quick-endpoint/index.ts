
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// Fixed: Declaring Deno to resolve compilation errors in non-Deno environments
declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * quick-endpoint: OAuth CALLBACK
 * This function is public (verifyJwt: false) because Google redirects the browser here.
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')

  const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')
  const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  
  const CALLBACK_URL = "https://hckjalcigpjdqcqhglhl.supabase.co/functions/v1/quick-endpoint"
  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

  if (code && state) {
    try {
      const { userId, platform, origRedirect } = JSON.parse(atob(state))

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

      // 2. Get YouTube Channel info
      const channelRes = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      })
      const channelData = await channelRes.json()
      const channel = channelData.items?.[0]
      if (!channel) throw new Error('No channel found')

      // 3. Store connection
      await supabase.from('social_accounts').upsert({
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

      // 4. Return to frontend
      return Response.redirect(`${decodeURIComponent(origRedirect)}?auth_success=true`, 302)
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders })
    }
  }

  return new Response(JSON.stringify({ error: 'Invalid callback' }), { status: 400, headers: corsHeaders })
}, { verifyJwt: false }) // CRITICAL: Allows browser redirects from Google
