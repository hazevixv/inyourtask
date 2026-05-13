'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, Check, Move } from 'lucide-react';
import styles from './ImageCropper.module.css';

interface ImageCropperProps {
  imageSrc: string;
  onCrop: (blob: Blob) => void;
  onCancel: () => void;
  aspectRatio?: number; // default 1 (square)
  outputSize?: number;  // default 400px
}

export default function ImageCropper({
  imageSrc,
  onCrop,
  onCancel,
  aspectRatio = 1,
  outputSize = 400,
}: ImageCropperProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imgLoaded, setImgLoaded] = useState(false);
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });

  const CANVAS_SIZE = 320; // display canvas size

  // Load image
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
      // Fit image to canvas initially
      const fitScale = Math.max(CANVAS_SIZE / img.naturalWidth, CANVAS_SIZE / img.naturalHeight);
      setScale(fitScale);
      setOffset({ x: 0, y: 0 });
      setImgLoaded(true);
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // Draw canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !imgLoaded) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Draw image
    const drawW = img.naturalWidth * scale;
    const drawH = img.naturalHeight * scale;
    const x = (CANVAS_SIZE - drawW) / 2 + offset.x;
    const y = (CANVAS_SIZE - drawH) / 2 + offset.y;

    ctx.drawImage(img, x, y, drawW, drawH);

    // Draw overlay (darken outside circle)
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(CANVAS_SIZE / 2, CANVAS_SIZE / 2, CANVAS_SIZE / 2 - 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Draw circle border
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(CANVAS_SIZE / 2, CANVAS_SIZE / 2, CANVAS_SIZE / 2 - 4, 0, Math.PI * 2);
    ctx.stroke();

    // Update preview
    drawPreview();
  }, [scale, offset, imgLoaded]);

  const drawPreview = useCallback(() => {
    const preview = previewRef.current;
    const img = imgRef.current;
    if (!preview || !img || !imgLoaded) return;

    const ctx = preview.getContext('2d');
    if (!ctx) return;

    const pSize = 80;
    preview.width = pSize;
    preview.height = pSize;

    ctx.clearRect(0, 0, pSize, pSize);
    ctx.save();
    ctx.beginPath();
    ctx.arc(pSize / 2, pSize / 2, pSize / 2, 0, Math.PI * 2);
    ctx.clip();

    const drawW = img.naturalWidth * scale;
    const drawH = img.naturalHeight * scale;
    const x = (CANVAS_SIZE - drawW) / 2 + offset.x;
    const y = (CANVAS_SIZE - drawH) / 2 + offset.y;

    // Scale down to preview size
    const ratio = pSize / CANVAS_SIZE;
    ctx.drawImage(img, x * ratio, y * ratio, drawW * ratio, drawH * ratio);
    ctx.restore();
  }, [scale, offset, imgLoaded]);

  useEffect(() => {
    draw();
  }, [draw]);

  // Mouse/touch drag
  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    setDragging(true);
    const pos = 'touches' in e ? e.touches[0] : e;
    setDragStart({ x: pos.clientX - offset.x, y: pos.clientY - offset.y });
  };

  const handleMouseMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!dragging) return;
    const pos = 'touches' in e ? (e as TouchEvent).touches[0] : (e as MouseEvent);
    setOffset({
      x: pos.clientX - dragStart.x,
      y: pos.clientY - dragStart.y,
    });
  }, [dragging, dragStart]);

  const handleMouseUp = useCallback(() => setDragging(false), []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleMouseMove);
    window.addEventListener('touchend', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    setScale(s => Math.max(0.3, Math.min(5, s + delta)));
  };

  const handleZoomIn = () => setScale(s => Math.min(5, s + 0.1));
  const handleZoomOut = () => setScale(s => Math.max(0.3, s - 0.1));
  const handleReset = () => {
    const img = imgRef.current;
    if (!img) return;
    const fitScale = Math.max(CANVAS_SIZE / img.naturalWidth, CANVAS_SIZE / img.naturalHeight);
    setScale(fitScale);
    setOffset({ x: 0, y: 0 });
  };

  // Export cropped image
  const handleCrop = () => {
    const img = imgRef.current;
    if (!img) return;

    const output = document.createElement('canvas');
    output.width = outputSize;
    output.height = outputSize;
    const ctx = output.getContext('2d');
    if (!ctx) return;

    // Clip to circle
    ctx.save();
    ctx.beginPath();
    ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2);
    ctx.clip();

    // Draw image at output resolution
    const ratio = outputSize / CANVAS_SIZE;
    const drawW = img.naturalWidth * scale * ratio;
    const drawH = img.naturalHeight * scale * ratio;
    const x = (outputSize - drawW) / 2 + offset.x * ratio;
    const y = (outputSize - drawH) / 2 + offset.y * ratio;

    ctx.drawImage(img, x, y, drawW, drawH);
    ctx.restore();

    output.toBlob((blob) => {
      if (blob) onCrop(blob);
    }, 'image/jpeg', 0.9);
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <span className={styles.title}>Crop Photo</span>
          <button className={styles.closeBtn} onClick={onCancel}><X size={16} /></button>
        </div>

        <div className={styles.body}>
          {/* Canvas */}
          <div className={styles.canvasWrap} ref={containerRef}>
            <canvas
              ref={canvasRef}
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              className={styles.canvas}
              style={{ cursor: dragging ? 'grabbing' : 'grab' }}
              onMouseDown={handleMouseDown}
              onTouchStart={handleMouseDown}
              onWheel={handleWheel}
            />
            {!imgLoaded && (
              <div className={styles.canvasLoading}>Loading...</div>
            )}
          </div>

          {/* Controls */}
          <div className={styles.controls}>
            <div className={styles.controlGroup}>
              <button className={styles.controlBtn} onClick={handleZoomOut} title="Zoom out">
                <ZoomOut size={16} />
              </button>
              <input
                type="range"
                min="30"
                max="500"
                value={Math.round(scale * 100)}
                onChange={e => setScale(parseInt(e.target.value) / 100)}
                className={styles.slider}
              />
              <button className={styles.controlBtn} onClick={handleZoomIn} title="Zoom in">
                <ZoomIn size={16} />
              </button>
            </div>

            <div className={styles.controlHint}>
              <Move size={12} /> Drag to reposition · Scroll to zoom
            </div>

            <button className={styles.resetBtn} onClick={handleReset} title="Reset">
              <RotateCcw size={13} /> Reset
            </button>
          </div>

          {/* Preview */}
          <div className={styles.previewRow}>
            <span className={styles.previewLabel}>Preview:</span>
            <canvas ref={previewRef} width={80} height={80} className={styles.preview} />
          </div>
        </div>

        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onCancel}>Cancel</button>
          <button className={styles.cropBtn} onClick={handleCrop}>
            <Check size={15} /> Apply
          </button>
        </div>
      </div>
    </div>
  );
}
