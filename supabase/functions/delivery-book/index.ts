// @deno-types="https://deno.land/std@0.224.0/http/server.ts"
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createSupabaseClients } from '../_shared/supabaseClient.ts';
import { ensureRole, getUserContext } from '../_shared/auth.ts';
import { errorResponse, jsonResponse } from '../_shared/response.ts';

interface DeliveryBookRequest {
  order_id?: string;
  rate_id?: string;
  shipment_details?: Record<string, unknown>;
}

const SHIPBUBBLE_SHIPMENTS_URL = 'https://api.shipbubble.com/v1/shipments';

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return errorResponse(405, 'Method not allowed');
  }

  const apiKey = (Deno.env.get('SHIPBUBBLE_API_KEY') as string);
  if (!apiKey) {
    return errorResponse(500, 'SHIPBUBBLE_API_KEY is not configured');
  }

  let payload: DeliveryBookRequest;
  try {
    payload = await req.json();
  } catch (_err) {
    return errorResponse(400, 'Invalid JSON payload');
  }

  if (!payload.order_id || !payload.rate_id) {
    return errorResponse(400, 'order_id and rate_id are required');
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
      .select('id, seller_id, metadata')
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
      return errorResponse(403, 'Only the seller can book delivery');
    }

    const shipmentResponse = await fetch(SHIPBUBBLE_SHIPMENTS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        rate_id: payload.rate_id,
        ...(payload.shipment_details ?? {}),
      }),
    });

    const shipment = await shipmentResponse.json();

    if (!shipmentResponse.ok) {
      console.error('Shipbubble booking failure', shipment);
      return errorResponse(
        shipmentResponse.status,
        'Failed to book delivery with Shipbubble',
        shipment
      );
    }

    const trackingNumber = shipment?.data?.tracking_number ?? shipment?.tracking_number ?? null;

    const { data: storedShipment, error: storeError } = await supabaseAdmin
      .from('shipments')
      .insert({
        order_id: order.id,
        tracking_number: trackingNumber,
        status: 'booked',
        provider: 'Shipbubble',
        metadata: shipment,
      })
      .select()
      .maybeSingle();

    if (storeError) {
      console.error('Failed to store shipment data', storeError);
    }

    const { error: intentUpdate } = await supabaseAdmin
      .from('shipment_intents')
      .update({ status: 'booked', response_payload: shipment })
      .eq('order_id', order.id)
      .eq('quote_id', payload.rate_id);

    if (intentUpdate) {
      console.error('Failed to update shipment intent', intentUpdate);
    }

    await supabaseAdmin
      .from('orders')
      .update({ status: 'in_transit', shipping_provider: 'Shipbubble' })
      .eq('id', order.id);

    // Notify buyer and seller with tracking number via send-sms function
    try {
      // Get buyer phone from manual_orders or order metadata
      const { data: manualOrder } = await supabaseAdmin
        .from('manual_orders')
        .select('buyer_phone, buyer_name')
        .eq('order_id', order.id)
        .maybeSingle();

      const { data: sellerProfile } = await supabaseAdmin
        .from('profiles')
        .select('phone, full_name')
        .eq('id', order.seller_id)
        .maybeSingle();

      const buyerPhone = manualOrder?.buyer_phone || (order.metadata as any)?.buyer_phone;
      const buyerName = manualOrder?.buyer_name || 'Customer';

      const trackingMsgBuyer = `Hi ${buyerName}, your order has been booked with tracking number ${trackingNumber}. We'll update you on the delivery status.`;
      const trackingMsgSeller = `Order ${order.id} has been booked with tracking number ${trackingNumber}. Please hand over the goods to the logistics partner.`;

      if (buyerPhone) {
        await supabaseAdmin.functions.invoke('send-sms', {
          body: { to: buyerPhone, message: trackingMsgBuyer, order_id: order.id, type: 'delivery_booked' },
        });
      }

      if (sellerProfile?.phone) {
        await supabaseAdmin.functions.invoke('send-sms', {
          body: { to: sellerProfile.phone, message: trackingMsgSeller, order_id: order.id, type: 'delivery_booked' },
        });
      }
    } catch (notifyErr) {
      console.error('Failed to notify parties about booking:', notifyErr);
    }

    return jsonResponse({ shipment: storedShipment ?? shipment });
  } catch (error) {
    console.error('delivery-book error', error);
    return errorResponse(500, 'Unexpected error booking delivery');
  }
});

