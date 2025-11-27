import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Listing, PendingListing, ReferencePrice } from '../types';

interface AgriMarketDB extends DBSchema {
  listings: {
    key: string;
    value: Listing;
    indexes: { 'by-date': string };
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
}

let dbInstance: IDBPDatabase<AgriMarketDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<AgriMarketDB>> {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = await openDB<AgriMarketDB>('agrimarket-db', 2, {
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

export async function addPendingListing(listing: PendingListing): Promise<void> {
  const db = await getDB();
  await db.add('pendingListings', listing);
}

export async function getPendingListings(): Promise<PendingListing[]> {
  const db = await getDB();
  return db.getAllFromIndex('pendingListings', 'by-date');
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
