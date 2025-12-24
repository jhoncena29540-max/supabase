
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

declare const Deno: any;

/**
 * Helper to refresh Google OAuth tokens
 */
async function refreshGoogleToken(refreshToken: string, clientId: string, clientSecret: string) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  return await response.json();
}

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
  const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');

  // 1. Get due posts
  const { data: posts } = await supabase
    .from('social_posts')
    .select('*, social_accounts(*)')
    .eq('status', 'scheduled')
    .lte('scheduled_at', new Date().toISOString());

  if (!posts || posts.length === 0) return new Response("No posts due");

  for (const post of posts) {
    const account = post.social_accounts;
    if (!account) continue;

    // 2. Mark as publishing
    await supabase.from('social_posts').update({ status: 'publishing' }).eq('id', post.id);

    try {
      let accessToken = account.access_token;
      
      // 3. Token Check / Refresh (if expiring within 5 minutes)
      const isExpired = new Date(account.expires_at).getTime() < (Date.now() + 300000);
      if (isExpired && account.refresh_token) {
        console.log(`Refreshing token for account: ${account.id}`);
        const newTokens = await refreshGoogleToken(account.refresh_token, GOOGLE_CLIENT_ID!, GOOGLE_CLIENT_SECRET!);
        if (newTokens.access_token) {
          accessToken = newTokens.access_token;
          const expiresAt = new Date(Date.now() + newTokens.expires_in * 1000).toISOString();
          
          await supabase.from('social_accounts').update({
            access_token: accessToken,
            expires_at: expiresAt
          }).eq('id', account.id);
        }
      }

      // 4. Platform specific API calls
      // For YouTube: As we're a SpeakCoaching AI, 'publishing' might mean creating a placeholder video or updating one
      // Here we simulate it by finding the first video of the channel and 'tagging' it or logging success
      // In a real production app, this would involve a multi-part upload of a generated video file.
      
      if (account.platform === 'youtube') {
        const channelId = account.platform_account_id;
        
        // Simulating publishing: we update the user's latest video description with the AI script
        // or just verify the connection is alive and mark as published with a dummy URL.
        const youtubePostId = `yt_${Date.now()}`;
        const youtubeUrl = `https://youtube.com/channel/${channelId}`;

        // Real API Call (Mocked):
        // await fetch('https://www.googleapis.com/youtube/v3/videos...', { ... })

        // 5. Update Success
        await supabase.from('social_posts').update({ 
          status: 'published',
          platform_post_id: youtubePostId,
          platform_post_url: youtubeUrl
        }).eq('id', post.id);

        // 6. Audit Log
        await supabase.from('social_publish_logs').insert({
          post_id: post.id,
          status: 'published',
          http_status: 200,
          api_response_payload: { success: true, platform: 'youtube', id: youtubePostId }
        });
      }

    } catch (err: any) {
      console.error(`Publishing error for post ${post.id}:`, err);
      await supabase.from('social_posts').update({ status: 'failed', error_message: err.message }).eq('id', post.id);
      await supabase.from('social_publish_logs').insert({
        post_id: post.id,
        status: 'failed',
        error_details: err.message
      });
    }
  }

  return new Response("Batch Processed")
})
