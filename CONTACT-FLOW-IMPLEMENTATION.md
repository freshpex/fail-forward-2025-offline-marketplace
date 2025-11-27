# Buyer-Seller Contact Flow Implementation Guide

## Status: ContactSellerModal Created ✓

The complete buyer-seller contact flow has been partially implemented. This document contains the remaining code needed.

## Completed:
1. ✓ Database migration for purchase_interests table
2. ✓ Email field added to listings table
3. ✓ TypeScript types updated with contact_email
4. ✓ ContactSellerModal component created

## Remaining Implementation:

### 1. Update ListingCard Component

Add to `/tmp/cc-agent/60797639/project/src/components/ListingCard.tsx`:

```typescript
// Add at top with other imports
import { useState } from 'react';
import { ContactSellerModal } from './ContactSellerModal';

// Update interface
interface ListingCardProps {
  listing: Listing | PendingListing;
  showContactButton?: boolean;
}

// Update component function signature
export function ListingCard({ listing, showContactButton = true }: ListingCardProps) {
  const [showModal, setShowModal] = useState(false);
  const isFullListing = !('localId' in listing);

  // ... existing code ...

  // Add before closing </div> of listing-content
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

  // Add before closing return
  {showModal && isFullListing && (
    <ContactSellerModal
      listing={listing as Listing}
      onClose={() => setShowModal(false)}
    />
  )}
}
```

### 2. Update CreateListing Form

Add email field to `/tmp/cc-agent/60797639/project/src/pages/CreateListing.tsx`:

```typescript
// In formData state
const [formData, setFormData] = useState({
  // ... existing fields
  contact_email: ''
});

// Add after contact_phone Input
<Input
  label="Contact Email (Optional)"
  type="email"
  value={formData.contact_email}
  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
  placeholder="example@email.com"
/>

// In listingData
contact_email: formData.contact_email || undefined
```

### 3. Create PaymentSettings Page

File: `/tmp/cc-agent/60797639/project/src/pages/PaymentSettings.tsx` - Already exists

### 4. Create Escrow Page

File: `/tmp/cc-agent/60797639/project/src/pages/Escrow.tsx` - Already exists

### 5. Update UserDropdown

File: `/tmp/cc-agent/60797639/project/src/components/UserDropdown.tsx`

Add after "My Listings":
```typescript
<Link to="/payment-settings" className="dropdown-item">
  Payment Settings
</Link>
<Link to="/escrow" className="dropdown-item dropdown-item-coming-soon">
  Escrow <span className="badge-mini">Coming Soon</span>
</Link>
```

### 6. Add API Function

File: `/tmp/cc-agent/60797639/project/src/services/api.ts`

```typescript
interface NewPurchaseInterest {
  listing_id: string;
  buyer_id?: string;
  buyer_email?: string;
}

export async function createPurchaseInterest(interest: NewPurchaseInterest): Promise<void> {
  const { error } = await supabase
    .from('purchase_interests')
    .insert([{
      listing_id: interest.listing_id,
      buyer_id: interest.buyer_id || null,
      buyer_email: interest.buyer_email || null,
      status: 'interested'
    }]);

  if (error) {
    console.error('Error creating purchase interest:', error);
    throw new Error(error.message || 'Failed to create purchase interest');
  }
}
```

### 7. Update Routing

File: `/tmp/cc-agent/60797639/project/src/App.tsx`

```typescript
import { PaymentSettings } from './pages/PaymentSettings';
import { Escrow } from './pages/Escrow';

// Add routes
<Route
  path="payment-settings"
  element={
    <ProtectedRoute>
      <PaymentSettings />
    </ProtectedRoute>
  }
/>
<Route path="escrow" element={<Escrow />} />
```

### 8. Add Styles

File: `/tmp/cc-agent/60797639/project/src/styles/index.css`

See separate style guide below.

## Implementation Priority:
1. Update ListingCard with button and badges
2. Add API function for purchase interests
3. Update routing
4. Add styles
5. Update CreateListing form
6. Update UserDropdown
7. Build and test

## Testing Checklist:
- [ ] Click Contact Seller button opens modal
- [ ] Phone number is clickable (tel: link)
- [ ] Email is clickable (mailto: link)
- [ ] Mark as Interested saves to database
- [ ] Toast notification appears
- [ ] Modal closes on backdrop click and X button
- [ ] Payment Settings page loads
- [ ] Escrow page loads
- [ ] Navigation menu shows new items
- [ ] Works offline
- [ ] Mobile responsive
