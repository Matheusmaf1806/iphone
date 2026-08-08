import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Verificar se o Supabase está configurado
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

let supabaseInstance = null;

if (isSupabaseConfigured) {
  try {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  } catch (error) {
    console.error('Error creating Supabase client:', error);
  }
}

// Cliente para uso no navegador (client-side)
export const supabase = supabaseInstance;

// Cliente para uso no servidor (server-side)
export function createServerClient() {
  if (!isSupabaseConfigured) {
    return null;
  }

  try {
    return createClient(supabaseUrl, supabaseAnonKey);
  } catch (error) {
    console.error('Error creating server Supabase client:', error);
    return null;
  }
}
