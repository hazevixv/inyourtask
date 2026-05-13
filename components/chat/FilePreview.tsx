'use client';

import { useState } from 'react';
import { Download, File, FileText, Image as ImageIcon, X, ZoomIn } from 'lucide-react';
import styles from './FileAttachment.module.css';

interface FilePreviewProps {
  attachments: Attachment[];
}

interface Attachment {
  fileUrl: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  thumbnail?: string;
}

export default function FilePreview({ attachments }: FilePreviewProps) {
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <ImageIcon size={20} />;
    if (type === 'application/pdf') return <FileText size={20} />;
    return <File size={20} />;
  };

  const isImage = (type: string) => type.startsWith('image/');

  return (
    <>
      <div className={styles.filePreview}>
        {attachments.map((att, idx) => (
          <div key={idx} className={styles.attachmentItem}>
            {isImage(att.fileType) ? (
              <div className={styles.imagePreview}>
                <img src={att.fileUrl} alt={att.fileName} />
                <button 
                  className={styles.zoomBtn}
                  onClick={() => setLightboxImage(att.fileUrl)}
                  title="View full size"
                >
                  <ZoomIn size={16} />
                </button>
              </div>
            ) : (
              <div className={styles.fileIcon}>
                {getFileIcon(att.fileType)}
              </div>
            )}
            
            <div className={styles.attachmentInfo}>
              <span className={styles.attachmentName}>{att.fileName}</span>
              <span className={styles.attachmentSize}>{formatFileSize(att.fileSize)}</span>
            </div>
            
            <a 
              href={att.fileUrl} 
              download={att.fileName}
              className={styles.downloadBtn}
              title="Download"
            >
              <Download size={16} />
            </a>
          </div>
        ))}
      </div>

      {/* Lightbox for images */}
      {lightboxImage && (
        <div className={styles.lightbox} onClick={() => setLightboxImage(null)}>
          <button className={styles.lightboxClose} onClick={() => setLightboxImage(null)}>
            <X size={24} />
          </button>
          <img src={lightboxImage} alt="Full size" className={styles.lightboxImage} />
        </div>
      )}
    </>
  );
}
