// @deno-types="https://deno.land/std@0.224.0/http/server.ts"
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createSupabaseClients } from '../_shared/supabaseClient.ts';
import { errorResponse, jsonResponse } from '../_shared/response.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface MarkReadyRequest {
  order_id?: string;
  status?: 'ready_for_pickup' | 'in_transit';
}

serve(async (req: Request) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return errorResponse(405, 'Method not allowed');
  }

  let payload: MarkReadyRequest;
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
    
    // Get current user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return errorResponse(401, 'Missing Authorization header');
    }

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return errorResponse(401, 'Unauthenticated');
    }

    // Load the order
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, seller_id, status')
      .eq('id', payload.order_id)
      .maybeSingle();

    if (orderError) {
      console.error('Failed to load order', orderError);
      return errorResponse(500, 'Unable to load order');
    }

    if (!order) {
      return errorResponse(404, 'Order not found');
    }

    // Check if current user is the seller of this order
    // or check profile for admin role
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    const isAdmin = profile?.role === 'admin';
    const isSeller = order.seller_id === user.id;

    if (!isAdmin && !isSeller) {
      return errorResponse(403, 'Only the seller can mark the order as ready');
    }

    const nextStatus = payload.status ?? 'ready_for_pickup';

    const { data: updatedOrder, error: updateError } = await supabaseAdmin
      .from('orders')
      .update({ status: nextStatus })
      .eq('id', payload.order_id)
      .select()
      .maybeSingle();

    if (updateError) {
      console.error('Failed to update order status', updateError);
      return errorResponse(500, 'Failed to update order');
    }

    // Send SMS notification to buyer when order is ready
    if (nextStatus === 'ready_for_pickup' && updatedOrder) {
      try {
        // Get order details with listing and buyer info
        const { data: orderDetails } = await supabaseAdmin
          .from('orders')
          .select(`
            *,
            listing:listings(id, crop, pickup_address),
            manual_order:manual_orders(buyer_name, buyer_phone)
          `)
          .eq('id', payload.order_id)
          .maybeSingle();

        if (orderDetails) {
          const buyerPhone = orderDetails.manual_order?.[0]?.buyer_phone || orderDetails.buyer_contact;
          const buyerName = orderDetails.manual_order?.[0]?.buyer_name || 'Customer';
          const listingTitle = orderDetails.listing?.crop || 'your order';
          const orderRef = orderDetails.order_reference || payload.order_id.substring(0, 8);

          if (buyerPhone) {
            const message = `Good news, ${buyerName}! Your order "${listingTitle}" (Ref: ${orderRef}) is now ready for pickup/delivery. You will be contacted by our delivery partner soon. Thank you!`;
            
            await supabaseAdmin.functions.invoke('send-sms', {
              body: { 
                to: buyerPhone, 
                message, 
                order_id: orderDetails.id, 
                type: 'order_ready' 
              },
            });
            console.log(`SMS sent to buyer ${buyerPhone} for order ${orderRef}`);
          }
        }
      } catch (smsError) {
        // Don't fail the update if SMS fails
        console.error('Error sending SMS notification:', smsError);
      }
    }

    return jsonResponse({ order: updatedOrder });
  } catch (error) {
    console.error('order-mark-ready error', error);
    return errorResponse(500, 'Unexpected error marking order ready');
  }
});

