-- Create storage bucket for incident documents
-- Note: Storage buckets must be created through Supabase Dashboard or using the storage API
-- This migration provides the SQL for reference and RLS policies

-- Insert bucket configuration (this will only work if the bucket doesn't exist)
-- In production, create the bucket through Supabase Dashboard
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'incident-documents',
  'incident-documents', 
  false, -- Private bucket
  52428800, -- 50MB file size limit
  ARRAY[
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Create RLS policies for the storage bucket
-- These policies control who can access files in the bucket

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can upload incident documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view incident documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their uploaded documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete incident documents" ON storage.objects;

-- Policy: Authenticated users can upload files to incident-documents bucket
CREATE POLICY "Authenticated users can upload incident documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'incident-documents'
  AND (storage.foldername(name))[1] ~ '^\d+$' -- Folder name must be a valid incident_id
);

-- Policy: Users can view files if they have access to the incident
CREATE POLICY "Users can view incident documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'incident-documents'
  AND EXISTS (
    SELECT 1 FROM public.incidents i
    WHERE i.incident_id = ((storage.foldername(name))[1])::INTEGER
  )
);

-- Policy: Users can update their own uploaded files
CREATE POLICY "Users can update their uploaded documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'incident-documents'
  AND owner = auth.uid()
)
WITH CHECK (
  bucket_id = 'incident-documents'
  AND owner = auth.uid()
);

-- Policy: Admin users can delete documents
CREATE POLICY "Admins can delete incident documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'incident-documents'
  AND EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.user_id = auth.uid()
    AND u.role_id IN (1, 2, 3) -- Super Admin, Account Manager, Administrator
  )
);

-- Create helper function to generate secure file paths
CREATE OR REPLACE FUNCTION generate_incident_document_path(
  p_incident_id INTEGER,
  p_file_name TEXT
)
RETURNS TEXT AS $$
DECLARE
  v_timestamp TEXT;
  v_random_string TEXT;
  v_extension TEXT;
  v_safe_name TEXT;
BEGIN
  -- Get file extension
  v_extension := CASE 
    WHEN position('.' in p_file_name) > 0 
    THEN substring(p_file_name from position('.' in p_file_name))
    ELSE ''
  END;
  
  -- Generate timestamp and random string
  v_timestamp := to_char(NOW(), 'YYYYMMDD_HH24MISS');
  v_random_string := substr(md5(random()::text), 1, 8);
  
  -- Create safe file name
  v_safe_name := v_timestamp || '_' || v_random_string || v_extension;
  
  -- Return the full path: incident_id/filename
  RETURN p_incident_id::TEXT || '/' || v_safe_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION generate_incident_document_path TO authenticated;

-- Create function to handle file upload and record in database
CREATE OR REPLACE FUNCTION upload_incident_document(
  p_incident_id INTEGER,
  p_file_name TEXT,
  p_file_type TEXT,
  p_file_size INTEGER,
  p_file_url TEXT
)
RETURNS UUID AS $$
DECLARE
  v_document_id UUID;
  v_user_id UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  -- Verify incident exists
  IF NOT EXISTS (SELECT 1 FROM public.incidents WHERE incident_id = p_incident_id) THEN
    RAISE EXCEPTION 'Incident % does not exist', p_incident_id;
  END IF;
  
  -- Insert document record
  INSERT INTO public.incident_documents (
    incident_id,
    file_url,
    file_name,
    file_type,
    file_size,
    uploaded_by
  ) VALUES (
    p_incident_id,
    p_file_url,
    p_file_name,
    p_file_type,
    p_file_size,
    v_user_id
  )
  RETURNING id INTO v_document_id;
  
  -- Create notification for relevant users
  -- Notify employer admin
  INSERT INTO public.notifications (user_id, title, message, type, metadata)
  SELECT DISTINCT
    u.user_id,
    'New Document Uploaded',
    'A new document has been uploaded for incident ' || i.incident_number,
    'info',
    jsonb_build_object(
      'incident_id', p_incident_id,
      'document_id', v_document_id,
      'file_name', p_file_name
    )
  FROM public.incidents i
  JOIN public.users u ON u.employer_id = i.employer_id
  WHERE i.incident_id = p_incident_id
  AND u.role_id IN (1, 2, 3, 4); -- Notify admins and employer admins
  
  RETURN v_document_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION upload_incident_document TO authenticated;

-- Create function to get signed upload URL (for direct browser uploads)
CREATE OR REPLACE FUNCTION get_incident_document_upload_url(
  p_incident_id INTEGER,
  p_file_name TEXT
)
RETURNS TABLE (
  upload_path TEXT,
  signed_url TEXT
) AS $$
DECLARE
  v_path TEXT;
BEGIN
  -- Generate secure file path
  v_path := generate_incident_document_path(p_incident_id, p_file_name);
  
  -- Return the path (signed URL must be generated on the client side using Supabase client)
  RETURN QUERY
  SELECT 
    v_path AS upload_path,
    NULL::TEXT AS signed_url; -- This will be generated client-side
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_incident_document_upload_url TO authenticated;

-- Add comment documentation
COMMENT ON FUNCTION generate_incident_document_path IS 'Generates a secure file path for incident documents with timestamp and random string';
COMMENT ON FUNCTION upload_incident_document IS 'Records an uploaded document in the database and creates notifications';
COMMENT ON FUNCTION get_incident_document_upload_url IS 'Gets the upload path for a document (signed URL generated client-side)';