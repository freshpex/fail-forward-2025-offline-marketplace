import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { supabase } from '../services/supabase';

interface Order {
  id: string;
  order_reference: string;
  status: string;
  payment_status: string | null;
  total_amount: number | null;
  created_at: string;
  updated_at: string;
  listing: {
    crop: string;
    price: number;
    unit: string;
    image_url?: string;
    farmer_name?: string;
  } | null;
  manual_order: {
    buyer_name: string;
    buyer_phone: string;
  }[] | null;
}

const ORDER_STATUSES = [
  { key: 'pending_payment', label: 'Awaiting Payment', icon: '💳', description: 'Order created, awaiting payment' },
  { key: 'payment_verified', label: 'Payment Verified', icon: '✅', description: 'Payment received, awaiting seller preparation' },
  { key: 'ready_for_pickup', label: 'Ready for Pickup', icon: '📦', description: 'Seller has prepared the order for logistics pickup' },
  { key: 'in_transit', label: 'In Transit', icon: '🚚', description: 'Order is on its way to you' },
  { key: 'completed', label: 'Delivered', icon: '🎉', description: 'Order has been delivered successfully' },
  { key: 'cancelled', label: 'Cancelled', icon: '❌', description: 'Order was cancelled' },
];

export function TrackOrder() {
  const [searchParams] = useSearchParams();
  const [orderRef, setOrderRef] = useState('');
  const [phone, setPhone] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-load order if ref is in URL
  useEffect(() => {
    const refFromUrl = searchParams.get('ref');
    if (refFromUrl) {
      setOrderRef(refFromUrl);
      trackOrder(refFromUrl);
    }
  }, [searchParams]);

  const trackOrder = async (ref: string) => {
    if (!ref.trim()) {
      setError('Please enter an order reference');
      return;
    }

    setLoading(true);
    setError(null);
    setOrder(null);

    try {
      // Only search by order_reference (not by id which requires valid UUID)
      const { data, error: queryError } = await supabase
        .from('orders')
        .select(`
          *,
          listing:listings(crop, price, unit, image_url, farmer_name),
          manual_order:manual_orders(buyer_name, buyer_phone)
        `)
        .ilike('order_reference', `%${ref.trim()}%`)
        .maybeSingle();

      if (queryError) {
        console.error('Query error:', queryError);
        setError('Failed to find order. Please check the reference and try again.');
        return;
      }

      if (!data) {
        setError('Order not found. Please check your order reference.');
        return;
      }

      // If phone is provided, verify it matches
      if (phone.trim()) {
        const buyerPhone = data.manual_order?.[0]?.buyer_phone || '';
        const normalizedPhone = phone.replace(/\D/g, '');
        const normalizedBuyerPhone = buyerPhone.replace(/\D/g, '');
        
        if (!normalizedBuyerPhone.includes(normalizedPhone) && !normalizedPhone.includes(normalizedBuyerPhone)) {
          setError('Phone number does not match our records for this order.');
          return;
        }
      }

      setOrder(data as Order);
    } catch (err) {
      console.error('Track order error:', err);
      setError('Failed to track order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    trackOrder(orderRef);
  };

  const getCurrentStatusIndex = () => {
    if (!order) return -1;
    return ORDER_STATUSES.findIndex(s => s.key === order.status);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return '—';
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  return (
    <div className="track-order-page">
      <div className="container">
        <div className="page-header">
          <h1>Track Your Order</h1>
          <p className="page-description">
            Enter your order reference to see the current status of your purchase.
          </p>
        </div>

        <div className="track-form-section">
          <form onSubmit={handleTrack} className="track-form">
            <Input
              label="Order Reference"
              type="text"
              placeholder="e.g., ORD-6749A1B2-ABC123"
              value={orderRef}
              onChange={(e) => setOrderRef(e.target.value)}
              required
            />
            <Input
              label="Phone Number (Optional)"
              type="tel"
              placeholder="For verification"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <Button type="submit" disabled={loading}>
              {loading ? 'Tracking...' : 'Track Order'}
            </Button>
          </form>

          {error && <div className="alert alert-error">{error}</div>}

          {order && (
            <div className="order-details">
              <div className="order-header">
                <div className="order-ref">
                  <span className="label">Order Reference:</span>
                  <span className="value">{order.order_reference}</span>
                </div>
                <div className="order-date">
                  <span className="label">Ordered:</span>
                  <span className="value">{formatDate(order.created_at)}</span>
                </div>
              </div>

              {order.listing && (
                <div className="order-item">
                  {order.listing.image_url && (
                    <img 
                      src={order.listing.image_url} 
                      alt={order.listing.crop}
                      className="item-image"
                    />
                  )}
                  <div className="item-info">
                    <h3>{order.listing.crop}</h3>
                    <p className="crop-type">From: {order.listing.farmer_name || 'Farmer'}</p>
                    <p className="price">
                      {formatCurrency(order.listing.price)} / {order.listing.unit}
                    </p>
                  </div>
                  <div className="item-total">
                    <span className="label">Total:</span>
                    <span className="amount">{formatCurrency(order.total_amount)}</span>
                  </div>
                </div>
              )}

              <div className="order-timeline">
                <h3>Order Status</h3>
                <div className="timeline">
                  {ORDER_STATUSES.map((status, index) => {
                    const currentIndex = getCurrentStatusIndex();
                    const isCompleted = index < currentIndex;
                    const isCurrent = index === currentIndex;
                    const isCancelled = order.status === 'cancelled';
                    
                    // Don't show steps after cancelled
                    if (isCancelled && index > currentIndex) return null;

                    let stepClass = 'timeline-step';
                    if (isCompleted) stepClass += ' completed';
                    if (isCurrent) stepClass += ' current';
                    if (status.key === 'cancelled' && isCancelled) stepClass += ' cancelled';

                    return (
                      <div key={status.key} className={stepClass}>
                        <div className="step-icon">
                          {isCompleted ? '✓' : status.icon}
                        </div>
                        <div className="step-content">
                          <h4>{status.label}</h4>
                          <p>{status.description}</p>
                          {isCurrent && order.updated_at && (
                            <span className="step-time">{formatDate(order.updated_at)}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {order.status === 'payment_verified' && (
                <div className="status-alert info">
                  <span className="alert-icon">ℹ️</span>
                  <div>
                    <strong>Seller is preparing your order</strong>
                    <p>The seller has been notified and is preparing your items for pickup. You'll receive an SMS when it's ready.</p>
                  </div>
                </div>
              )}

              {order.status === 'ready_for_pickup' && (
                <div className="status-alert success">
                  <span className="alert-icon">📦</span>
                  <div>
                    <strong>Ready for logistics pickup</strong>
                    <p>Your order is packed and waiting for the delivery partner to collect it.</p>
                  </div>
                </div>
              )}

              {order.status === 'in_transit' && (
                <div className="status-alert info">
                  <span className="alert-icon">🚚</span>
                  <div>
                    <strong>On the way!</strong>
                    <p>Your order is being delivered. You'll receive it soon!</p>
                  </div>
                </div>
              )}

              <div className="order-actions">
                <p className="help-text">
                  Need help? Contact our support at{' '}
                  <a href="mailto:epekipoluenoch@gmail.com">support@afrimarket.com</a>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
