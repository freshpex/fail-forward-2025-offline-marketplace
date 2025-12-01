// @deno-types="https://esm.sh/@supabase/supabase-js@2"
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { Database } from './types.ts';

interface SupabaseClients {
  supabaseAdmin: SupabaseClient<Database>;
  supabaseUser: SupabaseClient<Database>;
}

export function createSupabaseClients(req: Request): SupabaseClients {
  const supabaseUrl = (Deno.env.get('SUPABASE_URL') as string);
  const anonKey = (Deno.env.get('SUPABASE_ANON_KEY') as string);
  const serviceKey = (Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string);

  if (!supabaseUrl || !anonKey || !serviceKey) {
    throw new Error('Missing Supabase environment variables');
  }

  const authHeader = req.headers.get('Authorization') ?? '';

  const supabaseUser = createClient<Database>(supabaseUrl, anonKey, {
    auth: { persistSession: false },
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });

  const supabaseAdmin = createClient<Database>(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  return { supabaseAdmin, supabaseUser };
}
