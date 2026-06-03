
-- Fix: Change restrictive public SELECT policies to permissive for all public-facing tables
-- The issue is that RESTRICTIVE policies require ALL to pass, so anon users fail "Admins can view all"

-- SERVICES
DROP POLICY IF EXISTS "Anyone can view active services" ON public.services;
CREATE POLICY "Anyone can view active services"
  ON public.services FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Admins can view all services" ON public.services;
CREATE POLICY "Admins can view all services"
  ON public.services FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- PROJECTS
DROP POLICY IF EXISTS "Anyone can view active projects" ON public.projects;
CREATE POLICY "Anyone can view active projects"
  ON public.projects FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Admins can view all projects" ON public.projects;
CREATE POLICY "Admins can view all projects"
  ON public.projects FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- SKILLS
DROP POLICY IF EXISTS "Anyone can view active skills" ON public.skills;
CREATE POLICY "Anyone can view active skills"
  ON public.skills FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Admins can view all skills" ON public.skills;
CREATE POLICY "Admins can view all skills"
  ON public.skills FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- TESTIMONIALS
DROP POLICY IF EXISTS "Anyone can view active testimonials" ON public.testimonials;
CREATE POLICY "Anyone can view active testimonials"
  ON public.testimonials FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Admins can view all testimonials" ON public.testimonials;
CREATE POLICY "Admins can view all testimonials"
  ON public.testimonials FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
