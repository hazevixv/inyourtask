import { useEffect, useRef, useState } from 'react';

/**
 * Smart Scroll Hook - Prevents auto-scroll when user is interacting
 * 
 * Usage:
 * const { containerRef, endRef, scrollToBottom, showScrollButton } = useSmartScroll(items);
 * 
 * Features:
 * - Detects user interaction (scroll, wheel, touch)
 * - Only auto-scrolls when user is at bottom
 * - Pauses auto-scroll during user interaction
 * - Shows scroll-to-bottom button when needed
 */
export function useSmartScroll<T>(
  items: T[], 
  options: {
    threshold?: number; // Distance from bottom to consider "at bottom" (default: 150px)
    interactionDelay?: number; // Time to wait after interaction before resuming auto-scroll (default: 2000ms)
    autoScrollOnNewItem?: boolean; // Auto-scroll only when new item added (default: true)
  } = {}
) {
  const {
    threshold = 150,
    interactionDelay = 2000,
    autoScrollOnNewItem = true,
  } = options;

  const containerRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const isUserInteractingRef = useRef(false);
  const lastItemCountRef = useRef(0);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Auto-scroll logic
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const isAtBottom = () => {
      return container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
    };

    const atBottom = isAtBottom();
    const newItemAdded = items.length > lastItemCountRef.current;
    const shouldAutoScroll = autoScrollOnNewItem ? newItemAdded : true;

    // Only auto-scroll if user is at bottom, not interacting, and conditions met
    if (atBottom && !isUserInteractingRef.current && shouldAutoScroll) {
      setTimeout(() => {
        if (!isUserInteractingRef.current) {
          endRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }

    lastItemCountRef.current = items.length;
    setShowScrollButton(!atBottom && items.length > 0);
  }, [items, threshold, autoScrollOnNewItem]);

  // User interaction detection
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let interactionTimeout: NodeJS.Timeout;

    const markInteracting = () => {
      isUserInteractingRef.current = true;
      clearTimeout(interactionTimeout);
      interactionTimeout = setTimeout(() => {
        isUserInteractingRef.current = false;
      }, interactionDelay);
    };

    const handleScroll = () => {
      markInteracting();
      const atBottom = container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
      setShowScrollButton(!atBottom && items.length > 0);
    };

    const handleWheel = () => markInteracting();
    const handleTouchStart = () => markInteracting();
    const handleTouchEnd = () => markInteracting();

    container.addEventListener('scroll', handleScroll);
    container.addEventListener('wheel', handleWheel, { passive: true });
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('scroll', handleScroll);
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchend', handleTouchEnd);
      clearTimeout(interactionTimeout);
    };
  }, [items.length, threshold, interactionDelay]);

  const scrollToBottom = () => {
    isUserInteractingRef.current = false;
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const isUserInteracting = () => isUserInteractingRef.current;

  return {
    containerRef,
    endRef,
    scrollToBottom,
    showScrollButton,
    isUserInteracting,
  };
}
