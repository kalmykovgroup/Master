import {createClient} from '@supabase/supabase-js';
import {createStorage} from './storage';
import type {Database} from '../types/database';

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  'http://localhost:8000';

const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const storageAdapter = createStorage('supabase-auth');

export {SUPABASE_URL, SUPABASE_ANON_KEY};

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: storageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
