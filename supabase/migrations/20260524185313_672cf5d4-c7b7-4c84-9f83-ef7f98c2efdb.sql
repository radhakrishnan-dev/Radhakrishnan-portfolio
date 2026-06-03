
-- client_notes
CREATE TABLE public.client_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.client_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view client_notes" ON public.client_notes FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin'));
CREATE POLICY "Admins can insert client_notes" ON public.client_notes FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "Admins can update client_notes" ON public.client_notes FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin'));
CREATE POLICY "Admins can delete client_notes" ON public.client_notes FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'));
CREATE INDEX idx_client_notes_client ON public.client_notes(client_id, created_at DESC);

-- client_files
CREATE TABLE public.client_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  file_name text NOT NULL,
  storage_path text NOT NULL,
  file_size bigint NOT NULL DEFAULT 0,
  file_type text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'Other',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.client_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view client_files" ON public.client_files FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin'));
CREATE POLICY "Admins can insert client_files" ON public.client_files FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "Admins can update client_files" ON public.client_files FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin'));
CREATE POLICY "Admins can delete client_files" ON public.client_files FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'));
CREATE INDEX idx_client_files_client ON public.client_files(client_id, created_at DESC);

-- last contacted
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS last_contacted_at timestamptz;

-- storage bucket (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('client-files','client-files', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admins view client-files objects" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'client-files' AND has_role(auth.uid(),'admin'));
CREATE POLICY "Admins upload client-files objects" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'client-files' AND has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update client-files objects" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'client-files' AND has_role(auth.uid(),'admin'));
CREATE POLICY "Admins delete client-files objects" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'client-files' AND has_role(auth.uid(),'admin'));
