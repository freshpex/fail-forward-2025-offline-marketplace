import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Listing, PendingListing, ReferencePrice } from '../types';

// Pending action types for offline sync
export interface PendingOrderUpdate {
  localId: string;
  orderId: string;
  action: 'mark_ready' | 'complete' | 'cancel';
  data?: Record<string, unknown>;
  status: 'pending' | 'syncing' | 'failed';
  created_at: string;
  error?: string;
}

export interface PendingListingEdit {
  localId: string;
  listingId: string;
  updates: Partial<Listing>;
  status: 'pending' | 'syncing' | 'failed';
  created_at: string;
  error?: string;
}

export interface PendingListingDelete {
  localId: string;
  listingId: string;
  status: 'pending' | 'syncing' | 'failed';
  created_at: string;
  error?: string;
}

// Order interface for caching
export interface CachedOrder {
  id: string;
  order_reference: string;
  status: string;
  payment_status: string | null;
  quantity: number;
  produce_price: number | null;
  total_amount: number | null;
  created_at: string;
  updated_at: string;
  seller_id: string;
  buyer_id?: string;
  listing_id?: string;
  listing?: {
    id: string;
    crop: string;
    price: number;
    unit: string;
    image_url?: string;
    farmer_name?: string;
    location?: string;
  } | null;
  manual_order?: {
    buyer_name: string;
    buyer_phone: string;
  }[] | null;
}

interface AgriMarketDB extends DBSchema {
  listings: {
    key: string;
    value: Listing;
    indexes: { 'by-date': string };
  };
  myListings: {
    key: string;
    value: Listing;
    indexes: { 'by-date': string; 'by-seller': string };
  };
  myOrders: {
    key: string;
    value: CachedOrder;
    indexes: { 'by-date': string; 'by-seller': string };
  };
  pendingListings: {
    key: string;
    value: PendingListing;
    indexes: { 'by-date': string };
  };
  prices: {
    key: string;
    value: ReferencePrice;
    indexes: { 'by-date': string };
  };
  pendingOrderUpdates: {
    key: string;
    value: PendingOrderUpdate;
    indexes: { 'by-date': string };
  };
  pendingListingEdits: {
    key: string;
    value: PendingListingEdit;
    indexes: { 'by-date': string };
  };
  pendingListingDeletes: {
    key: string;
    value: PendingListingDelete;
    indexes: { 'by-date': string };
  };
}

let dbInstance: IDBPDatabase<AgriMarketDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<AgriMarketDB>> {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = await openDB<AgriMarketDB>('agrimarket-db', 4, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        if (!db.objectStoreNames.contains('listings')) {
          const listingsStore = db.createObjectStore('listings', { keyPath: 'id' });
          listingsStore.createIndex('by-date', 'created_at');
        }

        if (!db.objectStoreNames.contains('pendingListings')) {
          const pendingStore = db.createObjectStore('pendingListings', { keyPath: 'localId' });
          pendingStore.createIndex('by-date', 'created_at');
        }
      }

      if (oldVersion < 2) {
        if (!db.objectStoreNames.contains('prices')) {
          const pricesStore = db.createObjectStore('prices', { keyPath: 'id' });
          pricesStore.createIndex('by-date', 'date');
        }
      }

      // Version 3: Add stores for offline order/listing management
      if (oldVersion < 3) {
        if (!db.objectStoreNames.contains('pendingOrderUpdates')) {
          const orderUpdatesStore = db.createObjectStore('pendingOrderUpdates', { keyPath: 'localId' });
          orderUpdatesStore.createIndex('by-date', 'created_at');
        }

        if (!db.objectStoreNames.contains('pendingListingEdits')) {
          const listingEditsStore = db.createObjectStore('pendingListingEdits', { keyPath: 'localId' });
          listingEditsStore.createIndex('by-date', 'created_at');
        }

        if (!db.objectStoreNames.contains('pendingListingDeletes')) {
          const listingDeletesStore = db.createObjectStore('pendingListingDeletes', { keyPath: 'localId' });
          listingDeletesStore.createIndex('by-date', 'created_at');
        }
      }

      // Version 4: Add stores for user's own listings and orders (for offline access)
      if (oldVersion < 4) {
        if (!db.objectStoreNames.contains('myListings')) {
          const myListingsStore = db.createObjectStore('myListings', { keyPath: 'id' });
          myListingsStore.createIndex('by-date', 'created_at');
          myListingsStore.createIndex('by-seller', 'seller_id');
        }

        if (!db.objectStoreNames.contains('myOrders')) {
          const myOrdersStore = db.createObjectStore('myOrders', { keyPath: 'id' });
          myOrdersStore.createIndex('by-date', 'created_at');
          myOrdersStore.createIndex('by-seller', 'seller_id');
        }
      }
    }
  });

  return dbInstance;
}

export async function cacheListings(listings: Listing[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('listings', 'readwrite');

  await Promise.all([
    ...listings.map((listing) => tx.store.put(listing)),
    tx.done
  ]);
}

export async function getCachedListings(): Promise<Listing[]> {
  const db = await getDB();
  return db.getAllFromIndex('listings', 'by-date');
}

// ==================== MY LISTINGS (User's own listings for offline) ====================

export async function cacheMyListings(listings: Listing[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('myListings', 'readwrite');
  
  // Clear existing and add new
  await tx.store.clear();
  await Promise.all([
    ...listings.map((listing) => tx.store.put(listing)),
    tx.done
  ]);
}

export async function getCachedMyListings(): Promise<Listing[]> {
  const db = await getDB();
  const listings = await db.getAllFromIndex('myListings', 'by-date');
  // Return in descending order (newest first)
  return listings.reverse();
}

export async function getCachedListingById(listingId: string): Promise<Listing | undefined> {
  const db = await getDB();
  // Try myListings first, then general listings cache
  let listing = await db.get('myListings', listingId);
  if (!listing) {
    listing = await db.get('listings', listingId);
  }
  return listing;
}

export async function updateCachedListing(listingId: string, updates: Partial<Listing>): Promise<void> {
  const db = await getDB();
  const listing = await db.get('myListings', listingId);
  if (listing) {
    await db.put('myListings', { ...listing, ...updates });
  }
  // Also update in general cache if exists
  const generalListing = await db.get('listings', listingId);
  if (generalListing) {
    await db.put('listings', { ...generalListing, ...updates });
  }
}

export async function removeCachedListing(listingId: string): Promise<void> {
  const db = await getDB();
  try {
    await db.delete('myListings', listingId);
  } catch (e) { /* ignore if not exists */ }
  try {
    await db.delete('listings', listingId);
  } catch (e) { /* ignore if not exists */ }
}

// ==================== MY ORDERS (User's orders for offline) ====================

export async function cacheMyOrders(orders: CachedOrder[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('myOrders', 'readwrite');
  
  // Clear existing and add new
  await tx.store.clear();
  await Promise.all([
    ...orders.map((order) => tx.store.put(order)),
    tx.done
  ]);
}

export async function getCachedMyOrders(): Promise<CachedOrder[]> {
  const db = await getDB();
  const orders = await db.getAllFromIndex('myOrders', 'by-date');
  // Return in descending order (newest first)
  return orders.reverse();
}

export async function getCachedOrderById(orderId: string): Promise<CachedOrder | undefined> {
  const db = await getDB();
  return db.get('myOrders', orderId);
}

export async function updateCachedOrder(orderId: string, updates: Partial<CachedOrder>): Promise<void> {
  const db = await getDB();
  const order = await db.get('myOrders', orderId);
  if (order) {
    await db.put('myOrders', { ...order, ...updates });
  }
}

export async function addPendingListing(listing: PendingListing): Promise<void> {
  const db = await getDB();
  await db.add('pendingListings', listing);
}

export async function getPendingListings(): Promise<PendingListing[]> {
  const db = await getDB();
  return db.getAllFromIndex('pendingListings', 'by-date');
}

export async function updatePendingListingStatus(
  localId: string,
  status: PendingListing['status'],
  error?: string
): Promise<void> {
  const db = await getDB();
  const listing = await db.get('pendingListings', localId);
  if (listing) {
    listing.status = status;
    if (error) listing.error = error;
    await db.put('pendingListings', listing);
  }
}

export async function removePendingListing(localId: string): Promise<void> {
  const db = await getDB();
  await db.delete('pendingListings', localId);
}

export async function clearPendingListings(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('pendingListings', 'readwrite');
  await tx.store.clear();
  await tx.done;
}

export async function cachePrices(prices: ReferencePrice[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('prices', 'readwrite');

  await Promise.all([
    ...prices.map((price) => tx.store.put(price)),
    tx.done
  ]);
}

export async function getCachedPrices(): Promise<ReferencePrice[]> {
  const db = await getDB();
  return db.getAllFromIndex('prices', 'by-date');
}

// ==================== PENDING ORDER UPDATES ====================

export async function addPendingOrderUpdate(update: PendingOrderUpdate): Promise<void> {
  const db = await getDB();
  await db.add('pendingOrderUpdates', update);
}

export async function getPendingOrderUpdates(): Promise<PendingOrderUpdate[]> {
  const db = await getDB();
  return db.getAllFromIndex('pendingOrderUpdates', 'by-date');
}

export async function updatePendingOrderUpdateStatus(
  localId: string, 
  status: PendingOrderUpdate['status'],
  error?: string
): Promise<void> {
  const db = await getDB();
  const update = await db.get('pendingOrderUpdates', localId);
  if (update) {
    update.status = status;
    if (error) update.error = error;
    await db.put('pendingOrderUpdates', update);
  }
}

export async function removePendingOrderUpdate(localId: string): Promise<void> {
  const db = await getDB();
  await db.delete('pendingOrderUpdates', localId);
}

export async function hasPendingOrderUpdate(orderId: string): Promise<boolean> {
  const pending = await getPendingOrderUpdates();
  return pending.some(p => p.orderId === orderId && p.status === 'pending');
}

// ==================== PENDING LISTING EDITS ====================

export async function addPendingListingEdit(edit: PendingListingEdit): Promise<void> {
  const db = await getDB();
  await db.add('pendingListingEdits', edit);
}

export async function getPendingListingEdits(): Promise<PendingListingEdit[]> {
  const db = await getDB();
  return db.getAllFromIndex('pendingListingEdits', 'by-date');
}

export async function updatePendingListingEditStatus(
  localId: string, 
  status: PendingListingEdit['status'],
  error?: string
): Promise<void> {
  const db = await getDB();
  const edit = await db.get('pendingListingEdits', localId);
  if (edit) {
    edit.status = status;
    if (error) edit.error = error;
    await db.put('pendingListingEdits', edit);
  }
}

export async function removePendingListingEdit(localId: string): Promise<void> {
  const db = await getDB();
  await db.delete('pendingListingEdits', localId);
}

export async function hasPendingListingEdit(listingId: string): Promise<boolean> {
  const pending = await getPendingListingEdits();
  return pending.some(p => p.listingId === listingId && p.status === 'pending');
}

// ==================== PENDING LISTING DELETES ====================

export async function addPendingListingDelete(deletion: PendingListingDelete): Promise<void> {
  const db = await getDB();
  await db.add('pendingListingDeletes', deletion);
}

export async function getPendingListingDeletes(): Promise<PendingListingDelete[]> {
  const db = await getDB();
  return db.getAllFromIndex('pendingListingDeletes', 'by-date');
}

export async function updatePendingListingDeleteStatus(
  localId: string, 
  status: PendingListingDelete['status'],
  error?: string
): Promise<void> {
  const db = await getDB();
  const deletion = await db.get('pendingListingDeletes', localId);
  if (deletion) {
    deletion.status = status;
    if (error) deletion.error = error;
    await db.put('pendingListingDeletes', deletion);
  }
}

export async function removePendingListingDelete(localId: string): Promise<void> {
  const db = await getDB();
  await db.delete('pendingListingDeletes', localId);
}

export async function hasPendingListingDelete(listingId: string): Promise<boolean> {
  const pending = await getPendingListingDeletes();
  return pending.some(p => p.listingId === listingId && p.status === 'pending');
}

// ==================== GET ALL PENDING COUNTS ====================

export async function getPendingSyncCounts(): Promise<{
  listings: number;
  orderUpdates: number;
  listingEdits: number;
  listingDeletes: number;
  total: number;
}> {
  const [listings, orderUpdates, listingEdits, listingDeletes] = await Promise.all([
    getPendingListings(),
    getPendingOrderUpdates(),
    getPendingListingEdits(),
    getPendingListingDeletes(),
  ]);
  
  const counts = {
    listings: listings.filter(l => l.status === 'pending').length,
    orderUpdates: orderUpdates.filter(o => o.status === 'pending').length,
    listingEdits: listingEdits.filter(e => e.status === 'pending').length,
    listingDeletes: listingDeletes.filter(d => d.status === 'pending').length,
    total: 0,
  };
  
  counts.total = counts.listings + counts.orderUpdates + counts.listingEdits + counts.listingDeletes;
  return counts;
}
