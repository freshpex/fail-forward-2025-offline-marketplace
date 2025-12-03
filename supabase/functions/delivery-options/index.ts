// @deno-types="https://deno.land/std@0.224.0/http/server.ts"
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createSupabaseClients } from '../_shared/supabaseClient.ts';
import { errorResponse, jsonResponse } from '../_shared/response.ts';

interface DeliveryOptionsRequest {
  listing_id?: string;
}

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

  let payload: DeliveryOptionsRequest;
  try {
    payload = await req.json();
  } catch (_err) {
    return errorResponse(400, 'Invalid JSON payload');
  }

  if (!payload.listing_id) {
    return errorResponse(400, 'listing_id is required');
  }

  try {
    const { supabaseAdmin, supabaseUser } = createSupabaseClients(req);
    
    // Try to get authenticated user, but allow guests
    let requesterId: string | null = null;
    let requesterEmail: string | null = null;
    
    const {
      data: { user },
    } = await supabaseUser.auth.getUser();
    
    if (user) {
      requesterId = user.id;
      requesterEmail = user.email ?? null;
    }

    const { data: listing, error: listingError } = await supabaseAdmin
      .from('listings')
      .select('id, location, seller_id, farmer_name')
      .eq('id', payload.listing_id)
      .maybeSingle();

    if (listingError) {
      console.error('Failed to load listing', listingError);
      return errorResponse(500, 'Failed to load listing information');
    }

    if (!listing) {
      return errorResponse(404, 'Listing not found');
    }

    const { data: sellerProfile } = listing.seller_id
      ? await supabaseAdmin
          .from('profiles')
          .select('id, full_name, seller_verified, role')
          .eq('id', listing.seller_id)
          .maybeSingle()
      : { data: null };

    const options = [
      {
        id: 'manual_pickup',
        label: 'Manual Pickup / Arrange Yourself',
        type: 'manual' as const,
        fee: 0,
        currency: 'NGN',
        estimated_timeframe: 'Coordinate directly with the seller',
        notes: 'Exchange contact details and coordinate pickup or your preferred logistics provider.',
      },
      {
        id: 'in_app_delivery',
        label: 'In-App Delivery via Terminal Africa',
        type: 'in_app' as const,
        provider: 'TerminalAfrica',
        currency: 'NGN',
        requires_quote: true,
        estimated_timeframe: 'Dispatch within 24 hours after seller confirmation',
        carriers: ['DHL', 'FedEx', 'GIG', 'Kwik', 'UPS', 'and more'],
      },
    ];

    return jsonResponse({
      options,
      listing: {
        id: listing.id,
        location: listing.location,
        farmer_name: listing.farmer_name,
      },
      seller: sellerProfile
        ? {
            id: sellerProfile.id,
            name: sellerProfile.full_name,
            verified: sellerProfile.seller_verified,
            role: sellerProfile.role,
          }
        : null,
      requester: requesterId
        ? {
            id: requesterId,
            email: requesterEmail,
          }
        : null,
    });
  } catch (error) {
    console.error('delivery-options error', error);
    return errorResponse(500, 'Unexpected error fetching delivery options');
  }
});
