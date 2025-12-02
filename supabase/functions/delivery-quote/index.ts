// @deno-types="https://deno.land/std@0.224.0/http/server.ts"
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createSupabaseClients } from '../_shared/supabaseClient.ts';
import { errorResponse, jsonResponse } from '../_shared/response.ts';

interface QuoteRequest {
  listing_id?: string;
  order_id?: string;
  delivery_method?: 'in_app';
  payload?: Record<string, unknown>;
}

const SHIPBUBBLE_VALIDATE_ADDRESS_URL = 'https://api.shipbubble.com/v1/shipping/address/validate';
const SHIPBUBBLE_FETCH_RATES_URL = 'https://api.shipbubble.com/v1/shipping/fetch_rates';

async function validateAddress(
  apiKey: string,
  address: string,
  name: string,
  email: string,
  phone: string
): Promise<{ success: boolean; address_code?: string; error?: string }> {
  try {
    const response = await fetch(SHIPBUBBLE_VALIDATE_ADDRESS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ name, email, phone, address }),
    });
    const data = await response.json();
    console.log('ShipBubble validate address:', response.status, JSON.stringify(data));
    if (response.ok && data?.status === 'success' && data?.data?.address_code) {
      return { success: true, address_code: data.data.address_code };
    }
    return { success: false, error: data?.message || data?.errors?.join(', ') || 'Address validation failed' };
  } catch (err) {
    console.error('Address validation error:', err);
    return { success: false, error: String(err) };
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
    });
  }
  if (req.method !== 'POST') return errorResponse(405, 'Method not allowed');

  let requestPayload: QuoteRequest;
  try { requestPayload = await req.json(); } catch (_err) { return errorResponse(400, 'Invalid JSON'); }
  if (!requestPayload.listing_id) return errorResponse(400, 'listing_id required');

  const payload = requestPayload.payload as Record<string, unknown> | undefined;

  try {
    const { supabaseAdmin } = createSupabaseClients(req);
    const { data: listing, error: listingError } = await supabaseAdmin
      .from('listings')
      .select('id, seller_id, location, pickup_address, pickup_city, pickup_state, crop, price')
      .eq('id', requestPayload.listing_id)
      .maybeSingle();

    if (listingError) return errorResponse(500, 'Unable to load listing');
    if (!listing) return errorResponse(404, 'Listing not found');

    const quantity = Math.max(1, Number(payload?.quantity ?? 1));
    const denoEnv = (globalThis as any).Deno;
    const apiKey = denoEnv?.env.get('SHIPBUBBLE_API_KEY');

    let quoteData: unknown = null;
    let quoteId = `fallback-${crypto.randomUUID()}`;
    let fallbackUsed = false;
    let feeEstimate = Math.max(2500, quantity * 800);
    let couriers: Array<Record<string, unknown>> = [];
    let cheapestCourier: Record<string, unknown> | null = null;
    let fastestCourier: Record<string, unknown> | null = null;

    if (apiKey && payload?.sender_address && payload?.receiver_address) {
      const senderValidation = await validateAddress(apiKey, String(payload.sender_address), String(payload.sender_name || 'Seller'), String(payload.sender_email || 'seller@marketplace.com'), String(payload.sender_phone || '08000000000'));
      const receiverValidation = await validateAddress(apiKey, String(payload.receiver_address), String(payload.receiver_name || 'Buyer'), String(payload.receiver_email || 'buyer@marketplace.com'), String(payload.receiver_phone || '08000000000'));

      if (!senderValidation.success || !receiverValidation.success) {
        fallbackUsed = true;
        quoteData = { note: 'Fallback - Address validation failed', sender_error: senderValidation.error, receiver_error: receiverValidation.error };
      } else {
        const shipbubblePayload = {
          sender_address_code: senderValidation.address_code,
          receiver_address_code: receiverValidation.address_code,
          pickup_date: payload.pickup_date || new Date(Date.now() + 86400000).toISOString().split('T')[0],
          category_id: payload.category_id ?? 1,
          package_items: payload.package_items || [{ name: (listing as any).crop || 'Produce', description: `${(listing as any).crop} - ${quantity} units`, unit_weight: Math.max(1, quantity * 0.5), unit_amount: Number((listing as any).price || 1000), quantity }],
          package_dimension: payload.package_dimension || { length: 30, width: 30, height: 20 },
        };

        try {
          const shipbubbleResponse = await fetch(SHIPBUBBLE_FETCH_RATES_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` }, body: JSON.stringify(shipbubblePayload) });
          const data = await shipbubbleResponse.json();
          console.log('ShipBubble rates:', shipbubbleResponse.status, JSON.stringify(data));

          if (shipbubbleResponse.ok && data?.status === 'success') {
            quoteData = data;
            quoteId = data.data?.request_token || quoteId;
            couriers = data.data?.couriers || [];
            cheapestCourier = data.data?.cheapest_courier || null;
            fastestCourier = data.data?.fastest_courier || null;
            if (cheapestCourier?.total) feeEstimate = Number(cheapestCourier.total);
          } else {
            fallbackUsed = true;
            quoteData = { note: 'Fallback - ShipBubble error', shipbubble_status: shipbubbleResponse.status, shipbubble_body: data };
          }
        } catch (e) { fallbackUsed = true; quoteData = { note: 'Fallback - request failed', error: String(e) }; }
      }
    } else if (!apiKey) {
      fallbackUsed = true; quoteData = { note: 'Fallback - no API key' };
    } else {
      fallbackUsed = true; quoteData = { note: 'Fallback - missing addresses' };
    }

    await supabaseAdmin.from('shipment_intents').insert({ order_id: requestPayload.order_id ?? null, quote_id: quoteId, provider: 'Shipbubble', request_payload: payload, response_payload: quoteData, status: 'quoted' });

    return jsonResponse({
      quote_id: quoteId, quote: quoteData, fee: feeEstimate, currency: 'NGN', quantity, fallback_used: fallbackUsed,
      couriers: couriers.map((c: any) => ({ courier_id: c.courier_id, courier_name: c.courier_name, total: c.total, delivery_eta: c.delivery_eta, service_type: c.service_type })),
      cheapest_courier: cheapestCourier ? { courier_id: (cheapestCourier as any).courier_id, courier_name: (cheapestCourier as any).courier_name, total: (cheapestCourier as any).total, delivery_eta: (cheapestCourier as any).delivery_eta } : null,
      fastest_courier: fastestCourier ? { courier_id: (fastestCourier as any).courier_id, courier_name: (fastestCourier as any).courier_name, total: (fastestCourier as any).total, delivery_eta: (fastestCourier as any).delivery_eta } : null,
      listing,
    });
  } catch (error) { console.error('delivery-quote error', error); return errorResponse(500, 'Unexpected error'); }
});
