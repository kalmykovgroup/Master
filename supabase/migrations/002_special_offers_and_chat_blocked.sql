-- Add chat_blocked to responses
ALTER TABLE public.responses ADD COLUMN IF NOT EXISTS chat_blocked boolean NOT NULL DEFAULT false;

-- Create special_offers table
CREATE TABLE IF NOT EXISTS public.special_offers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id     uuid NOT NULL REFERENCES public.responses(id) ON DELETE CASCADE,
  master_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message         text NOT NULL,
  proposed_price  integer,
  status          text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (response_id)
);

CREATE INDEX IF NOT EXISTS idx_special_offers_response ON public.special_offers(response_id);

-- RLS
ALTER TABLE public.special_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "special_offers_select" ON public.special_offers
  FOR SELECT USING (auth.uid() = master_id OR auth.uid() = client_id);

CREATE POLICY "special_offers_insert" ON public.special_offers
  FOR INSERT WITH CHECK (auth.uid() = master_id);

CREATE POLICY "special_offers_update" ON public.special_offers
  FOR UPDATE USING (auth.uid() = client_id);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.special_offers;
