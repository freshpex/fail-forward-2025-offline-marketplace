/**
 * Multi-Provider Delivery Service
 * Supports Terminal Africa (primary) and ShipBubble (fallback)
 * Designed for Nigerian agricultural marketplace
 */

// ==================== TYPES ====================

export interface DeliveryAddress {
  name: string;
  email: string;
  phone: string;
  line1: string;         // Street address
  city: string;
  state: string;
  country?: string;      // Default: NG (Nigeria)
  zip?: string;
}

export interface ParcelItem {
  name: string;
  description: string;
  weight: number;        // in kg
  value: number;         // in NGN
  quantity: number;
}

export interface PackageDimension {
  length: number;        // cm
  width: number;         // cm
  height: number;        // cm
}

export interface DeliveryQuoteRequest {
  pickup_address: DeliveryAddress;
  delivery_address: DeliveryAddress;
  items: ParcelItem[];
  dimension?: PackageDimension;
  pickup_date?: string;  // YYYY-MM-DD format
}

export interface CourierOption {
  id: string;
  courier_id: string;  // For frontend compatibility
  carrier_id: string;  // Original Terminal Africa field
  courier_name: string;  // For frontend compatibility
  carrier_name: string;  // Original Terminal Africa field
  carrier_logo?: string;
  amount: number;
  total: number;  // For frontend compatibility (same as amount)
  currency: string;
  delivery_time: string;
  delivery_eta: string;  // For frontend compatibility (same as delivery_time)
  pickup_time?: string;
  service_type?: string;
}

export interface DeliveryQuoteResponse {
  success: boolean;
  provider: 'terminal_africa' | 'shipbubble' | 'fallback';
  quote_id?: string;
  couriers: CourierOption[];
  cheapest?: CourierOption;
  fastest?: CourierOption;
  estimated_fee: number;
  currency: string;
  error?: string;
  debug?: unknown;
}

// ==================== TERMINAL AFRICA ====================

const TERMINAL_API_BASE = 'https://api.terminal.africa/v1';

async function terminalRequest(
  apiKey: string,
  endpoint: string,
  method: 'GET' | 'POST' = 'GET',
  body?: unknown
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  try {
    const url = endpoint.startsWith('http') ? endpoint : `${TERMINAL_API_BASE}${endpoint}`;
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    
    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.error(`Terminal Africa ${endpoint}: Non-JSON response (${response.status})`);
      return { success: false, error: `Server error: ${response.status}` };
    }
    
    const data = await response.json();
    console.log(`Terminal Africa ${endpoint}:`, response.status, JSON.stringify(data).substring(0, 500));
    
    if (response.ok && data?.status === true) {
      return { success: true, data: data.data };
    }
    return { success: false, error: data?.message || 'Terminal Africa request failed' };
  } catch (err) {
    console.error('Terminal Africa error:', err);
    return { success: false, error: String(err) };
  }
}

async function createTerminalAddress(
  apiKey: string,
  address: DeliveryAddress
): Promise<{ success: boolean; address_id?: string; error?: string }> {
  const nameParts = address.name.split(' ');
  const result = await terminalRequest(apiKey, '/addresses', 'POST', {
    first_name: nameParts[0] || 'Customer',
    last_name: nameParts.slice(1).join(' ') || 'User',
    email: address.email,
    phone: address.phone.startsWith('+') ? address.phone : `+234${address.phone.replace(/^0/, '')}`,
    line1: address.line1,
    city: address.city,
    state: address.state,
    country: address.country || 'NG',
    zip: address.zip || '',
    is_residential: true,
  });
  
  if (result.success && (result.data as any)?.address_id) {
    return { success: true, address_id: (result.data as any).address_id };
  }
  return { success: false, error: result.error };
}

async function createTerminalParcel(
  apiKey: string,
  items: ParcelItem[],
  dimension?: PackageDimension
): Promise<{ success: boolean; parcel_id?: string; error?: string }> {
  const totalWeight = items.reduce((sum, item) => sum + (item.weight * item.quantity), 0);
  
  const result = await terminalRequest(apiKey, '/parcels', 'POST', {
    description: items.map(i => `${i.quantity}x ${i.name}`).join(', '),
    weight: totalWeight,
    weight_unit: 'kg',
    items: items.map(item => ({
      name: item.name,
      description: item.description,
      weight: item.weight,
      value: item.value,
      quantity: item.quantity,
      currency: 'NGN',
    })),
    // Include packaging dimensions if provided
    ...(dimension && {
      packaging: 'other',
      metadata: {
        length: dimension.length,
        width: dimension.width,
        height: dimension.height,
      }
    }),
  });
  
  if (result.success && (result.data as any)?.parcel_id) {
    return { success: true, parcel_id: (result.data as any).parcel_id };
  }
  return { success: false, error: result.error };
}

async function getTerminalRates(
  apiKey: string,
  pickupAddressId: string,
  deliveryAddressId: string,
  parcelId: string
): Promise<{ success: boolean; rates?: CourierOption[]; error?: string }> {
  const result = await terminalRequest(
    apiKey,
    `/rates/shipment?pickup_address=${pickupAddressId}&delivery_address=${deliveryAddressId}&parcel_id=${parcelId}`,
    'GET'
  );
  
  if (result.success && Array.isArray(result.data)) {
    const rates = (result.data as any[]).map(rate => ({
      id: rate.id || rate.rate_id,
      courier_id: rate.id || rate.rate_id,  // Frontend compatibility
      carrier_id: rate.carrier_id,
      courier_name: rate.carrier_name,  // Frontend compatibility
      carrier_name: rate.carrier_name,
      carrier_logo: rate.carrier_logo,
      amount: rate.amount,
      total: rate.amount,  // Frontend compatibility
      currency: rate.currency || 'NGN',
      delivery_time: rate.delivery_time,
      delivery_eta: rate.delivery_time,  // Frontend compatibility
      pickup_time: rate.pickup_time,
      service_type: rate.carrier_rate_description,
    }));
    return { success: true, rates };
  }
  return { success: false, error: result.error };
}

export async function getTerminalAfricaQuote(
  apiKey: string,
  request: DeliveryQuoteRequest
): Promise<DeliveryQuoteResponse> {
  try {
    // Step 1: Create pickup address
    const pickupResult = await createTerminalAddress(apiKey, request.pickup_address);
    if (!pickupResult.success) {
      return {
        success: false,
        provider: 'terminal_africa',
        couriers: [],
        estimated_fee: 0,
        currency: 'NGN',
        error: `Pickup address error: ${pickupResult.error}`,
      };
    }
    
    // Step 2: Create delivery address
    const deliveryResult = await createTerminalAddress(apiKey, request.delivery_address);
    if (!deliveryResult.success) {
      return {
        success: false,
        provider: 'terminal_africa',
        couriers: [],
        estimated_fee: 0,
        currency: 'NGN',
        error: `Delivery address error: ${deliveryResult.error}`,
      };
    }
    
    // Step 3: Create parcel
    const parcelResult = await createTerminalParcel(apiKey, request.items, request.dimension);
    if (!parcelResult.success) {
      return {
        success: false,
        provider: 'terminal_africa',
        couriers: [],
        estimated_fee: 0,
        currency: 'NGN',
        error: `Parcel error: ${parcelResult.error}`,
      };
    }
    
    // Step 4: Get rates
    const ratesResult = await getTerminalRates(
      apiKey,
      pickupResult.address_id!,
      deliveryResult.address_id!,
      parcelResult.parcel_id!
    );
    
    if (!ratesResult.success || !ratesResult.rates?.length) {
      return {
        success: false,
        provider: 'terminal_africa',
        couriers: [],
        estimated_fee: 0,
        currency: 'NGN',
        error: ratesResult.error || 'No rates available',
      };
    }
    
    // Sort by price to find cheapest
    const sortedByPrice = [...ratesResult.rates].sort((a, b) => a.amount - b.amount);
    const cheapest = sortedByPrice[0];
    
    // Find fastest (shortest delivery time)
    const fastest = ratesResult.rates.reduce((fast, curr) => {
      const currDays = parseInt(curr.delivery_time) || 999;
      const fastDays = parseInt(fast.delivery_time) || 999;
      return currDays < fastDays ? curr : fast;
    }, ratesResult.rates[0]);
    
    return {
      success: true,
      provider: 'terminal_africa',
      quote_id: `TA-${Date.now()}`,
      couriers: ratesResult.rates,
      cheapest,
      fastest,
      estimated_fee: cheapest.amount,
      currency: 'NGN',
    };
  } catch (err) {
    console.error('Terminal Africa quote error:', err);
    return {
      success: false,
      provider: 'terminal_africa',
      couriers: [],
      estimated_fee: 0,
      currency: 'NGN',
      error: String(err),
    };
  }
}

// ==================== SHIPBUBBLE ====================

const SHIPBUBBLE_API_BASE = 'https://api.shipbubble.com/v1';

// ShipBubble category IDs
const SHIPBUBBLE_CATEGORIES = {
  GROCERIES: 2178251,
  DRY_FOOD: 24032950,
  HOT_FOOD: 98190590,
};

async function validateShipbubbleAddress(
  apiKey: string,
  address: DeliveryAddress
): Promise<{ success: boolean; address_code?: number; formatted_address?: string; error?: string }> {
  try {
    const fullAddress = `${address.line1}, ${address.city}, ${address.state}, Nigeria`;
    const response = await fetch(`${SHIPBUBBLE_API_BASE}/shipping/address/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        name: address.name,
        email: address.email,
        phone: address.phone,
        address: fullAddress,
      }),
    });
    
    const data = await response.json();
    console.log('ShipBubble validate address:', response.status, JSON.stringify(data));
    
    if (response.ok && data?.status === 'success' && data?.data?.address_code) {
      return { 
        success: true, 
        address_code: data.data.address_code,
        formatted_address: data.data.formatted_address,
      };
    }
    return { success: false, error: data?.message || 'Address validation failed' };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

export async function getShipbubbleQuote(
  apiKey: string,
  request: DeliveryQuoteRequest
): Promise<DeliveryQuoteResponse> {
  try {
    // Validate addresses
    const senderResult = await validateShipbubbleAddress(apiKey, request.pickup_address);
    const receiverResult = await validateShipbubbleAddress(apiKey, request.delivery_address);
    
    if (!senderResult.success || !receiverResult.success) {
      return {
        success: false,
        provider: 'shipbubble',
        couriers: [],
        estimated_fee: 0,
        currency: 'NGN',
        error: `Address validation failed: ${senderResult.error || receiverResult.error}`,
      };
    }
    
    // Prepare fetch_rates payload
    const totalWeight = request.items.reduce((sum, item) => sum + (item.weight * item.quantity), 0);
    const totalValue = request.items.reduce((sum, item) => sum + (item.value * item.quantity), 0);
    
    const payload = {
      sender_address_code: senderResult.address_code,
      receiver_address_code: receiverResult.address_code,
      pickup_date: request.pickup_date || new Date(Date.now() + 86400000).toISOString().split('T')[0],
      category_id: SHIPBUBBLE_CATEGORIES.GROCERIES,
      package_items: request.items.map(item => ({
        name: item.name,
        description: item.description,
        unit_weight: item.weight,
        unit_amount: item.value,
        quantity: item.quantity,
      })),
      package_dimension: request.dimension || { length: 50, width: 40, height: 30 },
    };
    
    console.log('ShipBubble fetch_rates payload:', JSON.stringify(payload));
    
    const response = await fetch(`${SHIPBUBBLE_API_BASE}/shipping/fetch_rates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });
    
    const data = await response.json();
    console.log('ShipBubble fetch_rates:', response.status, JSON.stringify(data));
    
    if (response.ok && data?.status === 'success' && data?.data?.couriers) {
      const couriers: CourierOption[] = data.data.couriers.map((c: any) => ({
        id: c.courier_id,
        courier_id: c.courier_id,
        carrier_id: c.courier_id,
        courier_name: c.courier_name,
        carrier_name: c.courier_name,
        carrier_logo: c.courier_image,
        amount: c.total,
        total: c.total,
        currency: 'NGN',
        delivery_time: c.delivery_eta || 'Varies',
        delivery_eta: c.delivery_eta || 'Varies',
        service_type: c.service_type,
      }));
      
      const cheapest = data.data.cheapest_courier ? {
        id: data.data.cheapest_courier.courier_id,
        courier_id: data.data.cheapest_courier.courier_id,
        carrier_id: data.data.cheapest_courier.courier_id,
        courier_name: data.data.cheapest_courier.courier_name,
        carrier_name: data.data.cheapest_courier.courier_name,
        amount: data.data.cheapest_courier.total,
        total: data.data.cheapest_courier.total,
        currency: 'NGN',
        delivery_time: data.data.cheapest_courier.delivery_eta || 'Varies',
        delivery_eta: data.data.cheapest_courier.delivery_eta || 'Varies',
      } : couriers[0];
      
      return {
        success: true,
        provider: 'shipbubble',
        quote_id: data.data.request_token,
        couriers,
        cheapest,
        fastest: couriers[0], // ShipBubble doesn't indicate fastest
        estimated_fee: cheapest?.amount || couriers[0]?.amount || 0,
        currency: 'NGN',
      };
    }
    
    return {
      success: false,
      provider: 'shipbubble',
      couriers: [],
      estimated_fee: 0,
      currency: 'NGN',
      error: data?.message || 'Failed to get rates',
      debug: { shipbubble_status: response.status, shipbubble_response: data },
    };
  } catch (err) {
    return {
      success: false,
      provider: 'shipbubble',
      couriers: [],
      estimated_fee: 0,
      currency: 'NGN',
      error: String(err),
    };
  }
}

// ==================== FALLBACK PRICING ====================

// Nigerian states grouped by region for distance estimation
const STATE_ZONES: Record<string, number> = {
  // Zone 1 - South-West
  'lagos': 1, 'ogun': 1, 'oyo': 1, 'osun': 1, 'ondo': 1, 'ekiti': 1,
  // Zone 2 - South-South
  'edo': 2, 'delta': 2, 'bayelsa': 2, 'rivers': 2, 'cross river': 2, 'akwa ibom': 2,
  // Zone 3 - South-East
  'abia': 3, 'anambra': 3, 'ebonyi': 3, 'enugu': 3, 'imo': 3,
  // Zone 4 - North-Central
  'kwara': 4, 'kogi': 4, 'benue': 4, 'plateau': 4, 'nasarawa': 4, 'niger': 4, 'fct': 4, 'abuja': 4,
  // Zone 5 - North-West
  'kaduna': 5, 'katsina': 5, 'kano': 5, 'jigawa': 5, 'kebbi': 5, 'sokoto': 5, 'zamfara': 5,
  // Zone 6 - North-East
  'bauchi': 6, 'gombe': 6, 'adamawa': 6, 'taraba': 6, 'borno': 6, 'yobe': 6,
};

function getStateZone(state: string): number {
  const lowerState = state.toLowerCase().trim();
  for (const [stateName, zone] of Object.entries(STATE_ZONES)) {
    if (lowerState.includes(stateName)) return zone;
  }
  return 1; // Default to zone 1
}

export function calculateFallbackFee(
  pickupState: string,
  deliveryState: string,
  totalWeightKg: number
): number {
  const pickupZone = getStateZone(pickupState);
  const deliveryZone = getStateZone(deliveryState);
  const zoneDiff = Math.abs(pickupZone - deliveryZone);
  
  // Base rate per kg based on zone distance
  const ratePerKg = zoneDiff === 0 ? 80 : zoneDiff === 1 ? 120 : zoneDiff === 2 ? 180 : 250;
  
  // Base fee based on zone distance
  const baseFee = zoneDiff === 0 ? 1500 : zoneDiff === 1 ? 2500 : zoneDiff === 2 ? 4000 : 6000;
  
  // Weight-based fee
  const weightFee = Math.max(totalWeightKg, 1) * ratePerKg;
  
  // Handling fee for heavy items
  const handlingFee = totalWeightKg > 100 ? 2000 : totalWeightKg > 50 ? 1000 : totalWeightKg > 20 ? 500 : 0;
  
  return Math.round(baseFee + weightFee + handlingFee);
}

export function getFallbackQuote(request: DeliveryQuoteRequest): DeliveryQuoteResponse {
  const totalWeight = request.items.reduce((sum, item) => sum + (item.weight * item.quantity), 0);
  const fee = calculateFallbackFee(
    request.pickup_address.state,
    request.delivery_address.state,
    totalWeight
  );
  
  // Create simulated courier options
  const standardFee = fee;
  const expressFee = Math.round(fee * 1.5);
  
  const standardCourier: CourierOption = {
    id: 'fallback-standard',
    courier_id: 'fallback-standard',
    carrier_id: 'standard',
    courier_name: 'Standard Delivery',
    carrier_name: 'Standard Delivery',
    amount: standardFee,
    total: standardFee,
    currency: 'NGN',
    delivery_time: 'Within 3-5 business days',
    delivery_eta: 'Within 3-5 business days',
    service_type: 'standard',
  };
  
  const expressCourier: CourierOption = {
    id: 'fallback-express',
    courier_id: 'fallback-express',
    carrier_id: 'express',
    courier_name: 'Express Delivery',
    carrier_name: 'Express Delivery',
    amount: expressFee,
    total: expressFee,
    currency: 'NGN',
    delivery_time: 'Within 1-2 business days',
    delivery_eta: 'Within 1-2 business days',
    service_type: 'express',
  };
  
  return {
    success: true,
    provider: 'fallback',
    quote_id: `FB-${Date.now()}`,
    couriers: [standardCourier, expressCourier],
    cheapest: standardCourier,
    fastest: expressCourier,
    estimated_fee: standardFee,
    currency: 'NGN',
  };
}

// ==================== MAIN QUOTE FUNCTION ====================

export async function getDeliveryQuote(
  request: DeliveryQuoteRequest,
  terminalApiKey?: string,
  shipbubbleApiKey?: string
): Promise<DeliveryQuoteResponse> {
  // Try Terminal Africa first (primary provider)
  if (terminalApiKey) {
    console.log('Attempting Terminal Africa quote...');
    const terminalResult = await getTerminalAfricaQuote(terminalApiKey, request);
    if (terminalResult.success && terminalResult.couriers.length > 0) {
      console.log('Terminal Africa quote successful');
      return terminalResult;
    }
    console.log('Terminal Africa failed:', terminalResult.error);
  }
  
  // Try ShipBubble as fallback
  if (shipbubbleApiKey) {
    console.log('Attempting ShipBubble quote...');
    const shipbubbleResult = await getShipbubbleQuote(shipbubbleApiKey, request);
    if (shipbubbleResult.success && shipbubbleResult.couriers.length > 0) {
      console.log('ShipBubble quote successful');
      return shipbubbleResult;
    }
    console.log('ShipBubble failed:', shipbubbleResult.error);
  }
  
  // Use fallback pricing
  console.log('Using fallback pricing');
  return getFallbackQuote(request);
}
