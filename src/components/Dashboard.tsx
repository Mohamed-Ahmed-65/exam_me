import { getExamsByStream } from '../data/exams';
import type { Stream, Exam } from '../data/exams';
import DashboardHeader from './DashboardHeader';
import CountdownTimer from './CountdownTimer';
import ExamList from './ExamList';

interface DashboardProps {
  stream: Stream;
  onOpenSubTasks: (exam: Exam) => void;
}

export default function Dashboard({ stream, onOpenSubTasks }: DashboardProps) {
  const exams = getExamsByStream(stream);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 pb-24">
      <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12 space-y-8 sm:space-y-12 animate-in fade-in duration-700">
        
        {/* Header & Controls */}
        <div className="space-y-8">
            <DashboardHeader />
            <CountdownTimer exams={exams} />
        </div>

        {/* Main Content */}
        <main>
          <div className="flex items-center gap-4 mb-8">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-200 border-r-4 border-blue-500 pr-4">
              جدول الامتحانات
            </h2>
            <div className="h-px bg-slate-800/50 flex-1" />
          </div>
          
          <ExamList stream={stream} onOpenSubTasks={onOpenSubTasks} />
        </main>
      </div>
    </div>
  );
}
