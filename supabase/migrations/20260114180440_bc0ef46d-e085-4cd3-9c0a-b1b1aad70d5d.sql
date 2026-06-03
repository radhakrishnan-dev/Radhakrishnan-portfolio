-- Create services table
CREATE TABLE public.services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  highlight TEXT NOT NULL DEFAULT '',
  icon TEXT NOT NULL DEFAULT 'Wrench',
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Anyone can view active services" 
ON public.services 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can insert services" 
ON public.services 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update services" 
ON public.services 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete services" 
ON public.services 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_services_updated_at
BEFORE UPDATE ON public.services
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial services data
INSERT INTO public.services (title, description, highlight, icon, display_order) VALUES
('Portfolio Websites', 'Showcase your work and skills with a stunning personal portfolio that makes a lasting impression.', 'Perfect for freelancers', 'User', 1),
('Business Websites', 'Professional websites that establish credibility and help your business grow with a strong online presence.', 'For small businesses', 'Building2', 2),
('E-commerce Websites', 'Sell your products online with a fully functional store including cart, checkout, and payment integration.', 'Start selling online', 'ShoppingCart', 3),
('Website Redesign', 'Transform your outdated website into a modern, fast, and mobile-responsive digital experience.', 'Fresh new look', 'RefreshCw', 4),
('Admin Dashboards', 'Custom admin panels to manage your website content, users, and business data efficiently.', 'Full control', 'LayoutDashboard', 5),
('Website Maintenance', 'Keep your website secure, updated, and running smoothly with ongoing maintenance support.', 'Peace of mind', 'Wrench', 6),
('Poster Designing', 'Eye-catching posters for events, promotions, and social media that grab attention and drive engagement.', 'Visual impact', 'Image', 7),
('Video Editing', 'Professional video editing for promotional content, Instagram reels, and marketing campaigns.', 'Engaging content', 'Video', 8),
('YouTube Thumbnails', 'Click-worthy thumbnails designed to boost your video views and channel growth.', 'More clicks', 'Youtube', 9);