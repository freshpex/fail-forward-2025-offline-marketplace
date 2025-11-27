import { useState, useEffect } from 'react';
import { ListingCard } from '../components/ListingCard';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { useListings } from '../hooks/useListings';
import { syncPendingListings, setupOnlineListener } from '../services/sync';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export function BrowseListings() {
  const [cropFilter, setCropFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [appliedFilters, setAppliedFilters] = useState<{ crop?: string; location?: string }>({});
  const isOnline = useOnlineStatus();

  const { listings, pendingListings, loading, error, refetch } = useListings(appliedFilters);

  useEffect(() => {
    if (isOnline) {
      syncPendingListings().then(() => refetch());
    }
  }, [isOnline]);

  useEffect(() => {
    const cleanup = setupOnlineListener(() => {
      syncPendingListings().then(() => refetch());
    });
    return cleanup;
  }, []);

  const handleFilter = () => {
    setAppliedFilters({
      crop: cropFilter.trim() || undefined,
      location: locationFilter.trim() || undefined
    });
  };

  const handleClearFilters = () => {
    setCropFilter('');
    setLocationFilter('');
    setAppliedFilters({});
  };

  const allListings = [...pendingListings, ...listings];

  return (
    <div className="browse-listings">
      <h2>Browse Listings</h2>

      <div className="filters">
        <div className="filter-inputs">
          <Input
            label="Filter by Crop"
            type="text"
            value={cropFilter}
            onChange={(e) => setCropFilter(e.target.value)}
            placeholder="e.g., Maize"
          />
          <Input
            label="Filter by Location"
            type="text"
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            placeholder="e.g., Lagos"
          />
        </div>
        <div className="filter-actions">
          <Button onClick={handleFilter}>Apply Filters</Button>
          <Button variant="secondary" onClick={handleClearFilters}>Clear</Button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {loading && <div className="loading">Loading listings...</div>}

      {!loading && allListings.length === 0 && (
        <div className="empty-state">
          <p>No listings found. Be the first to list your produce!</p>
        </div>
      )}

      <div className="listings-grid">
        {allListings.map((listing) => (
          <ListingCard
            key={'localId' in listing ? listing.localId : listing.id}
            listing={listing}
          />
        ))}
      </div>
    </div>
  );
}
