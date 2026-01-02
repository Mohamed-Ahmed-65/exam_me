import { useEffect, useRef, useState, useCallback } from 'react';

export function useWebWorkerTimer(
  initialDuration: number, 
  onComplete?: () => void
) {
  const [timeLeft, setTimeLeft] = useState(initialDuration);
  const [isActive, setIsActive] = useState(false);
  const endTimeRef = useRef<number | null>(null);

  useEffect(() => {
    let interval: number;

    if (isActive && endTimeRef.current) {
      interval = window.setInterval(() => {
        const now = Date.now();
        const remaining = Math.ceil((endTimeRef.current! - now) / 1000);
        
        if (remaining <= 0) {
          setTimeLeft(0);
          setIsActive(false);
          endTimeRef.current = null;
          if (onComplete) onComplete();
        } else {
          setTimeLeft(remaining);
        }
      }, 200);
    }

    return () => clearInterval(interval);
  }, [isActive, onComplete]);

  const start = useCallback((duration?: number) => {
    // If a specific duration is passed (e.g. switching modes), use it.
    // Otherwise use current timeLeft.
    const timeToRun = duration !== undefined ? duration : timeLeft;
    
    setTimeLeft(timeToRun); // Immediate UI update
    endTimeRef.current = Date.now() + timeToRun * 1000;
    setIsActive(true);
  }, [timeLeft]);

  const pause = useCallback(() => {
    setIsActive(false);
    endTimeRef.current = null;
  }, []);

  const reset = useCallback((newDuration: number) => {
    setIsActive(false);
    endTimeRef.current = null;
    setTimeLeft(newDuration);
  }, []);

  return { timeLeft, isActive, start, pause, reset, setTimeLeft };
}
