'use client';

import { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';
import styles from './VoiceMessage.module.css';

interface VoicePlayerProps {
  audioUrl: string;
  duration: number;
}

export default function VoicePlayer({ audioUrl, duration }: VoicePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  
  const audioRef = useRef<HTMLAudioElement>(null);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (audioRef.current) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = x / rect.width;
      const newTime = percentage * duration;
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const cyclePlaybackRate = () => {
    const rates = [1, 1.5, 2, 0.5];
    const currentIndex = rates.indexOf(playbackRate);
    const nextRate = rates[(currentIndex + 1) % rates.length];
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.addEventListener('timeupdate', handleTimeUpdate);
      audio.addEventListener('ended', handleEnded);
      
      return () => {
        audio.removeEventListener('timeupdate', handleTimeUpdate);
        audio.removeEventListener('ended', handleEnded);
      };
    }
  }, []);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={styles.voicePlayer}>
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      
      <button onClick={togglePlay} className={styles.playBtn}>
        {isPlaying ? <Pause size={16} /> : <Play size={16} />}
      </button>
      
      <div className={styles.waveformContainer} onClick={handleSeek}>
        <div className={styles.waveform}>
          <div className={styles.waveformProgress} style={{ width: `${progress}%` }} />
        </div>
        <div className={styles.timeDisplay}>
          <span className={styles.currentTime}>{formatTime(currentTime)}</span>
          <span className={styles.totalTime}>{formatTime(duration)}</span>
        </div>
      </div>
      
      <button onClick={cyclePlaybackRate} className={styles.speedBtn} title="Playback Speed">
        {playbackRate}x
      </button>
    </div>
  );
}
