import { useState } from 'react';
import { Listing, PendingListing } from '../types';
import { formatNairaSimple } from '../utils/currency';
import { getCropIcon, isValidImageUrl } from '../utils/imageHelpers';
import { ContactSellerModal } from './ContactSellerModal';

interface ListingCardProps {
  listing: Listing | PendingListing;
  showContactButton?: boolean;
}

const SCHEDULE_LABELS: Record<string, string> = {
  morning: 'Morning (8AM - 12PM)',
  afternoon: 'Afternoon (12PM - 4PM)',
  evening: 'Evening (4PM - 8PM)',
  flexible: 'Flexible / Contact seller'
};

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
            <span className="detail-label">Available:</span>
            <span className="detail-value">
              {listing.quantity} {listing.unit}
              {listing.measurement_value && listing.measurement_unit && (
                <span className="package-size"> ({listing.measurement_value} {listing.measurement_unit} each)</span>
              )}
            </span>
          </div>
          {listing.unit_description && (
            <div className="detail-row">
              <span className="detail-label">Notes:</span>
              <span className="detail-value">{listing.unit_description}</span>
            </div>
          )}
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
          {'pickup_address' in listing && listing.pickup_address && (
            <div className="detail-row">
              <span className="detail-label">Pickup:</span>
              <span className="detail-value">
                {listing.pickup_address}
                {listing.pickup_city ? `, ${listing.pickup_city}` : ''}
                {listing.pickup_state ? `, ${listing.pickup_state}` : ''}
              </span>
            </div>
          )}
          {'harvest_date' in listing && listing.harvest_date && (
            <div className="detail-row">
              <span className="detail-label">Harvest Ready:</span>
              <span className="detail-value">{new Date(listing.harvest_date).toLocaleDateString()}</span>
            </div>
          )}
          {'preferred_schedule' in listing && listing.preferred_schedule && (
            <div className="detail-row">
              <span className="detail-label">Pickup Window:</span>
              <span className="detail-value">{SCHEDULE_LABELS[listing.preferred_schedule] ?? listing.preferred_schedule}</span>
            </div>
          )}
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
          {'seller_verified' in listing && listing.seller_verified && (
            <div className="detail-row">
              <span className="detail-label">Verification:</span>
              <span className="detail-value verified">Verified Seller ✅</span>
            </div>
          )}
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
             Click to Order
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
