CREATE TABLE public.saved_filters (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name       text NOT NULL,
  categories text[] NOT NULL DEFAULT '{}',
  budget_min integer,
  budget_max integer,
  location   text,
  is_active  boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_saved_filters_user ON public.saved_filters(user_id);

ALTER TABLE public.saved_filters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "saved_filters_select" ON public.saved_filters
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "saved_filters_insert" ON public.saved_filters
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "saved_filters_update" ON public.saved_filters
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "saved_filters_delete" ON public.saved_filters
  FOR DELETE USING (auth.uid() = user_id);
