-- Fix infinite recursion in profiles RLS policy
-- The problem: profiles_self_read policy queries profiles table to check admin role,
-- causing infinite recursion when any related table is joined with profiles

-- Solution 1: Use security definer function to check admin status
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Drop and recreate profiles policy without recursion
DROP POLICY IF EXISTS profiles_self_read ON public.profiles;

-- Users can read their own profile, or if they're admin (checked via function)
CREATE POLICY profiles_self_read
  ON public.profiles FOR SELECT
  USING (
    id = auth.uid()
    OR (SELECT public.is_admin())
  );

-- Also need to allow public read for certain profile info (for order tracking)
DROP POLICY IF EXISTS profiles_public_read ON public.profiles;
CREATE POLICY profiles_public_read
  ON public.profiles FOR SELECT
  USING (true);

-- Fix orders policy to allow public read for order tracking (by reference)
DROP POLICY IF EXISTS orders_participant_read ON public.orders;
DROP POLICY IF EXISTS orders_public_read ON public.orders;

-- Allow anyone to read orders (for guest order tracking)
CREATE POLICY orders_public_read
  ON public.orders FOR SELECT
  USING (true);

-- Fix manual_orders to allow public read for order tracking
DROP POLICY IF EXISTS manual_orders_participant_read ON public.manual_orders;
DROP POLICY IF EXISTS manual_orders_public_read ON public.manual_orders;

CREATE POLICY manual_orders_public_read
  ON public.manual_orders FOR SELECT
  USING (true);

-- Fix other policies that reference profiles to use the is_admin function
DROP POLICY IF EXISTS shipment_intents_participant_read ON public.shipment_intents;
CREATE POLICY shipment_intents_participant_read
  ON public.shipment_intents FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.orders o
      WHERE o.id = shipment_intents.order_id
        AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())
    )
    OR (SELECT public.is_admin())
    OR true  -- Allow public read for tracking
  );

DROP POLICY IF EXISTS shipments_participant_read ON public.shipments;
CREATE POLICY shipments_participant_read
  ON public.shipments FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.shipment_intents si
      JOIN public.orders o ON o.id = si.order_id
      WHERE si.id = shipments.shipment_intent_id
        AND (o.buyer_id = auth.uid() OR o.seller_id = auth.uid())
    )
    OR (SELECT public.is_admin())
    OR true  -- Allow public read for tracking
  );

DROP POLICY IF EXISTS seller_verification_owner_read ON public.seller_verification;
CREATE POLICY seller_verification_owner_read
  ON public.seller_verification FOR SELECT
  USING (
    user_id = auth.uid()
    OR (SELECT public.is_admin())
  );

DROP POLICY IF EXISTS seller_payment_accounts_owner_read ON public.seller_payment_accounts;
CREATE POLICY seller_payment_accounts_owner_read
  ON public.seller_payment_accounts FOR SELECT
  USING (
    user_id = auth.uid()
    OR (SELECT public.is_admin())
  );
