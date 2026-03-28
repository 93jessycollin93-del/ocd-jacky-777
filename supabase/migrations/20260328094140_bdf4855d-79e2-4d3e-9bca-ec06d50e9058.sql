
-- Create storage bucket for chat attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-attachments', 'chat-attachments', true);

-- Create chat_attachments table
CREATE TABLE public.chat_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chat_attachments ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own attachments" ON public.chat_attachments
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own attachments" ON public.chat_attachments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own attachments" ON public.chat_attachments
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Storage RLS policies
CREATE POLICY "Users can upload chat attachments" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'chat-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view own chat attachments" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'chat-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Anyone can view public chat attachments" ON storage.objects
  FOR SELECT TO anon USING (bucket_id = 'chat-attachments');

CREATE POLICY "Users can delete own chat attachments" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'chat-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);
