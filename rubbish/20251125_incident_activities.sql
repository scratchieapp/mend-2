-- Migration: Create incident_activities table for tracking activity log
-- This table stores all activities related to incidents: calls, appointments, notes, edits, etc.

-- Create the incident_activities table
CREATE TABLE IF NOT EXISTS public.incident_activities (
    id SERIAL PRIMARY KEY,
    incident_id INTEGER NOT NULL REFERENCES public.incidents(incident_id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('call', 'appointment', 'note', 'voice_agent', 'edit')),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    created_by VARCHAR(255) NOT NULL, -- User display name or email
    created_by_user_id VARCHAR(255), -- Optional reference to user_id
    metadata JSONB DEFAULT '{}'::jsonb -- For storing extra data like field changes, appointment dates, etc.
);

-- Create index for faster lookups by incident
CREATE INDEX IF NOT EXISTS idx_incident_activities_incident_id 
ON public.incident_activities(incident_id);

-- Create index for sorting by creation time
CREATE INDEX IF NOT EXISTS idx_incident_activities_created_at 
ON public.incident_activities(created_at DESC);

-- Enable RLS
ALTER TABLE public.incident_activities ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Allow authenticated users to read activities for incidents they can access
CREATE POLICY "Users can read incident activities" 
ON public.incident_activities 
FOR SELECT 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.incidents i 
        WHERE i.incident_id = incident_activities.incident_id
    )
);

-- Allow authenticated users to insert activities
CREATE POLICY "Users can insert incident activities" 
ON public.incident_activities 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Allow users to update their own activities
CREATE POLICY "Users can update own activities" 
ON public.incident_activities 
FOR UPDATE 
TO authenticated 
USING (created_by_user_id = auth.uid()::text OR created_by_user_id IS NULL);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.incident_activities TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.incident_activities_id_seq TO authenticated;

-- Add comment for documentation
COMMENT ON TABLE public.incident_activities IS 'Stores activity log entries for incidents including calls, notes, appointments, edits, and voice agent interactions';
COMMENT ON COLUMN public.incident_activities.type IS 'Type of activity: call, appointment, note, voice_agent, or edit';
COMMENT ON COLUMN public.incident_activities.metadata IS 'JSON object containing additional data like field changes for edits, appointment dates, etc.';

