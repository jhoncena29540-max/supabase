
import { GoogleGenAI, Content } from "@google/genai";

// Safe access to environment variables for production stability
const getApiKey = () => {
  try {
    return 'AIzaSyAmMDkMjyK1D-hPQtO1A6Qmt_19mC5cWjI';
  } catch (e) {
    return '';
  }
};

const apiKey = getApiKey();
const ai = new GoogleGenAI({ apiKey });

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

-- Idempotent Policies for Users
drop policy if exists "Public profiles are viewable by everyone." on public.users;
create policy "Public profiles are viewable by everyone." on public.users for select using (true);

drop policy if exists "Users can insert their own profile." on public.users;
create policy "Users can insert their own profile." on public.users for insert with check (auth.uid() = id);

drop policy if exists "Users can update own profile." on public.users;
create policy "Users can update own profile." on public.users for update using (auth.uid() = id);

-- 2. Handle New User Trigger
create or replace function public.handle_new_user() returns trigger as $$
begin
  insert into public.users (id, email, name)
  values (new.id, new.email, new.raw_user_meta_data->>'name');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

-- 3. Create AI Requests Table
create table if not exists public.ai_requests (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  request_type text not null,
  prompt text not null,
  response text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.ai_requests enable row level security;

-- Idempotent Policies for AI Requests
drop policy if exists "Users can view their own requests." on public.ai_requests;
create policy "Users can view their own requests." on public.ai_requests for select using (auth.uid() = user_id);

drop policy if exists "Users can insert their own requests." on public.ai_requests;
create policy "Users can insert their own requests." on public.ai_requests for insert with check (auth.uid() = user_id);

-- 4. Create Landing Pages Table
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

-- Idempotent Policies for Landing Pages
drop policy if exists "Users can manage their own pages." on public.landing_pages;
create policy "Users can manage their own pages." on public.landing_pages for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Anyone can view published pages." on public.landing_pages;
create policy "Anyone can view published pages." on public.landing_pages for select to public using (is_published = true);

-- 5. Create Storage Bucket and Policies
insert into storage.buckets (id, name, public) 
values ('app', 'app', true) 
on conflict (id) do nothing;

-- Idempotent Storage Policies
drop policy if exists "Public Access" on storage.objects;
create policy "Public Access" 
on storage.objects for select 
using ( bucket_id = 'app' );

drop policy if exists "Allow Authenticated Uploads" on storage.objects;
create policy "Allow Authenticated Uploads" 
on storage.objects for insert 
with check (
  bucket_id = 'app' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

drop policy if exists "Allow Owner Updates" on storage.objects;
create policy "Allow Owner Updates" 
on storage.objects for update 
using (
  bucket_id = 'app' 
  AND auth.uid()::text = (storage.foldername(name))[2]
);

drop policy if exists "Allow Owner Deletes" on storage.objects;
create policy "Allow Owner Deletes" 
on storage.objects for delete 
using (
  bucket_id = 'app' 
  AND auth.uid()::text = (storage.foldername(name))[2]
);
`;

export const generateContentScript = async (topic: string, format: 'speech' | 'landing_page' | 'presentation') => {
  if (!apiKey) throw new Error("AI Service configuration error: API Key missing.");

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
  if (!apiKey) throw new Error("AI Service configuration error: API Key missing.");

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
  if (!apiKey) throw new Error("AI Service configuration error: API Key missing.");

  const prompt = `Create a complete, single-file HTML landing page based on this description: "${description}".
  
  CRITICAL TECHNICAL REQUIREMENTS:
  1.  MUST include <script src="https://cdn.tailwindcss.com"></script> in the <head>.
  2.  MUST include <meta name="viewport" content="width=device-width, initial-scale=1.0">.
  3.  The design must be "Modern SaaS" or "Glassmorphism".
  4.  Add 'min-h-screen' class to the body to ensure full height.
  5.  Structure: 
      - Header (Logo + Nav)
      - Hero Section (H1, Subtext, CTA Button)
      - Features Grid (3 columns)
      - Testimonials
      - Footer
  6.  Use <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" /> for icons. Use <i class="fas fa-icon"></i> syntax.
  7.  Use placeholder images from Unsplash.
  8.  Return ONLY the raw HTML code starting with <!DOCTYPE html>.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        systemInstruction: "You are a specialized frontend engineer generating production-ready HTML landing pages. Output raw HTML only.",
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
  if (!apiKey) throw new Error("AI Service configuration error: API Key missing.");

  const prompt = `
  You are an expert frontend engineer. You have an existing HTML landing page and a user request to modify it.
  
  USER INSTRUCTION: "${instructions}"
  
  CURRENT HTML:
  ${currentCode}
  
  TASK:
  1. Apply the user's changes to the HTML code.
  2. Return ONLY the full, updated HTML code starting with <!DOCTYPE html>.
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
  if (!apiKey) throw new Error("AI Service configuration error: API Key missing.");

  const systemInstruction = `You are the AI Assistant for "SpeakCoaching AI".
  Your goal is to help users navigate the app, discover features, and answer questions about public speaking.

  App Features:
  1. Content Studio: Users can generate speech scripts, landing page copy, and presentation talking points.
  2. Speak Coaching: Users paste text to get feedback on Tone, Clarity, and Confidence.
  3. Landing Page Builder: Users create HTML landing pages via prompts, view live previews (desktop/mobile), and publish them.
  4. History: Users can view past generations.

  IMPORTANT:
  If the user mentions "RLS Policy", "Storage Upload Failed", or "SQL Schema", YOU MUST provide the following SQL code:

  \`\`\`sql
  ${SQL_SCHEMA}
  \`\`\`
  `;

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
