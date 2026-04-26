
-- Explicit deny UPDATE on append-only tables
CREATE POLICY "Deny updates on chat_messages" ON public.chat_messages
  FOR UPDATE TO authenticated, anon USING (false) WITH CHECK (false);
CREATE POLICY "Deny updates on chat_attachments" ON public.chat_attachments
  FOR UPDATE TO authenticated, anon USING (false) WITH CHECK (false);
CREATE POLICY "Deny updates on conversation_tag_links" ON public.conversation_tag_links
  FOR UPDATE TO authenticated, anon USING (false) WITH CHECK (false);
CREATE POLICY "Deny updates on bot_api_keys" ON public.bot_api_keys
  FOR UPDATE TO authenticated, anon USING (false) WITH CHECK (false);
CREATE POLICY "Deny updates on api_usage_logs" ON public.api_usage_logs
  FOR UPDATE TO authenticated, anon USING (false) WITH CHECK (false);
CREATE POLICY "Deny deletes on api_usage_logs" ON public.api_usage_logs
  FOR DELETE TO authenticated, anon USING (false);
CREATE POLICY "Deny updates on gunit_memory" ON public.gunit_memory
  FOR UPDATE TO authenticated, anon USING (false) WITH CHECK (false);
CREATE POLICY "Deny updates on gunit_improvements" ON public.gunit_improvements
  FOR UPDATE TO authenticated, anon USING (false) WITH CHECK (false);
CREATE POLICY "Deny deletes on gunit_improvements" ON public.gunit_improvements
  FOR DELETE TO authenticated, anon USING (false);
