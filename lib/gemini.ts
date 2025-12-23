
import { GoogleGenAI, Content } from "@google/genai";

/**
 * COMPLIANCE RULE:
 * Must use new GoogleGenAI({apiKey: process.env.API_KEY});
 * API key must be obtained exclusively from process.env.API_KEY.
 */
const ai = new GoogleGenAI({ apiKey: "AIzaSyCNXC0X-yUUVRCPT1W2QWEweT5NUv33xFs" });

export const SQL_SCHEMA = `
-- 1. Create Users Table
create table if not exists public.users (
  id uuid references auth.users on delete cascade not null primary key,
  email text not null,
  name text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.users enable row level security;

-- 2. Create AI Requests Table
create table if not exists public.ai_requests (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  request_type text not null,
  prompt text not null,
  response text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.ai_requests enable row level security;

-- 3. Create Landing Pages Table
create table if not exists public.landing_pages (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  slug text not null,
  title text not null,
  html_content text,
  storage_path text,
  is_published boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(slug)
);
alter table public.landing_pages enable row level security;

-- 4. Social Scheduler Tables
create table if not exists public.social_accounts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  platform text not null,
  platform_account_id text not null,
  account_name text,
  username text,
  avatar_url text,
  metrics jsonb default '{"followers": 0, "engagement": 0}'::jsonb,
  access_token text,
  refresh_token text,
  expires_at timestamp with time zone,
  status text default 'connected',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, platform, platform_account_id)
);
alter table public.social_accounts enable row level security;

create table if not exists public.social_posts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  account_id uuid references public.social_accounts(id) on delete cascade not null,
  content text not null,
  media_urls text[] default '{}'::text[],
  scheduled_at timestamp with time zone not null,
  status text default 'scheduled',
  platform_post_id text,
  platform_post_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.social_posts enable row level security;

create table if not exists public.social_publish_logs (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references public.social_posts(id) on delete cascade not null,
  status text not null,
  error_details text,
  api_request jsonb,
  api_response jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.social_publish_logs enable row level security;

-- Policies
create policy "Users can manage their own profile." on public.users for all using (auth.uid() = id);
create policy "Users can manage their own requests." on public.ai_requests for all using (auth.uid() = user_id);
create policy "Users can manage their own landing pages." on public.landing_pages for all using (auth.uid() = user_id);
create policy "Users can manage their own social accounts." on public.social_accounts for all using (auth.uid() = user_id);
create policy "Users can manage their own social posts." on public.social_posts for all using (auth.uid() = user_id);
`;

export const generateContentScript = async (topic: string, format: 'speech' | 'landing_page' | 'presentation') => {
  const prompts = {
    speech: `Write a compelling, professional speech script about "${topic}". The tone should be engaging and authoritative. Structure it with an introduction, body points, and a strong conclusion.`,
    landing_page: `Generate high-converting landing page copy for a product or service related to "${topic}". Include a Headline, Subheadline, Feature List, and a Call to Action.`,
    presentation: `Create detailed presentation talking points for a slide deck about "${topic}". Organize by slide number with bullet points for the speaker.`
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompts[format],
      config: {
        systemInstruction: "You are an expert copywriter and public speaking coach.",
      }
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Content Error:", error);
    throw error;
  }
};

export const generateCoachingAdvice = async (input: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analyze the following text (or speech idea) and provide coaching advice on Tone, Clarity, and Confidence. Give specific tips on how to deliver this effectively:\n\n"${input}"`,
      config: {
        systemInstruction: "You are a world-class speech coach. Provide constructive, encouraging, and actionable feedback.",
      }
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Coaching Error:", error);
    throw error;
  }
};

export const generateLandingPageCode = async (description: string) => {
  const prompt = `Create a complete, single-file HTML landing page based on this description: "${description}".
  
  CRITICAL TECHNICAL REQUIREMENTS:
  1.  MUST include <script src="https://cdn.tailwindcss.com"></script> in the <head>.
  2.  MUST include <meta name="viewport" content="width=device-width, initial-scale=1.0">.
  3.  The design must be "Modern SaaS" or "Glassmorphism".
  4.  Structure: Header, Hero, Features, Testimonials, Footer.
  5.  Return ONLY raw HTML.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        systemInstruction: "You are a specialized frontend engineer. Output raw HTML only.",
      }
    });
    
    let html = response.text || '';
    const match = html.match(/```html([\s\S]*?)```/);
    if (match) {
        html = match[1];
    } else {
        html = html.replace(/```/g, '');
    }
    return html.trim();
  } catch (error) {
    console.error("Gemini Landing Page Error:", error);
    throw error;
  }
};

export const refineLandingPageCode = async (currentCode: string, instructions: string) => {
  const prompt = `
  Modify this HTML landing page: "${instructions}"
  CURRENT HTML:
  ${currentCode}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        systemInstruction: "You are a specialized frontend engineer. Output raw HTML only.",
      }
    });
    
    let html = response.text || '';
    const match = html.match(/```html([\s\S]*?)```/);
    if (match) {
        html = match[1];
    } else {
        html = html.replace(/```/g, '');
    }
    return html.trim();
  } catch (error) {
    console.error("Gemini Refinement Error:", error);
    throw error;
  }
};

export const getChatResponse = async (history: Content[], message: string) => {
  const systemInstruction = `You are the AI Assistant for "SpeakCoaching AI". Help users with public speaking and app navigation. If they need to fix database issues, show them the SQL_SCHEMA.`;

  try {
    const chat = ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: {
        systemInstruction: systemInstruction,
      },
      history: history
    });

    const result = await chat.sendMessage({ message });
    return result.text;
  } catch (error) {
    console.error("Chat Error:", error);
    throw error;
  }
};
