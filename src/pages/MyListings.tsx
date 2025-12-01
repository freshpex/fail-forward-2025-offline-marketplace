import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ListingCard } from '../components/ListingCard';
import { ComponentLoader } from '../components/ComponentLoader';
import { Button } from '../components/Button';
import { Listing } from '../types';
import { showSuccess, showError } from '../utils/toast';
import { useNavigate } from 'react-router-dom';

const buildOwnerFilter = (userId: string) => `seller_id.eq.${userId},user_id.eq.${userId}`;

export function MyListings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

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
    const ownerFilter = buildOwnerFilter(user.id);

    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .or(ownerFilter)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching listings:', error);
      showError('Unable to load your listings right now');
      setListings([]);
    } else if (data) {
      const normalized = await normalizeLegacyListings(data as Listing[]);
      setListings(normalized);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchMyListings();
  }, [user]);

  const handleDelete = async (listingId: string) => {
    if (!user) {
      showError('You must be signed in to delete listings');
      return;
    }

    if (!confirm('Are you sure you want to delete this listing?')) return;

    setDeleting(listingId);
    try {
      const ownerFilter = buildOwnerFilter(user.id);
      const { error } = await supabase
        .from('listings')
        .delete()
        .eq('id', listingId)
        .or(ownerFilter);

      if (error) throw error;

      setListings((prev) => prev.filter((l) => l.id !== listingId));
      await fetchMyListings();
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
            <div key={listing.id} className="listing-card-wrapper">
              <ListingCard listing={listing} />
              <div className="listing-actions">
                <Button
                  variant="secondary"
                  onClick={() => handleEdit(listing.id)}
                  className="btn-edit"
                >
                  ✏️ Edit
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => handleDelete(listing.id)}
                  disabled={deleting === listing.id}
                  className="btn-delete"
                >
                  {deleting === listing.id ? '...' : '🗑️ Delete'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
