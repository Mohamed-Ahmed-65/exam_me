import type { Exam } from '../data/exams';
import { Calendar, CheckCircle2, ListTodo } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface ExamCardProps {
  exam: Exam;
  progress: { review: boolean; pastPapers: boolean; nightRevision: boolean };
  onToggle: (type: 'review' | 'pastPapers' | 'nightRevision') => void;
  onOpenSubTasks: () => void;
  isPast: boolean;
  isNext: boolean;
}

export function ExamCard({ exam, progress, onToggle, onOpenSubTasks, isPast, isNext }: ExamCardProps) {
  const date = new Date(exam.date).toLocaleDateString('ar-EG', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div
      className={twMerge(
        "relative p-6 rounded-2xl border transition-all duration-300",
        isPast 
          ? "bg-slate-900/50 border-slate-800 opacity-60 grayscale" 
          : "bg-slate-900 border-slate-700 hover:border-slate-600",
        isNext && "border-blue-500/50 shadow-[0_0_30px_-5px_rgba(59,130,246,0.2)] ring-1 ring-blue-500/20"
      )}
    >
      {isNext && (
        <div className="absolute -top-3 right-6 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
          القادم
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between gap-6">
        <div className="flex-1">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
            <Calendar className="w-4 h-4" />
            <span>{date}</span>
          </div>
          <div className="flex items-start justify-between gap-4">
            <h3 className="text-xl font-bold text-slate-100">{exam.subject}</h3>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenSubTasks();
              }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500 hover:text-white transition-all group shrink-0"
            >
              <ListTodo className="w-4 h-4" />
              <span className="text-xs font-bold">المهام</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <Checkbox 
            label="مراجعة المنهج" 
            checked={progress.review} 
            onChange={() => onToggle('review')}
            color="text-emerald-400"
          />
          <Checkbox 
            label="حل امتحانات" 
            checked={progress.pastPapers} 
            onChange={() => onToggle('pastPapers')}
            color="text-amber-400"
          />
          <Checkbox 
            label="ليلة الامتحان" 
            checked={progress.nightRevision} 
            onChange={() => onToggle('nightRevision')}
            color="text-purple-400"
          />
        </div>
      </div>
    </div>
  );
}

function Checkbox({ label, checked, onChange, color }: { label: string; checked: boolean; onChange: () => void; color: string }) {
  return (
    <button
      onClick={onChange}
      className={twMerge(
        "flex items-center gap-3 px-4 py-2 rounded-xl border transition-all duration-200",
        checked 
          ? "bg-slate-800 border-slate-600" 
          : "bg-transparent border-slate-800 hover:bg-slate-800/50"
      )}
    >
      <div className={twMerge(
        "w-5 h-5 rounded border flex items-center justify-center transition-colors",
        checked ? `bg-current border-current ${color}` : "border-slate-600"
      )}>
        {checked && <CheckCircle2 className="w-4 h-4 text-slate-900" />}
      </div>
      <span className={clsx("text-sm font-medium", checked ? "text-slate-200" : "text-slate-500")}>
        {label}
      </span>
    </button>
  );
}
