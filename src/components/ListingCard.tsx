import { useState } from 'react';
import { Listing, PendingListing } from '../types';
import { formatNairaSimple } from '../utils/currency';
import { getCropIcon, isValidImageUrl } from '../utils/imageHelpers';
import { ContactSellerModal } from './ContactSellerModal';

interface ListingCardProps {
  listing: Listing | PendingListing;
  showContactButton?: boolean;
}

export function ListingCard({ listing, showContactButton = true }: ListingCardProps) {
  const isPending = 'localId' in listing;
  const status = listing.status;
  const hasImage = isValidImageUrl(listing.image_url);
  const [showModal, setShowModal] = useState(false);

  const isFullListing = !isPending && 'id' in listing;

  return (
    <>
      <div className={`listing-card ${isPending ? 'pending' : ''}`}>
      <div className="listing-image-container">
        {hasImage ? (
          <img
            src={listing.image_url!}
            alt={`${listing.crop} produce`}
            className="listing-image"
            loading="lazy"
          />
        ) : (
          <div className="listing-image-placeholder">
            {getCropIcon(listing.crop)}
          </div>
        )}
      </div>

      <div className="listing-content">
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

        {showContactButton && isFullListing && (
          <>
            <div className="listing-badges">
              <span className="badge badge-offline">📡 Offline capable</span>
              <span className="badge badge-lowdata">📊 Low data mode</span>
            </div>
            <button
              className="contact-seller-btn"
              onClick={() => setShowModal(true)}
            >
              📞 Contact Seller
            </button>
          </>
        )}
      </div>
    </div>

    {showModal && isFullListing && (
      <ContactSellerModal
        listing={listing as Listing}
        onClose={() => setShowModal(false)}
      />
    )}
  </>
  );
}
