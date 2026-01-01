import { useState, useEffect } from 'react';
import { getExamsByStream } from '../data/exams';
import type { Stream, Exam } from '../data/exams';
import { ExamCard } from './ExamCard';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

interface ExamProgress {
  [examId: string]: {
    review: boolean;
    pastPapers: boolean;
    nightRevision: boolean;
  };
}

export default function ExamList({ stream, onOpenSubTasks }: { stream: Stream; onOpenSubTasks: (exam: Exam) => void }) {
  const { user } = useAuth();
  const [progress, setProgress] = useState<ExamProgress>({});
  const [loading, setLoading] = useState(true);
  const exams = getExamsByStream(stream);
  
  // Sorting exams by date
  const sortedExams = [...exams].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  const now = new Date();
  const nextExamIndex = sortedExams.findIndex(e => new Date(e.date) > now);
  const nextExamId = nextExamIndex !== -1 ? sortedExams[nextExamIndex].id : null;

  useEffect(() => {
    if (user) {
      const fetchProgress = async () => {
        try {
          const { data, error } = await supabase
            .from('exam_progress')
            .select('*')
            .eq('user_id', user.id);

          if (error) throw error;

          const progressMap: ExamProgress = {};
          data.forEach(p => {
            progressMap[p.exam_id] = {
              review: p.review,
              pastPapers: p.past_papers,
              nightRevision: p.night_revision
            };
          });
          setProgress(progressMap);
        } catch (err) {
          console.error('Error fetching exam progress:', err);
        } finally {
          setLoading(false);
        }
      };

      fetchProgress();

      // Realtime subscription
      const channel = supabase
        .channel(`exam-progress-${user.id}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'exam_progress',
          filter: `user_id=eq.${user.id}`
        }, (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            setProgress(prev => ({
              ...prev,
              [payload.new.exam_id]: {
                review: payload.new.review,
                pastPapers: payload.new.past_papers,
                nightRevision: payload.new.night_revision
              }
            }));
          }
        })
        .subscribe();

      return () => {
        channel.unsubscribe();
      };
    }
  }, [user]);

  const toggleProgress = async (examId: string, type: 'review' | 'pastPapers' | 'nightRevision') => {
    if (!user) return;
    
    const dbField = (type === 'pastPapers' ? 'past_papers' : type === 'nightRevision' ? 'night_revision' : 'review') as string;
    const current = progress[examId] || { review: false, pastPapers: false, nightRevision: false };
    const newValue = !current[type];

    // Optimistic update
    setProgress(prev => ({
      ...prev,
      [examId]: { ...current, [type]: newValue }
    }));

    // Check if record exists for this exam manually to avoid upsert complexity if desired, 
    // but upsert with onConflict is cleaner.
    const { error } = await supabase
      .from('exam_progress')
      .upsert({
        user_id: user.id,
        exam_id: examId,
        [dbField]: newValue,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,exam_id' });

    if (error) {
      console.error('Error toggling exam progress:', error);
      // Revert on error
      setProgress(prev => ({
        ...prev,
        [examId]: { ...current, [type]: !newValue }
      }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

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
