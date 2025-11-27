import { Listing, NewListing, ReferencePrice } from '../types';
import { supabase } from './supabase';

export interface NewPurchaseInterest {
  listing_id: string;
  buyer_id?: string;
  buyer_email?: string;
}

export async function createListing(listing: NewListing): Promise<Listing> {
  const { data, error } = await supabase
    .from('listings')
    .insert([{
      ...listing,
      status: 'synced'
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
