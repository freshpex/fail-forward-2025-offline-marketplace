export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[];

export interface Database {
  public: {
    Tables: {
      listings: {
        Row: {
          id: string;
          crop: string;
          quantity: number;
          unit: string;
          price: number | null;
          location: string;
          contact_phone: string;
          contact_email: string | null;
          farmer_name: string | null;
          image_url: string | null;
          status: 'pending' | 'synced' | 'failed';
          created_at: string;
          updated_at: string;
          seller_id: string | null;
        };
        Insert: Partial<Database['public']['Tables']['listings']['Row']>;
        Update: Partial<Database['public']['Tables']['listings']['Row']>;
      };
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          phone: string | null;
          role: 'buyer' | 'seller' | 'admin';
          seller_verified: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['profiles']['Row']>;
        Update: Partial<Database['public']['Tables']['profiles']['Row']>;
      };
      orders: {
        Row: {
          id: string;
          listing_id: string;
          buyer_id: string;
          seller_id: string;
          status:
            | 'pending_payment'
            | 'payment_verified'
            | 'ready_for_pickup'
            | 'in_transit'
            | 'completed'
            | 'cancelled';
          delivery_method: 'manual' | 'in_app';
          delivery_quote: Json | null;
          total_amount: number | null;
          currency: string;
          payment_reference: string | null;
          payment_status: string | null;
          shipping_provider: string | null;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['orders']['Row']>;
        Update: Partial<Database['public']['Tables']['orders']['Row']>;
      };
      manual_orders: {
        Row: {
          id: string;
          order_id: string;
          buyer_name: string;
          buyer_phone: string;
          instructions: string | null;
          scheduled_date: string | null;
          created_at: string;
        };
        Insert: Partial<Database['public']['Tables']['manual_orders']['Row']>;
        Update: Partial<Database['public']['Tables']['manual_orders']['Row']>;
      };
      shipment_intents: {
        Row: {
          id: string;
          order_id: string;
          quote_id: string | null;
          provider: string | null;
          request_payload: Json | null;
          response_payload: Json | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['shipment_intents']['Row']>;
        Update: Partial<Database['public']['Tables']['shipment_intents']['Row']>;
      };
      shipments: {
        Row: {
          id: string;
          order_id: string;
          tracking_number: string | null;
          status: 'pending' | 'booked' | 'in_transit' | 'delivered' | 'failed';
          eta: string | null;
          provider: string | null;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['shipments']['Row']>;
        Update: Partial<Database['public']['Tables']['shipments']['Row']>;
      };
      seller_verification: {
        Row: {
          id: string;
          user_id: string;
          document_url: string;
          document_type: string | null;
          status: 'pending' | 'approved' | 'rejected';
          rejection_reason: string | null;
          submitted_at: string;
          reviewed_at: string | null;
          reviewer_id: string | null;
        };
        Insert: Partial<Database['public']['Tables']['seller_verification']['Row']>;
        Update: Partial<Database['public']['Tables']['seller_verification']['Row']>;
      };
      seller_payment_accounts: {
        Row: {
          id: string;
          user_id: string;
          bank_name: string;
          account_number: string;
          account_name: string;
          paystack_recipient_code: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['seller_payment_accounts']['Row']>;
        Update: Partial<Database['public']['Tables']['seller_payment_accounts']['Row']>;
      };
    };
  };
}
