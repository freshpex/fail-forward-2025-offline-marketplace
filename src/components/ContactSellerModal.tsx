import { useState } from 'react';
import { Button } from './Button';
import { ButtonSpinner } from './ButtonSpinner';
import { Listing } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { createPurchaseInterest } from '../services/api';
import { showSuccess, showError } from '../utils/toast';

interface ContactSellerModalProps {
  listing: Listing;
  onClose: () => void;
}

export function ContactSellerModal({ listing, onClose }: ContactSellerModalProps) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [interestMarked, setInterestMarked] = useState(false);

  const handleMarkInterested = async () => {
    setIsSubmitting(true);
    try {
      await createPurchaseInterest({
        listing_id: listing.id,
        buyer_id: user?.id,
        buyer_email: user?.email,
      });
      setInterestMarked(true);
      showSuccess('Your interest has been sent to the seller.');
    } catch (error) {
      showError('Failed to mark interest. Please try again.');
      console.error('Error marking interest:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal-content contact-seller-modal">
        <div className="modal-header">
          <h2>Contact Seller</h2>
          <button
            className="modal-close"
            onClick={onClose}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        <div className="modal-body">
          <div className="product-info">
            <h3>{listing.crop}</h3>
            <p className="product-meta">
              {listing.quantity} {listing.unit}
              {listing.location && ` • ${listing.location}`}
            </p>
          </div>

          <div className="seller-info-section">
            <h4>Seller Information</h4>

            {listing.farmer_name && (
              <div className="info-row">
                <span className="info-label">Name:</span>
                <span className="info-value">{listing.farmer_name}</span>
              </div>
            )}

            <div className="info-row contact-row">
              <span className="info-label">Phone:</span>
              <a
                href={`tel:${listing.contact_phone}`}
                className="contact-link phone-link"
              >
                {listing.contact_phone}
              </a>
            </div>

            {listing.contact_email && (
              <div className="info-row contact-row">
                <span className="info-label">Email:</span>
                <a
                  href={`mailto:${listing.contact_email}`}
                  className="contact-link email-link"
                >
                  {listing.contact_email}
                </a>
              </div>
            )}
          </div>

          <div className="payment-notice">
            <div className="notice-icon">ℹ️</div>
            <div className="notice-content">
              <p>
                <strong>Secure in-app payments are coming soon.</strong>
              </p>
              <p>For now, contact the seller directly to arrange purchase.</p>
            </div>
          </div>

          <div className="modal-actions">
            {!interestMarked ? (
              <Button
                onClick={handleMarkInterested}
                disabled={isSubmitting}
                className="btn-interest"
              >
                {isSubmitting ? (
                  <>
                    <ButtonSpinner /> Marking Interest...
                  </>
                ) : (
                  '⭐ Mark as Interested'
                )}
              </Button>
            ) : (
              <div className="interest-confirmed">
                ✓ Interest Sent to Seller
              </div>
            )}

            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
