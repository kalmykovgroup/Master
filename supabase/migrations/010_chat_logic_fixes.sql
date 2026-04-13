-- Update get_unread_counts() to return conversation_status
CREATE OR REPLACE FUNCTION public.get_unread_counts()
RETURNS TABLE(conversation_id uuid, unread_count bigint, conversation_status text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.conversation_id, COUNT(*) as unread_count, c.status as conversation_status
  FROM public.messages m
  JOIN public.conversations c ON c.id = m.conversation_id
  WHERE m.sender_id != auth.uid()
    AND m.read_at IS NULL
    AND (c.client_id = auth.uid() OR c.master_id = auth.uid())
  GROUP BY m.conversation_id, c.status;
$$;
