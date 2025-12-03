import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ListingCard } from '../components/ListingCard';
import { ComponentLoader } from '../components/ComponentLoader';
import { Button } from '../components/Button';
import { Listing } from '../types';
import { showSuccess, showError, showWarning } from '../utils/toast';
import { useNavigate } from 'react-router-dom';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { 
  addPendingListingDelete,
  getPendingListingDeletes,
  getPendingListingEdits,
  cacheMyListings,
  getCachedMyListings,
  removeCachedListing,
  type PendingListingDelete
} from '../services/db';
import { syncPendingListingDeletes, syncPendingListingEdits, setupOnlineListener } from '../services/sync';

const buildOwnerFilter = (userId: string) => `seller_id.eq.${userId},user_id.eq.${userId}`;

// Extended listing type to track offline status
interface ExtendedListing extends Listing {
  _pendingDelete?: boolean;
  _pendingEdit?: boolean;
}

export function MyListings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isOnline = useOnlineStatus();
  const [listings, setListings] = useState<ExtendedListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [pendingDeletes, setPendingDeletes] = useState<Set<string>>(new Set());
  const [pendingEdits, setPendingEdits] = useState<Set<string>>(new Set());

  // Setup online listener to sync when connection is restored
  useEffect(() => {
    const cleanup = setupOnlineListener(async () => {
      // Sync both edits and deletes
      const [editResult, deleteResult] = await Promise.all([
        syncPendingListingEdits(),
        syncPendingListingDeletes()
      ]);
      
      const totalSuccess = editResult.success + deleteResult.success;
      const totalFailed = editResult.failed + deleteResult.failed;
      
      if (totalSuccess > 0) {
        showSuccess(`Synced ${totalSuccess} listing change(s)`);
        fetchMyListings();
      }
      if (totalFailed > 0) {
        showError(`Failed to sync ${totalFailed} change(s)`);
      }
    });
    
    return cleanup;
  }, []);

  // Load pending changes on mount
  useEffect(() => {
    loadPendingChanges();
  }, []);

  const loadPendingChanges = async () => {
    const [pendingDel, pendingEd] = await Promise.all([
      getPendingListingDeletes(),
      getPendingListingEdits()
    ]);
    const deleteIds = new Set(pendingDel.filter(p => p.status === 'pending').map(p => p.listingId));
    const editIds = new Set(pendingEd.filter(p => p.status === 'pending').map(p => p.listingId));
    setPendingDeletes(deleteIds);
    setPendingEdits(editIds);
  };

  const normalizeLegacyListings = async (records: Listing[]): Promise<Listing[]> => {
    if (!user) return records;

    const legacyIds = records
      .filter((listing) => !listing.seller_id && listing.user_id === user.id)
      .map((listing) => listing.id);

    if (legacyIds.length === 0) {
      return records;
    }

    const { error } = await supabase
      .from('listings')
      .update({ seller_id: user.id })
      .in('id', legacyIds);

    if (error) {
      console.error('Failed to normalize legacy listings:', error);
      showError('Some legacy listings could not be updated. Please try again later.');
      return records;
    }

    const legacySet = new Set(legacyIds);
    return records.map((listing) =>
      legacySet.has(listing.id) ? { ...listing, seller_id: user.id } : listing
    );
  };

  const fetchMyListings = async () => {
    if (!user) {
      setListings([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    
    // If offline, load from cache
    if (!isOnline) {
      console.log('📶 Offline: Loading listings from cache');
      const cachedListings = await getCachedMyListings();
      
      // Load pending changes and mark listings
      const [pendingDel, pendingEd] = await Promise.all([
        getPendingListingDeletes(),
        getPendingListingEdits()
      ]);
      const deleteIds = new Set(pendingDel.filter(p => p.status === 'pending').map(p => p.listingId));
      const editIds = new Set(pendingEd.filter(p => p.status === 'pending').map(p => p.listingId));
      setPendingDeletes(deleteIds);
      setPendingEdits(editIds);
      
      const listingsWithStatus: ExtendedListing[] = cachedListings.map(listing => ({
        ...listing,
        _pendingDelete: deleteIds.has(listing.id),
        _pendingEdit: editIds.has(listing.id),
      }));
      
      setListings(listingsWithStatus);
      
      if (cachedListings.length === 0) {
        showWarning('No cached listings available. Connect to the internet to load listings.');
      }
      setLoading(false);
      return;
    }
    
    // Online: Fetch from server
    const ownerFilter = buildOwnerFilter(user.id);

    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .or(ownerFilter)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching listings:', error);
      
      // On error, try to load from cache as fallback
      const cachedListings = await getCachedMyListings();
      if (cachedListings.length > 0) {
        const [pendingDel, pendingEd] = await Promise.all([
          getPendingListingDeletes(),
          getPendingListingEdits()
        ]);
        const deleteIds = new Set(pendingDel.filter(p => p.status === 'pending').map(p => p.listingId));
        const editIds = new Set(pendingEd.filter(p => p.status === 'pending').map(p => p.listingId));
        
        const listingsWithStatus: ExtendedListing[] = cachedListings.map(listing => ({
          ...listing,
          _pendingDelete: deleteIds.has(listing.id),
          _pendingEdit: editIds.has(listing.id),
        }));
        setListings(listingsWithStatus);
        showWarning('Using cached listings. Some data may be outdated.');
      } else {
        showError('Unable to load your listings right now');
        setListings([]);
      }
    } else if (data) {
      const normalized = await normalizeLegacyListings(data as Listing[]);
      
      // Cache listings for offline use
      if (normalized.length > 0) {
        await cacheMyListings(normalized);
        console.log(`✅ Cached ${normalized.length} listings for offline use`);
      }
      
      // Load pending changes and mark listings
      const [pendingDel, pendingEd] = await Promise.all([
        getPendingListingDeletes(),
        getPendingListingEdits()
      ]);
      const deleteIds = new Set(pendingDel.filter(p => p.status === 'pending').map(p => p.listingId));
      const editIds = new Set(pendingEd.filter(p => p.status === 'pending').map(p => p.listingId));
      setPendingDeletes(deleteIds);
      setPendingEdits(editIds);
      
      // Mark listings with pending status
      const listingsWithStatus: ExtendedListing[] = normalized.map(listing => ({
        ...listing,
        _pendingDelete: deleteIds.has(listing.id),
        _pendingEdit: editIds.has(listing.id),
      }));
      
      setListings(listingsWithStatus);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchMyListings();
  }, [user, isOnline]);

  const handleDelete = async (listingId: string) => {
    if (!user) {
      showError('You must be signed in to delete listings');
      return;
    }

    if (!confirm('Are you sure you want to delete this listing?')) return;

    setDeleting(listingId);
    
    // If offline, queue the deletion
    if (!isOnline) {
      try {
        const pendingDelete: PendingListingDelete = {
          localId: `delete-listing-${listingId}-${Date.now()}`,
          listingId,
          status: 'pending',
          created_at: new Date().toISOString(),
        };
        
        await addPendingListingDelete(pendingDelete);
        
        // Also remove from cache (will still show in UI as pending delete)
        await removeCachedListing(listingId);
        
        // Optimistically update the UI - mark as pending delete
        setListings(prev => prev.map(l => 
          l.id === listingId 
            ? { ...l, _pendingDelete: true } 
            : l
        ));
        setPendingDeletes(prev => new Set([...prev, listingId]));
        
        showWarning('You are offline. Listing will be deleted when you reconnect.');
      } finally {
        setDeleting(null);
      }
      return;
    }
    
    // Online: Delete immediately
    try {
      const ownerFilter = buildOwnerFilter(user.id);
      const { error } = await supabase
        .from('listings')
        .delete()
        .eq('id', listingId)
        .or(ownerFilter);

      if (error) throw error;

      setListings((prev) => prev.filter((l) => l.id !== listingId));
      showSuccess('Listing deleted successfully');
    } catch (error: any) {
      console.error('Error deleting listing:', error);
      showError(error.message || 'Failed to delete listing');
    } finally {
      setDeleting(null);
    }
  };

  const handleEdit = (listingId: string) => {
    // Navigate to edit page (we'll create this)
    navigate(`/create?listingId=${listingId}`);
  };

  if (loading) {
    return <ComponentLoader message="Loading your listings..." />;
  }

  if (!user) {
    return (
      <div className="my-listings-page">
        <div className="empty-state">
          <p>You need to sign in to manage your listings.</p>
          <Button onClick={() => navigate('/login')}>Go to Login</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="my-listings-page">
      <div className="page-header">
        <h1>My Listings</h1>
        <Button onClick={() => navigate('/create')}>
          + Add New Listing
        </Button>
      </div>

      {/* Offline indicator */}
      {!isOnline && (
        <div className="offline-banner">
          <span className="offline-icon">📶</span>
          <span>You're offline. Changes will sync when you reconnect.</span>
        </div>
      )}

      {/* Pending sync indicator */}
      {(pendingDeletes.size > 0 || pendingEdits.size > 0) && isOnline && (
        <div className="sync-banner">
          <span className="sync-icon">🔄</span>
          <span>
            {pendingDeletes.size > 0 && `${pendingDeletes.size} deletion${pendingDeletes.size > 1 ? 's' : ''}`}
            {pendingDeletes.size > 0 && pendingEdits.size > 0 && ', '}
            {pendingEdits.size > 0 && `${pendingEdits.size} edit${pendingEdits.size > 1 ? 's' : ''}`}
            {' '}pending sync...
          </span>
        </div>
      )}

      {listings.length === 0 ? (
        <div className="empty-state">
          <p>You haven't created any listings yet.</p>
          <Button onClick={() => navigate('/create')}>
            Create Your First Listing
          </Button>
        </div>
      ) : (
        <div className="listings-grid">
          {listings.map((listing) => (
            <div key={listing.id} className={`listing-card-wrapper ${listing._pendingDelete ? 'pending-delete' : ''} ${listing._pendingEdit ? 'pending-edit' : ''}`}>
              {listing._pendingDelete && (
                <div className="pending-delete-overlay">
                  <span>⏳ Pending deletion</span>
                </div>
              )}
              {listing._pendingEdit && !listing._pendingDelete && (
                <div className="pending-edit-overlay">
                  <span>✏️ Pending edit sync</span>
                </div>
              )}
              <ListingCard listing={listing} />
              <div className="listing-actions">
                <Button
                  variant="secondary"
                  onClick={() => handleEdit(listing.id)}
                  className="btn-edit"
                  disabled={listing._pendingDelete}
                >
                  ✏️ Edit
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => handleDelete(listing.id)}
                  disabled={deleting === listing.id || listing._pendingDelete}
                  className="btn-delete"
                >
                  {deleting === listing.id ? '...' : listing._pendingDelete ? '⏳ Pending' : '🗑️ Delete'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
