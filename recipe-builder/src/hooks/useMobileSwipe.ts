import { useRef, useCallback } from "react";

/**
 * Hook for swipe gesture detection on touch devices.
 * Returns touch event handlers and a way to navigate between items.
 */
export default function useMobileSwipe(
  onSwipeLeft: () => void,
  onSwipeRight: () => void,
  minSwipeDistance = 50
) {
  const touchStartX = useRef<number | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (dx < -minSwipeDistance) {
      onSwipeLeft();
    } else if (dx > minSwipeDistance) {
      onSwipeRight();
    }
    touchStartX.current = null;
  }, [onSwipeLeft, onSwipeRight, minSwipeDistance]);

  return { handleTouchStart, handleTouchEnd };
}
