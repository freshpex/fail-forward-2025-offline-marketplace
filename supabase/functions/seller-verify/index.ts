// @deno-types="https://deno.land/std@0.224.0/http/server.ts"
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createSupabaseClients } from '../_shared/supabaseClient.ts';
import { getUserContext } from '../_shared/auth.ts';
import { errorResponse, jsonResponse } from '../_shared/response.ts';

interface SellerVerifyRequest {
  document_path?: string;
  document_type?: string;
  additional_info?: string;
}

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return errorResponse(405, 'Method not allowed');
  }

  let payload: SellerVerifyRequest;
  try {
    payload = await req.json();
  } catch (_err) {
    return errorResponse(400, 'Invalid JSON payload');
  }

  if (!payload.document_path) {
    return errorResponse(400, 'document_path is required');
  }

  try {
    const { supabaseAdmin, supabaseUser } = createSupabaseClients(req);
    const context = await getUserContext(req, supabaseUser, supabaseAdmin);

    if (context instanceof Response) {
      return context;
    }

    const { data: verification, error: verificationError } = await supabaseAdmin
      .from('seller_verification')
      .insert({
        user_id: context.user.id,
        document_url: payload.document_path,
        document_type: payload.document_type ?? null,
        status: 'pending',
      })
      .select()
      .maybeSingle();

    if (verificationError) {
      console.error('Failed to create seller verification request', verificationError);
      return errorResponse(500, 'Failed to submit verification');
    }

    const { error: profileUpdateError } = await supabaseAdmin
      .from('profiles')
      .upsert(
        {
          id: context.user.id,
          role: 'seller',
          seller_verified: false,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );

    if (profileUpdateError) {
      console.error('Failed to update profile after verification', profileUpdateError);
    }

    return jsonResponse({ verification });
  } catch (error) {
    console.error('seller-verify error', error);
    return errorResponse(500, 'Unexpected error submitting seller verification');
  }
});

