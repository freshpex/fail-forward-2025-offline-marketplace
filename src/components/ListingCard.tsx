import { Listing, PendingListing } from '../types';
import { formatNairaSimple } from '../utils/currency';

interface ListingCardProps {
  listing: Listing | PendingListing;
}

export function ListingCard({ listing }: ListingCardProps) {
  const isPending = 'localId' in listing;
  const status = listing.status;

  return (
    <div className={`listing-card ${isPending ? 'pending' : ''}`}>
      <div className="listing-header">
        <h3 className="listing-crop">{listing.crop}</h3>
        <span className={`status-badge status-${status}`}>
          {status === 'pending' ? 'Pending Sync' : 'Synced'}
        </span>
      </div>
      <div className="listing-details">
        <div className="detail-row">
          <span className="detail-label">Quantity:</span>
          <span className="detail-value">{listing.quantity} {listing.unit}</span>
        </div>
        {listing.price && (
          <div className="detail-row">
            <span className="detail-label">Price:</span>
            <span className="detail-value">{formatNairaSimple(listing.price)}/{listing.unit}</span>
          </div>
        )}
        <div className="detail-row">
          <span className="detail-label">Location:</span>
          <span className="detail-value">{listing.location}</span>
        </div>
        {listing.farmer_name && (
          <div className="detail-row">
            <span className="detail-label">Farmer:</span>
            <span className="detail-value">{listing.farmer_name}</span>
          </div>
        )}
        <div className="detail-row">
          <span className="detail-label">Contact:</span>
          <span className="detail-value phone">{listing.contact_phone}</span>
        </div>
      </div>
    </div>
  );
}
