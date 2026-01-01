import { useState, useEffect } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
import type { Stream, Exam } from './data/exams';
import StreamSelector from './components/StreamSelector';
import Dashboard from './components/Dashboard';
import SubTasksView from './components/SubTasksView';
import PomodoroTimer from './components/PomodoroTimer';

function App() {
  const [stream, setStream] = useLocalStorage<Stream | null>('selected-stream', null);
  const [activeView, setActiveView] = useState<'dashboard' | 'subtasks'>('dashboard');
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  if (!stream) {
    return <StreamSelector onSelect={(s) => setStream(s)} />;
  }

  // Handle case where old stream might be stored in localStorage
  if (stream !== 'scientific') {
    setStream(null);
    return null;
  }

  const handleOpenSubTasks = (exam: Exam) => {
    setSelectedExam(exam);
    setActiveView('subtasks');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToDashboard = () => {
    setActiveView('dashboard');
    setSelectedExam(null);
  };

  return (
    <>
      {activeView === 'subtasks' && selectedExam ? (
        <SubTasksView exam={selectedExam} onBack={handleBackToDashboard} />
      ) : (
        <Dashboard stream={stream} onOpenSubTasks={handleOpenSubTasks} />
      )}
      <PomodoroTimer />
    </>
  );
}

export default App;
