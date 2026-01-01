/* eslint-disable no-restricted-globals */
let intervalId: number | null = null;
let targetTime: number | null = null;

self.onmessage = (e: MessageEvent) => {
  const { type, payload } = e.data;

  switch (type) {
    case 'START':
        if (payload.targetTime) {
            targetTime = payload.targetTime;
        } else if (payload.duration) {
            targetTime = Date.now() + payload.duration * 1000;
        }
        
        if (intervalId) clearInterval(intervalId);
        
        intervalId = self.setInterval(() => {
            if (!targetTime) return;
            
            const now = Date.now();
            const timeLeft = Math.max(0, Math.ceil((targetTime - now) / 1000));
            
            self.postMessage({ type: 'TICK', timeLeft });
            
            if (timeLeft <= 0) {
                if (intervalId) clearInterval(intervalId);
                self.postMessage({ type: 'COMPLETE' });
            }
        }, 1000);
        break;

    case 'PAUSE':
        if (intervalId) clearInterval(intervalId);
        intervalId = null;
        targetTime = null;
        break;

    case 'RESET':
        if (intervalId) clearInterval(intervalId);
        intervalId = null;
        targetTime = null;
        break;
  }
};

export {};
