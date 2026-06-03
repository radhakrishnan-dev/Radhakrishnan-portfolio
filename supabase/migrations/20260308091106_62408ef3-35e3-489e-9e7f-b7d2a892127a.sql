
-- Contact messages table
CREATE TABLE public.contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- Anyone can submit a contact message
CREATE POLICY "Anyone can submit contact messages" ON public.contact_messages
  FOR INSERT WITH CHECK (true);

-- Only admins can view contact messages
CREATE POLICY "Admins can view contact messages" ON public.contact_messages
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can update contact messages (mark as read)
CREATE POLICY "Admins can update contact messages" ON public.contact_messages
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete contact messages
CREATE POLICY "Admins can delete contact messages" ON public.contact_messages
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Site settings table for profile/about editor
CREATE TABLE public.site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL DEFAULT '',
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read site settings (public content)
CREATE POLICY "Anyone can view site settings" ON public.site_settings
  FOR SELECT USING (true);

-- Only admins can update site settings
CREATE POLICY "Admins can update site settings" ON public.site_settings
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can insert site settings
CREATE POLICY "Admins can insert site settings" ON public.site_settings
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed default site settings
INSERT INTO public.site_settings (key, value) VALUES
  ('name', 'Radhakrishnan'),
  ('title', 'Web Developer & Designer'),
  ('bio', 'I''m a passionate web developer with a strong business mindset. I believe every brand deserves a powerful online presence that drives real results.'),
  ('bio_secondary', 'Whether you''re a small business owner, startup founder, or freelancer, I''m here to help you establish your digital footprint.'),
  ('quote', 'Your website is your 24/7 salesperson. Let''s make it work for you.'),
  ('email', 'mrradhakrishnan2607@gmail.com'),
  ('phone', '+91 93630 53725'),
  ('whatsapp', '919363053725'),
  ('instagram', 'mr_krishzz_07'),
  ('location', 'India');

-- Media storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('media', 'media', true);

-- Storage policies for media bucket
CREATE POLICY "Anyone can view media" ON storage.objects
  FOR SELECT USING (bucket_id = 'media');

CREATE POLICY "Admins can upload media" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'media' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update media" ON storage.objects
  FOR UPDATE USING (bucket_id = 'media' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete media" ON storage.objects
  FOR DELETE USING (bucket_id = 'media' AND public.has_role(auth.uid(), 'admin'));
