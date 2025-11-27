import express from 'express';
import cors from 'cors';
import { body, query, validationResult } from 'express-validator';
import { createClient } from '@supabase/supabase-js';

const app = express();
const PORT = process.env.PORT || 3001;

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

app.use(cors());
app.use(express.json());

app.post(
  '/api/listings',
  [
    body('crop').trim().notEmpty().withMessage('Crop name is required'),
    body('quantity').isNumeric().isFloat({ min: 0.01 }).withMessage('Quantity must be a positive number'),
    body('unit').trim().notEmpty().withMessage('Unit is required'),
    body('price').optional({ nullable: true }).isNumeric().isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    body('location').trim().notEmpty().withMessage('Location is required'),
    body('contact_phone').trim().notEmpty().withMessage('Contact phone is required'),
    body('farmer_name').optional().trim()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { crop, quantity, unit, price, location, contact_phone, farmer_name } = req.body;

      const { data, error } = await supabase
        .from('listings')
        .insert([
          {
            crop,
            quantity: parseFloat(quantity),
            unit,
            price: price ? parseFloat(price) : null,
            location,
            contact_phone,
            farmer_name: farmer_name || null,
            status: 'synced'
          }
        ])
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        return res.status(500).json({ error: 'Failed to create listing' });
      }

      res.status(201).json({ data, message: 'Listing created successfully' });
    } catch (error) {
      console.error('Server error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

app.get(
  '/api/listings',
  [
    query('crop').optional().trim(),
    query('location').optional().trim()
  ],
  async (req, res) => {
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

      res.json({ data });
    } catch (error) {
      console.error('Server error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

app.get(
  '/api/prices',
  [
    query('crop').optional().trim(),
    query('region').optional().trim()
  ],
  async (req, res) => {
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

      res.json({ data });
    } catch (error) {
      console.error('Server error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
