# Database Migration Instructions

## Important: Use the Corrected Migration

⚠️ **DO NOT RUN**: `20240101000000_incident_documents.sql` (has errors)
✅ **RUN THIS**: `20240101000001_incident_documents_fixed.sql`

## Issues Fixed in the New Migration

### 1. UUID vs Integer Type Mismatch
- **Problem**: The original migration used INTEGER for `uploaded_by`, but Supabase Auth uses UUID for user IDs
- **Solution**: Changed `uploaded_by` to UUID type to match `users.user_id`

### 2. Auth System Compatibility
- **Problem**: Incorrect casting of `auth.uid()::INTEGER` 
- **Solution**: Removed all INTEGER casting since `auth.uid()` returns UUID

### 3. Added Notifications Table
- **Problem**: Notification system referenced a table that didn't exist
- **Solution**: Created comprehensive notifications table with proper structure

## How to Run the Migration

1. Open your Supabase Dashboard
2. Navigate to SQL Editor
3. Copy the contents of `/supabase/migrations/20240101000001_incident_documents_fixed.sql`
4. Paste and execute in SQL Editor
5. Verify tables are created:
   - `incident_documents`
   - `notifications`

## What the Migration Creates

### incident_documents table
- Stores file references for incident documentation
- Links to Supabase Storage
- Tracks who uploaded files and when
- Foreign keys to incidents and users tables

### notifications table  
- Stores notification records
- Supports different notification types (info, warning, error, success)
- JSONB metadata for flexible data storage
- Read/unread status tracking

### Row Level Security (RLS)
- Users can view documents for incidents they have access to
- Authenticated users can upload documents
- Users can update their own documents
- Admins can delete any documents
- Users can only see their own notifications

## Storage Setup

After running the migration, also set up Supabase Storage:

1. Navigate to `/admin/storage-setup` in your application
2. Click "Setup Storage Buckets" 
3. Configure storage policies in Supabase Dashboard:
   - Go to Storage → Policies
   - Select "incident-documents" bucket
   - Add appropriate access policies

## Verification

Run these queries to verify the migration succeeded:

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('incident_documents', 'notifications');

-- Check foreign keys
SELECT
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name IN ('incident_documents', 'notifications');

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('incident_documents', 'notifications');
```

## Common Issues and Solutions

### Issue: "relation already exists"
**Solution**: The migration includes DROP TABLE IF EXISTS, but if you need to reset:
```sql
DROP TABLE IF EXISTS public.incident_documents CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
```
Then run the migration again.

### Issue: "permission denied"
**Solution**: Make sure you're running the migration as a database admin user.

### Issue: Storage bucket not accessible
**Solution**: 
1. Create the bucket manually in Supabase Storage
2. Set it to private (not public)
3. Configure RLS policies for the bucket

## Next Steps

1. ✅ Run the corrected migration
2. ✅ Set up storage buckets
3. ✅ Test file uploads in the incident report form
4. ✅ Verify notifications are being created
5. 🔄 Configure email service for actual notification delivery (SendGrid, AWS SES, etc.)