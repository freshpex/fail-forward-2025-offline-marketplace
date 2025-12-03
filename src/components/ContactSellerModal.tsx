import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './Button';
import { ButtonSpinner } from './ButtonSpinner';
import { LoadingSpinner } from './LoadingSpinner';
import { Input } from './Input';
import { Listing } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { estimatePackage } from '../utils/produceEstimator';
import { 
  getDeliveryOptions, 
  getDeliveryQuote, 
  createOrder,
  verifyOrderPayment 
} from '../services/orders';
import { showSuccess, showError } from '../utils/toast';
import './ContactSellerModal.css';

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
  const [step, setStep] = useState<'details' | 'quote'>('details');
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
  });
  const [purchaseQuantity, setPurchaseQuantity] = useState(1);

  const sellerName = listing.farmer_name || listing.seller_profile?.full_name || 'Seller';
  const sellerPhone = listing.contact_phone || listing.seller_profile?.phone || '';
  const sellerEmail = listing.contact_email || null;
  const availableQuantity = Math.max(1, listing.quantity || 1);
  const unitPrice = Number(listing.price) || 0;
  const produceTotal = unitPrice * purchaseQuantity;
  
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
    loadDeliveryOptions();
  }, [listing.id]);

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

  const offlineDeliveryOptions = [
    {
      id: 'manual_pickup',
      label: 'Self Pickup / Arrange Yourself',
      type: 'manual' as const,
      fee: 0,
      currency: 'NGN',
      notes: 'Contact seller directly and arrange pickup at your convenience',
      available_offline: true,
    },
    {
      id: 'in_app_delivery',
      label: 'Doorstep Delivery (Via Terminal Africa)',
      type: 'in_app' as const,
      provider: 'Terminal Africa',
      currency: 'NGN',
      requires_quote: true,
      notes: 'We deliver to your doorstep. Payment required upfront.',
      available_offline: false,
      offline_message: 'Internet connection required for delivery service',
    },
  ];

  const loadDeliveryOptions = async () => {
    if (!isOnline) {
      setDeliveryOptions(offlineDeliveryOptions);
      return;
    }

    setLoadingOptions(true);
    try {
      const response = await getDeliveryOptions(listing.id);
      const options = (response.options || []).map((opt: any) => ({
        ...opt,
        available_offline: opt.type === 'manual',
        offline_message: opt.type === 'in_app' 
          ? 'Internet connection required for delivery service'
          : undefined,
      }));
      setDeliveryOptions(options);
    } catch (error) {
      console.error('Error loading delivery options:', error);
      setDeliveryOptions(offlineDeliveryOptions);
      showError('Failed to load delivery options. Showing offline options.');
    } finally {
      setLoadingOptions(false);
    }
  };

  const fetchDeliveryQuote = async () => {
    if (!manualDetails.delivery_address || !manualDetails.buyer_name || !manualDetails.buyer_phone) {
      showError('Please fill in all delivery details');
      return;
    }

    setLoadingQuote(true);
    try {
      const pickupAddress = (listing as any).pickup_address || listing.location || '';
      const pickupCity = (listing as any).pickup_city || '';
      const pickupState = (listing as any).pickup_state || '';
      
      const senderFullAddress = [pickupAddress, pickupCity, pickupState]
        .filter(Boolean)
        .join(', ') || 'Nigeria';
      
      const receiverFullAddress = [
        manualDetails.delivery_address,
        manualDetails.delivery_city,
        manualDetails.delivery_state
      ].filter(Boolean).join(', ') || manualDetails.delivery_address;

      const packageEstimate = estimatePackage(
        listing.crop,
        listing.unit || 'bags',
        purchaseQuantity,
        listing.measurement_value
      );

      console.log('📦 Package estimate:', packageEstimate);

      const quoteResponse = await getDeliveryQuote({
        listing_id: listing.id,
        payload: {
          sender_address: senderFullAddress,
          sender_name: sellerName,
          sender_phone: sellerPhone,
          sender_email: sellerEmail || 'seller@marketplace.com',
          
          receiver_address: receiverFullAddress,
          receiver_name: manualDetails.buyer_name,
          receiver_phone: manualDetails.buyer_phone,
          receiver_email: manualDetails.buyer_email || 'buyer@marketplace.com',
          
          pickup_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          category_id: 5,
          package_items: [{
            name: listing.crop,
            description: `${listing.crop} - ${purchaseQuantity} ${listing.unit}${listing.measurement_value ? ` (${listing.measurement_value} ${listing.measurement_unit} each)` : ''}`,
            unit_weight: packageEstimate.chargeableWeight,
            unit_amount: unitPrice,
            quantity: 1,
          }],
          package_dimension: {
            length: packageEstimate.length,
            width: packageEstimate.width,
            height: packageEstimate.height,
          },
          
          quantity: purchaseQuantity,
          total_value: produceTotal,
          weight_estimate: packageEstimate,
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

      if ((quoteResponse as any).cheapest_courier) {
        setSelectedCourier((quoteResponse as any).cheapest_courier.courier_id);
      }

      setStep('quote');
    } catch (error: any) {
      console.error('Error getting delivery quote:', error);
      showError(error.message || 'Failed to get delivery quote. Please check addresses and try again.');
    } finally {
      setLoadingQuote(false);
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
      const rawAmount = grandTotal * 100;
      const paymentAmount = Math.round(rawAmount);
      
      if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
        console.error('Invalid payment amount:', { grandTotal, rawAmount, paymentAmount });
        throw new Error(`Invalid payment amount. Please check the listing price.`);
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
          verifyOrderPayment({
            order_id: order.id,
            payment_reference: response.reference,
          })
            .then(() => {
              showSuccess('Payment successful! Your order has been confirmed.');
              onClose();
              navigate(`/track-order?ref=${encodeURIComponent(order.order_reference)}`);
            })
            .catch((verifyError: any) => {
              console.error('Payment verification failed:', verifyError);
              showError('Payment may have succeeded but verification failed. Please contact support.');
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
  }, [grandTotal, manualDetails, user, listing, onClose, navigate]);

  const handleCreateOrderAndPay = async () => {
    const deliveryOption = deliveryOptions.find(opt => opt.id === selectedDelivery);
    
    if (deliveryOption?.type === 'manual') {
      showSuccess('Contact the seller using the details shown above.');
      onClose();
      return;
    }

    if (!Number.isFinite(grandTotal) || grandTotal <= 0) {
      showError(`Invalid payment amount: ₦${grandTotal?.toLocaleString() || 'N/A'}. Please check the listing price and try again.`);
      return;
    }

    if (deliveryOption?.type === 'in_app') {
      setIsSubmitting(true);
      try {
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
        await initiatePaystackPayment(order);
        
      } catch (error: any) {
        console.error('Error creating order:', error);
        showError(error.message || 'Failed to create order. Please try again.');
        setIsSubmitting(false);
      }
    }
  };

  const handleProceedToCheckout = () => {
    if (!selectedDelivery) {
      showError('Please select a delivery method');
      return;
    }

    const deliveryOption = deliveryOptions.find(opt => opt.id === selectedDelivery);
    
    if (deliveryOption?.type === 'manual') {
      showSuccess('Contact the seller using the details shown above to arrange pickup.');
      onClose();
      return;
    }

    if (deliveryOption?.type === 'in_app') {
      if (unitPrice <= 0) {
        showError('This seller has not set a price for in-app payments. Please contact them directly.');
        return;
      }
      if (!manualDetails.delivery_address || !manualDetails.buyer_name || !manualDetails.buyer_phone) {
        showError('Please fill in all required delivery details');
        return;
      }
      
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
      <div className="modal-content contact-seller-modal modern-checkout">
        <div className="modal-header">
          <h2>
            {step === 'details' && '🛒 Complete Your Order'}
            {step === 'quote' && '🚚 Choose Delivery & Pay'}
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
          {/* Product Summary Card */}
          <div className="product-summary-card">
            {listing.image_url && (
              <img src={listing.image_url} alt={listing.crop} className="product-thumb" />
            )}
            <div className="product-summary-info">
              <h3>{listing.crop}</h3>
              <p className="product-location">📍 {listing.location}</p>
              {listing.price && (
                <p className="product-price">
                  {formatCurrency(listing.price)}
                  <span className="per-unit">/{listing.unit}</span>
                </p>
              )}
            </div>
          </div>

          {step === 'details' && (
            <>
              {/* Quantity Selector */}
              <div className="quantity-section">
                <label className="section-label">Select Quantity</label>
                <div className="quantity-control">
                  <button
                    type="button"
                    className="qty-btn"
                    onClick={() => setPurchaseQuantity(Math.max(1, purchaseQuantity - 1))}
                    disabled={purchaseQuantity <= 1}
                  >
                    −
                  </button>
                  <input
                    type="number"
                    className="qty-input"
                    value={purchaseQuantity}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      if (!Number.isNaN(value)) {
                        setPurchaseQuantity(Math.min(Math.max(1, value), availableQuantity));
                      }
                    }}
                    min={1}
                    max={availableQuantity}
                  />
                  <button
                    type="button"
                    className="qty-btn"
                    onClick={() => setPurchaseQuantity(Math.min(availableQuantity, purchaseQuantity + 1))}
                    disabled={purchaseQuantity >= availableQuantity}
                  >
                    +
                  </button>
                  <span className="qty-unit">{listing.unit}</span>
                </div>
                <p className="qty-note">Available: {listing.quantity} {listing.unit}</p>
              </div>

              {/* Delivery Method Selection */}
              <div className="delivery-section">
                <label className="section-label">Choose Delivery Method</label>
                
                {!isOnline && (
                  <div className="inline-notice offline">
                    <span className="notice-icon">📡</span>
                    <span>You're offline. In-app delivery requires internet connection.</span>
                  </div>
                )}

                {loadingOptions ? (
                  <div className="loading-state-inline">
                    <LoadingSpinner size="small" />
                    <span>Loading options...</span>
                  </div>
                ) : (
                  <div className="delivery-options-modern">
                    {deliveryOptions.map((option) => {
                      const isDisabled = !isOnline && option.type === 'in_app';
                      const isSelected = selectedDelivery === option.id;
                      
                      return (
                        <div
                          key={option.id}
                          className={`delivery-card ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
                          onClick={() => !isDisabled && setSelectedDelivery(option.id)}
                        >
                          <div className="delivery-card-header">
                            <input
                              type="radio"
                              checked={isSelected}
                              onChange={() => !isDisabled && setSelectedDelivery(option.id)}
                              disabled={isDisabled}
                            />
                            <div className="delivery-icon">
                              {option.type === 'manual' ? '🤝' : '🚚'}
                            </div>
                            <div className="delivery-title">
                              <strong>{option.label}</strong>
                              {option.type === 'in_app' && <span className="badge-secure">Secure</span>}
                            </div>
                          </div>
                          <p className="delivery-description">{option.notes}</p>
                          {isDisabled && (
                            <p className="offline-warning-inline">⚠️ Requires internet connection</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Delivery Details Form */}
              {selectedDelivery === 'in_app_delivery' && (
                <div className="delivery-form-section">
                  <label className="section-label">Delivery Details</label>
                  <div className="form-grid">
                    <Input
                      label="Your Name"
                      value={manualDetails.buyer_name}
                      onChange={(e) => setManualDetails({...manualDetails, buyer_name: e.target.value})}
                      required
                      placeholder="John Doe"
                    />
                    <Input
                      label="Phone Number"
                      value={manualDetails.buyer_phone}
                      onChange={(e) => setManualDetails({...manualDetails, buyer_phone: e.target.value})}
                      required
                      placeholder="+234 xxx xxx xxxx"
                    />
                  </div>
                  <Input
                    label="Email (for updates)"
                    type="email"
                    value={manualDetails.buyer_email}
                    onChange={(e) => setManualDetails({...manualDetails, buyer_email: e.target.value})}
                    placeholder="your@email.com"
                  />
                  <Input
                    label="Street Address"
                    value={manualDetails.delivery_address}
                    onChange={(e) => setManualDetails({...manualDetails, delivery_address: e.target.value})}
                    required
                    placeholder="123 Main Street"
                  />
                  <div className="form-grid">
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
                    label="Special Instructions (Optional)"
                    value={manualDetails.instructions}
                    onChange={(e) => setManualDetails({...manualDetails, instructions: e.target.value})}
                    placeholder="Apartment number, landmarks, etc."
                  />
                </div>
              )}

              {/* Seller Contact Card */}
              {selectedDelivery === 'manual_pickup' && (
                <div className="seller-contact-card">
                  <div className="contact-header">
                    <span className="contact-icon">👤</span>
                    <h4>Seller Contact</h4>
                  </div>
                  <div className="contact-details">
                    {sellerName && (
                      <div className="contact-item">
                        <span className="label">Name:</span>
                        <span className="value">{sellerName}</span>
                      </div>
                    )}
                    {sellerPhone && (
                      <a href={`tel:${sellerPhone}`} className="contact-link">
                        📞 {sellerPhone}
                      </a>
                    )}
                    {sellerEmail && (
                      <a href={`mailto:${sellerEmail}`} className="contact-link">
                        📧 {sellerEmail}
                      </a>
                    )}
                  </div>
                  <p className="contact-note">
                    Contact the seller directly to arrange pickup time and location.
                  </p>
                </div>
              )}

              {/* Price Summary */}
              {unitPrice > 0 && (
                <div className="price-summary-section">
                  <div className="summary-row">
                    <span>Subtotal ({purchaseQuantity} {listing.unit})</span>
                    <span className="amount">{formatCurrency(produceTotal)}</span>
                  </div>
                  {selectedDelivery === 'in_app_delivery' && (
                    <div className="summary-row">
                      <span>Delivery Fee</span>
                      <span className="amount">Calculated at checkout</span>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="modal-actions-modern">
                {selectedDelivery === 'manual_pickup' ? (
                  <Button
                    onClick={() => {
                      showSuccess('Contact the seller using the details above');
                    }}
                    className="btn-primary btn-large"
                  >
                    Confirm & Contact Seller
                  </Button>
                ) : (
                  <Button
                    onClick={handleProceedToCheckout}
                    disabled={!selectedDelivery || loadingQuote}
                    className="btn-primary btn-large"
                  >
                    {loadingQuote ? (
                      <>
                        <ButtonSpinner /> Getting Rates...
                      </>
                    ) : (
                      <>Proceed to Checkout →</>
                    )}
                  </Button>
                )}
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
                    <h3>Select Courier</h3>
                    <div className="courier-list">
                      {deliveryQuote.couriers.slice(0, 5).map((courier) => (
                        <div
                          key={courier.courier_id}
                          className={`courier-option ${selectedCourier === courier.courier_id ? 'selected' : ''}`}
                          onClick={() => setSelectedCourier(courier.courier_id)}
                        >
                          <div className="courier-details">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input
                            type="radio"
                            checked={selectedCourier === courier.courier_id}
                            onChange={() => setSelectedCourier(courier.courier_id)}
                            />
                            <strong>{courier.courier_name}</strong>
                          </div>
                          <p style={{ marginLeft: '18px' }}><span className="courier-eta">{courier.delivery_eta}</span></p>
                          </div>
                          <strong><span style={{ marginLeft: '18px', color: 'green' }} className="courier-price">{formatCurrency(courier.total)}</span></strong>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Cheapest/Fastest Options */}
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
                    setStep('details');
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
