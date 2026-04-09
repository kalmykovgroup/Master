-- =============================================================================
-- Master App: Database Schema (reflects all migrations through 005)
-- =============================================================================
-- This file is auto-applied when the PostgreSQL container is first created.
-- =============================================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Required by supabase/realtime service
CREATE SCHEMA IF NOT EXISTS _realtime;

-- =============================================================================
-- TABLES
-- =============================================================================

-- profiles (base table for all users)
CREATE TABLE public.profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone       text NOT NULL DEFAULT '',
  role        text CHECK (role IN ('client', 'master')),
  display_name text,
  avatar_url  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- master_profiles (master-specific fields, 1:1 with profiles where role='master')
CREATE TABLE public.master_profiles (
  user_id           uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  bio               text,
  age               integer,
  citizenship       text,
  work_experience   text,
  profile_completed boolean NOT NULL DEFAULT false,
  avg_rating        numeric(2,1),
  review_count      integer NOT NULL DEFAULT 0,
  last_active_at    timestamptz
);

CREATE INDEX idx_master_profiles_activity ON public.master_profiles(
  last_active_at DESC NULLS LAST, avg_rating DESC NULLS LAST
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
  assigned_master_id uuid REFERENCES public.profiles(id),
  master_completed boolean NOT NULL DEFAULT false,
  client_completed boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT orders_completed_requires_client
    CHECK (status <> 'completed' OR client_completed = true),
  CONSTRAINT orders_master_completed_check
    CHECK (master_completed = false OR status IN ('in_progress', 'completed'))
);

CREATE INDEX idx_orders_client ON public.orders(client_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_category ON public.orders(category);
CREATE INDEX idx_orders_assigned_master ON public.orders(assigned_master_id);

-- responses
CREATE TABLE public.responses (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id       uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  master_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message        text,
  proposed_price integer,
  status         text NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'accepted', 'rejected')),
  chat_blocked   boolean NOT NULL DEFAULT false,
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

-- special_offers
CREATE TABLE public.special_offers (
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

CREATE INDEX idx_special_offers_response ON public.special_offers(response_id);

-- order_views (tracks which orders a user has opened)
CREATE TABLE public.order_views (
  user_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  order_id   uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  viewed_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, order_id)
);

CREATE INDEX idx_order_views_user ON public.order_views(user_id);

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- 1. Auto-create profile + master_profiles on auth.users insert (dual accounts)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, phone, role)
  VALUES (NEW.id, COALESCE(NEW.phone, ''), 'client');
  INSERT INTO public.master_profiles (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Recalculate avg_rating and review_count on review insert (writes to master_profiles)
CREATE OR REPLACE FUNCTION public.handle_new_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.master_profiles
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
  WHERE user_id = NEW.reviewee_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_review_inserted
  AFTER INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_review();

-- 4. Update conversations.last_message_at on message insert
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
ALTER TABLE public.master_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.special_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_views ENABLE ROW LEVEL SECURITY;

-- profiles: anyone can read, only own profile can update
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- master_profiles: anyone can read, only own can update/insert
CREATE POLICY "master_profiles_select" ON public.master_profiles
  FOR SELECT USING (true);

CREATE POLICY "master_profiles_update" ON public.master_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "master_profiles_insert" ON public.master_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- orders: anyone can read open orders, clients can insert/update own orders
CREATE POLICY "orders_select" ON public.orders
  FOR SELECT USING (true);

CREATE POLICY "orders_insert" ON public.orders
  FOR INSERT WITH CHECK (auth.uid() = client_id);

CREATE POLICY "orders_update" ON public.orders
  FOR UPDATE USING (auth.uid() = client_id OR auth.uid() = assigned_master_id);

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
  FOR INSERT WITH CHECK (
    auth.uid() = reviewer_id
    AND EXISTS (
      SELECT 1 FROM public.orders
      WHERE id = order_id AND master_completed = true
    )
  );

-- special_offers: master and client can read, master can insert, client can update
CREATE POLICY "special_offers_select" ON public.special_offers
  FOR SELECT USING (auth.uid() = master_id OR auth.uid() = client_id);

CREATE POLICY "special_offers_insert" ON public.special_offers
  FOR INSERT WITH CHECK (auth.uid() = master_id);

CREATE POLICY "special_offers_update" ON public.special_offers
  FOR UPDATE USING (auth.uid() = client_id);

-- order_views: users can read/insert/update own views
CREATE POLICY "order_views_select" ON public.order_views
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "order_views_insert" ON public.order_views
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "order_views_update" ON public.order_views
  FOR UPDATE USING (auth.uid() = user_id);

-- =============================================================================
-- REALTIME
-- =============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.responses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.special_offers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.master_profiles;
