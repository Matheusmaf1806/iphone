import { createServerClient as createClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

export function createServerClient() {
  if (!isSupabaseConfigured) {
    return null;
  }

  try {
    const cookieStore = cookies();

    return createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value;
          },
          set(name, value, options) {
            try {
              cookieStore.set({ name, value, ...options });
            } catch (error) {
              // Cookies can't be set in Server Components
            }
          },
          remove(name, options) {
            try {
              cookieStore.set({ name, value: '', ...options });
            } catch (error) {
              // Cookies can't be removed in Server Components
            }
          },
        },
      }
    );
  } catch (error) {
    console.error('Error creating server Supabase client:', error);
    return null;
  }
}
