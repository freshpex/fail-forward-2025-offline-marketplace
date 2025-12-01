// @deno-types="https://deno.land/std@0.224.0/http/server.ts"
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createSupabaseClients } from '../_shared/supabaseClient.ts';
import { errorResponse, jsonResponse } from '../_shared/response.ts';

interface ShipbubbleWebhookPayload {
  event?: string;
  data?: Record<string, any>;
}

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return errorResponse(405, 'Method not allowed');
  }

  let payload: ShipbubbleWebhookPayload;
  try {
    payload = await req.json();
  } catch (_err) {
    return errorResponse(400, 'Invalid JSON payload');
  }

  // Attempt to extract tracking number and status from common locations
  const trackingNumber = payload.data?.tracking_number ?? payload.data?.shipment?.tracking_number ?? payload.data?.data?.tracking_number;
  const status = payload.data?.status ?? payload.data?.shipment?.status ?? payload.data?.current_status ?? payload.event;

  if (!trackingNumber) {
    console.warn('Webhook received without tracking number', payload);
    return jsonResponse({ ok: false, message: 'No tracking number in payload' });
  }

  try {
    const { supabaseAdmin } = createSupabaseClients(req);

    // Find shipment by tracking number
    const { data: shipment } = await supabaseAdmin
      .from('shipments')
      .select('id, order_id, tracking_number, status')
      .eq('tracking_number', trackingNumber)
      .maybeSingle();

    if (!shipment) {
      console.warn('No shipment found for tracking number', trackingNumber);
      return jsonResponse({ ok: false, message: 'Shipment not found' });
    }

    // Map carrier status to internal statuses (best-effort)
    let newShipmentStatus = status ?? 'in_transit';
    let newOrderStatus: string | null = null;

    const normalized = String(status ?? '').toLowerCase();
    if (normalized.includes('deliv') || normalized.includes('delivered') || normalized === 'delivered') {
      newShipmentStatus = 'delivered';
      newOrderStatus = 'completed';
    } else if (normalized.includes('picked') || normalized.includes('collec') || normalized.includes('pickup') || normalized.includes('picked_up')) {
      newShipmentStatus = 'booked';
      newOrderStatus = 'in_transit';
    } else if (normalized.includes('in_transit') || normalized.includes('transit') || normalized.includes('on_way')) {
      newShipmentStatus = 'in_transit';
      newOrderStatus = 'in_transit';
    } else if (normalized.includes('failed') || normalized.includes('cancel')) {
      newShipmentStatus = 'failed';
      newOrderStatus = 'cancelled';
    } else {
      newShipmentStatus = normalized || 'in_transit';
    }

    // Update shipment record
    const { data: updatedShipment, error: updateShipErr } = await supabaseAdmin
      .from('shipments')
      .update({ status: newShipmentStatus, metadata: payload })
      .eq('id', shipment.id)
      .select()
      .maybeSingle();

    if (updateShipErr) {
      console.error('Failed to update shipment from webhook', updateShipErr);
    }

    // Update order status if we derived one
    if (newOrderStatus) {
      const { error: orderUpdateErr } = await supabaseAdmin
        .from('orders')
        .update({ status: newOrderStatus })
        .eq('id', shipment.order_id);

      if (orderUpdateErr) {
        console.error('Failed to update order status from webhook', orderUpdateErr);
      }
    }

    // Notify buyer and seller about the status update
    try {
      const { data: orderDetails } = await supabaseAdmin
        .from('orders')
        .select('id, order_reference, seller_id')
        .eq('id', shipment.order_id)
        .maybeSingle();

      const { data: manualOrder } = await supabaseAdmin
        .from('manual_orders')
        .select('buyer_phone, buyer_name')
        .eq('order_id', shipment.order_id)
        .maybeSingle();

      const { data: sellerProfile } = await supabaseAdmin
        .from('profiles')
        .select('phone, full_name')
        .eq('id', orderDetails?.seller_id)
        .maybeSingle();

      const buyerPhone = manualOrder?.buyer_phone;
      const buyerName = manualOrder?.buyer_name || 'Customer';
      const orderRef = orderDetails?.order_reference ?? shipment.order_id;

      const buyerMsg = `Update for order ${orderRef}: delivery status is now '${newShipmentStatus}'. Tracking: ${trackingNumber}`;
      const sellerMsg = `Order ${orderRef} status updated to '${newShipmentStatus}'. Tracking: ${trackingNumber}`;

      if (buyerPhone) {
        await supabaseAdmin.functions.invoke('send-sms', {
          body: { to: buyerPhone, message: buyerMsg, order_id: shipment.order_id, type: 'delivery_booked' },
        });
      }

      if (sellerProfile?.phone) {
        await supabaseAdmin.functions.invoke('send-sms', {
          body: { to: sellerProfile.phone, message: sellerMsg, order_id: shipment.order_id, type: 'delivery_booked' },
        });
      }
    } catch (notifyErr) {
      console.error('Failed to notify parties from webhook:', notifyErr);
    }

    return jsonResponse({ ok: true });
  } catch (error) {
    console.error('delivery-webhook error', error);
    return errorResponse(500, 'Unexpected error processing webhook');
  }
});
