// @deno-types="https://deno.land/std@0.224.0/http/server.ts"
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createSupabaseClients } from '../_shared/supabaseClient.ts';
import { errorResponse, jsonResponse } from '../_shared/response.ts';

interface OrderVerifyRequest {
  order_id?: string;
  payment_reference?: string;
}

const PAYSTACK_VERIFY_URL = 'https://api.paystack.co/transaction/verify/';

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
    });
  }

  if (req.method !== 'POST') {
    return errorResponse(405, 'Method not allowed');
  }

  const denoEnv = (globalThis as typeof globalThis & {
    Deno?: {
      env: {
        get(name: string): string | undefined;
      };
    };
  }).Deno;

  const paystackKey = denoEnv?.env.get('PAYSTACK_SECRET_KEY');
  if (!paystackKey) {
    return errorResponse(500, 'PAYSTACK_SECRET_KEY is not configured');
  }

  let payload: OrderVerifyRequest;
  try {
    payload = await req.json();
  } catch (_err) {
    return errorResponse(400, 'Invalid JSON payload');
  }

  if (!payload.order_id || !payload.payment_reference) {
    return errorResponse(400, 'order_id and payment_reference are required');
  }

  try {
    const { supabaseAdmin, supabaseUser } = createSupabaseClients(req);
    
    // Try to get user if authenticated, but allow guest verification
    let userId: string | null = null;
    try {
      const { data: { user } } = await supabaseUser.auth.getUser();
      userId = user?.id ?? null;
    } catch {
      // Guest user - no auth
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, buyer_id, order_reference')
      .eq('id', payload.order_id)
      .maybeSingle();

    if (orderError) {
      console.error('Failed to load order', orderError);
      return errorResponse(500, 'Unable to load order');
    }

    if (!order) {
      return errorResponse(404, 'Order not found');
    }

    // For guest orders (buyer_id is null), allow verification
    // For authenticated orders, verify the user is the buyer
    if (order.buyer_id && userId && order.buyer_id !== userId) {
      return errorResponse(403, 'Only the buyer can verify payment');
    }

    const verifyResponse = await fetch(`${PAYSTACK_VERIFY_URL}${payload.payment_reference}`, {
      headers: {
        Authorization: `Bearer ${paystackKey}`,
      },
    });

    const verificationResult = await verifyResponse.json();

    if (!verifyResponse.ok) {
      console.error('Paystack verification failed', verificationResult);
      return errorResponse(
        verifyResponse.status,
        'Payment verification failed',
        verificationResult
      );
    }

    const status = verificationResult?.data?.status;
    const amount = verificationResult?.data?.amount;

    const { data: updatedOrder, error: updateError } = await supabaseAdmin
      .from('orders')
      .update({
        status: status === 'success' ? 'payment_verified' : 'pending_payment',
        payment_reference: payload.payment_reference,
        payment_status: status,
        total_amount: typeof amount === 'number' ? amount / 100 : undefined,
      })
      .eq('id', payload.order_id)
      .select()
      .maybeSingle();

    if (updateError) {
      console.error('Failed to update order after verification', updateError);
      return errorResponse(500, 'Failed to update order');
    }

    return jsonResponse({ order: updatedOrder, verification: verificationResult });
  } catch (error) {
    console.error('order-verify error', error);
    return errorResponse(500, 'Unexpected error verifying payment');
  }
});