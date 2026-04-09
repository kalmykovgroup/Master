-- Track which orders users have viewed
CREATE TABLE public.order_views (
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  order_id   uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  viewed_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, order_id)
);

CREATE INDEX idx_order_views_user ON public.order_views(user_id);

ALTER TABLE public.order_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "order_views_select" ON public.order_views
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "order_views_insert" ON public.order_views
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "order_views_update" ON public.order_views
  FOR UPDATE USING (auth.uid() = user_id);
