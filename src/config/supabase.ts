import {createClient} from '@supabase/supabase-js';
import {createStorage} from './storage';
import type {Database} from '../types/database';

// Local self-hosted Supabase (docker-compose)
// To switch to production, replace these with your hosted Supabase project values.
const SUPABASE_URL = __DEV__
  ? 'http://localhost:8000'
  : 'https://YOUR_PROJECT.supabase.co';

const SUPABASE_ANON_KEY = __DEV__
  ? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
  : 'YOUR_ANON_KEY';

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
