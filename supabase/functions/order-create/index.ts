// @deno-types="https://deno.land/std@0.224.0/http/server.ts"
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createSupabaseClients } from '../_shared/supabaseClient.ts';
import { errorResponse, jsonResponse } from '../_shared/response.ts';

interface ManualDetails {
  buyer_name: string;
  buyer_phone: string;
  buyer_email?: string;
  delivery_address?: string;
  instructions?: string;
  scheduled_date?: string;
}

interface OrderCreateRequest {
  listing_id?: string;
  delivery_method?: 'manual' | 'in_app';
  delivery_quote_id?: string;
  delivery_details?: Record<string, unknown> | null;
  payment_amount?: number;
  delivery_fee?: number;
  currency?: string;
  quantity?: number;
  manual_details?: ManualDetails;
  metadata?: Record<string, unknown>;
}

function generateOrderReference(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomUUID().slice(0, 6).toUpperCase();
  return `ORD-${timestamp}-${random}`;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
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

  let payload: OrderCreateRequest;
  try {
    payload = await req.json();
  } catch (_err) {
    return errorResponse(400, 'Invalid JSON payload');
  }

  if (!payload.listing_id) {
    return errorResponse(400, 'listing_id is required');
  }

  if (!payload.delivery_method) {
    return errorResponse(400, 'delivery_method is required');
  }

  if (typeof payload.payment_amount !== 'number') {
    return errorResponse(400, 'payment_amount must be provided');
  }

  // Validate buyer details
  if (!payload.manual_details?.buyer_name || !payload.manual_details?.buyer_phone) {
    return errorResponse(400, 'buyer_name and buyer_phone are required');
  }

  try {
    const { supabaseAdmin, supabaseUser } = createSupabaseClients(req);
    
    // Try to get authenticated user, but allow guest checkout
    let buyerId: string | null = null;
    let buyerEmail: string | null = null;
    
    const {
      data: { user },
    } = await supabaseUser.auth.getUser();
    
    if (user) {
      buyerId = user.id;
      buyerEmail = user.email ?? null;
    }

    const { data: listing, error: listingError } = await supabaseAdmin
      .from('listings')
      .select('id, seller_id, user_id, price, unit, package_type, measurement_unit, measurement_value, unit_description, crop, location, pickup_address')
      .eq('id', payload.listing_id)
      .maybeSingle();

    if (listingError) {
      console.error('Failed to load listing', listingError);
      return errorResponse(500, 'Unable to load listing data', listingError);
    }

    if (!listing) {
      return errorResponse(404, 'Listing not found');
    }

    // Use seller_id, fallback to user_id (legacy listings)
    const sellerId = listing.seller_id ?? (listing as any).user_id;
    
    if (!sellerId) {
      return errorResponse(422, 'Listing is missing seller information');
    }

    // If seller_id was missing but user_id exists, backfill it
    if (!listing.seller_id && sellerId) {
      await supabaseAdmin
        .from('listings')
        .update({ seller_id: sellerId })
        .eq('id', listing.id);
    }

    const quantity = Math.max(1, Number(payload.quantity ?? 1));
    const orderReference = generateOrderReference();
    const producePrice = Number(listing.price ?? 0) * quantity;
    const deliveryPrice = Number(payload.delivery_fee ?? payload.metadata?.delivery_fee ?? 0);
    const totalPrice = producePrice + deliveryPrice;
    const finalBuyerEmail = payload.manual_details?.buyer_email || buyerEmail || 'guest@marketplace.com';

    // Build the order object with ALL required fields based on actual schema
    const orderData: Record<string, unknown> = {
      listing_id: listing.id,
      buyer_id: buyerId,
      seller_id: sellerId,
      order_reference: orderReference,
      quantity: quantity,
      produce_price: producePrice,
      delivery_price: deliveryPrice,
      platform_commission: 0,
      total_price: totalPrice,
      payment_status: 'pending',
      status: 'created',
      pickup_address: listing.pickup_address || listing.location || 'To be confirmed',
      dropoff_address: payload.manual_details?.delivery_address || 'To be confirmed',
      buyer_contact: payload.manual_details?.buyer_phone,
      buyer_email: finalBuyerEmail,
      currency: payload.currency ?? 'NGN',
      delivery_method: payload.delivery_method,
      delivery_quote: payload.delivery_details ?? null,
      total_amount: payload.payment_amount,
      metadata: {
        ...(payload.metadata ?? {}),
        crop: listing.crop,
        unit_price: listing.price,
        unit: listing.unit,
        package_type: (listing as any).package_type ?? listing.unit,
        measurement_unit: (listing as any).measurement_unit ?? null,
        measurement_value: (listing as any).measurement_value ?? null,
        unit_description: (listing as any).unit_description ?? null,
        quantity,
        buyer_name: payload.manual_details?.buyer_name ?? null,
        buyer_phone: payload.manual_details?.buyer_phone ?? null,
      },
    };

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert(orderData)
      .select()
      .maybeSingle();

    if (orderError || !order) {
      console.error('Failed to create order', orderError);
      return errorResponse(500, 'Failed to create order', orderError);
    }

    if (payload.delivery_method === 'manual' && payload.manual_details) {
      const { error: manualError } = await supabaseAdmin.from('manual_orders').insert({
        order_id: order.id,
        buyer_name: payload.manual_details.buyer_name,
        buyer_phone: payload.manual_details.buyer_phone,
        instructions: payload.manual_details.instructions ?? null,
        scheduled_date: payload.manual_details.scheduled_date ?? null,
      });

      if (manualError) {
        console.error('Failed to store manual delivery details', manualError);
      }
    }

    if (payload.delivery_method === 'in_app' && payload.delivery_quote_id) {
      const { error: updateIntentError } = await supabaseAdmin
        .from('shipment_intents')
        .update({ order_id: order.id })
        .eq('quote_id', payload.delivery_quote_id);

      if (updateIntentError) {
        console.error('Failed to link shipment intent with order', updateIntentError);
      }
    }

    return jsonResponse({ order });
  } catch (error) {
    console.error('order-create error', error);
    return errorResponse(500, 'Unexpected error creating order', error);
  }
});

