-- Allow public (anon) users to view active sites
-- This is required for the Public Dashboard

-- Grant SELECT permission to anon role
GRANT SELECT ON public.sites TO anon;

-- Create RLS policy for public access
-- Only allow seeing active sites
CREATE POLICY "Allow public read access to active sites"
ON public.sites FOR SELECT TO anon
USING (is_active = true);

