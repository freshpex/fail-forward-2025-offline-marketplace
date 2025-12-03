import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { Button } from '../components/Button';
import { ComponentLoader } from '../components/ComponentLoader';
import { showSuccess, showError, showWarning } from '../utils/toast';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { 
  addPendingOrderUpdate, 
  getPendingOrderUpdates,
  cacheMyOrders,
  getCachedMyOrders,
  updateCachedOrder,
  type PendingOrderUpdate,
  type CachedOrder 
} from '../services/db';
import { syncPendingOrderUpdates, setupOnlineListener } from '../services/sync';

interface Order {
  id: string;
  order_reference: string;
  status: string;
  payment_status: string | null;
  quantity: number;
  produce_price: number | null;
  total_amount: number | null;
  created_at: string;
  updated_at: string;
  listing: {
    id: string;
    crop: string;
    price: number;
    unit: string;
    image_url?: string;
    farmer_name?: string;
    location?: string;
  } | null;
  manual_order: {
    buyer_name: string;
    buyer_phone: string;
  }[] | null;
  // Track if this order has a pending offline update
  _pendingOffline?: boolean;
}

const ORDER_STATUSES = [
  { key: 'pending_payment', label: 'Awaiting Payment', color: '#f59e0b' },
  { key: 'payment_verified', label: 'Payment Received', color: '#10b981' },
  { key: 'ready_for_pickup', label: 'Ready for Pickup', color: '#3b82f6' },
  { key: 'in_transit', label: 'In Transit', color: '#8b5cf6' },
  { key: 'completed', label: 'Delivered', color: '#22c55e' },
  { key: 'cancelled', label: 'Cancelled', color: '#ef4444' },
];

export function SellerOrders() {
  const { user } = useAuth();
  const isOnline = useOnlineStatus();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [pendingOfflineOrders, setPendingOfflineOrders] = useState<Set<string>>(new Set());

  // Setup online listener to sync when connection is restored
  useEffect(() => {
    const cleanup = setupOnlineListener(async () => {
      const result = await syncPendingOrderUpdates();
      if (result.success > 0) {
        showSuccess(`Synced ${result.success} order update(s)`);
        loadOrders();
      }
      if (result.failed > 0) {
        showError(`Failed to sync ${result.failed} order update(s)`);
      }
    });
    
    return cleanup;
  }, []);

  // Load pending offline orders on mount
  useEffect(() => {
    loadPendingOfflineOrders();
  }, []);

  const loadPendingOfflineOrders = async () => {
    const pending = await getPendingOrderUpdates();
    const pendingIds = new Set(pending.filter(p => p.status === 'pending').map(p => p.orderId));
    setPendingOfflineOrders(pendingIds);
  };

  useEffect(() => {
    if (user) {
      loadOrders();
    }
  }, [user, isOnline]);

  const loadOrders = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // If offline, load from cache
      if (!isOnline) {
        console.log('📶 Offline: Loading orders from cache');
        const cachedOrders = await getCachedMyOrders();
        
        // Mark orders with pending offline updates
        const pending = await getPendingOrderUpdates();
        const pendingIds = new Set(pending.filter(p => p.status === 'pending').map(p => p.orderId));
        setPendingOfflineOrders(pendingIds);
        
        const ordersWithPendingFlag = cachedOrders.map(order => ({
          ...order,
          _pendingOffline: pendingIds.has(order.id),
        })) as Order[];
        
        setOrders(ordersWithPendingFlag);
        
        if (cachedOrders.length === 0) {
          showWarning('No cached orders available. Connect to the internet to load orders.');
        }
        return;
      }
      
      // Online: Fetch from server
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          listing:listings(id, crop, price, unit, image_url, farmer_name, location),
          manual_order:manual_orders(buyer_name, buyer_phone)
        `)
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Cache orders for offline use
      if (data && data.length > 0) {
        await cacheMyOrders(data as CachedOrder[]);
        console.log(`✅ Cached ${data.length} orders for offline use`);
      }
      
      // Mark orders with pending offline updates
      const pending = await getPendingOrderUpdates();
      const pendingIds = new Set(pending.filter(p => p.status === 'pending').map(p => p.orderId));
      setPendingOfflineOrders(pendingIds);
      
      const ordersWithPendingFlag = (data || []).map(order => ({
        ...order,
        _pendingOffline: pendingIds.has(order.id),
      }));
      
      setOrders(ordersWithPendingFlag);
    } catch (err) {
      console.error('Error loading orders:', err);
      
      // On error, try to load from cache as fallback
      const cachedOrders = await getCachedMyOrders();
      if (cachedOrders.length > 0) {
        const pending = await getPendingOrderUpdates();
        const pendingIds = new Set(pending.filter(p => p.status === 'pending').map(p => p.orderId));
        const ordersWithPendingFlag = cachedOrders.map(order => ({
          ...order,
          _pendingOffline: pendingIds.has(order.id),
        })) as Order[];
        setOrders(ordersWithPendingFlag);
        showWarning('Using cached orders. Some data may be outdated.');
      } else {
        showError('Failed to load orders');
      }
    } finally {
      setLoading(false);
    }
  };

  const markAsReady = async (orderId: string) => {
    try {
      setUpdating(orderId);
      
      // If offline, queue the update
      if (!isOnline) {
        const pendingUpdate: PendingOrderUpdate = {
          localId: `order-ready-${orderId}-${Date.now()}`,
          orderId,
          action: 'mark_ready',
          status: 'pending',
          created_at: new Date().toISOString(),
        };
        
        await addPendingOrderUpdate(pendingUpdate);
        
        // Also update the cached order for consistency
        await updateCachedOrder(orderId, { status: 'ready_for_pickup' });
        
        // Optimistically update the UI
        setOrders(prev => prev.map(order => 
          order.id === orderId 
            ? { ...order, status: 'ready_for_pickup', _pendingOffline: true } 
            : order
        ));
        setPendingOfflineOrders(prev => new Set([...prev, orderId]));
        
        showWarning('You are offline. Order will be updated when you reconnect.');
        return;
      }
      
      // Online: Call the mark-ready edge function
      const { error } = await supabase.functions.invoke('order-mark-ready', {
        body: { order_id: orderId },
      });

      if (error) throw error;
      
      showSuccess('Order marked as ready for pickup!');
      loadOrders();
    } catch (err) {
      console.error('Error marking order ready:', err);
      showError('Failed to update order status');
    } finally {
      setUpdating(null);
    }
  };

  const getStatusInfo = (status: string) => {
    return ORDER_STATUSES.find(s => s.key === status) || { label: status, color: '#6b7280' };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NG', {
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

  const filteredOrders = filter === 'all' 
    ? orders 
    : orders.filter(o => o.status === filter);

  const pendingPrepOrders = orders.filter(o => o.status === 'payment_verified');
  const readyOrders = orders.filter(o => o.status === 'ready_for_pickup');

  if (loading) {
    return (
      <div className="seller-orders-page">
        <div className="container">
          <ComponentLoader message="Loading your orders..." />
        </div>
      </div>
    );
  }

  return (
    <div className="seller-orders-page">
      <div className="container">
        <div className="page-header">
          <h1>My Orders</h1>
          <p className="page-description">
            Manage orders for your produce listings
          </p>
        </div>

        {/* Offline indicator */}
        {!isOnline && (
          <div className="orders-alert offline">
            <div className="alert-icon">📶</div>
            <div className="alert-content">
              <h3>You're offline</h3>
              <p>Changes will be synced when you reconnect to the internet.</p>
            </div>
          </div>
        )}

        {/* Pending sync indicator */}
        {pendingOfflineOrders.size > 0 && isOnline && (
          <div className="orders-alert sync">
            <div className="alert-icon">🔄</div>
            <div className="alert-content">
              <h3>{pendingOfflineOrders.size} pending update{pendingOfflineOrders.size > 1 ? 's' : ''}</h3>
              <p>Some changes made offline are being synced...</p>
            </div>
          </div>
        )}

        {/* Alert for orders needing preparation */}
        {pendingPrepOrders.length > 0 && (
          <div className="orders-alert warning">
            <div className="alert-icon">⚠️</div>
            <div className="alert-content">
              <h3>{pendingPrepOrders.length} order{pendingPrepOrders.length > 1 ? 's' : ''} need{pendingPrepOrders.length === 1 ? 's' : ''} preparation!</h3>
              <p>Payment has been received. Please prepare these items for logistics pickup.</p>
            </div>
          </div>
        )}

        {/* Alert for orders ready for pickup */}
        {readyOrders.length > 0 && (
          <div className="orders-alert info">
            <div className="alert-icon">📦</div>
            <div className="alert-content">
              <h3>{readyOrders.length} order{readyOrders.length > 1 ? 's' : ''} awaiting pickup</h3>
              <p>These orders are ready. The logistics partner will collect them soon.</p>
            </div>
          </div>
        )}

        {/* Filter tabs */}
        <div className="order-filters">
          <button 
            className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({orders.length})
          </button>
          <button 
            className={`filter-tab ${filter === 'payment_verified' ? 'active' : ''}`}
            onClick={() => setFilter('payment_verified')}
          >
            Needs Prep ({pendingPrepOrders.length})
          </button>
          <button 
            className={`filter-tab ${filter === 'ready_for_pickup' ? 'active' : ''}`}
            onClick={() => setFilter('ready_for_pickup')}
          >
            Ready ({readyOrders.length})
          </button>
          <button 
            className={`filter-tab ${filter === 'in_transit' ? 'active' : ''}`}
            onClick={() => setFilter('in_transit')}
          >
            In Transit
          </button>
          <button 
            className={`filter-tab ${filter === 'completed' ? 'active' : ''}`}
            onClick={() => setFilter('completed')}
          >
            Completed
          </button>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="empty-state">
            <p>No orders found</p>
          </div>
        ) : (
          <div className="orders-list">
            {filteredOrders.map((order) => {
              const statusInfo = getStatusInfo(order.status);
              const buyerInfo = order.manual_order?.[0];
              const needsPrep = order.status === 'payment_verified';
              const hasPendingUpdate = order._pendingOffline || pendingOfflineOrders.has(order.id);

              return (
                <div key={order.id} className={`order-card ${needsPrep ? 'needs-action' : ''} ${hasPendingUpdate ? 'pending-sync' : ''}`}>
                  {hasPendingUpdate && (
                    <div className="pending-sync-banner">
                      <span>⏳ Pending sync when online</span>
                    </div>
                  )}
                  <div className="order-card-header">
                    <div className="order-ref">
                      <span className="label">Order</span>
                      <span className="value">{order.order_reference}</span>
                    </div>
                    <div 
                      className="status-badge"
                      style={{ backgroundColor: statusInfo.color }}
                    >
                      {statusInfo.label}
                    </div>
                  </div>

                  <div className="order-card-body">
                    {order.listing && (
                      <div className="order-item-row">
                        {order.listing.image_url && (
                          <img 
                            src={order.listing.image_url} 
                            alt={order.listing.crop}
                            className="item-thumb"
                          />
                        )}
                        <div className="item-details">
                          <h4>{order.listing.crop}</h4>
                          <p>{order.listing.farmer_name || 'Farmer'} • Qty: {order.quantity} {order.listing.unit}</p>
                        </div>
                        <div className="item-price">
                          {formatCurrency(order.total_amount || order.produce_price)}
                        </div>
                      </div>
                    )}

                    {buyerInfo && (
                      <div className="buyer-info">
                        <span className="buyer-label">Buyer:</span>
                        <span className="buyer-name">{buyerInfo.buyer_name}</span>
                        <a href={`tel:${buyerInfo.buyer_phone}`} className="buyer-phone">
                          📞 {buyerInfo.buyer_phone}
                        </a>
                      </div>
                    )}

                    <div className="order-meta">
                      <span className="order-date">Ordered: {formatDate(order.created_at)}</span>
                      {order.payment_status === 'success' && (
                        <span className="payment-confirmed">✓ Payment confirmed</span>
                      )}
                    </div>
                  </div>

                  {needsPrep && (
                    <div className="order-card-actions">
                      <div className="action-notice">
                        <strong>⚡ Action Required:</strong> Prepare this order for logistics pickup
                      </div>
                      <Button
                        onClick={() => markAsReady(order.id)}
                        disabled={updating === order.id}
                      >
                        {updating === order.id ? 'Updating...' : '✓ Mark as Ready for Pickup'}
                      </Button>
                    </div>
                  )}

                  {order.status === 'ready_for_pickup' && (
                    <div className="order-card-status">
                      <span className="status-icon">📦</span>
                      <span>Waiting for logistics partner to collect</span>
                    </div>
                  )}

                  {order.status === 'in_transit' && (
                    <div className="order-card-status">
                      <span className="status-icon">🚚</span>
                      <span>Order is being delivered to the buyer</span>
                    </div>
                  )}

                  {order.status === 'completed' && (
                    <div className="order-card-status success">
                      <span className="status-icon">✅</span>
                      <span>Order delivered successfully</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
