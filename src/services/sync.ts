import { createListing, updateListing, deleteListing } from './api';
import { supabase } from './supabase';
import { 
  getPendingListings, 
  removePendingListing,
  updatePendingListingStatus,
  getPendingOrderUpdates,
  removePendingOrderUpdate,
  updatePendingOrderUpdateStatus,
  getPendingListingEdits,
  removePendingListingEdit,
  updatePendingListingEditStatus,
  getPendingListingDeletes,
  removePendingListingDelete,
  updatePendingListingDeleteStatus,
  getPendingSyncCounts,
} from './db';

export interface SyncResult {
  success: number;
  failed: number;
  errors: string[];
}

export interface FullSyncResult {
  listings: SyncResult;
  orderUpdates: SyncResult;
  listingEdits: SyncResult;
  listingDeletes: SyncResult;
  totalSuccess: number;
  totalFailed: number;
}

// Sync lock to prevent duplicate syncs
let isSyncingListings = false;
let isSyncingDeletes = false;
let isSyncingEdits = false;
let isSyncingOrders = false;

// Sync pending new listings
export async function syncPendingListings(): Promise<SyncResult> {
  // Prevent duplicate syncs
  if (isSyncingListings) {
    console.log('⏳ Listing sync already in progress, skipping...');
    return { success: 0, failed: 0, errors: [] };
  }
  
  isSyncingListings = true;
  
  try {
    const pendingListings = await getPendingListings();
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const pending of pendingListings) {
      // Process items that are 'pending' or 'syncing' (retry stuck syncs)
      if (pending.status === 'failed') continue;
      
      try {
        // Mark as syncing to prevent duplicate processing
        await updatePendingListingStatus(pending.localId, 'syncing');
        
        const { localId, status, created_at, ...listingData } = pending;
        await createListing(listingData);
        await removePendingListing(localId);
        success++;
      } catch (error: any) {
        console.error('Failed to sync listing:', error);
        await updatePendingListingStatus(pending.localId, 'failed', error.message);
        errors.push(`Listing: ${error.message || 'Unknown error'}`);
        failed++;
      }
    }

    return { success, failed, errors };
  } finally {
    isSyncingListings = false;
  }
}

// Sync pending order updates (mark as ready, complete, cancel)
export async function syncPendingOrderUpdates(): Promise<SyncResult> {
  // Prevent duplicate syncs
  if (isSyncingOrders) {
    console.log('⏳ Order sync already in progress, skipping...');
    return { success: 0, failed: 0, errors: [] };
  }
  
  isSyncingOrders = true;
  
  try {
    const pendingUpdates = await getPendingOrderUpdates();
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const update of pendingUpdates) {
      // Process items that are 'pending' or 'syncing' (retry stuck syncs)
      if (update.status === 'failed') continue;
      
      try {
        await updatePendingOrderUpdateStatus(update.localId, 'syncing');
        
        if (update.action === 'mark_ready') {
          const { error } = await supabase.functions.invoke('order-mark-ready', {
            body: { order_id: update.orderId },
          });
          if (error) throw error;
        } else if (update.action === 'complete') {
          const { error } = await supabase.functions.invoke('order-complete', {
            body: { order_id: update.orderId, ...update.data },
          });
          if (error) throw error;
        } else if (update.action === 'cancel') {
          // Direct update for cancellation
          const { error } = await supabase
            .from('orders')
            .update({ status: 'cancelled' })
            .eq('id', update.orderId);
          if (error) throw error;
        }
        
        await removePendingOrderUpdate(update.localId);
        success++;
      } catch (error: any) {
        console.error('Failed to sync order update:', error);
        await updatePendingOrderUpdateStatus(update.localId, 'failed', error.message);
        errors.push(`Order ${update.orderId}: ${error.message || 'Unknown error'}`);
        failed++;
      }
    }

    return { success, failed, errors };
  } finally {
    isSyncingOrders = false;
  }
}

// Sync pending listing edits
export async function syncPendingListingEdits(): Promise<SyncResult> {
  // Prevent duplicate syncs
  if (isSyncingEdits) {
    console.log('⏳ Listing edit sync already in progress, skipping...');
    return { success: 0, failed: 0, errors: [] };
  }
  
  isSyncingEdits = true;
  
  try {
    const pendingEdits = await getPendingListingEdits();
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const edit of pendingEdits) {
      // Process items that are 'pending' or 'syncing' (retry stuck syncs)
      if (edit.status === 'failed') continue;
      
      try {
        await updatePendingListingEditStatus(edit.localId, 'syncing');
        
        // Cast to any to handle the type mismatch between Listing and NewListing
        await updateListing(edit.listingId, edit.updates as any);
        
        await removePendingListingEdit(edit.localId);
        success++;
      } catch (error: any) {
        console.error('Failed to sync listing edit:', error);
        await updatePendingListingEditStatus(edit.localId, 'failed', error.message);
        errors.push(`Edit listing ${edit.listingId}: ${error.message || 'Unknown error'}`);
        failed++;
      }
    }

    return { success, failed, errors };
  } finally {
    isSyncingEdits = false;
  }
}

// Sync pending listing deletions
export async function syncPendingListingDeletes(): Promise<SyncResult> {
  // Prevent duplicate syncs
  if (isSyncingDeletes) {
    console.log('⏳ Listing delete sync already in progress, skipping...');
    return { success: 0, failed: 0, errors: [] };
  }
  
  isSyncingDeletes = true;
  
  try {
    const pendingDeletes = await getPendingListingDeletes();
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    console.log(`🗑️ Processing ${pendingDeletes.length} pending deletions...`);

    for (const deletion of pendingDeletes) {
      // Process items that are 'pending' or 'syncing' (retry stuck syncs)
      if (deletion.status === 'failed') {
        console.log(`⏭️ Skipping failed deletion ${deletion.localId}`);
        continue;
      }
      
      try {
        console.log(`🗑️ Deleting listing ${deletion.listingId}...`);
        await updatePendingListingDeleteStatus(deletion.localId, 'syncing');
        
        await deleteListing(deletion.listingId);
        
        await removePendingListingDelete(deletion.localId);
        console.log(`✅ Successfully deleted listing ${deletion.listingId}`);
        success++;
      } catch (error: any) {
        console.error('Failed to sync listing deletion:', error);
        await updatePendingListingDeleteStatus(deletion.localId, 'failed', error.message);
        errors.push(`Delete listing ${deletion.listingId}: ${error.message || 'Unknown error'}`);
        failed++;
      }
    }

    return { success, failed, errors };
  } finally {
    isSyncingDeletes = false;
  }
}

// Sync all pending changes
export async function syncAllPendingChanges(): Promise<FullSyncResult> {
  console.log('🔄 Starting full sync of pending changes...');
  
  const [listings, orderUpdates, listingEdits, listingDeletes] = await Promise.all([
    syncPendingListings(),
    syncPendingOrderUpdates(),
    syncPendingListingEdits(),
    syncPendingListingDeletes(),
  ]);

  const result: FullSyncResult = {
    listings,
    orderUpdates,
    listingEdits,
    listingDeletes,
    totalSuccess: listings.success + orderUpdates.success + listingEdits.success + listingDeletes.success,
    totalFailed: listings.failed + orderUpdates.failed + listingEdits.failed + listingDeletes.failed,
  };

  console.log(`✅ Sync complete: ${result.totalSuccess} succeeded, ${result.totalFailed} failed`);
  
  return result;
}

// Get count of pending changes
export async function getPendingChangesCount(): Promise<number> {
  const counts = await getPendingSyncCounts();
  return counts.total;
}

export function isOnline(): boolean {
  return navigator.onLine;
}

export function setupOnlineListener(callback: () => void): () => void {
  const handleOnline = () => {
    console.log('📶 Connection restored, syncing...');
    callback();
  };

  window.addEventListener('online', handleOnline);

  return () => {
    window.removeEventListener('online', handleOnline);
  };
}
