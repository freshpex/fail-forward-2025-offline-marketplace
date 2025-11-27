import { Listing, NewListing, ReferencePrice } from '../types';

const API_BASE = '/api';

export async function createListing(listing: NewListing): Promise<Listing> {
  const response = await fetch(`${API_BASE}/listings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(listing)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create listing');
  }

  const result = await response.json();
  return result.data;
}

export async function fetchListings(filters?: { crop?: string; location?: string }): Promise<Listing[]> {
  const params = new URLSearchParams();
  if (filters?.crop) params.append('crop', filters.crop);
  if (filters?.location) params.append('location', filters.location);

  const url = `${API_BASE}/listings${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Failed to fetch listings');
  }

  const result = await response.json();
  return result.data;
}

export async function fetchPrices(filters?: { crop?: string; region?: string }): Promise<ReferencePrice[]> {
  const params = new URLSearchParams();
  if (filters?.crop) params.append('crop', filters.crop);
  if (filters?.region) params.append('region', filters.region);

  const url = `${API_BASE}/prices${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Failed to fetch prices');
  }

  const result = await response.json();
  return result.data;
}
