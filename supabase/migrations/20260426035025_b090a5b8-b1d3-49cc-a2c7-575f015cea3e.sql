
ALTER TABLE public.user_bots DROP COLUMN IF EXISTS api_keys;

CREATE POLICY "Deny client inserts on game_transactions"
  ON public.game_transactions FOR INSERT TO authenticated, anon
  WITH CHECK (false);
CREATE POLICY "Deny client updates on game_transactions"
  ON public.game_transactions FOR UPDATE TO authenticated, anon
  USING (false) WITH CHECK (false);
CREATE POLICY "Deny client deletes on game_transactions"
  ON public.game_transactions FOR DELETE TO authenticated, anon
  USING (false);

CREATE POLICY "Deny client inserts on purchase_locks"
  ON public.game_purchase_locks FOR INSERT TO authenticated, anon
  WITH CHECK (false);
CREATE POLICY "Deny client updates on purchase_locks"
  ON public.game_purchase_locks FOR UPDATE TO authenticated, anon
  USING (false) WITH CHECK (false);
CREATE POLICY "Deny client deletes on purchase_locks"
  ON public.game_purchase_locks FOR DELETE TO authenticated, anon
  USING (false);

ALTER TABLE public.chat_messages
  ADD CONSTRAINT chat_messages_content_length CHECK (char_length(content) <= 200000);
ALTER TABLE public.jackie_memory
  ADD CONSTRAINT jackie_memory_value_length CHECK (char_length(value) <= 10000);

REVOKE ALL ON public.api_keys FROM anon;
REVOKE ALL ON public.api_usage_logs FROM anon;
REVOKE ALL ON public.bot_api_keys FROM anon;
REVOKE ALL ON public.game_transactions FROM anon;
REVOKE ALL ON public.game_purchase_locks FROM anon;
REVOKE ALL ON public.jackie_memory FROM anon;
REVOKE ALL ON public.chat_messages FROM anon;
REVOKE ALL ON public.chat_attachments FROM anon;
