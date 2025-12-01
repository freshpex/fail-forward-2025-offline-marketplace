// @deno-types="https://deno.land/std@0.224.0/http/server.ts"
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createSupabaseClients } from '../_shared/supabaseClient.ts';
import { errorResponse, jsonResponse } from '../_shared/response.ts';

interface OrderVerifyRequest {
  order_id?: string;
  payment_reference?: string;
}

const PAYSTACK_VERIFY_URL = 'https://api.paystack.co/transaction/verify/';

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
    });
  }

  if (req.method !== 'POST') {
    return errorResponse(405, 'Method not allowed');
  }

  const denoEnv = (globalThis as typeof globalThis & {
    Deno?: {
      env: {
        get(name: string): string | undefined;
      };
    };
  }).Deno;

  const paystackKey = denoEnv?.env.get('PAYSTACK_SECRET_KEY');
  if (!paystackKey) {
    return errorResponse(500, 'PAYSTACK_SECRET_KEY is not configured');
  }

  let payload: OrderVerifyRequest;
  try {
    payload = await req.json();
  } catch (_err) {
    return errorResponse(400, 'Invalid JSON payload');
  }

  if (!payload.order_id || !payload.payment_reference) {
    return errorResponse(400, 'order_id and payment_reference are required');
  }

  try {
    const { supabaseAdmin, supabaseUser } = createSupabaseClients(req);
    
    // Try to get user if authenticated, but allow guest verification
    let userId: string | null = null;
    try {
      const { data: { user } } = await supabaseUser.auth.getUser();
      userId = user?.id ?? null;
    } catch {
      // Guest user - no auth
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, buyer_id, order_reference')
      .eq('id', payload.order_id)
      .maybeSingle();

    if (orderError) {
      console.error('Failed to load order', orderError);
      return errorResponse(500, 'Unable to load order');
    }

    if (!order) {
      return errorResponse(404, 'Order not found');
    }

    // For guest orders (buyer_id is null), allow verification
    // For authenticated orders, verify the user is the buyer
    if (order.buyer_id && userId && order.buyer_id !== userId) {
      return errorResponse(403, 'Only the buyer can verify payment');
    }

    const verifyResponse = await fetch(`${PAYSTACK_VERIFY_URL}${payload.payment_reference}`, {
      headers: {
        Authorization: `Bearer ${paystackKey}`,
      },
    });

    const verificationResult = await verifyResponse.json();

    if (!verifyResponse.ok) {
      console.error('Paystack verification failed', verificationResult);
      return errorResponse(
        verifyResponse.status,
        'Payment verification failed',
        verificationResult
      );
    }

    const status = verificationResult?.data?.status;
    const amount = verificationResult?.data?.amount;

    // Build update object - only include defined values
    const updateData: Record<string, unknown> = {
      payment_reference: payload.payment_reference,
      payment_status: status,
      updated_at: new Date().toISOString(),
    };
    
    // Only set status if payment was successful
    if (status === 'success') {
      updateData.status = 'payment_verified';
    }
    
    // Only set total_amount if we have a valid number
    if (typeof amount === 'number') {
      updateData.total_amount = amount / 100;
    }

    console.log('Updating order with:', JSON.stringify(updateData));

    const { data: updatedOrder, error: updateError } = await supabaseAdmin
      .from('orders')
      .update(updateData)
      .eq('id', payload.order_id)
      .select()
      .maybeSingle();

    if (updateError) {
      console.error('Failed to update order after verification', JSON.stringify(updateError));
      return errorResponse(500, 'Failed to update order', { 
        details: updateError.message,
        code: updateError.code,
        hint: updateError.hint
      });
    }

    // Send SMS notifications for successful payments
    if (status === 'success' && updatedOrder) {
      try {
        // Get order details with listing and seller info
        const { data: orderDetails } = await supabaseAdmin
          .from('orders')
          .select(`
            *,
            listing:listings(title, seller_id, pickup_address),
            manual_order:manual_orders(buyer_name, buyer_phone)
          `)
          .eq('id', payload.order_id)
          .maybeSingle();

        if (orderDetails) {
          const buyerPhone = orderDetails.manual_order?.[0]?.buyer_phone;
          const buyerName = orderDetails.manual_order?.[0]?.buyer_name || 'Customer';
          const listingTitle = orderDetails.listing?.title || 'your order';
          const orderRef = orderDetails.order_reference || payload.order_id.substring(0, 8);
          const totalAmount = (amount / 100).toLocaleString('en-NG');

          // Get seller's phone number
          const { data: sellerProfile } = await supabaseAdmin
            .from('profiles')
            .select('phone, full_name')
            .eq('id', orderDetails.seller_id)
            .maybeSingle();

          const twilioAccountSid = denoEnv?.env.get('TWILIO_ACCOUNT_SID');
          const twilioAuthToken = denoEnv?.env.get('TWILIO_AUTH_TOKEN');
          const twilioPhoneNumber = denoEnv?.env.get('TWILIO_PHONE_NUMBER');

          if (twilioAccountSid && twilioAuthToken && twilioPhoneNumber) {
            const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
            const authHeader = btoa(`${twilioAccountSid}:${twilioAuthToken}`);

            // Helper function to send SMS
            const sendSms = async (to: string, message: string) => {
              let phoneNumber = to.replace(/\s+/g, '').replace(/-/g, '');
              if (phoneNumber.startsWith('0')) {
                phoneNumber = '+234' + phoneNumber.substring(1);
              } else if (phoneNumber.startsWith('234') && !phoneNumber.startsWith('+')) {
                phoneNumber = '+' + phoneNumber;
              } else if (!phoneNumber.startsWith('+')) {
                phoneNumber = '+234' + phoneNumber;
              }

              const formData = new URLSearchParams();
              formData.append('To', phoneNumber);
              formData.append('From', twilioPhoneNumber);
              formData.append('Body', message);

              try {
                const smsResponse = await fetch(twilioUrl, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Basic ${authHeader}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                  },
                  body: formData.toString(),
                });
                const smsResult = await smsResponse.json();
                console.log(`SMS sent to ${phoneNumber}:`, smsResult.sid || smsResult.error_message);
                return smsResult;
              } catch (smsErr) {
                console.error(`Failed to send SMS to ${phoneNumber}:`, smsErr);
                return null;
              }
            };

            // Send SMS to buyer
            if (buyerPhone) {
              const buyerMessage = `Hi ${buyerName}! Your payment of ₦${totalAmount} for "${listingTitle}" was successful. Order ref: ${orderRef}. We will notify you when your order is ready for delivery. Thank you for shopping with us!`;
              await sendSms(buyerPhone, buyerMessage);
            }

            // Send SMS to seller
            if (sellerProfile?.phone) {
              const sellerMessage = `New order received! Order ref: ${orderRef}. "${listingTitle}" - ₦${totalAmount}. Please prepare the item for pickup. The logistics partner will contact you soon.`;
              await sendSms(sellerProfile.phone, sellerMessage);
            }
          } else {
            console.log('Twilio credentials not configured, skipping SMS notifications');
          }
        }
      } catch (smsError) {
        // Don't fail the verification if SMS fails
        console.error('Error sending SMS notifications:', smsError);
      }
    }

    return jsonResponse({ order: updatedOrder, verification: verificationResult });
  } catch (error) {
    console.error('order-verify error', error);
    return errorResponse(500, 'Unexpected error verifying payment');
  }
});