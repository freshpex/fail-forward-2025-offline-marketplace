/**
 * Terminal Africa Integration Test Script
 * 
 * Run this script to test Terminal Africa integration:
 * node test-terminal-africa.js
 * 
 * Set TERMINAL_AFRICA_API_KEY environment variable before running
 */

const TERMINAL_API_KEY = process.env.TERMINAL_AFRICA_API_KEY;

if (!TERMINAL_API_KEY) {
  console.log('❌ ERROR: TERMINAL_AFRICA_API_KEY environment variable not set');
  console.log('');
  console.log('To get an API key:');
  console.log('1. Go to https://terminal.africa');
  console.log('2. Create an account or login');
  console.log('3. Go to Dashboard > Settings > API Keys');
  console.log('4. Create a new API key');
  console.log('');
  console.log('Then run with:');
  console.log('$env:TERMINAL_AFRICA_API_KEY="your_key"; node test-terminal-africa.js');
  process.exit(1);
}

const TERMINAL_API_BASE = 'https://api.terminal.africa/v1';

async function terminalRequest(endpoint, method = 'GET', body = null) {
  const url = `${TERMINAL_API_BASE}${endpoint}`;
  console.log(`\n📡 ${method} ${url}`);
  if (body) console.log('Body:', JSON.stringify(body, null, 2));
  
  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TERMINAL_API_KEY}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    
    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
    return { success: response.ok && data.status === true, data: data.data, message: data.message };
  } catch (err) {
    console.error('Error:', err);
    return { success: false, error: String(err) };
  }
}

async function testGetCarriers() {
  console.log('\n' + '='.repeat(60));
  console.log('🚚 TEST 1: Get Available Carriers');
  console.log('='.repeat(60));
  
  return await terminalRequest('/carriers');
}

async function testCreateAddress(addressData) {
  console.log('\n' + '='.repeat(60));
  console.log(`🏠 Creating Address: ${addressData.first_name} ${addressData.last_name}`);
  console.log('='.repeat(60));
  
  return await terminalRequest('/addresses', 'POST', addressData);
}

async function testCreateParcel(parcelData) {
  console.log('\n' + '='.repeat(60));
  console.log('📦 Creating Parcel');
  console.log('='.repeat(60));
  
  return await terminalRequest('/parcels', 'POST', parcelData);
}

async function testGetRates(pickupAddressId, deliveryAddressId, parcelId) {
  console.log('\n' + '='.repeat(60));
  console.log('💰 Getting Shipping Rates');
  console.log('='.repeat(60));
  
  return await terminalRequest(
    `/rates/shipment?pickup_address=${pickupAddressId}&delivery_address=${deliveryAddressId}&parcel_id=${parcelId}`
  );
}

async function runTests() {
  console.log('='.repeat(60));
  console.log('🧪 TERMINAL AFRICA API INTEGRATION TESTS');
  console.log('='.repeat(60));
  console.log('API Key:', TERMINAL_API_KEY.substring(0, 15) + '...');
  
  // Test 1: Get carriers
  const carriersResult = await testGetCarriers();
  if (carriersResult.success) {
    console.log('\n✅ Carriers available:');
    if (Array.isArray(carriersResult.data)) {
      carriersResult.data.slice(0, 5).forEach(c => {
        console.log(`  - ${c.name} (${c.carrier_id})`);
      });
      if (carriersResult.data.length > 5) {
        console.log(`  ... and ${carriersResult.data.length - 5} more`);
      }
    }
  } else {
    console.log('❌ Failed to get carriers');
  }
  
  // Test 2: Create sender address (Ikeja, Lagos)
  const senderResult = await testCreateAddress({
    first_name: 'Farm',
    last_name: 'Seller',
    email: 'seller@marketplace.com',
    phone: '+2348012345678',
    line1: 'Computer Village, Ikeja',
    city: 'Ikeja',
    state: 'Lagos',
    country: 'NG',
    zip: '100001',
    is_residential: false,
  });
  
  if (!senderResult.success) {
    console.log('❌ Failed to create sender address');
    console.log('Note: This may fail if the address already exists. Check the API response.');
  }
  
  // Test 3: Create receiver address (Lekki, Lagos)
  const receiverResult = await testCreateAddress({
    first_name: 'Test',
    last_name: 'Buyer',
    email: 'buyer@test.com',
    phone: '+2348087654321',
    line1: 'Admiralty Way, Lekki Phase 1',
    city: 'Lekki',
    state: 'Lagos',
    country: 'NG',
    zip: '101245',
    is_residential: true,
  });
  
  if (!receiverResult.success) {
    console.log('❌ Failed to create receiver address');
  }
  
  // Test 4: Create parcel (agricultural produce)
  const parcelResult = await testCreateParcel({
    description: 'Agricultural produce - Rice bags',
    weight: 50, // 50 kg
    weight_unit: 'kg',
    items: [{
      name: 'Rice',
      description: '2 bags of rice (25kg each)',
      weight: 50,
      value: 80000,
      quantity: 2,
      currency: 'NGN',
    }],
  });
  
  if (!parcelResult.success) {
    console.log('❌ Failed to create parcel');
  }
  
  // Test 5: Get rates if we have all IDs
  if (senderResult.data?.address_id && receiverResult.data?.address_id && parcelResult.data?.parcel_id) {
    const ratesResult = await testGetRates(
      senderResult.data.address_id,
      receiverResult.data.address_id,
      parcelResult.data.parcel_id
    );
    
    if (ratesResult.success && Array.isArray(ratesResult.data)) {
      console.log('\n✅ SUCCESS! Got shipping rates:');
      ratesResult.data.forEach(rate => {
        console.log(`  - ${rate.carrier_name}: ₦${rate.amount.toLocaleString()} (${rate.delivery_time})`);
      });
      
      // Find cheapest
      const cheapest = ratesResult.data.reduce((min, r) => r.amount < min.amount ? r : min, ratesResult.data[0]);
      console.log(`\n💰 Cheapest: ${cheapest.carrier_name} - ₦${cheapest.amount.toLocaleString()}`);
    } else {
      console.log('❌ Failed to get rates or no rates available');
    }
  } else {
    console.log('\n⚠️ Could not test rates - missing address or parcel IDs');
    console.log('Sender ID:', senderResult.data?.address_id || 'missing');
    console.log('Receiver ID:', receiverResult.data?.address_id || 'missing');
    console.log('Parcel ID:', parcelResult.data?.parcel_id || 'missing');
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🏁 TESTS COMPLETE');
  console.log('='.repeat(60));
  console.log('\n📝 Next Steps:');
  console.log('1. If tests passed, set TERMINAL_AFRICA_API_KEY in Supabase secrets:');
  console.log('   npx supabase secrets set TERMINAL_AFRICA_API_KEY=your_key');
  console.log('2. Deploy the delivery-quote function:');
  console.log('   npx supabase functions deploy delivery-quote --no-verify-jwt');
  console.log('3. Test via the marketplace app');
}

runTests();
