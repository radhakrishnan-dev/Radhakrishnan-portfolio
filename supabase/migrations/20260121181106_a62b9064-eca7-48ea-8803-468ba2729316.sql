-- Add policy for admins to view ALL services (including inactive)
CREATE POLICY "Admins can view all services"
ON public.services
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add policy for admins to view ALL projects (including inactive)
CREATE POLICY "Admins can view all projects"
ON public.projects
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add policy for admins to view ALL skills (including inactive)
CREATE POLICY "Admins can view all skills"
ON public.skills
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add policy for admins to view ALL testimonials (including inactive)
CREATE POLICY "Admins can view all testimonials"
ON public.testimonials
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add email column to user_roles to store the admin's email when created
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS email TEXT;