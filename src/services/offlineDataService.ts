/**
 * Offline Data Service
 * 
 * Pre-fetches and caches user data (listings, orders) after login
 * so they can access it offline immediately.
 */

import { supabase } from './supabase';
import { 
  cacheMyListings, 
  cacheMyOrders, 
  getCachedMyListings,
  getCachedMyOrders,
  type CachedOrder 
} from './db';
import { Listing } from '../types';

export interface OfflinePrefetchResult {
  listings: { cached: number; error?: string };
  orders: { cached: number; error?: string };
}

/**
 * Prefetch and cache all user data for offline access.
 * Call this after login or when app is online.
 */
export async function prefetchUserDataForOffline(userId: string): Promise<OfflinePrefetchResult> {
  console.log('📦 Prefetching user data for offline access...');
  
  const result: OfflinePrefetchResult = {
    listings: { cached: 0 },
    orders: { cached: 0 },
  };

  // Fetch and cache user's listings
  try {
    const { data: listings, error } = await supabase
      .from('listings')
      .select('*')
      .or(`seller_id.eq.${userId},user_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    if (listings && listings.length > 0) {
      await cacheMyListings(listings as Listing[]);
      result.listings.cached = listings.length;
      console.log(`✅ Cached ${listings.length} listings for offline`);
    }
  } catch (err: any) {
    console.error('Failed to cache listings:', err);
    result.listings.error = err.message;
  }

  // Fetch and cache user's orders (as seller)
  try {
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        *,
        listing:listings(id, crop, price, unit, image_url, farmer_name, location),
        manual_order:manual_orders(buyer_name, buyer_phone)
      `)
      .eq('seller_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    if (orders && orders.length > 0) {
      await cacheMyOrders(orders as CachedOrder[]);
      result.orders.cached = orders.length;
      console.log(`✅ Cached ${orders.length} orders for offline`);
    }
  } catch (err: any) {
    console.error('Failed to cache orders:', err);
    result.orders.error = err.message;
  }

  return result;
}

/**
 * Get user's listings - from cache if offline, or fetch and cache if online
 */
export async function getMyListingsWithOffline(userId: string, isOnline: boolean): Promise<{
  listings: Listing[];
  fromCache: boolean;
  error?: string;
}> {
  if (!isOnline) {
    // Return cached data when offline
    const cached = await getCachedMyListings();
    return { listings: cached, fromCache: true };
  }

  // Online: Fetch fresh data and cache it
  try {
    const { data: listings, error } = await supabase
      .from('listings')
      .select('*')
      .or(`seller_id.eq.${userId},user_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    const listingsData = listings as Listing[] || [];
    
    // Cache for offline
    if (listingsData.length > 0) {
      await cacheMyListings(listingsData);
    }
    
    return { listings: listingsData, fromCache: false };
  } catch (err: any) {
    console.error('Failed to fetch listings, trying cache:', err);
    
    // Fallback to cache on error
    const cached = await getCachedMyListings();
    if (cached.length > 0) {
      return { listings: cached, fromCache: true, error: 'Using cached data' };
    }
    
    return { listings: [], fromCache: false, error: err.message };
  }
}

/**
 * Get user's orders - from cache if offline, or fetch and cache if online
 */
export async function getMyOrdersWithOffline(userId: string, isOnline: boolean): Promise<{
  orders: CachedOrder[];
  fromCache: boolean;
  error?: string;
}> {
  if (!isOnline) {
    // Return cached data when offline
    const cached = await getCachedMyOrders();
    return { orders: cached, fromCache: true };
  }

  // Online: Fetch fresh data and cache it
  try {
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        *,
        listing:listings(id, crop, price, unit, image_url, farmer_name, location),
        manual_order:manual_orders(buyer_name, buyer_phone)
      `)
      .eq('seller_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    const ordersData = orders as CachedOrder[] || [];
    
    // Cache for offline
    if (ordersData.length > 0) {
      await cacheMyOrders(ordersData);
    }
    
    return { orders: ordersData, fromCache: false };
  } catch (err: any) {
    console.error('Failed to fetch orders, trying cache:', err);
    
    // Fallback to cache on error
    const cached = await getCachedMyOrders();
    if (cached.length > 0) {
      return { orders: cached, fromCache: true, error: 'Using cached data' };
    }
    
    return { orders: [], fromCache: false, error: err.message };
  }
}

/**
 * Check if we have any cached data for offline
 */
export async function hasOfflineData(): Promise<{
  hasListings: boolean;
  hasOrders: boolean;
  listingsCount: number;
  ordersCount: number;
}> {
  const listings = await getCachedMyListings();
  const orders = await getCachedMyOrders();
  
  return {
    hasListings: listings.length > 0,
    hasOrders: orders.length > 0,
    listingsCount: listings.length,
    ordersCount: orders.length,
  };
}
