'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Paperclip, X, File, Image as ImageIcon, FileText, Loader2 } from 'lucide-react';
import styles from './FileAttachment.module.css';

interface FileUploaderProps {
  onUploadComplete: (files: UploadedFile[]) => void;
  onCancel?: () => void;
}

interface UploadedFile {
  fileUrl: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  thumbnail?: string;
}

export default function FileUploader({ onUploadComplete, onCancel }: FileUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    setError(null);
    
    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0];
      if (rejection.errors[0]?.code === 'file-too-large') {
        setError('File terlalu besar. Maksimal 50MB per file.');
      } else if (rejection.errors[0]?.code === 'file-invalid-type') {
        setError('Tipe file tidak didukung.');
      } else {
        setError('File tidak valid.');
      }
      return;
    }

    // Check total size
    const totalSize = acceptedFiles.reduce((sum, file) => sum + file.size, 0);
    if (totalSize > 100 * 1024 * 1024) {
      setError('Total ukuran file melebihi 100MB.');
      return;
    }

    setSelectedFiles(prev => [...prev, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize: 50 * 1024 * 1024, // 50MB
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-powerpoint': ['.ppt'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
      'text/plain': ['.txt'],
      'text/csv': ['.csv'],
      'application/json': ['.json'],
      'application/xml': ['.xml'],
      'application/zip': ['.zip'],
      'application/x-rar-compressed': ['.rar'],
      'application/x-7z-compressed': ['.7z']
    }
  });

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    if (selectedFiles.length === 0) return;
    
    setUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      selectedFiles.forEach(file => {
        formData.append('files', file);
      });

      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          setUploadProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          const data = JSON.parse(xhr.responseText);
          if (data.success) {
            onUploadComplete(data.files);
            setSelectedFiles([]);
          } else {
            setError(data.error || 'Upload gagal');
          }
        } else {
          setError('Upload gagal');
        }
        setUploading(false);
      });

      xhr.addEventListener('error', () => {
        setError('Upload gagal');
        setUploading(false);
      });

      xhr.open('POST', '/api/chat/upload');
      xhr.send(formData);

    } catch (err: any) {
      setError(err.message || 'Upload gagal');
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <ImageIcon size={20} />;
    if (file.type === 'application/pdf') return <FileText size={20} />;
    return <File size={20} />;
  };

  return (
    <div className={styles.fileUploader}>
      {selectedFiles.length === 0 ? (
        <div {...getRootProps()} className={`${styles.dropzone} ${isDragActive ? styles.dropzoneActive : ''}`}>
          <input {...getInputProps()} />
          <Paperclip size={32} className={styles.dropzoneIcon} />
          {isDragActive ? (
            <p>Drop files here...</p>
          ) : (
            <>
              <p>Drag & drop files here</p>
              <span>or click to browse</span>
              <small>Max 50MB per file, 100MB total</small>
            </>
          )}
        </div>
      ) : (
        <div className={styles.fileList}>
          <div className={styles.fileListHeader}>
            <span>{selectedFiles.length} file(s) selected</span>
            <button onClick={() => setSelectedFiles([])} className={styles.clearBtn}>
              Clear all
            </button>
          </div>
          
          {selectedFiles.map((file, index) => (
            <div key={index} className={styles.fileItem}>
              <div className={styles.fileIcon}>{getFileIcon(file)}</div>
              <div className={styles.fileInfo}>
                <span className={styles.fileName}>{file.name}</span>
                <span className={styles.fileSize}>{formatFileSize(file.size)}</span>
              </div>
              <button onClick={() => removeFile(index)} className={styles.removeBtn}>
                <X size={16} />
              </button>
            </div>
          ))}

          {uploading && (
            <div className={styles.uploadProgress}>
              <div className={styles.progressBar}>
                <div className={styles.progressFill} style={{ width: `${uploadProgress}%` }} />
              </div>
              <span className={styles.progressText}>{uploadProgress}%</span>
            </div>
          )}

          {error && (
            <div className={styles.uploadError}>
              {error}
              <button onClick={() => setError(null)} className={styles.errorClose}>
                <X size={14} />
              </button>
            </div>
          )}

          <div className={styles.uploadActions}>
            <button onClick={onCancel} className={styles.cancelBtn} disabled={uploading}>
              Cancel
            </button>
            <button onClick={uploadFiles} className={styles.uploadBtn} disabled={uploading}>
              {uploading ? (
                <>
                  <Loader2 size={16} className={styles.spinning} />
                  Uploading...
                </>
              ) : (
                'Upload & Send'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
