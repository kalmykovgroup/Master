-- =============================================================================
-- Master App: Initial Database Schema
-- =============================================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- TABLES
-- =============================================================================

-- profiles
CREATE TABLE public.profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone       text NOT NULL DEFAULT '',
  role        text CHECK (role IN ('client', 'master')),
  display_name text,
  avatar_url  text,
  bio         text,
  avg_rating  numeric(2,1),
  review_count integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- orders
CREATE TABLE public.orders (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title       text NOT NULL,
  description text NOT NULL,
  category    text NOT NULL,
  budget_min  integer,
  budget_max  integer,
  status      text NOT NULL DEFAULT 'open'
              CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled')),
  location    text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_orders_client ON public.orders(client_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_category ON public.orders(category);

-- responses
CREATE TABLE public.responses (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id       uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  master_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message        text,
  proposed_price integer,
  status         text NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, master_id)
);

CREATE INDEX idx_responses_order ON public.responses(order_id);
CREATE INDEX idx_responses_master ON public.responses(master_id);

-- conversations
CREATE TABLE public.conversations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  client_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  master_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_message_at timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, master_id)
);

CREATE INDEX idx_conversations_client ON public.conversations(client_id);
CREATE INDEX idx_conversations_master ON public.conversations(master_id);

-- messages
CREATE TABLE public.messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  text            text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_conversation_time ON public.messages(conversation_id, created_at);

-- reviews
CREATE TABLE public.reviews (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reviewee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating      smallint NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment     text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, reviewer_id)
);

CREATE INDEX idx_reviews_reviewee ON public.reviews(reviewee_id);

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- 1. Auto-create profile on auth.users insert
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, phone)
  VALUES (NEW.id, COALESCE(NEW.phone, ''));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Recalculate avg_rating and review_count on review insert
CREATE OR REPLACE FUNCTION public.handle_new_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET
    avg_rating = (
      SELECT ROUND(AVG(rating)::numeric, 1)
      FROM public.reviews
      WHERE reviewee_id = NEW.reviewee_id
    ),
    review_count = (
      SELECT COUNT(*)
      FROM public.reviews
      WHERE reviewee_id = NEW.reviewee_id
    )
  WHERE id = NEW.reviewee_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_review_inserted
  AFTER INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_review();

-- 3. Update conversations.last_message_at on message insert
CREATE OR REPLACE FUNCTION public.handle_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.conversations
  SET last_message_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_message_inserted
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_message();

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- profiles: anyone can read, only own profile can update
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- orders: anyone can read open orders, clients can insert/update own orders
CREATE POLICY "orders_select" ON public.orders
  FOR SELECT USING (true);

CREATE POLICY "orders_insert" ON public.orders
  FOR INSERT WITH CHECK (auth.uid() = client_id);

CREATE POLICY "orders_update" ON public.orders
  FOR UPDATE USING (auth.uid() = client_id);

-- responses: order owner and respondent can read, masters can insert own
CREATE POLICY "responses_select" ON public.responses
  FOR SELECT USING (
    auth.uid() = master_id
    OR auth.uid() IN (SELECT client_id FROM public.orders WHERE id = order_id)
  );

CREATE POLICY "responses_insert" ON public.responses
  FOR INSERT WITH CHECK (auth.uid() = master_id);

CREATE POLICY "responses_update" ON public.responses
  FOR UPDATE USING (
    auth.uid() IN (SELECT client_id FROM public.orders WHERE id = order_id)
  );

-- conversations: participants can read/insert
CREATE POLICY "conversations_select" ON public.conversations
  FOR SELECT USING (auth.uid() = client_id OR auth.uid() = master_id);

CREATE POLICY "conversations_insert" ON public.conversations
  FOR INSERT WITH CHECK (auth.uid() = client_id OR auth.uid() = master_id);

-- messages: conversation participants can read/insert
CREATE POLICY "messages_select" ON public.messages
  FOR SELECT USING (
    conversation_id IN (
      SELECT id FROM public.conversations
      WHERE client_id = auth.uid() OR master_id = auth.uid()
    )
  );

CREATE POLICY "messages_insert" ON public.messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND conversation_id IN (
      SELECT id FROM public.conversations
      WHERE client_id = auth.uid() OR master_id = auth.uid()
    )
  );

-- reviews: anyone can read, authenticated users can insert own reviews
CREATE POLICY "reviews_select" ON public.reviews
  FOR SELECT USING (true);

CREATE POLICY "reviews_insert" ON public.reviews
  FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

-- =============================================================================
-- REALTIME
-- =============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.responses;
