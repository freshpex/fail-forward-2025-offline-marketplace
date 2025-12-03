import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './Button';
import { ButtonSpinner } from './ButtonSpinner';
import { LoadingSpinner } from './LoadingSpinner';
import { Input } from './Input';
import { Listing } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { createPurchaseInterest } from '../services/api';
import { estimatePackage } from '../utils/produceEstimator';
import { 
  getDeliveryOptions, 
  getDeliveryQuote, 
  createOrder,
  verifyOrderPayment 
} from '../services/orders';
import { showSuccess, showError } from '../utils/toast';

// Paystack public key from environment
const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY as string;

interface ContactSellerModalProps {
  listing: Listing;
  onClose: () => void;
}

interface DeliveryQuoteData {
  quote_id: string;
  fee: number;
  currency: string;
  quote: unknown;
  couriers?: Array<{
    courier_id: string;
    courier_name: string;
    total: number;
    delivery_eta: string;
    service_type: string;
  }>;
  cheapest_courier?: {
    courier_name: string;
    total: number;
    delivery_eta: string;
  };
  fastest_courier?: {
    courier_name: string;
    total: number;
    delivery_eta: string;
  };
}

// Load Paystack script dynamically
function loadPaystackScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).PaystackPop) {
      resolve();
      return;
    }
    
    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Paystack'));
    document.head.appendChild(script);
  });
}

export function ContactSellerModal({ listing, onClose }: ContactSellerModalProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isOnline = useOnlineStatus();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [interestMarked, setInterestMarked] = useState(false);
  const [step, setStep] = useState<'contact' | 'delivery' | 'quote' | 'payment'>('contact');
  const [deliveryOptions, setDeliveryOptions] = useState<any[]>([]);
  const [selectedDelivery, setSelectedDelivery] = useState<string | null>(null);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [deliveryQuote, setDeliveryQuote] = useState<DeliveryQuoteData | null>(null);
  const [selectedCourier, setSelectedCourier] = useState<string | null>(null);
  const [manualDetails, setManualDetails] = useState({
    buyer_name: '',
    buyer_phone: '',
    buyer_email: user?.email || '',
    delivery_address: '',
    delivery_city: '',
    delivery_state: '',
    instructions: '',
    scheduled_date: ''
  });
  const [purchaseQuantity, setPurchaseQuantity] = useState(1);

  const sellerName = listing.farmer_name || listing.seller_profile?.full_name || 'Seller';
  const sellerPhone = listing.contact_phone || listing.seller_profile?.phone || '';
  const sellerEmail = listing.contact_email || null;
  const availableQuantity = Math.max(1, listing.quantity || 1);
  
  // Ensure price is a valid number (handle null, undefined, string, or NaN)
  const unitPrice = Number(listing.price) || 0;
  const produceTotal = unitPrice * purchaseQuantity;
  
  // Get selected courier fee or cheapest fee
  const getDeliveryFee = (): number => {
    if (!deliveryQuote) return 0;
    if (selectedCourier && deliveryQuote.couriers) {
      const courier = deliveryQuote.couriers.find(c => c.courier_id === selectedCourier);
      return Number(courier?.total) || Number(deliveryQuote.fee) || 0;
    }
    return Number(deliveryQuote.cheapest_courier?.total) || Number(deliveryQuote.fee) || 0;
  };
  
  const deliveryFee = getDeliveryFee();
  const grandTotal = produceTotal + deliveryFee;

  useEffect(() => {
    setPurchaseQuantity(1);
    setSelectedDelivery(null);
    setDeliveryQuote(null);
    setSelectedCourier(null);
  }, [listing.id]);

  useEffect(() => {
    if (step === 'delivery') {
      loadDeliveryOptions();
    }
  }, [step]);

  // Load Paystack when entering quote step
  useEffect(() => {
    if (step === 'quote') {
      loadPaystackScript().catch((err) => {
        console.error('Failed to load Paystack:', err);
      });
    }
  }, [step]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 0,
    }).format(value);

  // Offline delivery options - available without network
  const offlineDeliveryOptions = [
    {
      id: 'manual_pickup',
      label: 'Manual Pickup / Arrange Yourself',
      type: 'manual' as const,
      fee: 0,
      currency: 'NGN',
      estimated_timeframe: 'Coordinate directly with the seller',
      notes: 'Exchange contact details and coordinate pickup or your preferred logistics provider.',
      available_offline: true,
    },
    {
      id: 'in_app_delivery',
      label: 'In-App Delivery via Terminal Africa',
      type: 'in_app' as const,
      provider: 'Terminal Africa',
      currency: 'NGN',
      requires_quote: true,
      estimated_timeframe: 'Dispatch within 24 hours after seller confirmation',
      available_offline: false,
      offline_message: 'You need to be online to use this delivery option. Please connect to the internet to get delivery quotes.',
    },
  ];

  const loadDeliveryOptions = async () => {
    // If offline, use cached/static options
    if (!isOnline) {
      setDeliveryOptions(offlineDeliveryOptions);
      return;
    }

    setLoadingOptions(true);
    try {
      const response = await getDeliveryOptions(listing.id);
      // Mark online options with availability
      const options = (response.options || []).map((opt: any) => ({
        ...opt,
        available_offline: opt.type === 'manual',
        offline_message: opt.type === 'in_app' 
          ? 'You need to be online to use this delivery option. Please connect to the internet to get delivery quotes.'
          : undefined,
      }));
      setDeliveryOptions(options);
    } catch (error) {
      console.error('Error loading delivery options:', error);
      // Fallback to offline options on error
      setDeliveryOptions(offlineDeliveryOptions);
      showError('Failed to load delivery options. Showing offline options.');
    } finally {
      setLoadingOptions(false);
    }
  };

  const fetchDeliveryQuote = async () => {
    if (!manualDetails.delivery_address) {
      showError('Please enter your delivery address');
      return;
    }
    if (!manualDetails.buyer_name || !manualDetails.buyer_phone) {
      showError('Please enter your name and phone number');
      return;
    }

    setLoadingQuote(true);
    try {
      // Get pickup address from listing
      const pickupAddress = (listing as any).pickup_address || listing.location || '';
      const pickupCity = (listing as any).pickup_city || '';
      const pickupState = (listing as any).pickup_state || '';
      
      // Build full addresses
      const senderFullAddress = [pickupAddress, pickupCity, pickupState]
        .filter(Boolean)
        .join(', ') || 'Nigeria';
      
      const receiverFullAddress = [
        manualDetails.delivery_address,
        manualDetails.delivery_city,
        manualDetails.delivery_state
      ].filter(Boolean).join(', ') || manualDetails.delivery_address;

      // Smart weight and dimension estimation based on crop type and package
      const packageEstimate = estimatePackage(
        listing.crop,
        listing.unit || 'bags',
        purchaseQuantity,
        listing.measurement_value // Use seller-provided weight if available
      );

      console.log('📦 Package estimate:', packageEstimate);

      const quoteResponse = await getDeliveryQuote({
        listing_id: listing.id,
        payload: {
          // Terminal Africa API format
          sender_address: senderFullAddress,
          sender_name: sellerName,
          sender_phone: sellerPhone,
          sender_email: sellerEmail || 'seller@marketplace.com',
          
          receiver_address: receiverFullAddress,
          receiver_name: manualDetails.buyer_name,
          receiver_phone: manualDetails.buyer_phone,
          receiver_email: manualDetails.buyer_email || 'buyer@marketplace.com',
          
          // Package details - using smart estimates
          pickup_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Tomorrow
          category_id: 5, // Food/Groceries category
          package_items: [{
            name: listing.crop,
            description: `${listing.crop} - ${purchaseQuantity} ${listing.unit}${listing.measurement_value ? ` (${listing.measurement_value} ${listing.measurement_unit} each)` : ''}`,
            unit_weight: packageEstimate.chargeableWeight, // Use chargeable weight for accurate pricing
            unit_amount: unitPrice,
            quantity: 1, // We're sending total weight, not per-unit
          }],
          package_dimension: {
            length: packageEstimate.length,
            width: packageEstimate.width,
            height: packageEstimate.height,
          },
          
          // Additional context
          quantity: purchaseQuantity,
          total_value: produceTotal,
          weight_estimate: packageEstimate, // Include for debugging
        }
      }) as DeliveryQuoteData;

      setDeliveryQuote({
        quote_id: quoteResponse.quote_id,
        fee: Number(quoteResponse.fee ?? 0),
        currency: quoteResponse.currency ?? 'NGN',
        quote: quoteResponse.quote,
        couriers: (quoteResponse as any).couriers,
        cheapest_courier: (quoteResponse as any).cheapest_courier,
        fastest_courier: (quoteResponse as any).fastest_courier,
      });

      // Auto-select cheapest courier
      if ((quoteResponse as any).cheapest_courier) {
        setSelectedCourier((quoteResponse as any).cheapest_courier.courier_id);
      }

      // Move to quote step
      setStep('quote');
    } catch (error: any) {
      console.error('Error getting delivery quote:', error);
      showError(error.message || 'Failed to get delivery quote. Please check addresses and try again.');
    } finally {
      setLoadingQuote(false);
    }
  };

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

  const initiatePaystackPayment = useCallback(async (order: any) => {
    try {
      await loadPaystackScript();
      
      const PaystackPop = (window as any).PaystackPop;
      if (!PaystackPop) {
        throw new Error('Paystack not loaded');
      }

      const paymentEmail = manualDetails.buyer_email || user?.email || 'guest@marketplace.com';
      
      // Ensure amount is a valid positive integer (Paystack expects kobo)
      const rawAmount = grandTotal * 100;
      const paymentAmount = Math.round(rawAmount);
      
      // Validate the amount
      if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
        console.error('delivery method not available, please change delivery method:', { grandTotal, rawAmount, paymentAmount });
        throw new Error(`Invalid payment amount, delivery method not available: ₦${grandTotal?.toLocaleString() || 'N/A'}. Please check the listing price.`);
      }

      const handler = PaystackPop.setup({
        key: PAYSTACK_PUBLIC_KEY,
        email: paymentEmail,
        amount: paymentAmount,
        currency: 'NGN',
        ref: order.order_reference || `ORD-${Date.now()}`,
        metadata: {
          order_id: order.id,
          listing_id: listing.id,
          buyer_name: manualDetails.buyer_name,
          buyer_phone: manualDetails.buyer_phone,
          custom_fields: [
            {
              display_name: 'Order Reference',
              variable_name: 'order_reference',
              value: order.order_reference,
            },
            {
              display_name: 'Product',
              variable_name: 'product',
              value: listing.crop,
            },
          ],
        },
        onClose: function() {
          setIsSubmitting(false);
          showError('Payment cancelled. Your order is saved but not paid.');
        },
        callback: function(response: { reference: string }) {
          // Verify payment with backend
          verifyOrderPayment({
            order_id: order.id,
            payment_reference: response.reference,
          })
            .then(() => {
              showSuccess('Payment successful! Your order has been confirmed.');
              onClose();
              // Navigate to track order page with the order reference
              navigate(`/track-order?ref=${encodeURIComponent(order.order_reference)}`);
            })
            .catch((verifyError: any) => {
              console.error('Payment verification failed:', verifyError);
              showError('Payment may have succeeded but verification failed. Please contact support.');
              // Still navigate to track order so they can see status
              onClose();
              navigate(`/track-order?ref=${encodeURIComponent(order.order_reference)}`);
            })
            .finally(() => {
              setIsSubmitting(false);
            });
        },
      });

      handler.openIframe();
    } catch (error: any) {
      console.error('Paystack error:', error);
      showError('Failed to initialize payment. Please try again.');
      setIsSubmitting(false);
    }
  }, [grandTotal, manualDetails, user, listing, onClose]);

  const handleCreateOrderAndPay = async () => {
    const deliveryOption = deliveryOptions.find(opt => opt.id === selectedDelivery);
    
    // For manual pickup, just show contact info
    if (deliveryOption?.type === 'manual') {
      showSuccess('Contact the seller using the details shown above.');
      onClose();
      return;
    }

    // Validate payment amount before proceeding
    if (!Number.isFinite(grandTotal) || grandTotal <= 0) {
      showError(`Invalid payment amount: ₦${grandTotal?.toLocaleString() || 'N/A'}. Please check the listing price and try again.`);
      return;
    }

    // For in-app delivery, create order first then pay
    if (deliveryOption?.type === 'in_app') {
      setIsSubmitting(true);
      try {
        // Create order with pending_payment status
        const orderPayload: any = {
          listing_id: listing.id,
          delivery_method: 'in_app',
          payment_amount: grandTotal,
          delivery_fee: deliveryFee,
          quantity: purchaseQuantity,
          currency: 'NGN',
          manual_details: {
            buyer_name: manualDetails.buyer_name,
            buyer_phone: manualDetails.buyer_phone,
            buyer_email: manualDetails.buyer_email || user?.email || null,
            delivery_address: `${manualDetails.delivery_address}, ${manualDetails.delivery_city}, ${manualDetails.delivery_state}`.replace(/, ,/g, ',').replace(/^, |, $/g, ''),
            instructions: manualDetails.instructions || null,
          },
          metadata: {
            unit_price: unitPrice,
            produce_total: produceTotal,
            delivery_fee: deliveryFee,
            total_price: grandTotal,
            quantity: purchaseQuantity,
            delivery_address: manualDetails.delivery_address,
            delivery_city: manualDetails.delivery_city,
            delivery_state: manualDetails.delivery_state,
            selected_courier: selectedCourier,
          },
        };

        if (deliveryQuote) {
          orderPayload.delivery_quote_id = deliveryQuote.quote_id;
          orderPayload.delivery_details = deliveryQuote.quote;
        }

        const order = await createOrder(orderPayload);
        
        // Now initiate Paystack payment
        await initiatePaystackPayment(order);
        
      } catch (error: any) {
        console.error('Error creating order:', error);
        showError(error.message || 'Failed to create order. Please try again.');
        setIsSubmitting(false);
      }
    }
  };

  const handleProceedFromDelivery = () => {
    if (!selectedDelivery) {
      showError('Please select a delivery method');
      return;
    }

    const deliveryOption = deliveryOptions.find(opt => opt.id === selectedDelivery);
    
    // For manual pickup, just close
    if (deliveryOption?.type === 'manual') {
      showSuccess('Contact the seller using the details shown above to arrange pickup.');
      onClose();
      return;
    }

    // For in-app delivery, validate form and get quote
    if (deliveryOption?.type === 'in_app') {
      if (unitPrice <= 0) {
        showError('This seller has not set a price for in-app payments. Please contact them directly.');
        return;
      }
      if (!manualDetails.delivery_address) {
        showError('Please enter your delivery address');
        return;
      }
      if (!manualDetails.buyer_name || !manualDetails.buyer_phone) {
        showError('Please enter your name and phone number');
        return;
      }
      
      // Fetch delivery quote from Terminal Africa
      fetchDeliveryQuote();
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
          <h2>
            {step === 'contact' && 'Contact Seller'}
            {step === 'delivery' && 'Delivery Details'}
            {step === 'quote' && 'Choose Courier & Pay'}
            {step === 'payment' && 'Payment'}
          </h2>
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
              {listing.measurement_value && listing.measurement_unit && (
                <span className="package-size"> ({listing.measurement_value} {listing.measurement_unit} each)</span>
              )}
              {listing.location && ` • ${listing.location}`}
              {listing.price && ` • ₦${listing.price.toLocaleString()}`}
            </p>
            {listing.unit_description && (
              <p className="product-notes">{listing.unit_description}</p>
            )}
          </div>

          {(step === 'contact' || step === 'delivery') && (
            <div className="seller-info-section">
              <h4>Seller Information</h4>

              {sellerName && (
                <div className="info-row">
                  <span className="info-label">Name:</span>
                  <span className="info-value">{sellerName}</span>
                </div>
              )}

              <div className="info-row contact-row">
                <span className="info-label">Phone:</span>
                {sellerPhone ? (
                  <a href={`tel:${sellerPhone}`} className="contact-link phone-link">
                    {sellerPhone}
                  </a>
                ) : (
                  <span className="info-value muted">Not provided</span>
                )}
              </div>

              <div className="info-row contact-row">
                <span className="info-label">Email:</span>
                {sellerEmail ? (
                  <a href={`mailto:${sellerEmail}`} className="contact-link email-link">
                    {sellerEmail}
                  </a>
                ) : (
                  <span className="info-value muted">Not provided</span>
                )}
              </div>
            </div>
          )}

          <div className="purchase-info-section">
            <h4>Purchase Details</h4>
            {step !== 'quote' && (
              <>
                <Input
                  label={`Quantity (${listing.unit})`}
                  type="number"
                  min={1}
                  max={availableQuantity}
                  value={purchaseQuantity}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    if (Number.isNaN(value)) return;
                    const clamped = Math.min(Math.max(1, value), availableQuantity);
                    setPurchaseQuantity(clamped);
                    setDeliveryQuote(null);
                    setSelectedCourier(null);
                  }}
                  disabled={(step as any) === 'quote'}
                />
                <p className="info-note">Available: {listing.quantity} {listing.unit}</p>
              </>
            )}
            <div className="price-summary">
              <div>
                <span>Price per {listing.unit}:</span>
                <strong>
                  {unitPrice > 0 ? formatCurrency(unitPrice) : 'Contact seller'}
                </strong>
              </div>
              {unitPrice > 0 && (
                <div>
                  <span>Produce ({purchaseQuantity} {listing.unit}):</span>
                  <strong>{formatCurrency(produceTotal)}</strong>
                </div>
              )}
            </div>
          </div>

          {step === 'delivery' && (
            <>
              <div className="modal-actions">
                <Button
                  onClick={() => setStep('delivery')}
                  className="btn-primary"
                >
                  💳 Pay Now with App
                </Button>

                {!interestMarked ? (
                  <Button
                    onClick={handleMarkInterested}
                    disabled={isSubmitting}
                    variant="secondary"
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
            </>
          )}

          {step === 'contact' && (
            <>
              <div className="delivery-options-section">
                <h4>Select Delivery Method</h4>

                {!isOnline && (
                  <div className="offline-notice">
                    <div className="notice-icon">📡</div>
                    <div className="notice-content">
                      <p><strong>You're currently offline.</strong> Some delivery options may not be available.</p>
                    </div>
                  </div>
                )}
                
                {loadingOptions ? (
                  <div className="loading-state">
                    <LoadingSpinner />
                    <p>Loading delivery options...</p>
                  </div>
                ) : deliveryOptions.length === 0 ? (
                  <p>No delivery options available</p>
                ) : (
                  <div className="delivery-options-list">
                    {deliveryOptions.map((option) => {
                      const isDisabled = !isOnline && option.type === 'in_app';
                      return (
                        <div
                          key={option.id}
                          className={`delivery-option ${selectedDelivery === option.id ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
                          onClick={() => !isDisabled && setSelectedDelivery(option.id)}
                        >
                          <input
                            type="radio"
                            checked={selectedDelivery === option.id}
                            onChange={() => !isDisabled && setSelectedDelivery(option.id)}
                            disabled={isDisabled}
                          />
                          <div className="option-details">
                            <strong>{option.label}</strong>
                            {option.notes && <p className="option-notes">{option.notes}</p>}
                            {isDisabled && option.offline_message && (
                              <p className="offline-warning">⚠️ {option.offline_message}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {selectedDelivery === 'manual_pickup' && (
                  <div className="info-notice">
                    <div className="notice-icon">ℹ️</div>
                    <div className="notice-content">
                      <p><strong>Contact the seller directly to negotiate pricing or to arrange pickup for you.</strong></p>
                    </div>
                  </div>
                )}

                {selectedDelivery === 'in_app_delivery' && (
                  <div className="manual-details-form">
                    <h5>Your Delivery Details</h5>
                    <Input
                      label="Your Name"
                      value={manualDetails.buyer_name}
                      onChange={(e) => setManualDetails({...manualDetails, buyer_name: e.target.value})}
                      required
                    />
                    <Input
                      label="Your Phone"
                      value={manualDetails.buyer_phone}
                      onChange={(e) => setManualDetails({...manualDetails, buyer_phone: e.target.value})}
                      required
                    />
                    <Input
                      label="Your Email (for order updates)"
                      type="email"
                      value={manualDetails.buyer_email}
                      onChange={(e) => setManualDetails({...manualDetails, buyer_email: e.target.value})}
                      placeholder="email@example.com"
                    />
                    <Input
                      label="Delivery Address (Street)"
                      value={manualDetails.delivery_address}
                      onChange={(e) => setManualDetails({...manualDetails, delivery_address: e.target.value})}
                      placeholder="123 Main Street, Lekki Phase 1"
                      required
                    />
                    <div className="form-row">
                      <Input
                        label="City"
                        value={manualDetails.delivery_city}
                        onChange={(e) => setManualDetails({...manualDetails, delivery_city: e.target.value})}
                        placeholder="Lagos"
                      />
                      <Input
                        label="State"
                        value={manualDetails.delivery_state}
                        onChange={(e) => setManualDetails({...manualDetails, delivery_state: e.target.value})}
                        placeholder="Lagos"
                      />
                    </div>
                    <Input
                      label="Special Instructions"
                      value={manualDetails.instructions}
                      onChange={(e) => setManualDetails({...manualDetails, instructions: e.target.value})}
                      placeholder="Apartment number, landmark, etc."
                    />
                  </div>
                )}
              </div>

              <div className="modal-actions">
                <Button
                  onClick={handleProceedFromDelivery}
                  disabled={!selectedDelivery || loadingQuote}
                >
                  {loadingQuote ? (
                    <>
                      <ButtonSpinner /> Getting Delivery Rates...
                    </>
                  ) : selectedDelivery === 'manual_pickup' ? (
                    'Confirm'
                  ) : (
                    'Get Delivery Rates'
                  )}
                </Button>
                <Button variant="secondary" onClick={() => setStep('contact')}>
                  Back
                </Button>
              </div>
            </>
          )}

          {step === 'quote' && (
            <>
              <div className="order-summary-section">
                <h4>Order Summary</h4>
                
                <div className="summary-breakdown">
                  <div className="summary-row">
                    <span>{listing.crop} × {purchaseQuantity} {listing.unit}</span>
                    <span>{formatCurrency(produceTotal)}</span>
                  </div>
                  <div className="summary-row">
                    <span>Delivery Fee</span>
                    <span>{deliveryFee > 0 ? formatCurrency(deliveryFee) : 'Calculating...'}</span>
                  </div>
                  <div className="summary-row total">
                    <span><strong>Total</strong></span>
                    <span><strong>{formatCurrency(grandTotal)}</strong></span>
                  </div>
                </div>

                {/* Courier Selection */}
                {deliveryQuote?.couriers && deliveryQuote.couriers.length > 0 && (
                  <div className="courier-selection">
                    <h5>Select Courier</h5>
                    <div className="courier-list">
                      {deliveryQuote.couriers.slice(0, 5).map((courier) => (
                        <div
                          key={courier.courier_id}
                          className={`courier-option ${selectedCourier === courier.courier_id ? 'selected' : ''}`}
                          onClick={() => setSelectedCourier(courier.courier_id)}
                        >
                          <input
                            type="radio"
                            checked={selectedCourier === courier.courier_id}
                            onChange={() => setSelectedCourier(courier.courier_id)}
                          />
                          <div className="courier-details">
                            <strong>{courier.courier_name}</strong>
                            <span className="courier-eta">{courier.delivery_eta}</span>
                          </div>
                          <span className="courier-price">{formatCurrency(courier.total)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Show cheapest/fastest options */}
                {!deliveryQuote?.couriers && deliveryQuote?.cheapest_courier && (
                  <div className="delivery-recommendation">
                    <div className="recommendation-item">
                      <span className="badge badge-cheapest">💰 Best Price</span>
                      <strong>{deliveryQuote.cheapest_courier.courier_name}</strong>
                      <span>{formatCurrency(deliveryQuote.cheapest_courier.total)}</span>
                      <small>{deliveryQuote.cheapest_courier.delivery_eta}</small>
                    </div>
                    {deliveryQuote.fastest_courier && deliveryQuote.fastest_courier.courier_name !== deliveryQuote.cheapest_courier.courier_name && (
                      <div className="recommendation-item">
                        <span className="badge badge-fastest">⚡ Fastest</span>
                        <strong>{deliveryQuote.fastest_courier.courier_name}</strong>
                        <span>{formatCurrency(deliveryQuote.fastest_courier.total)}</span>
                        <small>{deliveryQuote.fastest_courier.delivery_eta}</small>
                      </div>
                    )}
                  </div>
                )}

                <div className="delivery-info">
                  <h5>Delivery To:</h5>
                  <p>{manualDetails.buyer_name}</p>
                  <p>{manualDetails.delivery_address}</p>
                  {manualDetails.delivery_city && <p>{manualDetails.delivery_city}, {manualDetails.delivery_state}</p>}
                  <p>{manualDetails.buyer_phone}</p>
                </div>
              </div>

              <div className="modal-actions">
                <Button
                  onClick={handleCreateOrderAndPay}
                  disabled={isSubmitting || deliveryFee <= 0}
                  className="btn-primary btn-pay"
                >
                  {isSubmitting ? (
                    <>
                      <ButtonSpinner /> Processing...
                    </>
                  ) : (
                    <>💳 Pay {formatCurrency(grandTotal)}</>
                  )}
                </Button>
                <Button 
                  variant="secondary" 
                  onClick={() => {
                    setStep('delivery');
                    setDeliveryQuote(null);
                    setSelectedCourier(null);
                  }}
                  disabled={isSubmitting}
                >
                  Back
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
