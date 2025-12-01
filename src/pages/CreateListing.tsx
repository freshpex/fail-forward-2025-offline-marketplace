import { useState, FormEvent, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { Button } from '../components/Button';
import { ButtonSpinner } from '../components/ButtonSpinner';
import { ImageUpload } from '../components/ImageUpload';
import { PhoneNumberInput } from '../components/PhoneNumberInput';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { createListing, fetchPrices, updateListing } from '../services/api';
import { addPendingListing, cachePrices, getCachedPrices } from '../services/db';
import { supabase } from '../services/supabase';
import { NewListing, PendingListing, ReferencePrice } from '../types';
import { formatNairaSimple } from '../utils/currency';

const UNITS = [
  { value: 'kg', label: 'Kilograms (kg)' },
  { value: 'tons', label: 'Tons' },
  { value: 'bags', label: 'Bags' },
  { value: 'crates', label: 'Crates' },
  { value: 'bundles', label: 'Bundles' },
  { value: 'pieces', label: 'Pieces' }
];

const SCHEDULE_OPTIONS = [
  { value: 'morning', label: 'Morning (8AM - 12PM)' },
  { value: 'afternoon', label: 'Afternoon (12PM - 4PM)' },
  { value: 'evening', label: 'Evening (4PM - 8PM)' },
  { value: 'flexible', label: 'Flexible / Contact me to arrange' }
];

export function CreateListing() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isOnline = useOnlineStatus();
  const [loading, setLoading] = useState(false);
  const [loadingListing, setLoadingListing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [referencePrices, setReferencePrices] = useState<ReferencePrice[]>([]);
  
  // Edit mode
  const listingId = searchParams.get('listingId');
  const isEditMode = !!listingId;

  const [formData, setFormData] = useState({
    crop: '',
    quantity: '',
    unit: '',
    price: '',
    location: '',
    contact_phone: '',
    contact_email: '',
    farmer_name: '',
    image_url: '',
    pickup_address: '',
    pickup_city: '',
    pickup_state: '',
    harvest_date: '',
    preferred_schedule: ''
  });

  // Load existing listing data when in edit mode
  useEffect(() => {
    const loadListing = async () => {
      if (!listingId) return;
      
      setLoadingListing(true);
      try {
        const { data, error } = await supabase
          .from('listings')
          .select('*')
          .eq('id', listingId)
          .single();
          
        if (error) throw error;
        
        if (data) {
          setFormData({
            crop: data.crop || '',
            quantity: data.quantity?.toString() || '',
            unit: data.unit || '',
            price: data.price?.toString() || '',
            location: data.location || '',
            contact_phone: data.contact_phone || '',
            contact_email: data.contact_email || '',
            farmer_name: data.farmer_name || '',
            image_url: data.image_url || '',
            pickup_address: data.pickup_address || '',
            pickup_city: data.pickup_city || '',
            pickup_state: data.pickup_state || '',
            harvest_date: data.harvest_date || '',
            preferred_schedule: data.preferred_schedule || ''
          });
        }
      } catch (err) {
        console.error('Error loading listing:', err);
        setError('Failed to load listing details');
      } finally {
        setLoadingListing(false);
      }
    };
    
    loadListing();
  }, [listingId]);

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
        contact_email: formData.contact_email || undefined,
        farmer_name: formData.farmer_name || undefined,
        image_url: formData.image_url || undefined,
        pickup_address: formData.pickup_address || undefined,
        pickup_city: formData.pickup_city || undefined,
        pickup_state: formData.pickup_state || undefined,
        harvest_date: formData.harvest_date || undefined,
        preferred_schedule: formData.preferred_schedule || undefined
      };

      if (isOnline) {
        if (isEditMode && listingId) {
          // Update existing listing
          await updateListing(listingId, listingData);
          setSuccess(true);
          setTimeout(() => navigate('/my-listings'), 1500);
        } else {
          // Create new listing
          await createListing(listingData);
          setSuccess(true);
          setTimeout(() => navigate('/browse'), 1500);
        }
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

      if (!isEditMode) {
        setFormData({
          crop: '',
          quantity: '',
          unit: '',
          price: '',
          location: '',
          contact_phone: '',
          contact_email: '',
          farmer_name: '',
          image_url: '',
          pickup_address: '',
          pickup_city: '',
          pickup_state: '',
          harvest_date: '',
          preferred_schedule: ''
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : isEditMode ? 'Failed to update listing' : 'Failed to create listing');
    } finally {
      setLoading(false);
    }
  };

  if (loadingListing) {
    return (
      <div className="create-listing">
        <h2>Loading Listing...</h2>
        <p>Please wait while we load the listing details.</p>
      </div>
    );
  }

  return (
    <div className="create-listing">
      <h2>{isEditMode ? 'Edit Listing' : 'List Your Produce'}</h2>
      <p className="page-subtitle">
        {isEditMode 
          ? 'Update your listing details below'
          : isOnline
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
          placeholder="e.g., 12500"
        />

        {relevantPrices.length > 0 && (
          <div className="price-reference">
            <h4 className="price-reference-title">Reference Prices:</h4>
            <div className="price-reference-list">
              {relevantPrices.map((price) => (
                <div key={price.id} className="price-reference-item">
                  <span className="price-reference-region">{price.region}</span>
                  <span className="price-reference-amount">{formatNairaSimple(price.price)}/{price.unit}</span>
                </div>
              ))}
            </div>
            <p className="price-reference-note">
              {isOnline ? 'Latest market prices' : 'Cached prices (offline)'}
            </p>
          </div>
        )}

        <Input
          label="General Location"
          type="text"
          required
          value={formData.location}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          placeholder="e.g., Ikeja, Lagos, Nigeria"
        />

        <Input
          label="Pickup Address"
          type="text"
          required
          value={formData.pickup_address}
          onChange={(e) => setFormData({ ...formData, pickup_address: e.target.value })}
          placeholder="House number, street name"
        />

        <div className="form-row">
          <Input
            label="City"
            type="text"
            required
            value={formData.pickup_city}
            onChange={(e) => setFormData({ ...formData, pickup_city: e.target.value })}
            placeholder="e.g., Ikeja"
          />

          <Input
            label="State"
            type="text"
            required
            value={formData.pickup_state}
            onChange={(e) => setFormData({ ...formData, pickup_state: e.target.value })}
            placeholder="e.g., Lagos"
          />
        </div>

        <div className="form-row">
          <Input
            label="Expected Harvest Date"
            type="date"
            value={formData.harvest_date}
            onChange={(e) => setFormData({ ...formData, harvest_date: e.target.value })}
          />

          <Select
            label="Preferred Pickup Schedule"
            options={SCHEDULE_OPTIONS}
            value={formData.preferred_schedule}
            onChange={(e) => setFormData({ ...formData, preferred_schedule: e.target.value })}
          />
        </div>

        <PhoneNumberInput
          label="Contact Phone"
          required
          value={formData.contact_phone}
          onChange={(value) => setFormData({ ...formData, contact_phone: value })}
          placeholder="Enter phone number"
        />

        <Input
          label="Contact Email (Optional)"
          type="email"
          value={formData.contact_email}
          onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
          placeholder="example@email.com"
        />

        <Input
          label="Your Name"
          type="text"
          value={formData.farmer_name}
          onChange={(e) => setFormData({ ...formData, farmer_name: e.target.value })}
          placeholder="Optional"
        />

        <ImageUpload
          onImageChange={(imageData) => setFormData({ ...formData, image_url: imageData || '' })}
          currentImage={formData.image_url}
        />

        <Button type="submit" disabled={loading}>
          {loading 
            ? <><ButtonSpinner /> Saving...</> 
            : isEditMode 
              ? 'Update Listing'
              : isOnline 
                ? 'Create Listing' 
                : 'Save for Later Sync'}
        </Button>
      </form>
    </div>
  );
}
