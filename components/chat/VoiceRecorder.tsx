'use client';

import { useState, useRef, useEffect } from 'react';
import { Mic, Square, X, Loader2 } from 'lucide-react';
import styles from './VoiceMessage.module.css';

interface VoiceRecorderProps {
  onRecordComplete: (audioBlob: Blob, duration: number) => void;
  onCancel?: () => void;
}

export default function VoiceRecorder({ onRecordComplete, onCancel }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const finalDuration = Math.floor((Date.now() - startTimeRef.current) / 1000);
        onRecordComplete(blob, finalDuration);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      startTimeRef.current = Date.now();
      setDuration(0);

      // Update duration every second
      timerRef.current = setInterval(() => {
        setDuration(prev => {
          const newDuration = prev + 1;
          // Auto-stop at 5 minutes (300 seconds)
          if (newDuration >= 300) {
            stopRecording();
          }
          return newDuration;
        });
      }, 1000);

    } catch (err: any) {
      console.error('Error accessing microphone:', err);
      setError('Tidak dapat mengakses mikrofon. Pastikan izin mikrofon sudah diberikan.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      // Stop all tracks
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    
    if (onCancel) {
      onCancel();
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  if (error) {
    return (
      <div className={styles.voiceError}>
        <span>{error}</span>
        <button onClick={() => setError(null)} className={styles.errorClose}>
          <X size={14} />
        </button>
      </div>
    );
  }

  if (!isRecording) {
    return (
      <button onClick={startRecording} className={styles.voiceBtn} title="Record Voice Message">
        <Mic size={18} />
      </button>
    );
  }

  return (
    <div className={styles.voiceRecorder}>
      <div className={styles.recordingIndicator}>
        <div className={styles.recordingDot} />
        <span className={styles.recordingText}>Recording...</span>
      </div>
      
      <span className={styles.duration}>{formatDuration(duration)}</span>
      
      <div className={styles.recordingActions}>
        <button onClick={cancelRecording} className={styles.cancelBtn} title="Cancel">
          <X size={16} />
        </button>
        <button onClick={stopRecording} className={styles.stopBtn} title="Stop & Send">
          <Square size={16} />
        </button>
      </div>
    </div>
  );
}
