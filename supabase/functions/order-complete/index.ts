// @deno-types="https://deno.land/std@0.224.0/http/server.ts"
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createSupabaseClients } from '../_shared/supabaseClient.ts';
import { ensureRole, getUserContext } from '../_shared/auth.ts';
import { errorResponse, jsonResponse } from '../_shared/response.ts';

interface OrderCompleteRequest {
  order_id?: string;
  notes?: string;
}

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return errorResponse(405, 'Method not allowed');
  }

  let payload: OrderCompleteRequest;
  try {
    payload = await req.json();
  } catch (_err) {
    return errorResponse(400, 'Invalid JSON payload');
  }

  if (!payload.order_id) {
    return errorResponse(400, 'order_id is required');
  }

  try {
    const { supabaseAdmin, supabaseUser } = createSupabaseClients(req);
    const context = await getUserContext(req, supabaseUser, supabaseAdmin);

    if (context instanceof Response) {
      return context;
    }

    const roleCheck = ensureRole(context.profile, ['seller', 'admin']);
    if (roleCheck instanceof Response) {
      return roleCheck;
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, seller_id, buyer_id')
      .eq('id', payload.order_id)
      .maybeSingle();

    if (orderError) {
      console.error('Failed to load order', orderError);
      return errorResponse(500, 'Unable to load order');
    }

    if (!order) {
      return errorResponse(404, 'Order not found');
    }

    if (context.profile?.role !== 'admin' && order.seller_id !== context.user.id) {
      return errorResponse(403, 'Only the seller can complete the order');
    }

    const updates = {
      status: 'completed',
      metadata: payload.notes ? { completion_notes: payload.notes } : undefined,
    };

    const { data: updatedOrder, error: updateError } = await supabaseAdmin
      .from('orders')
      .update(updates)
      .eq('id', order.id)
      .select()
      .maybeSingle();

    if (updateError) {
      console.error('Failed to mark order complete', updateError);
      return errorResponse(500, 'Failed to mark order complete');
    }

    await supabaseAdmin
      .from('shipments')
      .update({ status: 'delivered' })
      .eq('order_id', order.id);

    return jsonResponse({ order: updatedOrder });
  } catch (error) {
    console.error('order-complete error', error);
    return errorResponse(500, 'Unexpected error completing order');
  }
});

