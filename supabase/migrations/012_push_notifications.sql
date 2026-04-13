-- ============================================================
-- Push Notifications: device_tokens + notification_settings
-- ============================================================

-- 0. Enable pg_net extension for HTTP calls from triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Configure Edge Function URL (update for production domain)
ALTER DATABASE postgres SET app.settings.edge_function_url = 'http://supabase-functions:8000';

-- 1. Device tokens table
CREATE TABLE public.device_tokens (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token       text NOT NULL,
  platform    text NOT NULL CHECK (platform IN ('android', 'ios')),
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  UNIQUE (user_id, token)
);

ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "device_tokens_select_own" ON public.device_tokens
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "device_tokens_insert_own" ON public.device_tokens
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "device_tokens_update_own" ON public.device_tokens
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "device_tokens_delete_own" ON public.device_tokens
  FOR DELETE USING (auth.uid() = user_id);

-- 2. Notification settings table
CREATE TABLE public.notification_settings (
  user_id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  response_received    boolean DEFAULT true,
  master_completed     boolean DEFAULT true,
  special_offer        boolean DEFAULT true,
  response_accepted    boolean DEFAULT true,
  response_rejected    boolean DEFAULT true,
  client_completed     boolean DEFAULT true,
  new_message          boolean DEFAULT true,
  created_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now()
);

ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notification_settings_select_own" ON public.notification_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "notification_settings_insert_own" ON public.notification_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "notification_settings_update_own" ON public.notification_settings
  FOR UPDATE USING (auth.uid() = user_id);

-- 3. Auto-create notification_settings when profile is created
CREATE OR REPLACE FUNCTION public.create_notification_settings()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.notification_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_create_notification_settings
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_notification_settings();

-- Backfill for existing users
INSERT INTO public.notification_settings (user_id)
SELECT id FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================
-- notify_push() helper — calls Edge Function via pg_net
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_push(
  p_event_type text,
  p_user_id    uuid,
  p_title      text,
  p_body       text,
  p_data       jsonb DEFAULT '{}'::jsonb
) RETURNS void AS $$
DECLARE
  v_url text;
BEGIN
  v_url := current_setting('app.settings.edge_function_url', true);
  IF v_url IS NULL OR v_url = '' THEN
    RETURN;
  END IF;

  PERFORM net.http_post(
    url     := v_url || '/send-push',
    body    := jsonb_build_object(
      'event_type', p_event_type,
      'user_id',    p_user_id,
      'title',      p_title,
      'body',       p_body,
      'data',       p_data
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Trigger 1: responses INSERT → notify client (response_received)
-- ============================================================
CREATE OR REPLACE FUNCTION public.trg_notify_response_received()
RETURNS trigger AS $$
DECLARE
  v_order   record;
  v_master  text;
BEGIN
  SELECT o.client_id, o.title INTO v_order
  FROM public.orders o WHERE o.id = NEW.order_id;

  SELECT p.display_name INTO v_master
  FROM public.profiles p WHERE p.id = NEW.master_id;

  PERFORM public.notify_push(
    'response_received',
    v_order.client_id,
    'Новый отклик',
    COALESCE(v_master, 'Мастер') || ' откликнулся на «' || v_order.title || '»',
    jsonb_build_object('orderId', NEW.order_id, 'responseId', NEW.id)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_response_received
  AFTER INSERT ON public.responses
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_notify_response_received();

-- ============================================================
-- Trigger 2: responses UPDATE (status) → notify master (accepted/rejected)
-- ============================================================
CREATE OR REPLACE FUNCTION public.trg_notify_response_status()
RETURNS trigger AS $$
DECLARE
  v_order record;
  v_event text;
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  SELECT o.client_id, o.title INTO v_order
  FROM public.orders o WHERE o.id = NEW.order_id;

  IF NEW.status = 'accepted' THEN
    v_event := 'response_accepted';
    PERFORM public.notify_push(
      v_event, NEW.master_id,
      'Отклик принят',
      'Ваш отклик на «' || v_order.title || '» принят',
      jsonb_build_object('orderId', NEW.order_id)
    );
  ELSIF NEW.status = 'rejected' THEN
    v_event := 'response_rejected';
    PERFORM public.notify_push(
      v_event, NEW.master_id,
      'Отклик отклонён',
      'Ваш отклик на «' || v_order.title || '» отклонён',
      jsonb_build_object('orderId', NEW.order_id)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_response_status
  AFTER UPDATE ON public.responses
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_notify_response_status();

-- ============================================================
-- Trigger 3: orders UPDATE (master_completed / client_completed)
-- ============================================================
CREATE OR REPLACE FUNCTION public.trg_notify_order_completed()
RETURNS trigger AS $$
BEGIN
  -- master_completed changed to true → notify client
  IF NEW.master_completed = true AND OLD.master_completed = false THEN
    PERFORM public.notify_push(
      'master_completed',
      NEW.client_id,
      'Заказ выполнен',
      'Мастер подтвердил выполнение «' || NEW.title || '»',
      jsonb_build_object('orderId', NEW.id)
    );
  END IF;

  -- client_completed changed to true → notify master
  IF NEW.client_completed = true AND OLD.client_completed = false
     AND NEW.assigned_master_id IS NOT NULL THEN
    PERFORM public.notify_push(
      'client_completed',
      NEW.assigned_master_id,
      'Клиент подтвердил',
      'Клиент подтвердил выполнение «' || NEW.title || '»',
      jsonb_build_object('orderId', NEW.id)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_order_completed
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_notify_order_completed();

-- ============================================================
-- Trigger 4: special_offers INSERT → notify client
-- ============================================================
CREATE OR REPLACE FUNCTION public.trg_notify_special_offer()
RETURNS trigger AS $$
DECLARE
  v_master text;
BEGIN
  SELECT p.display_name INTO v_master
  FROM public.profiles p WHERE p.id = NEW.master_id;

  PERFORM public.notify_push(
    'special_offer',
    NEW.client_id,
    'Спецпредложение',
    COALESCE(v_master, 'Мастер') || ' отправил вам предложение',
    jsonb_build_object('orderId',
      (SELECT r.order_id FROM public.responses r WHERE r.id = NEW.response_id))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_special_offer
  AFTER INSERT ON public.special_offers
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_notify_special_offer();

-- ============================================================
-- Trigger 5: messages INSERT → notify recipient (new_message)
-- ============================================================
CREATE OR REPLACE FUNCTION public.trg_notify_new_message()
RETURNS trigger AS $$
DECLARE
  v_conv     record;
  v_recipient uuid;
  v_sender   text;
BEGIN
  SELECT c.client_id, c.master_id INTO v_conv
  FROM public.conversations c WHERE c.id = NEW.conversation_id;

  -- Determine recipient (the one who is NOT the sender)
  IF NEW.sender_id = v_conv.client_id THEN
    v_recipient := v_conv.master_id;
  ELSE
    v_recipient := v_conv.client_id;
  END IF;

  SELECT p.display_name INTO v_sender
  FROM public.profiles p WHERE p.id = NEW.sender_id;

  PERFORM public.notify_push(
    'new_message',
    v_recipient,
    COALESCE(v_sender, 'Сообщение'),
    COALESCE(NEW.text, 'Файл'),
    jsonb_build_object('conversationId', NEW.conversation_id)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_new_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_notify_new_message();
