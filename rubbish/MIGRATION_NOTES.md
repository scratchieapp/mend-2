# Supabase Migration Notes

## Database Schema Summary

### Key Tables and Data Types

#### Users Table
- **user_id**: UUID (string) - Primary key, matches Supabase Auth uid
- **email**: string | null
- **role_id**: integer | null - References user_roles table
- **employer_id**: string | null
- **site_id**: string | null

#### Incidents Table
- **incident_id**: integer - Primary key (SERIAL)
- **worker_id**: integer | null
- **employer_id**: integer | null
- **site_id**: integer | null

#### User Roles Table
- **role_id**: integer - Primary key
- **role_name**: string
- **role_label**: string

### Authentication System
This project uses **Supabase Auth**, not Clerk. Key points:
- `auth.uid()` returns a UUID that matches `users.user_id`
- No casting is needed when comparing auth.uid() to user_id
- RLS policies should use `auth.uid()` directly without type casting

### Common Migration Issues and Solutions

#### Issue 1: Foreign Key Type Mismatch
**Problem**: Trying to create a foreign key between columns of different types (e.g., INTEGER referencing UUID)
**Solution**: Ensure foreign key columns have the same data type as the referenced column

#### Issue 2: Incorrect auth.uid() Usage
**Problem**: Casting auth.uid() to INTEGER when it returns UUID
**Solution**: Use auth.uid() directly without casting when comparing to UUID columns

### Best Practices for New Migrations

1. **Always check existing table structures** before creating foreign keys:
   ```sql
   -- Check column types in Supabase Dashboard or use:
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'your_table';
   ```

2. **Use proper data types for user references**:
   ```sql
   -- Correct: Reference to users table
   user_id UUID REFERENCES public.users(user_id)
   
   -- Incorrect: Using INTEGER for user reference
   user_id INTEGER REFERENCES public.users(user_id)
   ```

3. **RLS Policies with Supabase Auth**:
   ```sql
   -- Correct: Direct comparison with UUID
   CREATE POLICY "Users can view own data" ON table_name
     FOR SELECT
     USING (user_id = auth.uid());
   
   -- Incorrect: Casting UUID to INTEGER
   CREATE POLICY "Users can view own data" ON table_name
     FOR SELECT
     USING (user_id = auth.uid()::INTEGER);
   ```

4. **Always include rollback strategy**:
   ```sql
   -- At the start of migration for cleanup if needed
   DROP TABLE IF EXISTS table_name CASCADE;
   ```

5. **Add indexes for foreign keys and commonly queried columns**:
   ```sql
   CREATE INDEX idx_table_user_id ON table_name(user_id);
   CREATE INDEX idx_table_created_at ON table_name(created_at);
   ```

## Migration Files

### Active Migrations
- `20240101000001_incident_documents_fixed.sql` - Corrected version with proper UUID types

### Deprecated Migrations
- `20240101000000_incident_documents.sql` - Has type mismatches, do not run

## Running Migrations

1. **Local Development**:
   ```bash
   supabase db push
   ```

2. **Production**:
   - Use Supabase Dashboard SQL Editor
   - Or use Supabase CLI with production credentials

## Troubleshooting

If you encounter foreign key constraint errors:
1. Check the data types of both columns involved
2. Verify that the referenced table and column exist
3. Ensure the referenced column has a unique constraint or is a primary key
4. Check that existing data doesn't violate the constraint