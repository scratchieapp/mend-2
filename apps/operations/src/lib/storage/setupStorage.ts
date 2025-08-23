import { supabase } from '@/integrations/supabase/client';
import { errorLogger } from '@/lib/monitoring/errorLogger';

/**
 * Setup Supabase Storage buckets for the application
 * This should be run once during initial setup or via admin panel
 */
export async function setupStorageBuckets() {
  try {
    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      errorLogger.error('Failed to list storage buckets', listError);
      return { success: false, error: listError.message };
    }

    const bucketName = 'incident-documents';
    const bucketExists = buckets?.some(bucket => bucket.name === bucketName);

    if (!bucketExists) {
      // Create the bucket
      const { data, error: createError } = await supabase.storage.createBucket(bucketName, {
        public: false, // Private bucket - requires authentication
        fileSizeLimit: 20971520, // 20MB limit per file
        allowedMimeTypes: [
          'image/jpeg',
          'image/jpg', 
          'image/png',
          'image/gif',
          'image/webp',
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ]
      });

      if (createError) {
        errorLogger.error('Failed to create storage bucket', createError);
        return { success: false, error: createError.message };
      }

      errorLogger.info('Storage bucket created successfully', { bucketName });
    } else {
      errorLogger.info('Storage bucket already exists', { bucketName });
    }

    // Set up storage policies (RLS)
    // Note: These policies should be set up in the Supabase dashboard or via migrations
    // as they require admin privileges
    
    return { 
      success: true, 
      message: bucketExists ? 'Bucket already exists' : 'Bucket created successfully' 
    };

  } catch (error) {
    errorLogger.error('Storage setup failed', error instanceof Error ? error : new Error('Unknown error'));
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Storage setup failed' 
    };
  }
}

/**
 * Get a public URL for a file in storage
 */
export function getPublicUrl(bucketName: string, path: string) {
  const { data } = supabase.storage
    .from(bucketName)
    .getPublicUrl(path);
  
  return data.publicUrl;
}

/**
 * Download a file from storage
 */
export async function downloadFile(bucketName: string, path: string) {
  try {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .download(path);

    if (error) {
      errorLogger.error('Failed to download file', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    errorLogger.error('File download failed', error instanceof Error ? error : new Error('Unknown error'));
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Download failed' 
    };
  }
}

/**
 * Delete a file from storage
 */
export async function deleteFile(bucketName: string, path: string) {
  try {
    const { error } = await supabase.storage
      .from(bucketName)
      .remove([path]);

    if (error) {
      errorLogger.error('Failed to delete file', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    errorLogger.error('File deletion failed', error instanceof Error ? error : new Error('Unknown error'));
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Deletion failed' 
    };
  }
}

/**
 * List files in a folder
 */
export async function listFiles(bucketName: string, folder: string) {
  try {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .list(folder, {
        limit: 100,
        offset: 0
      });

    if (error) {
      errorLogger.error('Failed to list files', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    errorLogger.error('File listing failed', error instanceof Error ? error : new Error('Unknown error'));
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Listing failed' 
    };
  }
}