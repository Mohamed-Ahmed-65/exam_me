import { useState, useEffect } from 'react';
import { Timer, AlertTriangle } from 'lucide-react';
import type { Exam } from '../data/exams';

export default function CountdownTimer({ exams }: { exams: Exam[] }) {
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number } | null>(null);
  const [nextExam, setNextExam] = useState<Exam | null>(null);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      // Find the first exam in the future
      const futureExams = exams
        .filter(e => new Date(e.date) > now)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      if (futureExams.length === 0) {
        setTimeLeft(null);
        setNextExam(null);
        return;
      }

      const target = futureExams[0];
      setNextExam(target);

      const diff = new Date(target.date).getTime() - now.getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / 1000 / 60) % 60);

      setTimeLeft({ days, hours, minutes });
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 60000); // Update every minute is enough

    return () => clearInterval(interval);
  }, [exams]);

  if (!timeLeft || !nextExam) return null;

  const isUrgent = timeLeft.days === 0 && timeLeft.hours < 24;

  return (
    <div className={`relative overflow-hidden rounded-2xl p-6 border transition-all duration-500 ${isUrgent ? 'bg-red-500/10 border-red-500/50 animate-pulse-slow' : 'bg-blue-600/10 border-blue-500/30'}`}>
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
        <div className="text-center md:text-right">
          <div className="flex items-center gap-2 mb-2">
            {isUrgent ? <AlertTriangle className="text-red-500 w-5 h-5" /> : <Timer className="text-blue-400 w-5 h-5" />}
            <span className={`text-sm font-bold uppercase tracking-wider ${isUrgent ? 'text-red-400' : 'text-blue-400'}`}>
              الامتحان القادم
            </span>
          </div>
          <h2 className="text-2xl font-bold text-slate-100">{nextExam.subject}</h2>
        </div>

        <div className="flex gap-4 text-center">
          <TimeUnit value={timeLeft.days} label="يوم" urgent={isUrgent} />
          <div className={`text-4xl font-light -mt-2 ${isUrgent ? 'text-red-500/50' : 'text-blue-500/30'}`}>:</div>
          <TimeUnit value={timeLeft.hours} label="ساعة" urgent={isUrgent} />
          <div className={`text-4xl font-light -mt-2 ${isUrgent ? 'text-red-500/50' : 'text-blue-500/30'}`}>:</div>
          <TimeUnit value={timeLeft.minutes} label="دقيقة" urgent={isUrgent} />
        </div>
      </div>
    </div>
  );
}

function TimeUnit({ value, label, urgent }: { value: number; label: string; urgent: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <div className={`text-3xl font-bold font-mono ${urgent ? 'text-red-500' : 'text-blue-400'}`}>
        {value.toString().padStart(2, '0')}
      </div>
      <div className={`text-xs ${urgent ? 'text-red-400/70' : 'text-blue-400/70'}`}>{label}</div>
    </div>
  );
}
