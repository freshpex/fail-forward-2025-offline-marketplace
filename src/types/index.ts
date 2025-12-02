export interface Listing {
  id: string;
  crop: string;
  quantity: number;
  unit: string;
  package_type?: string | null;
  measurement_unit?: string | null;
  measurement_value?: number | null;
  unit_description?: string | null;
  price?: number | null;
  location: string;
  contact_phone: string;
  contact_email?: string | null;
  farmer_name?: string | null;
  image_url?: string | null;
  pickup_address?: string | null;
  pickup_city?: string | null;
  pickup_state?: string | null;
  harvest_date?: string | null;
  preferred_schedule?: string | null;
  status: 'pending' | 'synced' | 'failed';
  created_at: string;
  updated_at: string;
  seller_id?: string | null;
  user_id?: string | null;
  seller_verified?: boolean;
  seller_profile?: SellerProfile | null;
}

export interface NewListing {
  crop: string;
  quantity: number;
  unit: string;
  package_type?: string;
  measurement_unit?: string;
  measurement_value?: number | null;
  unit_description?: string;
  price?: number | null;
  location: string;
  contact_phone: string;
  contact_email?: string;
  farmer_name?: string;
  image_url?: string;
  pickup_address?: string;
  pickup_city?: string;
  pickup_state?: string;
  harvest_date?: string;
  preferred_schedule?: string;
  seller_id?: string;
}

export interface PendingListing extends NewListing {
  localId: string;
  status: 'pending';
  created_at: string;
}

export interface ReferencePrice {
  id: string;
  crop: string;
  region: string;
  price: number;
  unit: string;
  date: string;
  source?: string | null;
  created_at: string;
  updated_at: string;
}

export type UserRole = 'buyer' | 'seller' | 'admin';

export interface SellerProfile {
  id: string;
  full_name?: string | null;
  phone?: string | null;
  role: UserRole;
  seller_verified: boolean;
}

export type OrderStatus =
  | 'pending_payment'
  | 'payment_verified'
  | 'ready_for_pickup'
  | 'in_transit'
  | 'completed'
  | 'cancelled';

export type ShipmentStatus = 'pending' | 'booked' | 'in_transit' | 'delivered' | 'failed';

export interface Order {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  status: OrderStatus;
  delivery_method: 'manual' | 'in_app';
  delivery_quote?: unknown;
  total_amount?: number | null;
  currency: string;
  payment_reference?: string | null;
  payment_status?: string | null;
  shipping_provider?: string | null;
  metadata?: unknown;
  created_at: string;
  updated_at: string;
}

export interface ManualOrder {
  id: string;
  order_id: string;
  buyer_name: string;
  buyer_phone: string;
  instructions?: string | null;
  scheduled_date?: string | null;
  created_at: string;
}

export interface ShipmentIntent {
  id: string;
  order_id?: string | null;
  quote_id?: string | null;
  provider?: string | null;
  status: string;
  request_payload?: unknown;
  response_payload?: unknown;
  created_at: string;
  updated_at: string;
}

export interface Shipment {
  id: string;
  order_id: string;
  tracking_number?: string | null;
  status: ShipmentStatus;
  eta?: string | null;
  provider?: string | null;
  metadata?: unknown;
  created_at: string;
  updated_at: string;
}

export interface SellerVerification {
  id: string;
  user_id: string;
  document_url: string;
  document_type?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string | null;
  submitted_at: string;
  reviewed_at?: string | null;
  reviewer_id?: string | null;
}

export interface SellerPaymentAccount {
  id: string;
  user_id: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  paystack_recipient_code?: string | null;
  created_at: string;
  updated_at: string;
}
