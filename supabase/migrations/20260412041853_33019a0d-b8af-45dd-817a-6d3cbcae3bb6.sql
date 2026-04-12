
-- 1. CRITICAL: Remove client INSERT on game_transactions — only service-role should write
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.game_transactions;

-- 2. CRITICAL: Remove client INSERT on game_purchase_locks — only service-role should write
DROP POLICY IF EXISTS "Users can insert own locks" ON public.game_purchase_locks;

-- 3. Add missing UPDATE policy on gunit_bots
CREATE POLICY "Users can update own bots"
ON public.gunit_bots
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
