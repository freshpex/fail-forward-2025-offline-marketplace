import { createListing } from './api';
import { getPendingListings, removePendingListing } from './db';

export async function syncPendingListings(): Promise<{ success: number; failed: number }> {
  const pendingListings = await getPendingListings();
  let success = 0;
  let failed = 0;

  for (const pending of pendingListings) {
    try {
      const { localId, status, created_at, ...listingData } = pending;
      await createListing(listingData);
      await removePendingListing(localId);
      success++;
    } catch (error) {
      console.error('Failed to sync listing:', error);
      failed++;
    }
  }

  return { success, failed };
}

export function isOnline(): boolean {
  return navigator.onLine;
}

export function setupOnlineListener(callback: () => void): () => void {
  const handleOnline = () => {
    console.log('Connection restored, syncing...');
    callback();
  };

  window.addEventListener('online', handleOnline);

  return () => {
    window.removeEventListener('online', handleOnline);
  };
}
