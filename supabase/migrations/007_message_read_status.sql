-- Колонка read_at на messages
ALTER TABLE public.messages ADD COLUMN read_at timestamptz;

-- Индекс для быстрых запросов непрочитанных
CREATE INDEX idx_messages_unread
  ON public.messages(conversation_id, sender_id)
  WHERE read_at IS NULL;

-- RLS: участник (не отправитель) может обновить read_at
CREATE POLICY "messages_update_read" ON public.messages
  FOR UPDATE USING (
    auth.uid() != sender_id
    AND conversation_id IN (
      SELECT id FROM public.conversations
      WHERE client_id = auth.uid() OR master_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() != sender_id
    AND conversation_id IN (
      SELECT id FROM public.conversations
      WHERE client_id = auth.uid() OR master_id = auth.uid()
    )
  );

-- RPC: пакетно пометить прочитанными все сообщения в диалоге
CREATE OR REPLACE FUNCTION public.mark_messages_read(p_conversation_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.messages
  SET read_at = now()
  WHERE conversation_id = p_conversation_id
    AND sender_id != auth.uid()
    AND read_at IS NULL;
END;
$$;

-- RPC: количество непрочитанных по диалогам
CREATE OR REPLACE FUNCTION public.get_unread_counts()
RETURNS TABLE(conversation_id uuid, unread_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.conversation_id, COUNT(*) as unread_count
  FROM public.messages m
  JOIN public.conversations c ON c.id = m.conversation_id
  WHERE m.sender_id != auth.uid()
    AND m.read_at IS NULL
    AND (c.client_id = auth.uid() OR c.master_id = auth.uid())
  GROUP BY m.conversation_id;
$$;

-- Права на вызов RPC
GRANT EXECUTE ON FUNCTION public.mark_messages_read(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_unread_counts() TO authenticated;

-- Realtime: полные данные для UPDATE событий
ALTER TABLE public.messages REPLICA IDENTITY FULL;
