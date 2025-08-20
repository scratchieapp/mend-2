-- THIS MIGRATION HAS BEEN REPLACED BY 20240101000001_incident_documents_fixed.sql
-- DO NOT RUN THIS MIGRATION - IT HAS DATA TYPE MISMATCHES
-- The error was: foreign key constraint "fk_uploaded_by" cannot be implemented
-- Key columns "uploaded_by" and "user_id" are of incompatible types: integer and uuid.

/* DEPRECATED - ENTIRE MIGRATION COMMENTED OUT TO PREVENT ACCIDENTAL EXECUTION

-- Create incident_documents table to store file references
CREATE TABLE IF NOT EXISTS public.incident_documents (
  id SERIAL PRIMARY KEY,
  incident_id INTEGER NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  uploaded_by INTEGER,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Foreign key constraints
  CONSTRAINT fk_incident 
    FOREIGN KEY (incident_id) 
    REFERENCES public.incidents(incident_id) 
    ON DELETE CASCADE,
    
  CONSTRAINT fk_uploaded_by
    FOREIGN KEY (uploaded_by)
    REFERENCES public.users(user_id)
    ON DELETE SET NULL
);

-- Create indexes for better query performance
CREATE INDEX idx_incident_documents_incident_id ON public.incident_documents(incident_id);
CREATE INDEX idx_incident_documents_uploaded_at ON public.incident_documents(uploaded_at);

-- Enable Row Level Security
ALTER TABLE public.incident_documents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Policy: Users can view documents for incidents they have access to
CREATE POLICY "Users can view incident documents" ON public.incident_documents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.incidents i
      WHERE i.incident_id = incident_documents.incident_id
    )
  );

-- Policy: Users can insert documents for incidents they can edit
CREATE POLICY "Users can upload incident documents" ON public.incident_documents
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.user_id = auth.uid()::INTEGER
    )
  );

-- Policy: Users can update their own uploaded documents
CREATE POLICY "Users can update their documents" ON public.incident_documents
  FOR UPDATE
  USING (uploaded_by = auth.uid()::INTEGER)
  WITH CHECK (uploaded_by = auth.uid()::INTEGER);

-- Policy: Admin users can delete documents
CREATE POLICY "Admins can delete documents" ON public.incident_documents
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.user_id = auth.uid()::INTEGER
      AND u.role_id IN (1, 2, 3) -- Super Admin, Builder Admin, Administrator
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_incident_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_incident_documents_updated_at_trigger
  BEFORE UPDATE ON public.incident_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_incident_documents_updated_at();

-- Create storage bucket policies (to be run in Supabase dashboard)
-- Note: Storage policies need to be set via the Supabase dashboard as they require different permissions

-- Example storage policies to add in Supabase dashboard:
-- 1. Authenticated users can upload files to incident-documents bucket
-- 2. Users can view files they have access to
-- 3. Users can delete their own uploaded files
-- 4. Admins can manage all files

END OF DEPRECATED MIGRATION */