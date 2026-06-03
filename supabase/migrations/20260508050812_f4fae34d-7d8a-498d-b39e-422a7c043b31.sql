ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS income_type text NOT NULL DEFAULT 'other';
ALTER TABLE public.client_projects ADD COLUMN IF NOT EXISTS income_type text NOT NULL DEFAULT 'other';