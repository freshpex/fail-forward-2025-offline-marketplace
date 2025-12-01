// @deno-types="https://esm.sh/@supabase/supabase-js@2"
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { Database } from './types.ts';
import { errorResponse } from './response.ts';

interface UserContext {
  user: { id: string; email: string | null };
  profile: Database['public']['Tables']['profiles']['Row'] | null;
}

export async function getUserContext(
  req: Request,
  supabaseUser: SupabaseClient<Database>,
  supabaseAdmin: SupabaseClient<Database>
): Promise<UserContext | Response> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return errorResponse(401, 'Missing Authorization header');
  }

  const {
    data: { user },
    error,
  } = await supabaseUser.auth.getUser();

  if (error || !user) {
    return errorResponse(401, 'Unauthenticated');
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  return {
    user: { id: user.id, email: user.email ?? null },
    profile: profile ?? null,
  };
}

export function ensureRole(
  profile: Database['public']['Tables']['profiles']['Row'] | null,
  allowedRoles: Array<'buyer' | 'seller' | 'admin'>
): Response | void {
  if (!profile) {
    return errorResponse(403, 'Profile not found for authenticated user');
  }

  if (!allowedRoles.includes(profile.role)) {
    return errorResponse(403, 'Insufficient permissions');
  }
}
