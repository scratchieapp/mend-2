import { supabase } from '@/integrations/supabase/client';
import { errorLogger } from '@/lib/monitoring/errorLogger';

interface DocumentData {
  url: string;
  name: string;
  type: string;
  size: number;
}

/**
 * Save document references to the database
 */
export async function saveIncidentDocuments(
  incidentId: number, 
  documents: DocumentData[]
): Promise<{ success: boolean; error?: string }> {
  if (!documents || documents.length === 0) {
    return { success: true };
  }

  try {
    // Get current user ID
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      errorLogger.error('Failed to get user for document upload', authError);
      return { success: false, error: 'Authentication required' };
    }

    // Prepare document records
    const documentRecords = documents.map(doc => ({
      incident_id: incidentId,
      file_url: doc.url,
      file_name: doc.name,
      file_type: doc.type,
      file_size: doc.size,
      uploaded_by: user.id, // Use UUID directly, no conversion needed
    }));

    // Insert document records
    const { error } = await supabase
      .from('incident_documents')
      .insert(documentRecords);

    if (error) {
      errorLogger.error('Failed to save document references', error, {
        incidentId,
        documentCount: documents.length,
      });
      return { 
        success: false, 
        error: `Failed to save document references: ${error.message}` 
      };
    }

    errorLogger.info('Document references saved successfully', {
      incidentId,
      documentCount: documents.length,
    });

    return { success: true };

  } catch (error) {
    errorLogger.error('Error saving incident documents', 
      error instanceof Error ? error : new Error('Unknown error'), 
      { incidentId, documentCount: documents.length }
    );
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to save documents' 
    };
  }
}

/**
 * Get documents for an incident
 */
export async function getIncidentDocuments(incidentId: number) {
  try {
    const { data, error } = await supabase
      .from('incident_documents')
      .select('*')
      .eq('incident_id', incidentId)
      .order('uploaded_at', { ascending: false });

    if (error) {
      errorLogger.error('Failed to fetch incident documents', error, { incidentId });
      return { success: false, error: error.message };
    }

    return { success: true, data };

  } catch (error) {
    errorLogger.error('Error fetching incident documents', 
      error instanceof Error ? error : new Error('Unknown error'), 
      { incidentId }
    );
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch documents' 
    };
  }
}

/**
 * Delete a document reference and optionally the file from storage
 */
export async function deleteIncidentDocument(
  documentId: number, 
  fileUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Delete from database
    const { error: dbError } = await supabase
      .from('incident_documents')
      .delete()
      .eq('id', documentId);

    if (dbError) {
      errorLogger.error('Failed to delete document reference', dbError, { documentId });
      return { success: false, error: dbError.message };
    }

    // Extract file path from URL for storage deletion
    // The URL format is typically: https://[project].supabase.co/storage/v1/object/public/[bucket]/[path]
    const urlParts = fileUrl.split('/storage/v1/object/public/incident-documents/');
    if (urlParts.length === 2) {
      const filePath = urlParts[1];
      
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('incident-documents')
        .remove([filePath]);

      if (storageError) {
        errorLogger.warn('Failed to delete file from storage', storageError, { 
          documentId, 
          filePath 
        });
        // Don't fail the operation if storage deletion fails
        // The database reference is already deleted
      }
    }

    errorLogger.info('Document deleted successfully', { documentId });
    return { success: true };

  } catch (error) {
    errorLogger.error('Error deleting document', 
      error instanceof Error ? error : new Error('Unknown error'), 
      { documentId }
    );
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to delete document' 
    };
  }
}