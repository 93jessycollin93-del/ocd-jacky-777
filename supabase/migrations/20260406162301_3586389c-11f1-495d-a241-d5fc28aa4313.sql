
-- Fix jackie_memory: drop public policies, recreate as authenticated
DROP POLICY IF EXISTS "Users can view own memories" ON public.jackie_memory;
DROP POLICY IF EXISTS "Users can insert own memories" ON public.jackie_memory;
DROP POLICY IF EXISTS "Users can update own memories" ON public.jackie_memory;
DROP POLICY IF EXISTS "Users can delete own memories" ON public.jackie_memory;

CREATE POLICY "Users can view own memories" ON public.jackie_memory FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own memories" ON public.jackie_memory FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own memories" ON public.jackie_memory FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own memories" ON public.jackie_memory FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Fix jackie_tasks: drop public policies, recreate as authenticated
DROP POLICY IF EXISTS "Users can view own tasks" ON public.jackie_tasks;
DROP POLICY IF EXISTS "Users can insert own tasks" ON public.jackie_tasks;
DROP POLICY IF EXISTS "Users can update own tasks" ON public.jackie_tasks;
DROP POLICY IF EXISTS "Users can delete own tasks" ON public.jackie_tasks;

CREATE POLICY "Users can view own tasks" ON public.jackie_tasks FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tasks" ON public.jackie_tasks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tasks" ON public.jackie_tasks FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own tasks" ON public.jackie_tasks FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Fix storage policies: drop and recreate for authenticated only
DROP POLICY IF EXISTS "Authenticated users can delete own chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update own chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view own chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload chat attachments" ON storage.objects;

CREATE POLICY "Authenticated users can view own chat attachments" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'chat-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Authenticated users can upload chat attachments" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'chat-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Authenticated users can update own chat attachments" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'chat-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Authenticated users can delete own chat attachments" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'chat-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
