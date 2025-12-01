// @deno-types="https://deno.land/std@0.224.0/http/server.ts"
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { errorResponse, jsonResponse } from '../_shared/response.ts';

interface VerifyBankRequest {
  bank_code: string;
  account_number: string;
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

  const paystackKey = denoEnv?.env.get('PAYSTACK_SECRET_KEY');
  if (!paystackKey) {
    return errorResponse(500, 'PAYSTACK_SECRET_KEY is not configured');
  }

  let payload: VerifyBankRequest;
  try {
    payload = await req.json();
  } catch (_err) {
    return errorResponse(400, 'Invalid JSON payload');
  }

  if (!payload.bank_code || !payload.account_number) {
    return errorResponse(400, 'bank_code and account_number are required');
  }

  if (payload.account_number.length !== 10) {
    return errorResponse(400, 'Account number must be 10 digits');
  }

  try {
    // Verify account using Paystack Resolve Account API
    const verifyUrl = `https://api.paystack.co/bank/resolve?account_number=${payload.account_number}&bank_code=${payload.bank_code}`;

    const response = await fetch(verifyUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${paystackKey}`,
      },
    });

    const result = await response.json();

    if (!response.ok || !result.status) {
      console.error('Paystack resolve failed:', result);
      return errorResponse(400, result.message || 'Could not verify account');
    }

    return jsonResponse({
      account_name: result.data.account_name,
      account_number: result.data.account_number,
      bank_id: result.data.bank_id,
    });
  } catch (error) {
    console.error('verify-bank-account error', error);
    return errorResponse(500, 'Unexpected error verifying bank account');
  }
});
