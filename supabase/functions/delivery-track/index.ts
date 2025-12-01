// @deno-types="https://deno.land/std@0.224.0/http/server.ts"
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createSupabaseClients } from '../_shared/supabaseClient.ts';
import { getUserContext } from '../_shared/auth.ts';
import { errorResponse, jsonResponse } from '../_shared/response.ts';

interface DeliveryTrackRequest {
  order_id?: string;
  tracking_number?: string;
}

const SHIPBUBBLE_TRACK_URL = 'https://api.shipbubble.com/v1/shipments/track/';

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return errorResponse(405, 'Method not allowed');
  }

  let payload: DeliveryTrackRequest;
  try {
    payload = await req.json();
  } catch (_err) {
    return errorResponse(400, 'Invalid JSON payload');
  }

  if (!payload.order_id && !payload.tracking_number) {
    return errorResponse(400, 'Provide order_id or tracking_number');
  }

  try {
    const { supabaseAdmin, supabaseUser } = createSupabaseClients(req);
    const context = await getUserContext(req, supabaseUser, supabaseAdmin);

    if (context instanceof Response) {
      return context;
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, buyer_id, seller_id')
      .eq('id', payload.order_id ?? '')
      .maybeSingle();

    if (orderError) {
      console.error('Failed to fetch order', orderError);
      return errorResponse(500, 'Unable to load order');
    }

    if (order && ![order.buyer_id, order.seller_id].includes(context.user.id) && context.profile?.role !== 'admin') {
      return errorResponse(403, 'You are not allowed to track this order');
    }

    let shipmentQuery = supabaseAdmin.from('shipments').select('*').limit(1);

    if (payload.order_id) {
      shipmentQuery = shipmentQuery.eq('order_id', payload.order_id);
    }

    if (payload.tracking_number) {
      shipmentQuery = shipmentQuery.eq('tracking_number', payload.tracking_number);
    }

    const { data: shipment, error: shipmentError } = await shipmentQuery.maybeSingle();

    if (shipmentError) {
      console.error('Failed to load shipment', shipmentError);
      return errorResponse(500, 'Unable to load shipment');
    }

    if (!shipment) {
      return errorResponse(404, 'Shipment not found');
    }

    const apiKey = (Deno.env.get('SHIPBUBBLE_API_KEY') as string);
    if (!apiKey) {
      return errorResponse(500, 'SHIPBUBBLE_API_KEY is not configured');
    }

    const trackingNumber = payload.tracking_number ?? shipment.tracking_number;
    if (!trackingNumber) {
      return errorResponse(422, 'Shipment is missing tracking number');
    }

    const trackResponse = await fetch(`${SHIPBUBBLE_TRACK_URL}${trackingNumber}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    const tracking = await trackResponse.json();

    if (!trackResponse.ok) {
      console.error('Shipbubble tracking failure', tracking);
      return errorResponse(trackResponse.status, 'Tracking lookup failed', tracking);
    }

    const latestStatus = tracking?.data?.current_status ?? tracking?.status;

    const { data: updatedShipment } = await supabaseAdmin
      .from('shipments')
      .update({ status: latestStatus ?? shipment.status, metadata: tracking })
      .eq('id', shipment.id)
      .select()
      .maybeSingle();

    return jsonResponse({ shipment: updatedShipment ?? shipment, tracking });
  } catch (error) {
    console.error('delivery-track error', error);
    return errorResponse(500, 'Unexpected error tracking delivery');
  }
});

