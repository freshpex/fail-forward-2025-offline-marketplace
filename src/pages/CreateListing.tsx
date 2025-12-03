import { useState, FormEvent, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { Button } from '../components/Button';
import { ButtonSpinner } from '../components/ButtonSpinner';
import { ImageUpload } from '../components/ImageUpload';
import { PhoneNumberInput } from '../components/PhoneNumberInput';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { createListing, updateListing } from '../services/api';
import { 
  addPendingListing, 
  addPendingListingEdit,
  getCachedListingById,
  updateCachedListing 
} from '../services/db';
import { supabase } from '../services/supabase';
import { NewListing, PendingListing, Listing } from '../types';
import { showWarning } from '../utils/toast';

const PACKAGE_TYPES = [
  { value: 'bags', label: 'Bags' },
  { value: 'sacks', label: 'Sacks' },
  { value: 'crates', label: 'Crates' },
  { value: 'jerry cans', label: 'Jerry Cans' },
  { value: 'drums', label: 'Drums' },
  { value: 'buckets', label: 'Buckets' },
  { value: 'baskets', label: 'Baskets' },
  { value: 'bundles', label: 'Bundles' },
  { value: 'bunches', label: 'Bunches' },
  { value: 'pieces', label: 'Loose Pieces' },
  { value: 'kg', label: 'Sold by weight (kg)' },
  { value: 'liters', label: 'Sold by volume (liters)' },
  { value: 'tons', label: 'Sold in tons' },
  { value: 'custom', label: 'Other (specify)' }
];

const MEASUREMENT_UNITS = [
  { value: 'kg', label: 'Kilograms (kg)' },
  { value: 'g', label: 'Grams (g)' },
  { value: 'tons', label: 'Tons' },
  { value: 'liters', label: 'Liters (L)' },
  { value: 'ml', label: 'Milliliters (ml)' },
  { value: 'pieces', label: 'Pieces / Units' },
  { value: 'bottles', label: 'Bottles' },
  { value: 'sachets', label: 'Sachets' },
  { value: 'custom', label: 'Custom unit' }
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
  
  // Edit mode
  const listingId = searchParams.get('listingId');
  const isEditMode = !!listingId;

  const [formData, setFormData] = useState({
    crop: '',
    quantity: '',
    unit: '',
    custom_unit: '',
    measurement_unit: '',
    custom_measurement_unit: '',
    measurement_value: '',
    unit_description: '',
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

  // State to track if loaded from cache
  const [loadedFromCache, setLoadedFromCache] = useState(false);

  // Helper to populate form from listing data
  const populateFormFromListing = (data: Listing) => {
    setFormData({
      crop: data.crop || '',
      quantity: data.quantity?.toString() || '',
      unit: PACKAGE_TYPES.some((option) => option.value === data.unit)
        ? data.unit
        : data.unit
        ? 'custom'
        : '',
      custom_unit: PACKAGE_TYPES.some((option) => option.value === data.unit)
        ? ''
        : data.unit || '',
      measurement_unit: MEASUREMENT_UNITS.some((option) => option.value === data.measurement_unit)
        ? data.measurement_unit ?? ''
        : data.measurement_unit
        ? 'custom'
        : '',
      custom_measurement_unit: MEASUREMENT_UNITS.some((option) => option.value === data.measurement_unit)
        ? ''
        : data.measurement_unit || '',
      measurement_value: data.measurement_value?.toString() || '',
      unit_description: data.unit_description || '',
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
  };

  // Load existing listing data when in edit mode
  useEffect(() => {
    const loadListing = async () => {
      if (!listingId) return;
      
      setLoadingListing(true);
      setLoadedFromCache(false);
      
      try {
        // If offline, try to load from cache first
        if (!isOnline) {
          console.log('📶 Offline: Attempting to load listing from cache');
          const cachedListing = await getCachedListingById(listingId);
          
          if (cachedListing) {
            populateFormFromListing(cachedListing);
            setLoadedFromCache(true);
            showWarning('Loaded from cache. Changes will be saved when you reconnect.');
            setLoadingListing(false);
            return;
          } else {
            setError('Listing not available offline. Please connect to the internet.');
            setLoadingListing(false);
            return;
          }
        }
        
        // Online: Fetch from server
        const { data, error } = await supabase
          .from('listings')
          .select('*')
          .eq('id', listingId)
          .single();
          
        if (error) throw error;
        
        if (data) {
          populateFormFromListing(data as Listing);
        }
      } catch (err) {
        console.error('Error loading listing:', err);
        
        // On error, try to load from cache as fallback
        const cachedListing = await getCachedListingById(listingId);
        if (cachedListing) {
          populateFormFromListing(cachedListing);
          setLoadedFromCache(true);
          showWarning('Using cached data. Some information may be outdated.');
        } else {
          setError('Failed to load listing details');
        }
      } finally {
        setLoadingListing(false);
      }
    };
    
    loadListing();
  }, [listingId, isOnline]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Determine the actual package type and measurement unit
      const resolvedUnit = formData.unit === 'custom' ? formData.custom_unit : formData.unit;
      const resolvedMeasurementUnit = formData.measurement_unit === 'custom'
        ? formData.custom_measurement_unit
        : formData.measurement_unit;

      const listingData: NewListing = {
        crop: formData.crop,
        quantity: parseFloat(formData.quantity),
        unit: resolvedUnit,
        package_type: resolvedUnit,
        measurement_unit: resolvedMeasurementUnit || undefined,
        measurement_value: formData.measurement_value ? parseFloat(formData.measurement_value) : null,
        unit_description: formData.unit_description || undefined,
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
        // Offline: Queue the changes
        if (isEditMode && listingId) {
          // Queue edit for later sync
          await addPendingListingEdit({
            localId: `edit-${listingId}-${Date.now()}`,
            listingId,
            updates: listingData as Partial<Listing>,
            status: 'pending',
            created_at: new Date().toISOString()
          });
          
          // Also update the local cache for consistency
          await updateCachedListing(listingId, listingData as Partial<Listing>);
          
          showWarning('You are offline. Changes will be saved when you reconnect.');
          setSuccess(true);
          setTimeout(() => navigate('/my-listings'), 1500);
        } else {
          // Queue new listing for later sync
          const pendingListing: PendingListing = {
            ...listingData,
            localId: `local-${Date.now()}-${Math.random()}`,
            status: 'pending',
            created_at: new Date().toISOString()
          };
          await addPendingListing(pendingListing);
          showWarning('You are offline. Listing will be created when you reconnect.');
          setSuccess(true);
          setTimeout(() => navigate('/browse'), 1500);
        }
      }

      if (!isEditMode) {
        setFormData({
          crop: '',
          quantity: '',
          unit: '',
            custom_unit: '',
            measurement_unit: '',
            custom_measurement_unit: '',
            measurement_value: '',
            unit_description: '',
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
        <p>Please wait while we load the listing details{!isOnline ? ' from cache' : ''}.</p>
      </div>
    );
  }

  return (
    <div className="create-listing">
      <h2>{isEditMode ? 'Edit Listing' : 'List Your Produce'}</h2>
      <p className="page-subtitle">
        {isEditMode 
          ? (isOnline 
              ? 'Update your listing details below'
              : loadedFromCache 
                ? 'You\'re offline. Changes will sync when you reconnect.'
                : 'Update your listing details below')
          : isOnline
            ? 'Fill out the form below to create your listing'
            : 'You\'re offline. Your listing will be saved and synced when you reconnect.'}
      </p>

      {/* Offline indicator */}
      {!isOnline && (
        <div className="offline-banner" style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#fef3c7', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>📶</span>
          <span>You're offline. {isEditMode ? 'Edits' : 'This listing'} will sync when you reconnect.</span>
        </div>
      )}

      {/* Loaded from cache indicator */}
      {loadedFromCache && (
        <div className="cache-banner" style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#dbeafe', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>💾</span>
          <span>Loaded from offline cache. Some data may be outdated.</span>
        </div>
      )}

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">
        {isEditMode
          ? (isOnline ? 'Listing updated' : 'Edit saved for sync')
          : (isOnline ? 'Listing created' : 'Listing saved for sync')
        } successfully! Redirecting...
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
            label="Quantity Available"
            type="number"
            required
            min="1"
            step="1"
            value={formData.quantity}
            onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
            placeholder="e.g., 50"
          />

          <Select
            label="Package Type"
            required
            options={PACKAGE_TYPES}
            value={formData.unit}
            onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
          />
        </div>

        {formData.unit === 'custom' && (
          <Input
            label="Custom Package Type"
            type="text"
            required
            value={formData.custom_unit}
            onChange={(e) => setFormData({ ...formData, custom_unit: e.target.value })}
            placeholder="e.g., wheelbarrows, paint buckets"
          />
        )}

        <div className="form-section-label">
          <strong>What does each package contain?</strong>
          <span className="helper-text">Helps buyers know the exact size</span>
        </div>

        <div className="form-row">
          <Input
            label="Amount per Package"
            type="number"
            min="0.01"
            step="0.01"
            value={formData.measurement_value}
            onChange={(e) => setFormData({ ...formData, measurement_value: e.target.value })}
            placeholder="e.g., 50"
          />

          <Select
            label="Measurement Unit"
            options={MEASUREMENT_UNITS}
            value={formData.measurement_unit}
            onChange={(e) => setFormData({ ...formData, measurement_unit: e.target.value })}
          />
        </div>

        {formData.measurement_unit === 'custom' && (
          <Input
            label="Custom Measurement Unit"
            type="text"
            required
            value={formData.custom_measurement_unit}
            onChange={(e) => setFormData({ ...formData, custom_measurement_unit: e.target.value })}
            placeholder="e.g., tubers, heads, fingers"
          />
        )}

        <Input
          label="Additional Description (Optional)"
          type="text"
          value={formData.unit_description}
          onChange={(e) => setFormData({ ...formData, unit_description: e.target.value })}
          placeholder="e.g., Grade A, freshly harvested, medium-sized"
        />

        <Input
          label="Price per Unit"
          type="number"
          min="0"
          step="0.01"
          value={formData.price}
          onChange={(e) => setFormData({ ...formData, price: e.target.value })}
          placeholder="e.g., 12500"
        />

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
