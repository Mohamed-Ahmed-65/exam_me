import { useEffect, useRef, useState, useCallback } from 'react';

type TimerMode = 'work' | 'break';

export function useWebWorkerTimer(
  initialDuration: number, 
  onComplete?: () => void
) {
  const [timeLeft, setTimeLeft] = useState(initialDuration);
  const [isActive, setIsActive] = useState(false);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    // Initialize Worker
    workerRef.current = new Worker(new URL('../workers/timer.worker.ts', import.meta.url), { type: 'module' });

    workerRef.current.onmessage = (e) => {
      const { type, timeLeft: remaining } = e.data;
      
      switch (type) {
        case 'TICK':
          setTimeLeft(remaining);
          break;
        case 'COMPLETE':
          setIsActive(false);
          if (onComplete) onComplete();
          break;
      }
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, [onComplete]);

  const start = useCallback((duration?: number) => {
    if (!workerRef.current) return;
    setIsActive(true);
    // If starting fresh, allow passing custom duration (for mode changes)
    const timeToRun = duration !== undefined ? duration : timeLeft;
    workerRef.current.postMessage({ type: 'START', payload: { duration: timeToRun } });
  }, [timeLeft]);

  const pause = useCallback(() => {
    if (!workerRef.current) return;
    setIsActive(false);
    workerRef.current.postMessage({ type: 'PAUSE' });
  }, []);

  const reset = useCallback((newDuration: number) => {
    if (!workerRef.current) return;
    setIsActive(false);
    setTimeLeft(newDuration);
    workerRef.current.postMessage({ type: 'RESET' });
  }, []);

  return { timeLeft, isActive, start, pause, reset, setTimeLeft };
}
