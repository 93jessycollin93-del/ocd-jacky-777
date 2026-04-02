
-- 1. Make chat-attachments bucket private
UPDATE storage.buckets SET public = false WHERE id = 'chat-attachments';

-- 2. Remove the anonymous SELECT policy on storage.objects
DROP POLICY IF EXISTS "Anyone can view public chat attachments" ON storage.objects;

-- 3. Fix game_projects policies: change from public to authenticated
DROP POLICY IF EXISTS "Users can view own projects" ON game_projects;
CREATE POLICY "Users can view own projects" ON game_projects FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own projects" ON game_projects;
CREATE POLICY "Users can insert own projects" ON game_projects FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own projects" ON game_projects;
CREATE POLICY "Users can update own projects" ON game_projects FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own projects" ON game_projects;
CREATE POLICY "Users can delete own projects" ON game_projects FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 4. Fix game_design_entries policies: change from public to authenticated
DROP POLICY IF EXISTS "Users can view own entries" ON game_design_entries;
CREATE POLICY "Users can view own entries" ON game_design_entries FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own entries" ON game_design_entries;
CREATE POLICY "Users can insert own entries" ON game_design_entries FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own entries" ON game_design_entries;
CREATE POLICY "Users can update own entries" ON game_design_entries FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own entries" ON game_design_entries;
CREATE POLICY "Users can delete own entries" ON game_design_entries FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 5. Add NOT NULL constraints to user_id columns
ALTER TABLE chat_messages ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE conversations ALTER COLUMN user_id SET NOT NULL;
