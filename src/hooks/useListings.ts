import { useState, useEffect } from 'react';
import { Listing, PendingListing } from '../types';
import { fetchListings } from '../services/api';
import { cacheListings, getCachedListings, getPendingListings } from '../services/db';

export function useListings(filters?: { crop?: string; location?: string }) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [pendingListings, setPendingListings] = useState<PendingListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);

  const loadListings = async () => {
    try {
      setLoading(true);
      setError(null);
      setIsFromCache(false);

      // Check if we're offline first
      const isOnline = navigator.onLine;
      
      let fetchedListings: Listing[] = [];
      let usingCache = false;
      
      if (isOnline) {
        try {
          fetchedListings = await fetchListings(filters);
          // Cache listings for offline use
          if (fetchedListings.length > 0) {
            await cacheListings(fetchedListings);
            console.log(`✅ Cached ${fetchedListings.length} listings for offline use`);
          }
        } catch (fetchError) {
          console.log('Failed to fetch from API, using cache', fetchError);
          fetchedListings = await getCachedListings();
          usingCache = true;
          setIsFromCache(true);
        }
      } else {
        // Offline: load from cache directly
        console.log('📶 Offline: Loading listings from cache');
        fetchedListings = await getCachedListings();
        usingCache = true;
        setIsFromCache(true);
      }

      // Apply filters to cached listings if needed (filters are already applied for API requests)
      if (usingCache && filters) {
        if (filters.crop) {
          fetchedListings = fetchedListings.filter(l => 
            l.crop?.toLowerCase().includes(filters.crop!.toLowerCase())
          );
        }
        if (filters.location) {
          fetchedListings = fetchedListings.filter(l => 
            l.location?.toLowerCase().includes(filters.location!.toLowerCase())
          );
        }
      }

      const pending = await getPendingListings();

      setListings(fetchedListings);
      setPendingListings(pending);
    } catch (err) {
      console.error('Error loading listings:', err);
      // Last resort: try to load from cache
      try {
        const cachedListings = await getCachedListings();
        const pending = await getPendingListings();
        setListings(cachedListings);
        setPendingListings(pending);
        setIsFromCache(true);
      } catch (cacheErr) {
        setError(err instanceof Error ? err.message : 'Failed to load listings');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadListings();
  }, [filters?.crop, filters?.location]);

  return { listings, pendingListings, loading, error, refetch: loadListings, isFromCache };
}
