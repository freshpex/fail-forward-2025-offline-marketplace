import { Listing, NewListing, ReferencePrice, SellerProfile } from '../types';
import { supabase } from './supabase';

export interface NewPurchaseInterest {
  listing_id: string;
  buyer_id?: string;
  buyer_email?: string;
}

export async function createListing(listing: NewListing): Promise<Listing> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('listings')
    .insert([{
      ...listing,
      status: 'synced',
      seller_id: listing.seller_id ?? user?.id ?? null,
      user_id: user?.id
    }])
    .select()
    .single();

  if (error) {
    console.error('Error creating listing:', error);
    throw new Error(error.message || 'Failed to create listing');
  }

  return data as Listing;
}

export async function fetchListings(filters?: { crop?: string; location?: string }): Promise<Listing[]> {
  let query = supabase
    .from('listings')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters?.crop) {
    query = query.ilike('crop', `%${filters.crop}%`);
  }

  if (filters?.location) {
    query = query.ilike('location', `%${filters.location}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching listings:', error);
    throw new Error(error.message || 'Failed to fetch listings');
  }

  return (data || []) as Listing[];
}

export async function updateListing(listingId: string, updates: Partial<NewListing>): Promise<Listing> {
  const { data, error } = await supabase
    .from('listings')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', listingId)
    .select('*')
    .single();

  if (error) {
    console.error('Error updating listing:', error);
    throw new Error(error.message || 'Failed to update listing');
  }

  return data as Listing;
}

export async function deleteListing(listingId: string): Promise<void> {
  const { error } = await supabase
    .from('listings')
    .delete()
    .eq('id', listingId);

  if (error) {
    console.error('Error deleting listing:', error);
    throw new Error(error.message || 'Failed to delete listing');
  }
}

export async function fetchListingsBySeller(userId: string): Promise<Listing[]> {
  const { data, error } = await supabase
    .from('listings')
    .select(`
      *,
      seller_profile:profiles!listings_seller_id_fkey(
        id,
        full_name,
        phone,
        role,
        seller_verified
      )
    `)
    .eq('seller_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching seller listings:', error);
    throw new Error(error.message || 'Failed to fetch listings');
  }

  return (data || []).map((listing) => ({
    ...listing,
    seller_profile: listing.seller_profile as SellerProfile | null,
    seller_verified: (listing.seller_profile as SellerProfile | null)?.seller_verified ?? false,
  })) as Listing[];
}

export async function fetchPrices(filters?: { crop?: string; region?: string }): Promise<ReferencePrice[]> {
  let query = supabase
    .from('reference_prices')
    .select('*')
    .order('date', { ascending: false });

  if (filters?.crop) {
    query = query.ilike('crop', `%${filters.crop}%`);
  }

  if (filters?.region) {
    query = query.ilike('region', `%${filters.region}%`);
  }

  const { data, error} = await query;

  if (error) {
    console.error('Error fetching prices:', error);
    throw new Error(error.message || 'Failed to fetch prices');
  }

  return (data || []) as ReferencePrice[];
}

export async function createPurchaseInterest(interest: NewPurchaseInterest): Promise<void> {
  const { error } = await supabase
    .from('purchase_interests')
    .insert([{
      listing_id: interest.listing_id,
      buyer_id: interest.buyer_id || null,
      buyer_email: interest.buyer_email || null,
      status: 'interested'
    }]);

  if (error) {
    console.error('Error creating purchase interest:', error);
    throw new Error(error.message || 'Failed to create purchase interest');
  }
}
