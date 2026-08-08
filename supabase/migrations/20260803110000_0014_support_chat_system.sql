-- Replace ticket system with direct chat interface for support

-- Drop existing tables if they exist to avoid conflicts
DROP TABLE IF EXISTS public.support_messages CASCADE;
DROP TABLE IF EXISTS public.support_conversations CASCADE;

-- Create support_conversations table first
CREATE TABLE public.support_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'resolved')),
  last_message text,
  last_message_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_support_conv_user ON public.support_conversations(user_id, last_message_at DESC);
CREATE INDEX idx_support_conv_status ON public.support_conversations(status, last_message_at DESC);

ALTER TABLE public.support_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "support_conv_select_own_or_admin" ON public.support_conversations;
CREATE POLICY "support_conv_select_own_or_admin" ON public.support_conversations FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "support_conv_insert_own" ON public.support_conversations;
CREATE POLICY "support_conv_insert_own" ON public.support_conversations FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "support_conv_update_admin" ON public.support_conversations;
CREATE POLICY "support_conv_update_admin" ON public.support_conversations FOR UPDATE
  TO authenticated USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Create support_messages table with all columns
CREATE TABLE public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.support_conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_name text NOT NULL,
  message text NOT NULL,
  is_admin boolean NOT NULL DEFAULT false,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_support_msg_conv ON public.support_messages(conversation_id, created_at ASC);
CREATE INDEX idx_support_msg_sender ON public.support_messages(sender_id, created_at DESC);

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "support_msg_select_conv_participants" ON public.support_messages;
CREATE POLICY "support_msg_select_conv_participants" ON public.support_messages FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.support_conversations 
      WHERE id = conversation_id 
      AND (user_id = auth.uid() OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS "support_msg_insert_conv_participants" ON public.support_messages;
CREATE POLICY "support_msg_insert_conv_participants" ON public.support_messages FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.support_conversations 
      WHERE id = conversation_id 
      AND (user_id = auth.uid() OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS "support_msg_update_admin" ON public.support_messages;
CREATE POLICY "support_msg_update_admin" ON public.support_messages FOR UPDATE
  TO authenticated USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Function to update conversation when new message is sent
CREATE OR REPLACE FUNCTION public.update_conversation_on_message()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.support_conversations
  SET 
    last_message = NEW.message,
    last_message_at = NEW.created_at,
    updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_conv_on_msg ON public.support_messages;
CREATE TRIGGER trg_update_conv_on_msg
  AFTER INSERT ON public.support_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_conversation_on_message();

-- Function to get unread count for a conversation
CREATE OR REPLACE FUNCTION public.get_unread_count(p_conversation_id uuid, p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  SELECT count(*) INTO v_count
  FROM public.support_messages
  WHERE conversation_id = p_conversation_id
    AND is_admin = true
    AND read = false;
  
  RETURN v_count;
END;
$$;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.support_conversations TO authenticated;
GRANT ALL ON public.support_conversations TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.support_messages TO authenticated;
GRANT ALL ON public.support_messages TO service_role;