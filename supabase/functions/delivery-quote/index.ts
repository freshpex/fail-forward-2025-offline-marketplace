// @deno-types="https://deno.land/std@0.224.0/http/server.ts"
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createSupabaseClients } from '../_shared/supabaseClient.ts';
import { errorResponse, jsonResponse } from '../_shared/response.ts';
import { 
  getDeliveryQuote, 
  type DeliveryQuoteRequest,
  type DeliveryAddress,
  type ParcelItem,
} from '../_shared/deliveryProviders.ts';

interface QuoteRequestPayload {
  listing_id?: string;
  order_id?: string;
  delivery_method?: 'in_app';
  payload?: {
    sender_address?: string;
    sender_name?: string;
    sender_email?: string;
    sender_phone?: string;
    sender_city?: string;
    sender_state?: string;
    receiver_address?: string;
    receiver_name?: string;
    receiver_email?: string;
    receiver_phone?: string;
    receiver_city?: string;
    receiver_state?: string;
    quantity?: number;
    unit_weight?: number;
    package_items?: Array<{
      name: string;
      description: string;
      unit_weight: number;
      unit_amount: number;
      quantity: number;
    }>;
    package_dimension?: {
      length: number;
      width: number;
      height: number;
    };
    pickup_date?: string;
    category_id?: number;
  };
}

function parseAddress(
  addressStr: string,
  name: string,
  email: string,
  phone: string,
  city?: string,
  state?: string
): DeliveryAddress {
  const parts = addressStr.split(',').map(p => p.trim());
  
  let extractedCity = city || '';
  let extractedState = state || '';
  
  if (!extractedCity && parts.length >= 2) {
    extractedCity = parts[parts.length - 2] || parts[0];
  }
  if (!extractedState && parts.length >= 1) {
    const stateNames = ['Lagos', 'Abuja', 'FCT', 'Kano', 'Rivers', 'Oyo', 'Kaduna', 'Ogun', 'Edo', 'Delta'];
    for (const part of parts) {
      for (const stateName of stateNames) {
        if (part.toLowerCase().includes(stateName.toLowerCase())) {
          extractedState = stateName;
          break;
        }
      }
    }
    if (!extractedState) {
      extractedState = parts[parts.length - 1]?.replace(/Nigeria/i, '').trim() || 'Lagos';
    }
  }
  
  return {
    name: name || 'Customer',
    email: email || 'customer@marketplace.com',
    phone: phone || '08000000000',
    line1: parts[0] || addressStr,
    city: extractedCity || 'Lagos',
    state: extractedState || 'Lagos',
    country: 'NG',
  };
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
  
  if (req.method !== 'POST') {
    return errorResponse(405, 'Method not allowed');
  }

  let requestPayload: QuoteRequestPayload;
  try {
    requestPayload = await req.json();
  } catch (_err) {
    return errorResponse(400, 'Invalid JSON');
  }
  
  if (!requestPayload.listing_id) {
    return errorResponse(400, 'listing_id required');
  }

  const payload = requestPayload.payload || {};

  try {
    const { supabaseAdmin } = createSupabaseClients(req);
    
    const { data: listing, error: listingError } = await supabaseAdmin
      .from('listings')
      .select('id, seller_id, location, pickup_address, pickup_city, pickup_state, crop, price')
      .eq('id', requestPayload.listing_id)
      .maybeSingle();

    if (listingError) {
      console.error('Listing error:', listingError);
      return errorResponse(500, 'Unable to load listing');
    }
    if (!listing) {
      return errorResponse(404, 'Listing not found');
    }

    const denoEnv = (globalThis as any).Deno;
    const terminalApiKey = denoEnv?.env.get('TERMINAL_AFRICA_API_KEY') || denoEnv?.env.get('TERMINAL_AFRICA_API_KEY');
    
    // ShipBubble removed - Terminal Africa is now primary provider
    const shipbubbleApiKey = undefined;

    const quantity = Math.max(1, Number(payload.quantity ?? 1));
    const unitWeight = Number(payload.unit_weight ?? 25);
    const totalWeight = unitWeight * quantity;

    const senderAddress = parseAddress(
      payload.sender_address || (listing as any).pickup_address || (listing as any).location || 'Lagos, Nigeria',
      payload.sender_name || 'Seller',
      payload.sender_email || 'seller@marketplace.com',
      payload.sender_phone || '08000000000',
      payload.sender_city || (listing as any).pickup_city,
      payload.sender_state || (listing as any).pickup_state
    );

    const receiverAddress = parseAddress(
      payload.receiver_address || 'Lagos, Nigeria',
      payload.receiver_name || 'Buyer',
      payload.receiver_email || 'buyer@marketplace.com',
      payload.receiver_phone || '08000000000',
      payload.receiver_city,
      payload.receiver_state
    );

    const items: ParcelItem[] = payload.package_items?.map((item: any) => ({
      name: item.name,
      description: item.description,
      weight: item.unit_weight,
      value: item.unit_amount,
      quantity: item.quantity,
    })) || [{
      name: (listing as any).crop || 'Agricultural Produce',
      description: `${(listing as any).crop || 'Produce'} - ${quantity} units`,
      weight: unitWeight,
      value: Number((listing as any).price || 1000),
      quantity: quantity,
    }];

    const quoteRequest: DeliveryQuoteRequest = {
      pickup_address: senderAddress,
      delivery_address: receiverAddress,
      items,
      dimension: payload.package_dimension,
      pickup_date: payload.pickup_date,
    };

    console.log('Quote request:', JSON.stringify(quoteRequest, null, 2));

    const quote = await getDeliveryQuote(quoteRequest, terminalApiKey, shipbubbleApiKey);

    try {
      await supabaseAdmin.from('shipment_intents').insert({
        order_id: requestPayload.order_id ?? null,
        quote_id: quote.quote_id || `${quote.provider}-${Date.now()}`,
        provider: quote.provider === 'terminal_africa' ? 'Terminal Africa' : 'Fallback',
        request_payload: quoteRequest,
        response_payload: quote,
        status: 'quoted',
      });
    } catch (dbError) {
      console.error('Failed to store shipment intent:', dbError);
    }

    return jsonResponse({
      success: quote.success,
      quote_id: quote.quote_id,
      provider: quote.provider,
      fee: quote.estimated_fee,
      currency: quote.currency,
      quantity,
      total_weight: totalWeight,
      fallback_used: quote.provider === 'fallback',
      couriers: quote.couriers,
      cheapest_courier: quote.cheapest,
      fastest_courier: quote.fastest,
      listing: {
        id: listing.id,
        seller_id: (listing as any).seller_id,
        location: (listing as any).location,
        pickup_address: (listing as any).pickup_address,
        pickup_city: (listing as any).pickup_city,
        pickup_state: (listing as any).pickup_state,
        crop: (listing as any).crop,
        price: (listing as any).price,
      },
      addresses: {
        pickup: senderAddress,
        delivery: receiverAddress,
      },
      error: quote.error,
      debug: quote.debug,
    });
  } catch (error) {
    console.error('delivery-quote error:', error);
    return errorResponse(500, 'Unexpected error');
  }
});
