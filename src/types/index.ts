export interface Listing {
  id: string;
  crop: string;
  quantity: number;
  unit: string;
  price?: number | null;
  location: string;
  contact_phone: string;
  contact_email?: string | null;
  farmer_name?: string | null;
  image_url?: string | null;
  status: 'pending' | 'synced' | 'failed';
  created_at: string;
  updated_at: string;
}

export interface NewListing {
  crop: string;
  quantity: number;
  unit: string;
  price?: number | null;
  location: string;
  contact_phone: string;
  contact_email?: string;
  farmer_name?: string;
  image_url?: string;
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
