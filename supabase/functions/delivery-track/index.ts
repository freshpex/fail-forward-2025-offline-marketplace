// @deno-types="https://deno.land/std@0.224.0/http/server.ts"
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createSupabaseClients } from '../_shared/supabaseClient.ts';
import { getUserContext } from '../_shared/auth.ts';
import { errorResponse, jsonResponse } from '../_shared/response.ts';

interface DeliveryTrackRequest {
  order_id?: string;
  tracking_number?: string;
  shipment_id?: string;
}

const TERMINAL_AFRICA_BASE_URL = 'https://api.terminal.africa/v1';

// Terminal Africa API helper
async function terminalRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
  const apiKey = Deno.env.get('TERMINAL_AFRICA_API_KEY');
  if (!apiKey) {
    throw new Error('Terminal Africa API key not configured');
  }

  const response = await fetch(`${TERMINAL_AFRICA_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await response.text();
    throw new Error(`Terminal Africa returned non-JSON response: ${text.substring(0, 200)}`);
  }

  return await response.json();
}

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

  if (!payload.order_id && !payload.tracking_number && !payload.shipment_id) {
    return errorResponse(400, 'Provide order_id, tracking_number, or shipment_id');
  }

  try {
    const { supabaseAdmin, supabaseUser } = createSupabaseClients(req);
    const context = await getUserContext(req, supabaseUser, supabaseAdmin);

    if (context instanceof Response) {
      return context;
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, buyer_id, seller_id, delivery_tracking_id')
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

    // Get shipment ID from shipment record, order, or payload
    const shipmentId = payload.shipment_id ?? shipment.tracking_number ?? order?.delivery_tracking_id;
    if (!shipmentId) {
      return errorResponse(422, 'Shipment is missing tracking/shipment ID');
    }

    // Track shipment via Terminal Africa
    const trackingResult = await terminalRequest(`/shipments/${shipmentId}/track`);

    if (!trackingResult || trackingResult.error) {
      console.error('Terminal Africa tracking failure', trackingResult);
      return errorResponse(500, 'Tracking lookup failed', trackingResult);
    }

    const trackingData = trackingResult.data || trackingResult;
    const latestStatus = trackingData?.status ?? trackingData?.current_status ?? shipment.status;

    // Map Terminal Africa status to internal status
    let mappedStatus = latestStatus;
    const normalized = String(latestStatus ?? '').toLowerCase();
    if (normalized.includes('delivered')) {
      mappedStatus = 'delivered';
    } else if (normalized.includes('transit') || normalized.includes('shipped')) {
      mappedStatus = 'in_transit';
    } else if (normalized.includes('pickup') || normalized.includes('picked')) {
      mappedStatus = 'picked_up';
    } else if (normalized.includes('cancel') || normalized.includes('failed')) {
      mappedStatus = 'failed';
    }

    const { data: updatedShipment } = await supabaseAdmin
      .from('shipments')
      .update({ 
        status: mappedStatus ?? shipment.status, 
        metadata: trackingData 
      })
      .eq('id', shipment.id)
      .select()
      .maybeSingle();

    return jsonResponse({ 
      shipment: updatedShipment ?? shipment, 
      tracking: trackingData,
      provider: 'Terminal Africa'
    });
  } catch (error) {
    console.error('delivery-track error', error);
    return errorResponse(500, 'Unexpected error tracking delivery');
  }
});

