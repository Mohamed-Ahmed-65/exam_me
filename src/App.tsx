import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import type { Stream, Exam } from './data/exams';
import StreamSelector from './components/StreamSelector';
import Dashboard from './components/Dashboard';
import SubTasksView from './components/SubTasksView';
import PomodoroTimer from './components/PomodoroTimer';
import Auth from './components/Auth';
import ThemeSelector from './components/ThemeSelector';
import TaskManager from './components/TaskManager';
import { useAuth } from './context/AuthContext';
import { LogOut, Loader2, Brain, X } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { AnimatePresence, motion } from 'framer-motion';

function App() {
  const { user, loading: authLoading, signOut } = useAuth();
  const [stream, setStream] = useState<Stream | null>(null);
  const [activeView, setActiveView] = useState<'dashboard' | 'subtasks'>('dashboard');
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [isBrainDumpOpen, setIsBrainDumpOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch or create profile and handle migration
  useEffect(() => {
    if (user && mounted) {
      const initProfileAndMigrate = async () => {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('selected_stream, theme_preference')
            .eq('id', user.id)
            .maybeSingle();

          if (error) throw error;

          if (!data) {
            // First time login - Perform Migration
            console.log('Performing one-time data migration...');
            
            // 1. Initialize profile
            await supabase.from('profiles').insert({ 
              id: user.id,
              country: user.user_metadata?.country || 'Unknown',
              theme_preference: localStorage.getItem('app-theme') || 'sapphire'
            });

            // 2. Migrate Tags
            const localExamTags = JSON.parse(localStorage.getItem('exam-shared-tags') || '[]');
            const localDumpTags = JSON.parse(localStorage.getItem('brain-dump-tags') || '[]');
            
            if (localExamTags.length || localDumpTags.length) {
              const allTags = [
                ...localExamTags.map((t: any) => ({ user_id: user.id, name: t.name, color: t.color, type: 'exam' })),
                ...localDumpTags.map((t: any) => ({ user_id: user.id, name: t.name, color: t.color, type: 'brain_dump' }))
              ];
              await supabase.from('tags').insert(allTags);
            }

            // 3. Migrate Brain Dump Tasks
            const localDumpTasks = JSON.parse(localStorage.getItem('brain-dump-tasks') || '[]');
            if (localDumpTasks.length) {
              await supabase.from('brain_dump_tasks').insert(
                localDumpTasks.map((t: any) => ({
                  user_id: user.id,
                  text: t.text,
                  completed: t.completed
                }))
              );
            }

            // 4. Migrate Subtasks
            const localSubtasks = JSON.parse(localStorage.getItem('exam-subtasks') || '{}');
            const subtaskEntries: any[] = [];
            Object.entries(localSubtasks).forEach(([examId, tasks]: [string, any]) => {
              (tasks as any[]).forEach((t: any) => {
                subtaskEntries.push({
                  user_id: user.id,
                  exam_id: examId,
                  text: t.text,
                  completed: t.completed
                });
              });
            });
            if (subtaskEntries.length) {
              await supabase.from('exam_subtasks').insert(subtaskEntries);
            }
            
            // 5. Migrate Exam Progress
            const localExamProgress = JSON.parse(localStorage.getItem('exam-progress') || '{}');
            const progressEntries: any[] = [];
            Object.entries(localExamProgress).forEach(([examId, data]: [string, any]) => {
              progressEntries.push({
                user_id: user.id,
                exam_id: examId,
                review: !!data.review,
                past_papers: !!data.pastPapers,
                night_revision: !!data.nightRevision
              });
            });
            if (progressEntries.length) {
              await supabase.from('exam_progress').insert(progressEntries);
            }
            
            setStream(null);
          } else {
            setStream(data.selected_stream as Stream);
            if (data.theme_preference) {
              localStorage.setItem('app-theme', data.theme_preference);
              if (data.theme_preference === 'sapphire') {
                document.documentElement.removeAttribute('data-theme');
              } else {
                document.documentElement.setAttribute('data-theme', data.theme_preference);
              }
            }
          }
        } catch (err) {
          console.error('Error in profile/migration init:', err);
        } finally {
          setProfileLoading(false);
        }
      };
      initProfileAndMigrate();
    } else if (!authLoading) {
      setProfileLoading(false);
    }
  }, [user, mounted, authLoading]);

  const handleStreamSelect = async (s: Stream) => {
    setStream(s);
    if (user) {
      await supabase.from('profiles').update({ selected_stream: s }).eq('id', user.id);
    }
  };

  if (!mounted || authLoading || (user && profileLoading)) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  if (!stream) {
    return <StreamSelector onSelect={handleStreamSelect} />;
  }

  if (stream !== 'scientific') {
    handleStreamSelect(null as any);
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col lg:flex-row-reverse">
      {/* Side Actions (Logout & Toggle) */}
      <div className="fixed top-4 left-4 z-50 flex gap-2">
        <button 
          onClick={() => signOut()}
          className="p-2 bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-xl text-slate-400 hover:text-white transition-all group shadow-xl"
          title="تسجيل الخروج"
        >
          <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
        </button>
        <button 
          onClick={() => setIsBrainDumpOpen(!isBrainDumpOpen)}
          className="lg:hidden p-2 bg-blue-600 border border-blue-500 rounded-xl text-white transition-all shadow-xl hover:bg-blue-500"
          title="افتح المسودة"
        >
          {isBrainDumpOpen ? <X className="w-5 h-5" /> : <Brain className="w-5 h-5" />}
        </button>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 w-full lg:pr-[350px] xl:pr-[400px]">
        {activeView === 'subtasks' && selectedExam ? (
          <SubTasksView 
            exam={selectedExam} 
            onBack={() => {
              setActiveView('dashboard');
              setSelectedExam(null);
            }} 
          />
        ) : (
          <Dashboard 
            stream={stream} 
            onOpenSubTasks={(exam) => {
              setSelectedExam(exam);
              setActiveView('subtasks');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }} 
          />
        )}
      </main>

      {/* Right Sidebar (Brain Dump) */}
      {/* Right Sidebar (Task Manager) */}
      <AnimatePresence mode="wait">
        {(isBrainDumpOpen || window.innerWidth >= 1024) && (
            <motion.aside 
                key="sidebar"
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className={twMerge(
                  "fixed inset-y-0 right-0 z-[150] w-[85%] sm:w-[50%] lg:w-[350px] xl:w-[400px] transition-transform duration-500 transform bg-slate-900 border-l border-slate-800 lg:translate-x-0",
                  isBrainDumpOpen ? "translate-x-0" : "translate-x-full"
                )}
            >
                <TaskManager />
            </motion.aside>
        )}
      </AnimatePresence>

      {/* Overlay for mobile Brain Dump */}
      <AnimatePresence>
        {isBrainDumpOpen && (
            <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[140] lg:hidden"
            onClick={() => setIsBrainDumpOpen(false)}
            />
        )}
      </AnimatePresence>

      <ThemeSelector />
      <PomodoroTimer />
    </div>
  );
}

export default App;
