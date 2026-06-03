CREATE TABLE public.project_expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID,
  client_id UUID,
  description TEXT NOT NULL DEFAULT '',
  amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  category TEXT NOT NULL DEFAULT 'other',
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.project_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view project_expenses" ON public.project_expenses FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert project_expenses" ON public.project_expenses FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update project_expenses" ON public.project_expenses FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete project_expenses" ON public.project_expenses FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_project_expenses_updated_at BEFORE UPDATE ON public.project_expenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_project_expenses_project ON public.project_expenses(project_id);