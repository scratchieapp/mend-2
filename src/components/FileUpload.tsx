import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Upload, 
  X, 
  File, 
  Image as ImageIcon, 
  FileText, 
  Trash2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { errorLogger } from '@/lib/monitoring/errorLogger';

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
  uploading?: boolean;
  progress?: number;
  error?: string;
}

interface FileUploadProps {
  onFilesChange?: (files: UploadedFile[]) => void;
  maxFiles?: number;
  maxSizeInMB?: number;
  acceptedFileTypes?: string[];
  bucketName?: string;
  folderPath?: string;
  disabled?: boolean;
}

const DEFAULT_ACCEPTED_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export function FileUpload({
  onFilesChange,
  maxFiles = 5,
  maxSizeInMB = 10,
  acceptedFileTypes = DEFAULT_ACCEPTED_TYPES,
  bucketName = 'incident-documents',
  folderPath = 'uploads',
  disabled = false,
}: FileUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <ImageIcon className="h-4 w-4" />;
    if (type === 'application/pdf') return <FileText className="h-4 w-4 text-red-500" />;
    return <File className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const validateFile = (file: File): string | null => {
    // Check file type
    if (!acceptedFileTypes.includes(file.type)) {
      const acceptedExtensions = acceptedFileTypes
        .map(type => type.split('/')[1])
        .join(', ');
      return `File type not accepted. Accepted types: ${acceptedExtensions}`;
    }

    // Check file size
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
    if (file.size > maxSizeInBytes) {
      return `File size exceeds ${maxSizeInMB}MB limit`;
    }

    return null;
  };

  const uploadToSupabase = async (file: File, fileId: string) => {
    try {
      // Update file status to uploading
      setFiles(prev => prev.map(f => 
        f.id === fileId ? { ...f, uploading: true, progress: 0 } : f
      ));

      // Generate unique file name
      const timestamp = Date.now();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileName = `${folderPath}/${timestamp}_${sanitizedName}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(fileName);

      // Update file with URL
      setFiles(prev => {
        const updated = prev.map(f => 
          f.id === fileId 
            ? { ...f, url: publicUrl, uploading: false, progress: 100 }
            : f
        );
        onFilesChange?.(updated.filter(f => f.url));
        return updated;
      });

      errorLogger.info('File uploaded successfully', {
        fileName,
        size: file.size,
        type: file.type,
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      
      errorLogger.error('File upload failed', error instanceof Error ? error : new Error(errorMessage), {
        fileName: file.name,
        size: file.size,
        type: file.type,
      });

      // Update file with error
      setFiles(prev => prev.map(f => 
        f.id === fileId 
          ? { ...f, uploading: false, error: errorMessage }
          : f
      ));
    }
  };

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || disabled) return;

    setUploadError(null);
    const newFiles: UploadedFile[] = [];
    const filesToUpload: { file: File; id: string }[] = [];

    // Check max files limit
    if (files.length + fileList.length > maxFiles) {
      setUploadError(`Maximum ${maxFiles} files allowed`);
      return;
    }

    // Process each file
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const validationError = validateFile(file);

      const fileId = `${Date.now()}-${i}`;
      
      if (validationError) {
        newFiles.push({
          id: fileId,
          name: file.name,
          size: file.size,
          type: file.type,
          error: validationError,
        });
      } else {
        newFiles.push({
          id: fileId,
          name: file.name,
          size: file.size,
          type: file.type,
          uploading: true,
          progress: 0,
        });
        filesToUpload.push({ file, id: fileId });
      }
    }

    setFiles(prev => [...prev, ...newFiles]);

    // Upload valid files
    for (const { file, id } of filesToUpload) {
      await uploadToSupabase(file, id);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const removeFile = async (fileId: string) => {
    const file = files.find(f => f.id === fileId);
    if (!file) return;

    // If file has URL, delete from storage
    if (file.url) {
      try {
        const path = file.url.split('/').pop();
        if (path) {
          await supabase.storage
            .from(bucketName)
            .remove([`${folderPath}/${path}`]);
        }
      } catch (error) {
        errorLogger.error('Failed to delete file from storage', error instanceof Error ? error : new Error('Delete failed'));
      }
    }

    setFiles(prev => {
      const updated = prev.filter(f => f.id !== fileId);
      onFilesChange?.(updated.filter(f => f.url));
      return updated;
    });
  };

  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload area */}
      <Card
        className={cn(
          'border-2 border-dashed transition-colors cursor-pointer',
          dragActive && 'border-primary bg-primary/5',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        onClick={handleClick}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <CardContent className="flex flex-col items-center justify-center py-8">
          <Upload className={cn('h-10 w-10 mb-4', dragActive ? 'text-primary' : 'text-muted-foreground')} />
          <p className="text-sm font-medium mb-1">
            {dragActive ? 'Drop files here' : 'Click to upload or drag and drop'}
          </p>
          <p className="text-xs text-muted-foreground">
            Max {maxFiles} files, up to {maxSizeInMB}MB each
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Accepted: Images, PDF, Word documents
          </p>
        </CardContent>
      </Card>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptedFileTypes.join(',')}
        onChange={(e) => handleFiles(e.target.files)}
        className="hidden"
        disabled={disabled}
      />

      {/* Error message */}
      {uploadError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{uploadError}</AlertDescription>
        </Alert>
      )}

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file) => (
            <Card key={file.id} className={cn(
              'p-3',
              file.error && 'border-destructive bg-destructive/5'
            )}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  {getFileIcon(file.type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {file.uploading && (
                    <div className="w-24">
                      <Progress value={file.progress || 0} className="h-2" />
                    </div>
                  )}
                  
                  {file.url && !file.uploading && (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                  
                  {file.error && (
                    <span className="text-xs text-destructive">{file.error}</span>
                  )}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(file.id);
                    }}
                    disabled={file.uploading}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}