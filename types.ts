
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  created_at: string;
}

export interface AIRequest {
  id: string;
  user_id: string;
  request_type: 'content' | 'coaching' | 'chat';
  prompt: string;
  response: string;
  created_at: string;
}

export interface LandingPage {
  id: string;
  user_id: string;
  slug: string;
  title: string;
  html_content: string;
  storage_path?: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export enum AppView {
  LANDING = 'LANDING',
  LOGIN = 'LOGIN',
  SIGNUP = 'SIGNUP',
  DASHBOARD_HOME = 'DASHBOARD_HOME',
  DASHBOARD_CONTENT = 'DASHBOARD_CONTENT',
  DASHBOARD_COACHING = 'DASHBOARD_COACHING',
  DASHBOARD_HISTORY = 'DASHBOARD_HISTORY',
  DASHBOARD_PROFILE = 'DASHBOARD_PROFILE',
  DASHBOARD_LANDING_BUILDER = 'DASHBOARD_LANDING_BUILDER',
  DASHBOARD_CHATBOT = 'DASHBOARD_CHATBOT',
  DASHBOARD_CONTACT = 'DASHBOARD_CONTACT',
  DASHBOARD_SOCIAL = 'DASHBOARD_SOCIAL',
}

// Add global declaration to fix JSX IntrinsicElements errors
declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}
