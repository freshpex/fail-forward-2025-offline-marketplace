import { useState, useEffect } from 'react';
import { Listing, PendingListing } from '../types';
import { fetchListings } from '../services/api';
import { cacheListings, getCachedListings, getPendingListings } from '../services/db';

export function useListings(filters?: { crop?: string; location?: string }) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [pendingListings, setPendingListings] = useState<PendingListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadListings = async () => {
    try {
      setLoading(true);
      setError(null);

      const [fetchedListings, pending] = await Promise.all([
        fetchListings(filters).catch(async () => {
          console.log('Failed to fetch from API, using cache');
          return getCachedListings();
        }),
        getPendingListings()
      ]);

      if (fetchedListings.length > 0) {
        await cacheListings(fetchedListings);
      }

      setListings(fetchedListings);
      setPendingListings(pending);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load listings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadListings();
  }, [filters?.crop, filters?.location]);

  return { listings, pendingListings, loading, error, refetch: loadListings };
}
