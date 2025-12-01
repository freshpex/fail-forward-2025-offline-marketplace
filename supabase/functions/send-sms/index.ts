// @deno-types="https://deno.land/std@0.224.0/http/server.ts"
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createSupabaseClients } from '../_shared/supabaseClient.ts';
import { errorResponse, jsonResponse } from '../_shared/response.ts';

interface SendSmsRequest {
  to: string; // Phone number in E.164 format (e.g., +2348012345678)
  message: string;
  order_id?: string;
  type?: 'payment_confirmed' | 'order_ready' | 'delivery_booked' | 'general';
}

interface TwilioResponse {
  sid: string;
  status: string;
  error_code?: number;
  error_message?: string;
}

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

  const twilioAccountSid = denoEnv?.env.get('TWILIO_ACCOUNT_SID');
  const twilioAuthToken = denoEnv?.env.get('TWILIO_AUTH_TOKEN');
  const twilioPhoneNumber = denoEnv?.env.get('TWILIO_PHONE_NUMBER');

  if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
    console.error('Twilio credentials missing');
    return errorResponse(500, 'SMS service not configured');
  }

  let payload: SendSmsRequest;
  try {
    payload = await req.json();
  } catch (_err) {
    return errorResponse(400, 'Invalid JSON payload');
  }

  if (!payload.to || !payload.message) {
    return errorResponse(400, 'Phone number (to) and message are required');
  }

  // Normalize phone number to E.164 format for Nigeria
  let phoneNumber = payload.to.replace(/\s+/g, '').replace(/-/g, '');
  
  // If it starts with 0, replace with +234
  if (phoneNumber.startsWith('0')) {
    phoneNumber = '+234' + phoneNumber.substring(1);
  }
  // If it starts with 234 without +, add +
  else if (phoneNumber.startsWith('234') && !phoneNumber.startsWith('+')) {
    phoneNumber = '+' + phoneNumber;
  }
  // If it doesn't start with +, assume Nigerian and add +234
  else if (!phoneNumber.startsWith('+')) {
    phoneNumber = '+234' + phoneNumber;
  }

  console.log(`Sending SMS to ${phoneNumber}: ${payload.message.substring(0, 50)}...`);

  try {
    // Twilio API endpoint
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;

    // Create Basic Auth header
    const authHeader = btoa(`${twilioAccountSid}:${twilioAuthToken}`);

    // Build form data
    const formData = new URLSearchParams();
    formData.append('To', phoneNumber);
    formData.append('From', twilioPhoneNumber);
    formData.append('Body', payload.message);

    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    const result: TwilioResponse = await response.json();

    if (!response.ok) {
      console.error('Twilio API error:', result);
      return errorResponse(response.status, result.error_message || 'Failed to send SMS', {
        error_code: result.error_code,
      });
    }

    console.log(`SMS sent successfully. SID: ${result.sid}`);

    // Optionally log the SMS to database for tracking
    if (payload.order_id) {
      try {
        const { supabaseAdmin } = createSupabaseClients(req);
        await supabaseAdmin.from('sms_logs').insert({
          order_id: payload.order_id,
          phone_number: phoneNumber,
          message: payload.message,
          sms_type: payload.type || 'general',
          twilio_sid: result.sid,
          status: result.status,
        });
      } catch (logError) {
        // Don't fail if logging fails
        console.warn('Failed to log SMS:', logError);
      }
    }

    return jsonResponse({
      success: true,
      sid: result.sid,
      status: result.status,
    });
  } catch (error) {
    console.error('send-sms error', error);
    return errorResponse(500, 'Unexpected error sending SMS');
  }
});
