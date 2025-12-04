# AgriMarket Technical Documentation

This document provides comprehensive technical documentation for the AgriMarket offline-first marketplace platform.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Frontend Architecture](#frontend-architecture)
3. [Backend Architecture](#backend-architecture)
4. [Database Schema](#database-schema)
5. [API Reference](#api-reference)
6. [Offline Sync System](#offline-sync-system)
7. [Payment Integration](#payment-integration)
8. [Logistics Integration](#logistics-integration)
9. [Notification System](#notification-system)
10. [Security](#security)
11. [Deployment](#deployment)
12. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

AgriMarket follows a modern JAMstack architecture with offline-first capabilities:

```
┌────────────────────────────────────────────────────────────────┐
│                         CLIENT (PWA)                           │
├────────────────────────────────────────────────────────────────┤
│  React 19 + TypeScript + Vite                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │   Pages     │  │  Components │  │  Services               │ │
│  │  - Home     │  │  - Button   │  │  - api.ts (HTTP calls)  │ │
│  │  - Browse   │  │  - Input    │  │  - db.ts (IndexedDB)    │ │
│  │  - Create   │  │  - Modal    │  │  - sync.ts (offline)    │ │
│  │  - Orders   │  │  - Cards    │  │  - supabase.ts          │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
│                           │                                     │
│  ┌────────────────────────▼────────────────────────────────┐   │
│  │              IndexedDB (Offline Storage)                 │   │
│  │  - listings, pendingListings, myListings, myOrders       │   │
│  │  - pendingOrderUpdates, pendingListingEdits/Deletes      │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼ HTTPS
┌────────────────────────────────────────────────────────────────┐
│                     SUPABASE BACKEND                           │
├────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────────────────────────┐  │
│  │   PostgreSQL    │  │      Edge Functions (Deno)          │  │
│  │   Database      │  │  - order-create, order-verify       │  │
│  │   + RLS         │  │  - delivery-quote, delivery-book    │  │
│  │                 │  │  - send-sms, seller-verify          │  │
│  └─────────────────┘  └─────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
        ┌──────────┐   ┌──────────┐   ┌──────────┐
        │ Paystack │   │ Terminal │   │  Twilio  │
        │ Payments │   │ Africa   │   │   SMS    │
        └──────────┘   └──────────┘   └──────────┘
```

---

## Frontend Architecture

### Technology Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.2.0 | UI framework |
| TypeScript | 5.9.3 | Type safety |
| Vite | 7.2.4 | Build tool |
| vite-plugin-pwa | 1.1.0 | PWA support |
| idb | 8.0.3 | IndexedDB wrapper |
| react-router-dom | 7.9.6 | Routing |
| react-hot-toast | 2.6.0 | Notifications |

### Directory Structure

```
src/
├── components/           # Reusable UI components
│   ├── Button.tsx       # Primary button component
│   ├── Input.tsx        # Form input component
│   ├── Select.tsx       # Dropdown select
│   ├── ListingCard.tsx  # Produce listing card
│   ├── ContactSellerModal.tsx  # Purchase flow modal
│   ├── ImageUpload.tsx  # Image upload with compression
│   ├── LoadingSpinner.tsx
│   ├── ComponentLoader.tsx
│   ├── ProtectedRoute.tsx
│   └── Layout.tsx       # App layout wrapper
│
├── contexts/
│   └── AuthContext.tsx  # Authentication state
│
├── hooks/
│   ├── useListings.ts   # Listings data hook
│   ├── useOnlineStatus.ts  # Network status
│   └── useScrollReveal.ts  # Animation hook
│
├── pages/
│   ├── Home.tsx         # Landing page
│   ├── BrowseListings.tsx  # Marketplace browse
│   ├── CreateListing.tsx   # Create/edit listing
│   ├── MyListings.tsx      # Seller listings management
│   ├── SellerOrders.tsx    # Order management
│   ├── TrackOrder.tsx      # Order tracking
│   ├── PaymentSettings.tsx # Bank account setup
│   ├── Dashboard.tsx       # User dashboard
│   ├── Login.tsx / Signup.tsx
│   └── InstallGuide.tsx    # PWA install help
│
├── services/
│   ├── api.ts           # API calls to Supabase
│   ├── db.ts            # IndexedDB operations
│   ├── sync.ts          # Offline sync logic
│   ├── supabase.ts      # Supabase client
│   ├── orders.ts        # Order-specific API
│   └── offlineDataService.ts  # Prefetch for offline
│
├── styles/
│   ├── index.css        # Global styles
│   └── home-investors.css
│
├── types/
│   └── index.ts         # TypeScript interfaces
│
├── utils/
│   ├── currency.ts      # Currency formatting
│   ├── imageHelpers.ts  # Image utilities
│   └── toast.ts         # Toast notifications
│
├── App.tsx              # Root component
├── main.tsx             # Entry point
└── vite-env.d.ts        # Vite type declarations
```

### Key Components

#### ContactSellerModal
The main purchase flow component handling:
- Delivery method selection
- Delivery quote fetching
- Courier selection
- Paystack payment integration
- Order creation

```typescript
// Key props
interface ContactSellerModalProps {
  listing: Listing;
  onClose: () => void;
}

// Steps: 'contact' → 'delivery' → 'quote' → 'payment'
```

#### ListingCard
Displays produce listing with:
- Image with fallback
- Price formatting
- Quantity/unit display
- Pending sync indicators
- Action buttons

#### ImageUpload
Handles image selection with:
- Camera/gallery access
- Client-side compression
- Base64 encoding for offline storage
- Supabase Storage upload when online

---

## Backend Architecture

### Supabase Edge Functions

All edge functions are located in `supabase/functions/` and written in Deno TypeScript.

#### Shared Utilities (`_shared/`)

| File | Purpose |
|------|---------|
| `supabaseClient.ts` | Creates admin and user Supabase clients |
| `auth.ts` | Authentication helpers, role checking |
| `response.ts` | Standardized JSON/error responses |
| `types.ts` | Database type definitions |
| `notifications.ts` | SMS/email sending utilities |
| `deliveryProviders.ts` | Terminal Africa integration |

#### Order Functions

| Function | Method | Description |
|----------|--------|-------------|
| `order-create` | POST | Create new order with listing/delivery details |
| `order-verify` | POST | Verify Paystack payment, update order status |
| `order-mark-ready` | POST | Seller marks order ready for pickup |
| `order-complete` | POST | Mark order as completed/delivered |

#### Delivery Functions

| Function | Method | Description |
|----------|--------|-------------|
| `delivery-options` | GET | List available delivery methods |
| `delivery-quote` | POST | Get shipping quotes from Terminal Africa |
| `delivery-book` | POST | Book shipment with carrier |
| `delivery-track` | GET | Track shipment status |
| `delivery-webhook` | POST | Handle carrier status updates |

#### Other Functions

| Function | Method | Description |
|----------|--------|-------------|
| `send-sms` | POST | Send SMS via Twilio |
| `seller-verify` | POST | Submit seller verification documents |
| `admin-approve-seller` | POST | Admin approves seller KYC |
| `verify-bank-account` | POST | Verify bank account via Paystack |

---

## Database Schema

### Core Tables

#### `profiles`
User profile information linked to Supabase Auth.

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  full_name TEXT,
  phone TEXT,
  role TEXT DEFAULT 'buyer', -- 'buyer', 'seller', 'admin'
  seller_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `listings`
Produce listings from sellers.

```sql
CREATE TABLE listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES profiles(id),
  user_id UUID, -- Legacy, being migrated to seller_id
  crop TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  price NUMERIC,
  location TEXT NOT NULL,
  pickup_address TEXT,
  pickup_city TEXT,
  pickup_state TEXT,
  contact_phone TEXT NOT NULL,
  contact_email TEXT,
  farmer_name TEXT,
  image_url TEXT,
  package_type TEXT,
  measurement_unit TEXT,
  measurement_value NUMERIC,
  unit_description TEXT,
  status TEXT DEFAULT 'synced',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `orders`
Purchase orders from buyers.

```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES listings(id),
  buyer_id UUID REFERENCES profiles(id),
  seller_id UUID REFERENCES profiles(id) NOT NULL,
  order_reference TEXT UNIQUE NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  produce_price NUMERIC,
  delivery_price NUMERIC DEFAULT 0,
  platform_commission NUMERIC DEFAULT 0,
  total_price NUMERIC,
  total_amount NUMERIC,
  payment_reference TEXT,
  payment_status TEXT DEFAULT 'pending',
  status TEXT DEFAULT 'created',
  delivery_method TEXT, -- 'manual', 'in_app'
  delivery_quote JSONB,
  delivery_tracking_id TEXT,
  delivery_status TEXT,
  delivery_carrier TEXT,
  delivery_booked_at TIMESTAMPTZ,
  pickup_address TEXT,
  dropoff_address TEXT,
  buyer_contact TEXT,
  buyer_email TEXT,
  currency TEXT DEFAULT 'NGN',
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `manual_orders`
Additional buyer details for orders.

```sql
CREATE TABLE manual_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  buyer_name TEXT NOT NULL,
  buyer_phone TEXT NOT NULL,
  instructions TEXT,
  scheduled_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `seller_payment_accounts`
Bank account details for seller payouts.

```sql
CREATE TABLE seller_payment_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) UNIQUE,
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_name TEXT NOT NULL,
  bank_code TEXT,
  account_type TEXT DEFAULT 'nuban',
  paystack_recipient_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Row Level Security (RLS)

All tables have RLS enabled. Key policies:

```sql
-- Listings: Anyone can read, only owner can modify
CREATE POLICY "Anyone can view listings"
  ON listings FOR SELECT USING (true);

CREATE POLICY "Sellers can insert own listings"
  ON listings FOR INSERT
  WITH CHECK (auth.uid() = seller_id OR auth.uid() = user_id);

CREATE POLICY "Sellers can update own listings"
  ON listings FOR UPDATE
  USING (auth.uid() = seller_id OR auth.uid() = user_id);

CREATE POLICY "Sellers can delete own listings"
  ON listings FOR DELETE
  USING (auth.uid() = seller_id OR auth.uid() = user_id);
```

---

## API Reference

### Supabase Client API (`services/api.ts`)

#### Listings

```typescript
// Fetch all listings with optional filters
fetchListings(filters?: { crop?: string; location?: string }): Promise<Listing[]>

// Create new listing
createListing(listing: NewListing): Promise<Listing>

// Update existing listing
updateListing(id: string, updates: Partial<NewListing>): Promise<Listing>

// Delete listing
deleteListing(id: string): Promise<void>

// Fetch single listing
fetchListingById(id: string): Promise<Listing>
```

#### Orders (`services/orders.ts`)

```typescript
// Create order
createOrder(payload: CreateOrderPayload): Promise<Order>

// Verify payment
verifyOrderPayment(payload: { order_id: string; payment_reference: string }): Promise<any>

// Mark order ready
markOrderReady(orderId: string): Promise<void>

// Get seller orders
getSellerOrders(): Promise<Order[]>

// Get order by reference
getOrderByReference(ref: string): Promise<Order>
```

#### Delivery

```typescript
// Get delivery options
getDeliveryOptions(listingId: string): Promise<DeliveryOptions>

// Get delivery quote
getDeliveryQuote(payload: DeliveryQuoteRequest): Promise<DeliveryQuote>

// Book delivery
bookDelivery(payload: BookDeliveryRequest): Promise<Shipment>

// Track shipment
trackShipment(trackingId: string): Promise<TrackingInfo>
```

### Edge Function Endpoints

Base URL: `https://<project>.supabase.co/functions/v1/`

#### POST `/order-create`

```typescript
// Request
{
  listing_id: string;
  delivery_method: 'manual' | 'in_app';
  payment_amount: number;
  delivery_fee?: number;
  quantity: number;
  currency: string;
  manual_details: {
    buyer_name: string;
    buyer_phone: string;
    buyer_email?: string;
    delivery_address?: string;
    instructions?: string;
  };
  metadata?: object;
  delivery_quote_id?: string;
  delivery_details?: object;
}

// Response
{
  order: Order;
}
```

#### POST `/order-verify`

```typescript
// Request
{
  order_id: string;
  payment_reference: string;
}

// Response
{
  order: Order;
  verification: PaystackVerification;
}
```

#### POST `/delivery-quote`

```typescript
// Request
{
  listing_id: string;
  payload: {
    sender_address: string;
    sender_name: string;
    sender_phone: string;
    sender_email?: string;
    receiver_address: string;
    receiver_name: string;
    receiver_phone: string;
    receiver_email?: string;
    pickup_date: string;
    package_items: PackageItem[];
    package_dimension: {
      length: number;
      width: number;
      height: number;
    };
  };
}

// Response
{
  quote_id: string;
  fee: number;
  currency: string;
  couriers: CourierOption[];
  cheapest_courier: CourierOption;
  fastest_courier: CourierOption;
}
```

#### POST `/send-sms`

```typescript
// Request
{
  to: string;           // Phone number (any format)
  message: string;      // SMS content
  order_id?: string;    // For logging
  type?: 'payment_confirmed' | 'order_ready' | 'delivery_booked' | 'general';
}

// Response
{
  success: boolean;
  sid: string;          // Twilio message SID
  status: string;
}
```

---

## Offline Sync System

### IndexedDB Schema (`services/db.ts`)

```typescript
interface AgriMarketDB extends DBSchema {
  // Cached listings from server
  listings: {
    key: string;
    value: Listing;
    indexes: { 'by-date': string };
  };
  
  // User's own listings cache
  myListings: {
    key: string;
    value: Listing;
    indexes: { 'by-date': string; 'by-seller': string };
  };
  
  // User's orders cache
  myOrders: {
    key: string;
    value: CachedOrder;
    indexes: { 'by-date': string; 'by-seller': string };
  };
  
  // Pending new listings (offline created)
  pendingListings: {
    key: string;
    value: PendingListing;
    indexes: { 'by-date': string };
  };
  
  // Pending order updates
  pendingOrderUpdates: {
    key: string;
    value: PendingOrderUpdate;
    indexes: { 'by-date': string };
  };
  
  // Pending listing edits
  pendingListingEdits: {
    key: string;
    value: PendingListingEdit;
    indexes: { 'by-date': string };
  };
  
  // Pending listing deletions
  pendingListingDeletes: {
    key: string;
    value: PendingListingDelete;
    indexes: { 'by-date': string };
  };
}
```

### Sync Flow (`services/sync.ts`)

```
┌─────────────────┐
│  User Action    │
│  (Create/Edit/  │
│   Delete)       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│  Online?        │─NO─▶│  Store in       │
│                 │     │  IndexedDB      │
└────────┬────────┘     │  (pending)      │
         │YES           └────────┬────────┘
         ▼                       │
┌─────────────────┐              │
│  Send to API    │              │
└────────┬────────┘              │
         │                       │
         ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│  Success        │     │  Online Event   │
│  Remove pending │◀────│  Triggers Sync  │
└─────────────────┘     └─────────────────┘
```

### Sync Functions

```typescript
// Sync all pending changes
syncAllPendingChanges(): Promise<FullSyncResult>

// Individual sync functions
syncPendingListings(): Promise<SyncResult>
syncPendingOrderUpdates(): Promise<SyncResult>
syncPendingListingEdits(): Promise<SyncResult>
syncPendingListingDeletes(): Promise<SyncResult>

// Setup online listener
setupOnlineListener(callback: () => void): () => void
```

### Sync Prevention

To prevent duplicate syncs, locks are used:

```typescript
let isSyncingListings = false;
let isSyncingDeletes = false;
let isSyncingEdits = false;
let isSyncingOrders = false;
```

---

## Payment Integration

### Paystack Integration

#### Frontend Flow

1. User selects quantity and delivery
2. Delivery quote fetched from Terminal Africa
3. Order created via `order-create` edge function
4. Paystack popup opens with order details
5. On success, `order-verify` called with payment reference
6. Order status updated, SMS sent

#### Code Example

```typescript
// ContactSellerModal.tsx
const initiatePaystackPayment = async (order: Order) => {
  const handler = PaystackPop.setup({
    key: PAYSTACK_PUBLIC_KEY,
    email: buyerEmail,
    amount: grandTotal * 100, // Kobo
    currency: 'NGN',
    ref: order.order_reference,
    metadata: {
      order_id: order.id,
      listing_id: listing.id,
    },
    callback: (response) => {
      verifyOrderPayment({
        order_id: order.id,
        payment_reference: response.reference,
      });
    },
  });
  handler.openIframe();
};
```

#### Backend Verification

```typescript
// order-verify edge function
const verifyResponse = await fetch(
  `https://api.paystack.co/transaction/verify/${reference}`,
  {
    headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
  }
);

if (verificationResult.data.status === 'success') {
  // Update order status
  // Send SMS notifications
  // Deduct stock from listing
}
```

---

## Logistics Integration

### Terminal Africa API

#### Getting Quotes

```typescript
// delivery-quote edge function
const ratesResponse = await fetch(
  'https://api.terminal.africa/v1/rates/shipment',
  {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TERMINAL_AFRICA_API_KEY}`,
    },
    body: JSON.stringify({
      pickup_address: pickupAddressId,
      delivery_address: deliveryAddressId,
      parcel: parcelId,
    }),
  }
);
```

#### Booking Shipment

```typescript
// delivery-book edge function
const shipmentResponse = await fetch(
  'https://api.terminal.africa/v1/shipments',
  {
    method: 'POST',
    body: JSON.stringify({
      rate_id: selectedRateId,
      pickup_address: pickupAddressId,
      delivery_address: deliveryAddressId,
      parcel: parcelId,
    }),
  }
);
```

#### Package Estimation

Smart package estimation based on crop type:

```typescript
function estimatePackage(
  cropType: string,
  unit: string,
  quantity: number,
  sellerWeight?: number
): PackageEstimate {
  // Base density estimates per crop type
  const densityMap = {
    rice: 0.85,
    maize: 0.75,
    beans: 0.80,
    tomatoes: 0.95,
    // ... more crops
  };
  
  // Calculate dimensions based on weight
  return {
    weight: calculatedWeight,
    length: calculatedLength,
    width: calculatedWidth,
    height: calculatedHeight,
    chargeableWeight: Math.max(actualWeight, volumetricWeight),
  };
}
```

---

## Notification System

### SMS via Twilio

#### Configuration

```bash
# Supabase Secrets
TWILIO_ACCOUNT_SID=ACxxxxxxxxx
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=+1234567890
```

#### Notification Triggers

| Event | Recipients | Message |
|-------|------------|---------|
| Payment Verified | Buyer, Seller | Order confirmation |
| Order Ready | Buyer | Ready for pickup/delivery |
| Delivery Booked | Buyer, Seller | Tracking info |
| Order Complete | Buyer | Thank you message |

#### Phone Number Normalization

```typescript
function normalizePhoneNumber(raw: string): string {
  let phone = raw.replace(/\s+/g, '').replace(/-/g, '');
  
  if (phone.startsWith('0')) {
    return `+234${phone.substring(1)}`;
  }
  if (phone.startsWith('234') && !phone.startsWith('+')) {
    return `+${phone}`;
  }
  if (!phone.startsWith('+')) {
    return `+234${phone}`;
  }
  
  return phone;
}
```

### Email (Optional SendGrid)

Email support is available via SendGrid:

```typescript
// _shared/notifications.ts
async function sendEmailNotification({
  to,
  subject,
  body,
  html,
}: EmailParams): Promise<NotificationResult> {
  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SENDGRID_API_KEY}`,
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: fromEmail, name: fromName },
      subject,
      content: [
        { type: 'text/plain', value: body },
        { type: 'text/html', value: html },
      ],
    }),
  });
}
```

---

## Security

### Authentication

- Supabase Auth with email/password
- JWT tokens for API authentication
- Protected routes via `ProtectedRoute` component

### Row Level Security

All database tables use RLS policies:
- Users can only modify their own data
- Public read access for listings
- Service role for edge functions

### API Security

- Edge functions validate authentication
- Paystack webhook signature verification
- CORS headers configured

### Data Validation

- Frontend form validation
- Backend payload validation
- SQL injection prevention via parameterized queries

---

## Deployment

### Frontend (Vercel)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

Configuration in `vercel.json`:
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/" }
  ]
}
```

### Backend (Supabase)

```bash
# Install Supabase CLI
npm i -g supabase

# Login
npx supabase login

# Link project
npx supabase link --project-ref <project-id>

# Deploy functions
npx supabase functions deploy --no-verify-jwt

# Set secrets
npx supabase secrets set KEY=value
```

### Environment Variables

#### Frontend (.env)
```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx
VITE_PAYSTACK_PUBLIC_KEY=pk_live_xxx
```

#### Backend (Supabase Secrets)
```
PAYSTACK_SECRET_KEY=sk_live_xxx
TERMINAL_AFRICA_API_KEY=sk_live_xxx
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=+1xxx
SENDGRID_API_KEY=SG.xxx (optional)
```

---

## Troubleshooting

### Common Issues

#### "Listing is missing seller information"

**Cause:** Old listings don't have `seller_id` populated.

**Fix:** Run migration to backfill:
```sql
UPDATE listings 
SET seller_id = user_id 
WHERE seller_id IS NULL AND user_id IS NOT NULL;
```

#### Payment amount validation error

**Cause:** Price is null or NaN.

**Fix:** Ensure `Number(listing.price)` is used:
```typescript
const unitPrice = Number(listing.price) || 0;
```

#### SMS not sending

**Cause:** Twilio credentials missing or phone format wrong.

**Fix:** 
1. Verify secrets are set: `npx supabase secrets list`
2. Check phone normalization logic
3. Check Twilio console for errors

#### Offline sync not working

**Cause:** IndexedDB version mismatch or sync lock.

**Fix:**
1. Clear IndexedDB in DevTools
2. Refresh page
3. Check console for sync errors

#### Delivery quotes failing

**Cause:** Terminal Africa API error or invalid address.

**Fix:**
1. Check API key is valid
2. Verify address format
3. Check Terminal Africa dashboard

### Debug Logging

Enable verbose logging:
```typescript
// In sync.ts
console.log('🔄 Starting full sync...');
console.log(`📦 Processing ${items.length} items...`);
console.log('✅ Sync complete');
```

### Support

For issues, open a GitHub issue or contact the development team.

---

## Appendix

### Migrations List

| Migration | Description |
|-----------|-------------|
| `20251127172613_add_image_url_to_listings.sql` | Add image_url column |
| `20251127193316_add_email_to_listings.sql` | Add contact_email column |
| `20251128120000_delivery_payment_system.sql` | Orders, shipments, payments |
| `20251128140000_fix_listings_rls.sql` | RLS policies for listings |
| `20251128150000_fix_orders_schema.sql` | Fix orders constraints |
| `20251201150000_fix_payment_status_constraint.sql` | Payment status enum |
| `20251201160000_fix_manual_orders_and_status.sql` | Manual orders table |
| `20251201170000_remove_status_constraints.sql` | Flexible status values |
| `20251201180000_fix_profiles_recursion.sql` | Profile RLS fix |
| `20251202100000_enhance_listing_units.sql` | Package/measurement fields |
| `20251202110000_fix_seller_payment_accounts.sql` | Bank account table |
| `20251202120000_fix_account_type_constraint.sql` | Account type field |

### Type Definitions

See `src/types/index.ts` and `supabase/functions/_shared/types.ts` for complete type definitions.
