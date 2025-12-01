// @deno-types="https://deno.land/std@0.224.0/http/server.ts"
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createSupabaseClients } from '../_shared/supabaseClient.ts';
import { ensureRole, getUserContext } from '../_shared/auth.ts';
import { errorResponse, jsonResponse } from '../_shared/response.ts';

interface AdminApproveRequest {
  verification_id?: string;
  approve?: boolean;
  rejection_reason?: string;
}

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return errorResponse(405, 'Method not allowed');
  }

  let payload: AdminApproveRequest;
  try {
    payload = await req.json();
  } catch (_err) {
    return errorResponse(400, 'Invalid JSON payload');
  }

  if (!payload.verification_id) {
    return errorResponse(400, 'verification_id is required');
  }

  try {
    const { supabaseAdmin, supabaseUser } = createSupabaseClients(req);
    const context = await getUserContext(req, supabaseUser, supabaseAdmin);

    if (context instanceof Response) {
      return context;
    }

    const roleCheck = ensureRole(context.profile, ['admin']);
    if (roleCheck instanceof Response) {
      return roleCheck;
    }

    const { data: verification, error: verificationError } = await supabaseAdmin
      .from('seller_verification')
      .select('*')
      .eq('id', payload.verification_id)
      .maybeSingle();

    if (verificationError) {
      console.error('Failed to load verification record', verificationError);
      return errorResponse(500, 'Unable to load verification record');
    }

    if (!verification) {
      return errorResponse(404, 'Verification record not found');
    }

    const status = payload.approve ? 'approved' : 'rejected';

    const { data: updatedVerification, error: updateError } = await supabaseAdmin
      .from('seller_verification')
      .update({
        status,
        rejection_reason: payload.approve ? null : payload.rejection_reason ?? 'No reason provided',
        reviewed_at: new Date().toISOString(),
        reviewer_id: context.user.id,
      })
      .eq('id', verification.id)
      .select()
      .maybeSingle();

    if (updateError) {
      console.error('Failed to update verification record', updateError);
      return errorResponse(500, 'Failed to update verification');
    }

    const profileUpdates = {
      seller_verified: payload.approve,
      role: payload.approve ? 'seller' : 'buyer',
      updated_at: new Date().toISOString(),
    };

    const { error: profileUpdateError } = await supabaseAdmin
      .from('profiles')
      .update(profileUpdates)
      .eq('id', verification.user_id);

    if (profileUpdateError) {
      console.error('Failed to update seller profile', profileUpdateError);
    }

    return jsonResponse({ verification: updatedVerification });
  } catch (error) {
    console.error('admin-approve-seller error', error);
    return errorResponse(500, 'Unexpected error approving seller');
  }
});

