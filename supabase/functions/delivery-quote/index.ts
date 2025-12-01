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

// Correct ShipBubble API endpoint for fetching rates
const SHIPBUBBLE_FETCH_RATES_URL = 'https://api.shipbubble.com/v1/shipping/fetch_rates';

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

  let requestPayload: QuoteRequest;
  try {
    requestPayload = await req.json();
  } catch (_err) {
    return errorResponse(400, 'Invalid JSON payload');
  }

  if (!requestPayload.listing_id) {
    return errorResponse(400, 'listing_id is required');
  }

  const payload = requestPayload.payload as Record<string, unknown> | undefined;

  try {
    const { supabaseAdmin } = createSupabaseClients(req);

    const { data: listing, error: listingError } = await supabaseAdmin
      .from('listings')
      .select('id, seller_id, location, pickup_address, pickup_city, pickup_state, crop, price')
      .eq('id', requestPayload.listing_id)
      .maybeSingle();

    if (listingError) {
      console.error('Failed to load listing', listingError);
      return errorResponse(500, 'Unable to load listing details');
    }

    if (!listing) {
      return errorResponse(404, 'Listing not found');
    }

    const quantity = Math.max(
      1,
      Number(payload?.quantity ?? 1)
    );

    const denoEnv = (globalThis as typeof globalThis & {
      Deno?: {
        env: {
          get(name: string): string | undefined;
        };
      };
    }).Deno;

    const apiKey = denoEnv?.env.get('SHIPBUBBLE_API_KEY');
    let quoteData: unknown = null;
    let quoteId = `fallback-${crypto.randomUUID()}`;
    let fallbackUsed = false;
    let feeEstimate = Math.max(2500, quantity * 800);
    let couriers: Array<Record<string, unknown>> = [];
    let cheapestCourier: Record<string, unknown> | null = null;
    let fastestCourier: Record<string, unknown> | null = null;

    if (apiKey && payload?.sender_address && payload?.receiver_address) {
      // Build proper ShipBubble request payload
      const shipbubblePayload = {
        sender_address: payload.sender_address,
        sender_name: payload.sender_name || 'Seller',
        sender_phone: payload.sender_phone || '',
        sender_email: payload.sender_email || 'seller@marketplace.com',
        
        receiver_address: payload.receiver_address,
        receiver_name: payload.receiver_name || 'Buyer',
        receiver_phone: payload.receiver_phone || '',
        receiver_email: payload.receiver_email || 'buyer@marketplace.com',
        
        pickup_date: payload.pickup_date || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        category_id: payload.category_id ?? 5, // Food & Groceries
        
        package_items: payload.package_items || [{
          name: (listing as Record<string, unknown>).crop || 'Agricultural Produce',
          description: `${(listing as Record<string, unknown>).crop} - ${quantity} units`,
          unit_weight: 1,
          unit_amount: Number((listing as Record<string, unknown>).price || 1000),
          quantity: quantity,
        }],
        
        package_dimension: payload.package_dimension || {
          length: 30,
          width: 30, 
          height: 20,
        },
      };

      try {
        console.log('ShipBubble request:', JSON.stringify(shipbubblePayload, null, 2));
        
        const shipbubbleResponse = await fetch(SHIPBUBBLE_FETCH_RATES_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(shipbubblePayload),
        });

        const data = await shipbubbleResponse.json();
        console.log('ShipBubble response:', shipbubbleResponse.status, JSON.stringify(data, null, 2));

        if (shipbubbleResponse.ok && data?.status === 'success') {
          quoteData = data;
          quoteId = data.data?.request_token || quoteId;
          couriers = data.data?.couriers || [];
          cheapestCourier = data.data?.cheapest_courier || null;
          fastestCourier = data.data?.fastest_courier || null;
          
          // Use cheapest courier's rate
          if (cheapestCourier?.total) {
            feeEstimate = Number(cheapestCourier.total);
          } else if (couriers.length > 0) {
            const cheapest = couriers.reduce((min: Record<string, unknown>, c: Record<string, unknown>) => 
              (c.total && Number(c.total) < Number(min.total || Infinity)) ? c : min, 
              { total: Infinity }
            );
            feeEstimate = cheapest.total !== Infinity ? Number(cheapest.total) : feeEstimate;
          }
        } else {
          fallbackUsed = true;
          quoteData = {
            note: 'Fallback quote - ShipBubble returned error',
            shipbubble_status: shipbubbleResponse.status,
            shipbubble_body: data,
          };
          console.error('ShipBubble quote failure:', data);
        }
      } catch (shipbubbleError) {
        fallbackUsed = true;
        quoteData = {
          note: 'Fallback quote - ShipBubble request failed',
          error: `${shipbubbleError}`,
        };
        console.error('ShipBubble request error:', shipbubbleError);
      }
    } else if (!apiKey) {
      fallbackUsed = true;
      quoteData = {
        note: 'Fallback quote - SHIPBUBBLE_API_KEY not configured',
      };
    } else {
      fallbackUsed = true;
      quoteData = {
        note: 'Fallback quote - Missing sender_address or receiver_address',
      };
    }

    const { data: intent, error: intentError } = await supabaseAdmin
      .from('shipment_intents')
      .insert({
        order_id: requestPayload.order_id ?? null,
        quote_id: quoteId,
        provider: 'Shipbubble',
        request_payload: payload,
        response_payload: quoteData,
        status: 'quoted',
      })
      .select()
      .maybeSingle();

    if (intentError) {
      console.error('Failed to store shipment intent', intentError);
    }

    return jsonResponse({
      quote_id: quoteId,
      quote: quoteData,
      fee: feeEstimate,
      currency: 'NGN',
      quantity,
      fallback_used: fallbackUsed,
      couriers: couriers.map((c: Record<string, unknown>) => ({
        courier_id: c.courier_id,
        courier_name: c.courier_name,
        courier_image: c.courier_image,
        total: c.total,
        delivery_eta: c.delivery_eta,
        pickup_eta: c.pickup_eta,
        service_type: c.service_type,
      })),
      cheapest_courier: cheapestCourier ? {
        courier_id: cheapestCourier.courier_id,
        courier_name: cheapestCourier.courier_name,
        total: cheapestCourier.total,
        delivery_eta: cheapestCourier.delivery_eta,
      } : null,
      fastest_courier: fastestCourier ? {
        courier_id: fastestCourier.courier_id,
        courier_name: fastestCourier.courier_name,
        total: fastestCourier.total,
        delivery_eta: fastestCourier.delivery_eta,
      } : null,
      intent,
      listing,
    });
  } catch (error) {
    console.error('delivery-quote error', error);
    return errorResponse(500, 'Unexpected error fetching delivery quote');
  }
});
