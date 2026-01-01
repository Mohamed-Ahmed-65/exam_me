// import { useState, useEffect } from 'react';
import { getExamsByStream } from '../data/exams';
import type { Stream, Exam } from '../data/exams';
import { ExamCard } from './ExamCard';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface ExamProgress {
  [examId: string]: {
    review: boolean;
    pastPapers: boolean;
    nightRevision: boolean;
  };
}

export default function ExamList({ stream, onOpenSubTasks }: { stream: Stream; onOpenSubTasks: (exam: Exam) => void }) {
  const [progress, setProgress] = useLocalStorage<ExamProgress>('exam-progress', {});
  const exams = getExamsByStream(stream);
  
  // Sorting exams by date
  const sortedExams = [...exams].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  // Determine current/next exam logic
  // Since we are in 2025 and exams are 2026, all are future.
  // But let's assume standard logic: first exam with date > now is "next".
  const now = new Date();
  const nextExamIndex = sortedExams.findIndex(e => new Date(e.date) > now);
  const nextExamId = nextExamIndex !== -1 ? sortedExams[nextExamIndex].id : null;

  const toggleProgress = (examId: string, type: keyof ExamProgress[string]) => {
    setProgress(prev => {
      const current = prev[examId] || { review: false, pastPapers: false, nightRevision: false };
      return {
        ...prev,
        [examId]: { ...current, [type]: !current[type] }
      };
    });
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto w-full">
      {sortedExams.map(exam => {
        const isPast = new Date(exam.date) < now;
        const isNext = exam.id === nextExamId;
        const examProgress = progress[exam.id] || { review: false, pastPapers: false, nightRevision: false };

        return (
          <ExamCard
            key={exam.id}
            exam={exam}
            progress={examProgress}
            onToggle={(type) => toggleProgress(exam.id, type)}
            onOpenSubTasks={() => onOpenSubTasks(exam)}
            isPast={isPast}
            isNext={isNext}
          />
        );
      })}
    </div>
  );
}
