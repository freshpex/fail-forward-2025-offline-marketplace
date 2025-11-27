import { useState, FormEvent, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { Button } from '../components/Button';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { createListing, fetchPrices } from '../services/api';
import { addPendingListing, cachePrices, getCachedPrices } from '../services/db';
import { NewListing, PendingListing, ReferencePrice } from '../types';

const UNITS = [
  { value: 'kg', label: 'Kilograms (kg)' },
  { value: 'tons', label: 'Tons' },
  { value: 'bags', label: 'Bags' },
  { value: 'crates', label: 'Crates' },
  { value: 'bundles', label: 'Bundles' },
  { value: 'pieces', label: 'Pieces' }
];

export function CreateListing() {
  const navigate = useNavigate();
  const isOnline = useOnlineStatus();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [referencePrices, setReferencePrices] = useState<ReferencePrice[]>([]);

  const [formData, setFormData] = useState({
    crop: '',
    quantity: '',
    unit: '',
    price: '',
    location: '',
    contact_phone: '',
    farmer_name: ''
  });

  useEffect(() => {
    const loadPrices = async () => {
      try {
        const prices = isOnline
          ? await fetchPrices()
          : await getCachedPrices();

        if (isOnline && prices.length > 0) {
          await cachePrices(prices);
        }

        setReferencePrices(prices);
      } catch (err) {
        console.error('Failed to load prices:', err);
      }
    };

    loadPrices();
  }, [isOnline]);

  const getRelevantPrices = () => {
    if (!formData.crop) return [];

    return referencePrices.filter(price =>
      price.crop.toLowerCase().includes(formData.crop.toLowerCase()) &&
      price.unit === formData.unit
    ).slice(0, 3);
  };

  const relevantPrices = getRelevantPrices();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const listingData: NewListing = {
        crop: formData.crop,
        quantity: parseFloat(formData.quantity),
        unit: formData.unit,
        price: formData.price ? parseFloat(formData.price) : null,
        location: formData.location,
        contact_phone: formData.contact_phone,
        farmer_name: formData.farmer_name || undefined
      };

      if (isOnline) {
        await createListing(listingData);
        setSuccess(true);
        setTimeout(() => navigate('/browse'), 1500);
      } else {
        const pendingListing: PendingListing = {
          ...listingData,
          localId: `local-${Date.now()}-${Math.random()}`,
          status: 'pending',
          created_at: new Date().toISOString()
        };
        await addPendingListing(pendingListing);
        setSuccess(true);
        setTimeout(() => navigate('/browse'), 1500);
      }

      setFormData({
        crop: '',
        quantity: '',
        unit: '',
        price: '',
        location: '',
        contact_phone: '',
        farmer_name: ''
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create listing');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-listing">
      <h2>List Your Produce</h2>
      <p className="page-subtitle">
        {isOnline
          ? 'Fill out the form below to create your listing'
          : 'You\'re offline. Your listing will be saved and synced when you reconnect.'}
      </p>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">
        Listing {isOnline ? 'created' : 'saved for sync'} successfully! Redirecting...
      </div>}

      <form onSubmit={handleSubmit} className="listing-form">
        <Input
          label="Crop Name"
          type="text"
          required
          value={formData.crop}
          onChange={(e) => setFormData({ ...formData, crop: e.target.value })}
          placeholder="e.g., Maize, Tomatoes, Rice"
        />

        <div className="form-row">
          <Input
            label="Quantity"
            type="number"
            required
            min="0.01"
            step="0.01"
            value={formData.quantity}
            onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
            placeholder="0"
          />

          <Select
            label="Unit"
            required
            options={UNITS}
            value={formData.unit}
            onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
          />
        </div>

        <Input
          label="Price per Unit"
          type="number"
          min="0"
          step="0.01"
          value={formData.price}
          onChange={(e) => setFormData({ ...formData, price: e.target.value })}
          placeholder="₦1,500"
        />

        {relevantPrices.length > 0 && (
          <div className="price-reference">
            <h4 className="price-reference-title">Reference Prices:</h4>
            <div className="price-reference-list">
              {relevantPrices.map((price) => (
                <div key={price.id} className="price-reference-item">
                  <span className="price-reference-region">{price.region}</span>
                  <span className="price-reference-amount">${price.price}/{price.unit}</span>
                </div>
              ))}
            </div>
            <p className="price-reference-note">
              {isOnline ? 'Latest market prices' : 'Cached prices (offline)'}
            </p>
          </div>
        )}

        <Input
          label="Location"
          type="text"
          required
          value={formData.location}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          placeholder="e.g., Kisumu, Western Region"
        />

        <Input
          label="Contact Phone"
          type="tel"
          required
          value={formData.contact_phone}
          onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
          placeholder="+254 XXX XXXX"
        />

        <Input
          label="Your Name"
          type="text"
          value={formData.farmer_name}
          onChange={(e) => setFormData({ ...formData, farmer_name: e.target.value })}
          placeholder="Optional"
        />

        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : isOnline ? 'Create Listing' : 'Save for Later Sync'}
        </Button>
      </form>
    </div>
  );
}
