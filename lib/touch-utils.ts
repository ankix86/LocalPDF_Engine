/**
 * Touch-first interaction utilities
 * Provides consistent touch handling across all PDF tools
 */

/**
 * Minimum touch target size (44x44px per WCAG guidelines)
 */
export const MIN_TOUCH_TARGET = 44;

/**
 * Prevents accidental page scroll while interacting with canvas/overlay
 */
export function preventScrollDuringTouch(element: HTMLElement | null) {
  if (!element) return () => {};

  const handler = (e: TouchEvent) => {
    // Only prevent if we're actively touching the element
    if (e.touches.length > 0) {
      e.preventDefault();
    }
  };

  element.addEventListener("touchmove", handler, { passive: false });
  
  return () => {
    element.removeEventListener("touchmove", handler);
  };
}

/**
 * Checks if device supports touch
 */
export function isTouchDevice(): boolean {
  if (typeof window === "undefined") return false;
  return (
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0 ||
    // @ts-ignore - legacy IE
    (navigator.msMaxTouchPoints && navigator.msMaxTouchPoints > 0)
  );
}

/**
 * Gets unified pointer position from mouse or touch event
 */
export function getPointerPosition(
  e: React.PointerEvent | PointerEvent | React.MouseEvent | MouseEvent | React.TouchEvent | TouchEvent
): { clientX: number; clientY: number } {
  if ("touches" in e && e.touches.length > 0) {
    return {
      clientX: e.touches[0].clientX,
      clientY: e.touches[0].clientY,
    };
  }
  return {
    clientX: (e as MouseEvent).clientX,
    clientY: (e as MouseEvent).clientY,
  };
}

/**
 * Calculates distance between two touch points (for pinch gestures)
 */
export function getTouchDistance(touch1: Touch, touch2: Touch): number {
  const dx = touch2.clientX - touch1.clientX;
  const dy = touch2.clientY - touch1.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Visual feedback helper - adds a subtle scale animation
 */
export function addTouchFeedback(element: HTMLElement | null) {
  if (!element) return;
  element.style.transform = "scale(0.98)";
  element.style.transition = "transform 0.1s ease-out";
  
  setTimeout(() => {
    element.style.transform = "scale(1)";
  }, 100);
}

/**
 * Debounces rapid touch events
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
