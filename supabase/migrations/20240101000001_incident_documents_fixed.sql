-- Drop existing table and policies if they exist (from failed migration)
DROP TABLE IF EXISTS public.incident_documents CASCADE;

-- Create incident_documents table to store file references
CREATE TABLE IF NOT EXISTS public.incident_documents (
  id SERIAL PRIMARY KEY,
  incident_id INTEGER NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  uploaded_by UUID, -- Changed from INTEGER to UUID to match users.user_id
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
CREATE INDEX idx_incident_documents_uploaded_by ON public.incident_documents(uploaded_by);

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

-- Policy: Authenticated users can insert documents
CREATE POLICY "Users can upload incident documents" ON public.incident_documents
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.user_id = auth.uid() -- No casting needed, both are UUID
    )
  );

-- Policy: Users can update their own uploaded documents
CREATE POLICY "Users can update their documents" ON public.incident_documents
  FOR UPDATE
  USING (uploaded_by = auth.uid()) -- No casting needed, both are UUID
  WITH CHECK (uploaded_by = auth.uid());

-- Policy: Admin users can delete documents
CREATE POLICY "Admins can delete documents" ON public.incident_documents
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.user_id = auth.uid() -- No casting needed, both are UUID
      AND u.role_id IN (1, 2, 3) -- Super Admin, Account Manager, Administrator
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

-- Create notifications table for the notification system
CREATE TABLE IF NOT EXISTS public.notifications (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'info', -- info, warning, error, success
  read BOOLEAN DEFAULT FALSE,
  metadata JSONB, -- Store additional data like incident_id, document_id, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Foreign key constraint
  CONSTRAINT fk_notification_user
    FOREIGN KEY (user_id)
    REFERENCES public.users(user_id)
    ON DELETE CASCADE
);

-- Create indexes for notifications (if they don't exist)
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);

-- Enable Row Level Security for notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admins can create notifications" ON public.notifications;

-- Users can only see their own notifications
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications" ON public.notifications
  FOR DELETE
  USING (user_id = auth.uid());

-- Only system/admin can insert notifications (typically done through service role)
-- This policy allows admins to create notifications for users
CREATE POLICY "Admins can create notifications" ON public.notifications
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.user_id = auth.uid()
      AND u.role_id IN (1, 2, 3) -- Super Admin, Account Manager, Administrator
    )
  );

-- Create function to update notifications updated_at timestamp
CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for notifications updated_at
DROP TRIGGER IF EXISTS update_notifications_updated_at_trigger ON public.notifications;
CREATE TRIGGER update_notifications_updated_at_trigger
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_notifications_updated_at();

-- Create function to create notifications (can be called from other triggers or functions)
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_type VARCHAR(50) DEFAULT 'info',
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, metadata)
  VALUES (p_user_id, p_title, p_message, p_type, p_metadata)
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the notification function to authenticated users
GRANT EXECUTE ON FUNCTION create_notification TO authenticated;

-- Add comment documentation
COMMENT ON TABLE public.incident_documents IS 'Stores file attachments and documents related to incidents';
COMMENT ON COLUMN public.incident_documents.uploaded_by IS 'UUID of the user who uploaded the document';
COMMENT ON TABLE public.notifications IS 'Stores user notifications for various system events';
COMMENT ON COLUMN public.notifications.metadata IS 'JSON data containing additional context like incident_id, document_id, etc.';