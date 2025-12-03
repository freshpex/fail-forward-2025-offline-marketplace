// @deno-types="https://deno.land/std@0.224.0/http/server.ts"
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createSupabaseClients } from '../_shared/supabaseClient.ts';
import { getUserContext } from '../_shared/auth.ts';
import { errorResponse, jsonResponse } from '../_shared/response.ts';

interface DeliveryBookRequest {
  rate_id: string;
  order_id: string;
  sender: {
    name: string;
    phone: string;
    email?: string;
    address: string;
    city: string;
    state: string;
    country?: string;
  };
  receiver: {
    name: string;
    phone: string;
    email?: string;
    address: string;
    city: string;
    state: string;
    country?: string;
  };
  parcel: {
    weight: number;
    length: number;
    width: number;
    height: number;
    description?: string;
  };
}

// Terminal Africa API helper
async function terminalRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
  const apiKey = Deno.env.get('TERMINAL_AFRICA_API_KEY');
  if (!apiKey) {
    throw new Error('Terminal Africa API key not configured');
  }

  const baseUrl = 'https://api.terminal.africa/v1';
  const response = await fetch(`${baseUrl}${endpoint}`, {
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

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || data.error || `Terminal Africa API error: ${response.status}`);
  }

  return data;
}

// Create address in Terminal Africa
async function createAddress(addressData: DeliveryBookRequest['sender'] | DeliveryBookRequest['receiver']): Promise<string> {
  // Parse address into components
  const nameParts = addressData.name.split(' ');
  const firstName = nameParts[0] || 'Customer';
  const lastName = nameParts.slice(1).join(' ') || 'Customer';

  const payload = {
    first_name: firstName,
    last_name: lastName,
    email: addressData.email || 'customer@example.com',
    phone: addressData.phone,
    line1: addressData.address,
    city: addressData.city,
    state: addressData.state,
    country: addressData.country || 'NG',
    is_residential: true,
  };

  const result = await terminalRequest('/addresses', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return result.data.address_id;
}

// Create parcel in Terminal Africa
async function createParcel(parcelData: DeliveryBookRequest['parcel']): Promise<string> {
  const payload = {
    description: parcelData.description || 'Agricultural produce',
    packaging: 'box',
    weight: parcelData.weight,
    items: [
      {
        name: parcelData.description || 'Agricultural produce',
        description: parcelData.description || 'Fresh farm produce',
        currency: 'NGN',
        value: 5000,
        quantity: 1,
        weight: parcelData.weight,
      }
    ],
  };

  const result = await terminalRequest('/parcels', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return result.data.parcel_id;
}

// Book shipment with Terminal Africa
async function bookShipment(
  pickupAddressId: string,
  deliveryAddressId: string,
  parcelId: string,
  rateId: string
): Promise<any> {
  const payload = {
    rate_id: rateId,
    pickup_address: pickupAddressId,
    delivery_address: deliveryAddressId,
    parcel: parcelId,
    shipment_type: 'dropoff',
    payment_method: 'wallet',
    metadata: {
      source: 'agric-marketplace',
    },
  };

  const result = await terminalRequest('/shipments', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return result.data;
}

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return errorResponse(405, 'Method not allowed');
  }

  let body: DeliveryBookRequest;
  try {
    body = await req.json();
  } catch (_err) {
    return errorResponse(400, 'Invalid JSON payload');
  }

  // Validate required fields
  if (!body.rate_id) {
    return errorResponse(400, 'rate_id is required');
  }
  if (!body.order_id) {
    return errorResponse(400, 'order_id is required');
  }
  if (!body.sender || !body.receiver) {
    return errorResponse(400, 'sender and receiver information is required');
  }
  if (!body.parcel) {
    return errorResponse(400, 'parcel information is required');
  }

  try {
    const { supabaseAdmin, supabaseUser } = createSupabaseClients(req);
    const context = await getUserContext(req, supabaseUser, supabaseAdmin);

    if (context instanceof Response) {
      return context;
    }

    console.log('Creating addresses and parcel for shipment booking...');

    // Create addresses and parcel in parallel
    const [pickupAddressId, deliveryAddressId, parcelId] = await Promise.all([
      createAddress(body.sender),
      createAddress(body.receiver),
      createParcel(body.parcel),
    ]);

    console.log('Created resources:', { pickupAddressId, deliveryAddressId, parcelId });

    // Book the shipment
    const shipment = await bookShipment(
      pickupAddressId,
      deliveryAddressId,
      parcelId,
      body.rate_id
    );

    console.log('Shipment booked:', shipment);

    // Update order with shipment details
    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({
        delivery_tracking_id: shipment.shipment_id,
        delivery_status: 'booked',
        delivery_carrier: shipment.carrier?.name || 'Terminal Africa',
        delivery_booked_at: new Date().toISOString(),
      })
      .eq('id', body.order_id);

    if (updateError) {
      console.error('Failed to update order:', updateError);
      // Don't fail the request, shipment is already booked
    }

    return jsonResponse({
      success: true,
      shipment: {
        id: shipment.shipment_id,
        tracking_id: shipment.tracking_number || shipment.shipment_id,
        carrier: shipment.carrier?.name || 'Terminal Africa',
        status: shipment.status || 'booked',
        pickup_address_id: pickupAddressId,
        delivery_address_id: deliveryAddressId,
        parcel_id: parcelId,
        estimated_delivery: shipment.estimated_delivery || null,
      },
    });
  } catch (error) {
    console.error('Delivery booking error:', error);
    return errorResponse(
      500,
      error instanceof Error ? error.message : 'Failed to book delivery'
    );
  }
});
