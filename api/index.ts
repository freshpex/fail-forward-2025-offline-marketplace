import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

function validateListing(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.crop || typeof data.crop !== 'string' || !data.crop.trim()) {
    errors.push('Crop name is required');
  }

  if (!data.quantity || isNaN(parseFloat(data.quantity)) || parseFloat(data.quantity) <= 0) {
    errors.push('Quantity must be a positive number');
  }

  if (!data.unit || typeof data.unit !== 'string' || !data.unit.trim()) {
    errors.push('Unit is required');
  }

  if (data.price !== null && data.price !== undefined && (isNaN(parseFloat(data.price)) || parseFloat(data.price) < 0)) {
    errors.push('Price must be a positive number');
  }

  if (!data.location || typeof data.location !== 'string' || !data.location.trim()) {
    errors.push('Location is required');
  }

  if (!data.contact_phone || typeof data.contact_phone !== 'string' || !data.contact_phone.trim()) {
    errors.push('Contact phone is required');
  }

  return { valid: errors.length === 0, errors };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const path = req.url?.split('?')[0];

  if (req.method === 'POST' && path === '/api/listings') {
    const validation = validateListing(req.body);

    if (!validation.valid) {
      return res.status(400).json({ errors: validation.errors });
    }

    try {
      const { crop, quantity, unit, price, location, contact_phone, farmer_name } = req.body;

      const { data, error } = await supabase
        .from('listings')
        .insert([
          {
            crop: crop.trim(),
            quantity: parseFloat(quantity),
            unit: unit.trim(),
            price: price ? parseFloat(price) : null,
            location: location.trim(),
            contact_phone: contact_phone.trim(),
            farmer_name: farmer_name?.trim() || null,
            status: 'synced'
          }
        ])
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        return res.status(500).json({ error: 'Failed to create listing' });
      }

      return res.status(201).json({ data, message: 'Listing created successfully' });
    } catch (error) {
      console.error('Server error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'GET' && path === '/api/listings') {
    try {
      const { crop, location } = req.query;

      let dbQuery = supabase
        .from('listings')
        .select('*')
        .order('created_at', { ascending: false });

      if (crop && typeof crop === 'string' && crop.trim()) {
        dbQuery = dbQuery.ilike('crop', `%${crop.trim()}%`);
      }

      if (location && typeof location === 'string' && location.trim()) {
        dbQuery = dbQuery.ilike('location', `%${location.trim()}%`);
      }

      const { data, error } = await dbQuery;

      if (error) {
        console.error('Supabase error:', error);
        return res.status(500).json({ error: 'Failed to fetch listings' });
      }

      return res.json({ data });
    } catch (error) {
      console.error('Server error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'GET' && path === '/api/prices') {
    try {
      const { crop, region } = req.query;

      let dbQuery = supabase
        .from('reference_prices')
        .select('*')
        .order('date', { ascending: false });

      if (crop && typeof crop === 'string' && crop.trim()) {
        dbQuery = dbQuery.ilike('crop', `%${crop.trim()}%`);
      }

      if (region && typeof region === 'string' && region.trim()) {
        dbQuery = dbQuery.ilike('region', `%${region.trim()}%`);
      }

      const { data, error } = await dbQuery;

      if (error) {
        console.error('Supabase error:', error);
        return res.status(500).json({ error: 'Failed to fetch prices' });
      }

      return res.json({ data });
    } catch (error) {
      console.error('Server error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'GET' && path === '/api/health') {
    return res.json({ status: 'ok', timestamp: new Date().toISOString() });
  }

  return res.status(404).json({ error: 'Not found' });
}
