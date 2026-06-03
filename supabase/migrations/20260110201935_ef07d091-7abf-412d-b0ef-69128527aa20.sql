-- Create admin_requests table to track pending admin access requests
CREATE TABLE public.admin_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    email TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable Row Level Security
ALTER TABLE public.admin_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own request status
CREATE POLICY "Users can view their own request"
ON public.admin_requests
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own request
CREATE POLICY "Users can create their own request"
ON public.admin_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can view all requests
CREATE POLICY "Admins can view all requests"
ON public.admin_requests
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update requests (approve/reject)
CREATE POLICY "Admins can update requests"
ON public.admin_requests
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete requests
CREATE POLICY "Admins can delete requests"
ON public.admin_requests
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));