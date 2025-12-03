import { supabase } from './supabase';
import {
  Order,
  SellerVerification,
  Shipment,
  ShipmentIntent,
} from '../types';

interface DeliveryOptionsResponse {
  options: Array<{
    id: string;
    label: string;
    type: 'manual' | 'in_app';
    fee?: number;
    currency?: string;
    estimated_timeframe?: string;
    notes?: string;
    provider?: string;
    requires_quote?: boolean;
  }>;
  seller: {
    id: string;
    name?: string | null;
    verified?: boolean;
    role?: string;
  } | null;
}

interface DeliveryQuotePayload {
  listing_id: string;
  order_id?: string;
  payload: Record<string, unknown>;
}

interface DeliveryQuoteResponse {
  quote_id: string;
  quote: unknown;
  fee?: number;
  currency?: string;
  quantity?: number;
  fallback_used?: boolean;
  intent?: unknown;
  listing?: unknown;
}

interface OrderCreatePayload {
  listing_id: string;
  delivery_method: 'manual' | 'in_app';
  delivery_quote_id?: string;
  delivery_details?: Record<string, unknown> | null;
  payment_amount: number;
  currency?: string;
  quantity?: number;
  manual_details?: {
    buyer_name: string;
    buyer_phone: string;
    instructions?: string;
    scheduled_date?: string;
  };
  metadata?: Record<string, unknown>;
}

interface PaymentVerifyPayload {
  order_id: string;
  payment_reference: string;
}

interface MarkReadyPayload {
  order_id: string;
  status?: 'ready_for_pickup' | 'in_transit';
}

interface DeliveryBookPayload {
  order_id: string;
  rate_id: string;
  shipment_details?: Record<string, unknown>;
}

interface DeliveryTrackPayload {
  order_id?: string;
  tracking_number?: string;
}

interface OrderCompletePayload {
  order_id: string;
  notes?: string;
}

interface SellerVerifyPayload {
  document_path: string;
  document_type?: string;
  additional_info?: string;
}

interface ApproveSellerPayload {
  verification_id: string;
  approve: boolean;
  rejection_reason?: string;
}

async function invokeFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>(name, { body });

  if (error) {
    console.error(`Edge function ${name} failed`, error);
    // Check if there are details in the error context or body
    if ('context' in error && error.context && typeof error.context === 'object' && 'json' in error.context) {
       try {
         const details = await (error.context as Response).json();
         console.error('Error details:', details);
         if (details.details) {
            throw new Error(`${details.error}: ${details.details}`);
         }
         if (details.error) {
            throw new Error(details.error);
         }
       } catch (e) {
         // ignore if we can't parse JSON
         if (e instanceof Error && e.message && !e.message.includes('JSON')) {
           throw e;
         }
       }
    }
    throw new Error(error.message ?? `Failed to execute ${name}`);
  }

  return data!;
}

export async function getDeliveryOptions(listingId: string) {
  return invokeFunction<DeliveryOptionsResponse>('delivery-options', { listing_id: listingId } as Record<string, unknown>);
}

export async function getDeliveryQuote(payload: DeliveryQuotePayload) {
  return invokeFunction<DeliveryQuoteResponse>('delivery-quote', payload as unknown as Record<string, unknown>);
}

export async function createOrder(payload: OrderCreatePayload) {
  const response = await invokeFunction<{ order: Order }>('order-create', payload as unknown as Record<string, unknown>);
  return response.order;
}

export async function verifyOrderPayment(payload: PaymentVerifyPayload) {
  const response = await invokeFunction<{ order: Order; verification: unknown }>('order-verify', payload as unknown as Record<string, unknown>);
  return response.order;
}

export async function markOrderReady(payload: MarkReadyPayload) {
  const response = await invokeFunction<{ order: Order }>('order-mark-ready', payload as unknown as Record<string, unknown>);
  return response.order;
}

export async function bookDelivery(payload: DeliveryBookPayload) {
  return invokeFunction<{ shipment: Shipment }>('delivery-book', payload as unknown as Record<string, unknown>);
}

export async function trackDelivery(payload: DeliveryTrackPayload) {
  return invokeFunction<{ shipment: Shipment; tracking: unknown }>('delivery-track', payload as unknown as Record<string, unknown>);
}

export async function completeOrder(payload: OrderCompletePayload) {
  const response = await invokeFunction<{ order: Order }>('order-complete', payload as unknown as Record<string, unknown>);
  return response.order;
}

export async function submitSellerVerification(payload: SellerVerifyPayload) {
  const response = await invokeFunction<{ verification: SellerVerification }>('seller-verify', payload as unknown as Record<string, unknown>);
  return response.verification;
}

export async function approveSellerVerification(payload: ApproveSellerPayload) {
  const response = await invokeFunction<{ verification: SellerVerification }>('admin-approve-seller', payload as unknown as Record<string, unknown>);
  return response.verification;
}

export async function listShipmentIntents(orderId: string) {
  const { data, error } = await supabase
    .from('shipment_intents')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to load shipment intents', error);
    throw new Error(error.message || 'Failed to load shipment intents');
  }

  return (data || []) as ShipmentIntent[];
}
