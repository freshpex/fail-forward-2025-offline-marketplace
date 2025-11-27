import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ListingCard } from '../components/ListingCard';
import { ComponentLoader } from '../components/ComponentLoader';
import { Listing } from '../types';

export function MyListings() {
  const { user } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMyListings = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setListings(data as Listing[]);
      }
      setLoading(false);
    };

    fetchMyListings();
  }, [user]);

  if (loading) {
    return <ComponentLoader message="Loading your listings..." />;
  }

  return (
    <div className="my-listings-page">
      <h1>My Listings</h1>
      {listings.length === 0 ? (
        <div className="empty-state">
          <p>You haven't created any listings yet.</p>
        </div>
      ) : (
        <div className="listings-grid">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  );
}
