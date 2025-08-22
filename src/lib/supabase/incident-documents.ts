import { supabase } from '@/integrations/supabase/client';

export interface IncidentDocument {
  id: string;
  incident_id: number;
  file_url: string;
  file_name: string;
  file_type: string;
  file_size: number;
  uploaded_by: string;
  uploaded_at: string;
  created_at: string;
  updated_at: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

/**
 * Upload a document for an incident
 */
export async function uploadIncidentDocument(
  incidentId: number,
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<IncidentDocument> {
  try {
    // Validate file
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      throw new Error('File size exceeds 50MB limit');
    }

    // Generate secure file path
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const randomString = Math.random().toString(36).substring(2, 10);
    const fileExt = file.name.split('.').pop() || '';
    const fileName = `${timestamp}_${randomString}.${fileExt}`;
    const filePath = `${incidentId}/${fileName}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('incident-documents')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        onUploadProgress: (progress) => {
          if (onProgress) {
            const percentage = Math.round((progress.loaded / progress.total) * 100);
            onProgress({
              loaded: progress.loaded,
              total: progress.total,
              percentage
            });
          }
        }
      });

    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      throw new Error(`Failed to upload file: ${uploadError.message}`);
    }

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from('incident-documents')
      .getPublicUrl(filePath);

    // Record in database using RPC function
    const { data: documentData, error: dbError } = await supabase
      .rpc('upload_incident_document', {
        p_incident_id: incidentId,
        p_file_name: file.name,
        p_file_type: file.type,
        p_file_size: file.size,
        p_file_url: urlData.publicUrl
      });

    if (dbError) {
      // If database insert fails, try to delete the uploaded file
      await supabase.storage
        .from('incident-documents')
        .remove([filePath]);
      
      console.error('Error recording document:', dbError);
      throw new Error(`Failed to record document: ${dbError.message}`);
    }

    // Fetch the complete document record
    const { data: document, error: fetchError } = await supabase
      .from('incident_documents')
      .select('*')
      .eq('id', documentData)
      .single();

    if (fetchError || !document) {
      throw new Error('Failed to fetch uploaded document details');
    }

    return document;
  } catch (error) {
    console.error('Error in uploadIncidentDocument:', error);
    throw error;
  }
}

/**
 * Get all documents for an incident
 */
export async function getIncidentDocuments(incidentId: number): Promise<IncidentDocument[]> {
  try {
    const { data, error } = await supabase
      .from('incident_documents')
      .select('*')
      .eq('incident_id', incidentId)
      .order('uploaded_at', { ascending: false });

    if (error) {
      console.error('Error fetching incident documents:', error);
      throw new Error(`Failed to fetch documents: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('Error in getIncidentDocuments:', error);
    throw error;
  }
}

/**
 * Delete a document
 */
export async function deleteIncidentDocument(documentId: string, filePath: string): Promise<void> {
  try {
    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('incident-documents')
      .remove([filePath]);

    if (storageError) {
      console.error('Error deleting file from storage:', storageError);
      // Continue to delete database record even if storage deletion fails
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('incident_documents')
      .delete()
      .eq('id', documentId);

    if (dbError) {
      console.error('Error deleting document record:', dbError);
      throw new Error(`Failed to delete document: ${dbError.message}`);
    }
  } catch (error) {
    console.error('Error in deleteIncidentDocument:', error);
    throw error;
  }
}

/**
 * Download a document
 */
export async function downloadIncidentDocument(filePath: string, fileName: string): Promise<void> {
  try {
    const { data, error } = await supabase.storage
      .from('incident-documents')
      .download(filePath);

    if (error) {
      console.error('Error downloading document:', error);
      throw new Error(`Failed to download document: ${error.message}`);
    }

    // Create a download link
    const url = URL.createObjectURL(data);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error in downloadIncidentDocument:', error);
    throw error;
  }
}

/**
 * Get a signed URL for temporary access to a document
 */
export async function getDocumentSignedUrl(filePath: string, expiresIn = 3600): Promise<string> {
  try {
    const { data, error } = await supabase.storage
      .from('incident-documents')
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      console.error('Error creating signed URL:', error);
      throw new Error(`Failed to create signed URL: ${error.message}`);
    }

    return data.signedUrl;
  } catch (error) {
    console.error('Error in getDocumentSignedUrl:', error);
    throw error;
  }
}

/**
 * Validate file type
 */
export function isValidFileType(file: File): boolean {
  const allowedTypes = [
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
  ];

  return allowedTypes.includes(file.type);
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}