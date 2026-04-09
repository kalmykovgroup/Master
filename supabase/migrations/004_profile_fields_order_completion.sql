-- =============================================================================
-- Migration 004: Profile fields + Order completion flow
-- =============================================================================

-- profiles: new fields
ALTER TABLE public.profiles ADD COLUMN age integer;
ALTER TABLE public.profiles ADD COLUMN citizenship text;
ALTER TABLE public.profiles ADD COLUMN work_experience text;
ALTER TABLE public.profiles ADD COLUMN profile_completed boolean NOT NULL DEFAULT false;

-- Existing users with role → profile_completed = true
UPDATE public.profiles SET profile_completed = true WHERE role IS NOT NULL;

-- orders: master assignment + completion confirmation
ALTER TABLE public.orders ADD COLUMN assigned_master_id uuid REFERENCES public.profiles(id);
ALTER TABLE public.orders ADD COLUMN master_completed boolean NOT NULL DEFAULT false;
ALTER TABLE public.orders ADD COLUMN client_completed boolean NOT NULL DEFAULT false;

CREATE INDEX idx_orders_assigned_master ON public.orders(assigned_master_id);

-- CHECK: completed only when client_completed = true
ALTER TABLE public.orders ADD CONSTRAINT orders_completed_requires_client
  CHECK (status <> 'completed' OR client_completed = true);

-- CHECK: master_completed only for in_progress/completed
ALTER TABLE public.orders ADD CONSTRAINT orders_master_completed_check
  CHECK (master_completed = false OR status IN ('in_progress', 'completed'));

-- RLS: orders_update — allow assigned master to update (master_completed)
DROP POLICY IF EXISTS "orders_update" ON public.orders;
CREATE POLICY "orders_update" ON public.orders
  FOR UPDATE USING (auth.uid() = client_id OR auth.uid() = assigned_master_id);

-- RLS: reviews — only when master_completed = true
DROP POLICY IF EXISTS "reviews_insert" ON public.reviews;
CREATE POLICY "reviews_insert" ON public.reviews
  FOR INSERT WITH CHECK (
    auth.uid() = reviewer_id
    AND EXISTS (
      SELECT 1 FROM public.orders
      WHERE id = order_id AND master_completed = true
    )
  );
