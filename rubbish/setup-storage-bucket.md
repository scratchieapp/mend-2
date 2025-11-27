# Setting Up Supabase Storage Bucket for Incident Documents

## Manual Setup via Supabase Dashboard

1. **Navigate to Storage**
   - Go to: https://supabase.com/dashboard/project/rkzcybthcszeusrohbtc/storage/buckets
   - Click "Create bucket"

2. **Create the Bucket**
   - **Name**: `incident-documents`
   - **Public bucket**: ❌ Unchecked (Private)
   - **File size limit**: 50MB (52428800 bytes)
   - **Allowed MIME types**: 
     ```
     image/jpeg
     image/jpg
     image/png
     image/gif
     image/webp
     application/pdf
     application/msword
     application/vnd.openxmlformats-officedocument.wordprocessingml.document
     application/vnd.ms-excel
     application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
     text/plain
     text/csv
     ```

3. **Apply RLS Policies**
   Run this SQL in the SQL Editor (https://supabase.com/dashboard/project/rkzcybthcszeusrohbtc/sql/new):

```sql
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
```

4. **Create Helper Functions**
   Run this SQL to create the helper functions:

```sql
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
```

## Verification

After setup, verify everything is working:

1. **Check bucket exists**:
   - Go to Storage in Supabase Dashboard
   - You should see `incident-documents` bucket

2. **Test upload** (from your application):
   ```typescript
   import { uploadIncidentDocument } from '@/lib/supabase/incident-documents';
   
   const file = // your file
   const incidentId = // your incident ID
   
   const document = await uploadIncidentDocument(incidentId, file, (progress) => {
     console.log(`Upload progress: ${progress.percentage}%`);
   });
   ```

3. **Test retrieval**:
   ```typescript
   import { getIncidentDocuments } from '@/lib/supabase/incident-documents';
   
   const documents = await getIncidentDocuments(incidentId);
   console.log('Documents:', documents);
   ```

## Storage Structure

Files are organized as:
```
incident-documents/
├── {incident_id}/
│   ├── 20250122_143022_abc123.pdf
│   ├── 20250122_143045_def456.jpg
│   └── 20250122_143112_ghi789.docx
```

Each file is named with:
- Timestamp (YYYYMMDD_HHMMSS)
- Random 8-character string
- Original file extension

This ensures unique file names and prevents collisions.