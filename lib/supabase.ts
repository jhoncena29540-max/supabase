
import { createClient } from '@supabase/supabase-js';

// Configuration provided in the request
export const SUPABASE_URL = 'https://hckjalcigpjdqcqhglhl.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_nC6hPIaR1KgEZxBazbA62g_-PacBNBa';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
