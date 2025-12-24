
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// Fixed: Declaring Deno to resolve compilation errors in non-Deno environments
declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * bright-responder: OAuth START
 * This function is public (verifyJwt: false) to allow browser redirects.
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const url = new URL(req.url)
  const platform = url.searchParams.get('platform')
  const userId = url.searchParams.get('user_id')
  const redirectUriParam = url.searchParams.get('redirect_uri')

  const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')
  
  // The callback URL MUST point to your quick-endpoint
  const CALLBACK_URL = "https://hckjalcigpjdqcqhglhl.supabase.co/functions/v1/quick-endpoint"

  if (platform === 'youtube' && userId) {
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID!)
    authUrl.searchParams.set('redirect_uri', CALLBACK_URL)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('access_type', 'offline')
    authUrl.searchParams.set('prompt', 'consent')
    authUrl.searchParams.set('scope', [
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube.readonly',
      'https://www.googleapis.com/auth/userinfo.profile'
    ].join(' '))
    
    // Pass context through state to the callback
    const statePayload = btoa(JSON.stringify({
      userId,
      platform: 'youtube',
      origRedirect: redirectUriParam
    }))
    authUrl.searchParams.set('state', statePayload)

    return Response.redirect(authUrl.toString(), 302)
  }

  return new Response(JSON.stringify({ error: 'Missing parameters' }), { 
    status: 400, 
    headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
  })
}, { verifyJwt: false }) // CRITICAL: Allows browser redirects
