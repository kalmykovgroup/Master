-- Add status column to conversations (active / archived)
ALTER TABLE public.conversations
  ADD COLUMN status text NOT NULL DEFAULT 'active';

CREATE INDEX idx_conversations_status ON public.conversations(status);

-- RLS policy for UPDATE (currently only SELECT and INSERT exist)
CREATE POLICY "conversations_update" ON public.conversations
  FOR UPDATE USING (auth.uid() = client_id OR auth.uid() = master_id)
  WITH CHECK (auth.uid() = client_id OR auth.uid() = master_id);
