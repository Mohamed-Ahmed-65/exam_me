import { useState, useRef, useEffect } from 'react';
import { ArrowRight, Plus, CheckCircle2, Circle, Trash2, List, GripVertical, X, Edit2, Check, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import type { Exam } from '../data/exams';
import { twMerge } from 'tailwind-merge';

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface SubTask {
  id: string;
  text: string;
  completed: boolean;
  tagId?: string;
}

interface SubTasksViewProps {
  exam: Exam;
  onBack: () => void;
}

const TAG_COLORS = [
  'bg-blue-500', 'bg-purple-500', 'bg-rose-500', 'bg-emerald-500', 
  'bg-amber-500', 'bg-slate-500', 'bg-indigo-500', 'bg-pink-500'
];

export default function SubTasksView({ exam, onBack }: SubTasksViewProps) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<SubTask[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  const [newSubTask, setNewSubTask] = useState('');
  const [selectedTagId, setSelectedTagId] = useState<string | undefined>();
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  // Fetch data & Subscribe to changes
  useEffect(() => {
    if (user && exam) {
      const fetchData = async () => {
        try {
          const [tasksRes, tagsRes] = await Promise.all([
            supabase.from('exam_subtasks').select('*').eq('user_id', user.id).eq('exam_id', exam.id).order('created_at', { ascending: false }),
            supabase.from('tags').select('*').eq('user_id', user.id).eq('type', 'exam')
          ]);

          if (tasksRes.error) throw tasksRes.error;
          if (tagsRes.error) throw tagsRes.error;

          setTasks(tasksRes.data.map(t => ({
            id: t.id,
            text: t.text,
            completed: t.completed,
            tagId: t.tag_id
          })));

          setTags(tagsRes.data);
        } catch (err) {
          console.error('Error fetching subtasks:', err);
        } finally {
          setLoading(false);
        }
      };

      fetchData();

      // Realtime Subscriptions
      const tasksChannel = supabase
        .channel(`exam-subtasks-${exam.id}`)
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'exam_subtasks',
          filter: `exam_id=eq.${exam.id}` 
        }, (payload) => {
          if (payload.eventType === 'INSERT') {
            const newTask = {
              id: payload.new.id,
              text: payload.new.text,
              completed: payload.new.completed,
              tagId: payload.new.tag_id
            };
            setTasks(prev => {
              if (prev.find(t => t.id === newTask.id)) return prev;
              return [newTask, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            setTasks(prev => prev.map(t => t.id === payload.new.id ? {
              ...t,
              text: payload.new.text,
              completed: payload.new.completed,
              tagId: payload.new.tag_id
            } : t));
          } else if (payload.eventType === 'DELETE') {
            setTasks(prev => prev.filter(t => t.id !== payload.old.id));
          }
        })
        .subscribe();

      const tagsChannel = supabase
        .channel('exam-tags-sync')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'tags',
          filter: `user_id=eq.${user.id}`
        }, (payload) => {
          if (payload.eventType === 'INSERT') {
            setTags(prev => [...prev, payload.new as Tag]);
          } else if (payload.eventType === 'UPDATE') {
            setTags(prev => prev.map(t => t.id === payload.new.id ? payload.new as Tag : t));
          } else if (payload.eventType === 'DELETE') {
            setTags(prev => prev.filter(t => t.id !== payload.old.id));
          }
        })
        .subscribe();

      return () => {
        tasksChannel.unsubscribe();
        tagsChannel.unsubscribe();
      };
    }
  }, [user, exam]);

  const addSubTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubTask.trim() || !user) return;

    const tempId = crypto.randomUUID();
    const newTask: SubTask = {
      id: tempId,
      text: newSubTask.trim(),
      completed: false,
      tagId: selectedTagId
    };

    // Optimistic Update
    setTasks([newTask, ...tasks]);
    setNewSubTask('');

    const { data, error } = await supabase.from('exam_subtasks').insert({
      user_id: user.id,
      exam_id: exam.id,
      text: newTask.text,
      completed: false,
      tag_id: newTask.tagId
    }).select().single();

    if (error) {
      console.error('Error adding subtask:', error);
      setTasks(tasks.filter(t => t.id !== tempId));
    } else if (data) {
      setTasks(prev => prev.map(t => t.id === tempId ? { ...t, id: data.id } : t));
    }
  };

  const toggleTask = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const newStatus = !task.completed;
    setTasks(tasks.map(t => t.id === taskId ? { ...t, completed: newStatus } : t));

    const { error } = await supabase
      .from('exam_subtasks')
      .update({ completed: newStatus })
      .eq('id', taskId);

    if (error) {
      console.error('Error toggling subtask:', error);
      setTasks(tasks.map(t => t.id === taskId ? { ...t, completed: !newStatus } : t));
    }
  };

  const deleteTask = async (taskId: string) => {
    const backup = [...tasks];
    setTasks(tasks.filter(t => t.id !== taskId));

    const { error } = await supabase
      .from('exam_subtasks')
      .delete()
      .eq('id', taskId);

    if (error) {
      console.error('Error deleting subtask:', error);
      setTasks(backup);
    }
  };

  const startEditing = (task: SubTask) => {
    setEditingTaskId(task.id);
    setEditingText(task.text);
  };

  const saveEdit = async (taskId: string) => {
    const backupText = tasks.find(t => t.id === taskId)?.text || '';
    setTasks(tasks.map(t => t.id === taskId ? { ...t, text: editingText.trim() } : t));
    setEditingTaskId(null);

    const { error } = await supabase
      .from('exam_subtasks')
      .update({ text: editingText.trim() })
      .eq('id', taskId);

    if (error) {
      console.error('Error saving subtask edit:', error);
      setTasks(tasks.map(t => t.id === taskId ? { ...t, text: backupText } : t));
    }
  };

  const addTag = async () => {
    if (!newTagName.trim() || !user) return;
    
    const { data, error } = await supabase.from('tags').insert({
      user_id: user.id,
      name: newTagName.trim(),
      color: newTagColor,
      type: 'exam'
    }).select().single();

    if (error) {
      console.error('Error adding tag:', error);
      return;
    }

    if (data) {
      setTags([...tags, data]);
      setNewTagName('');
      setIsAddingTag(false);
    }
  };

  // Reordering logic
  const handleSort = () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    const _tasks = [...tasks];
    const draggedItemContent = _tasks.splice(dragItem.current, 1)[0];
    _tasks.splice(dragOverItem.current, 0, draggedItemContent);
    dragItem.current = null;
    dragOverItem.current = null;
    setTasks(_tasks);
  };

  const completedCount = tasks.filter(t => t.completed).length;
  const progress = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 pb-24">
      <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12 space-y-8 sm:space-y-12 animate-in slide-in-from-left duration-500">
        
        {/* Header */}
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-slate-900 rounded-full transition-colors text-slate-400 hover:text-white"
          >
            <ArrowRight className="w-6 h-6" />
          </button>
          <div>
            <div className="flex items-center gap-2 text-blue-500 text-sm font-medium mb-1">
              <List className="w-4 h-4" />
              <span>مهام المادة</span>
            </div>
            <h1 className="text-3xl font-bold text-slate-100">{exam.subject}</h1>
          </div>
        </div>

        {/* Progress Card */}
        <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl shadow-xl">
          <div className="flex justify-between items-end mb-4">
            <div>
              <p className="text-slate-400 text-sm">الإحصائيات</p>
              <h2 className="text-2xl font-bold text-white">
                {completedCount} من {tasks.length} مهام
              </h2>
            </div>
            <div className="text-right">
              <span className="text-3xl font-bold text-blue-500">{Math.round(progress)}%</span>
            </div>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 transition-all duration-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" 
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Add Input & Tag Selection */}
        <div className="space-y-4">
            <form onSubmit={addSubTask} className="relative group">
            <input
                type="text"
                value={newSubTask}
                onChange={(e) => setNewSubTask(e.target.value)}
                placeholder="أضف مهمة جديدة لهذه المادة..."
                className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 rounded-xl px-6 py-4 outline-none transition-all placeholder:text-slate-600 shadow-lg shadow-inner"
            />
            <button
                type="submit"
                className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors shadow-lg active:scale-95"
            >
                <Plus className="w-5 h-5" />
            </button>
            </form>

            {/* Tag Selection Row */}
            <div className="flex flex-wrap gap-2">
                {tags.map(tag => (
                    <button
                        key={tag.id}
                        type="button"
                        onClick={() => setSelectedTagId(selectedTagId === tag.id ? undefined : tag.id)}
                        className={twMerge(
                            "px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all border flex items-center gap-2",
                            selectedTagId === tag.id 
                            ? `${tag.color} text-white border-white/20 shadow-lg` 
                            : "bg-slate-900 text-slate-500 border-slate-800 hover:border-slate-700 shadow-sm"
                        )}
                    >
                        <div className={twMerge("w-1.5 h-1.5 rounded-full", tag.color, "bg-white/50")} />
                        {tag.name}
                    </button>
                ))}
                <button
                    onClick={() => setIsAddingTag(true)}
                    className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-slate-900/50 text-slate-500 border border-slate-800 border-dashed hover:border-slate-700"
                >
                    + تاغ جديد
                </button>
            </div>

            {/* Add Tag Modal-like */}
            {isAddingTag && (
                <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl animate-in zoom-in-95 duration-200 shadow-2xl">
                    <div className="flex justify-between mb-4">
                        <span className="text-xs font-bold text-slate-400">إنشاء تاغ جديد</span>
                        <button onClick={() => setIsAddingTag(false)}><X className="w-4 h-4 text-slate-500" /></button>
                    </div>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newTagName}
                            onChange={(e) => setNewTagName(e.target.value)}
                            placeholder="اسم التاغ..."
                            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm outline-none shadow-inner"
                        />
                        <button 
                            onClick={addTag}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-500 transition-all shadow-lg active:scale-95"
                        >
                            إضافة
                        </button>
                    </div>
                    <div className="flex gap-2 mt-4">
                        {TAG_COLORS.map(c => (
                            <button
                                key={c}
                                onClick={() => setNewTagColor(c)}
                                className={twMerge(
                                    "w-6 h-6 rounded-full border-2 transition-all",
                                    c,
                                    newTagColor === c ? "border-white scale-110 shadow-lg" : "border-transparent"
                                )}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>

        {/* Tasks List */}
        <div className="space-y-3">
          {tasks.length === 0 ? (
            <div className="text-center py-12 bg-slate-900/20 border border-dashed border-slate-800 rounded-2xl animate-in fade-in duration-500">
              <List className="w-12 h-12 text-slate-700 mx-auto mb-4" />
              <p className="text-slate-500">لا توجد مهام مضافة لهذه المادة بعد</p>
            </div>
          ) : (
            tasks.map((task, index) => {
              const taskTag = tags.find(t => t.id === task.tagId);
              const isEditing = editingTaskId === task.id;

              return (
                <div 
                  key={task.id}
                  draggable
                  onDragStart={() => (dragItem.current = index)}
                  onDragEnter={() => (dragOverItem.current = index)}
                  onDragEnd={handleSort}
                  onDragOver={(e) => e.preventDefault()}
                  className={twMerge(
                    "group flex items-center gap-4 p-4 rounded-xl border transition-all duration-300 cursor-grab active:cursor-grabbing",
                    task.completed 
                      ? "bg-slate-900/30 border-slate-800/50 opacity-60" 
                      : "bg-slate-900 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80 shadow-lg hover:shadow-blue-500/5"
                  )}
                >
                  <div className="text-slate-700 group-hover:text-slate-500 transition-colors shrink-0">
                    <GripVertical className="w-4 h-4" />
                  </div>

                  <button 
                    onClick={() => toggleTask(task.id)}
                    className={twMerge(
                      "transition-colors shrink-0",
                      task.completed ? "text-blue-500" : "text-slate-600 hover:text-slate-500"
                    )}
                  >
                    {task.completed ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                  </button>
                  
                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                        <div className="flex gap-2">
                             <input 
                                type="text"
                                autoFocus
                                value={editingText}
                                onChange={(e) => setEditingText(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && saveEdit(task.id)}
                                className="flex-1 bg-slate-950 border border-blue-500/50 rounded-lg px-2 py-1 text-sm outline-none text-slate-100 shadow-inner"
                             />
                             <button onClick={() => saveEdit(task.id)} className="p-1.5 bg-blue-600 rounded-lg text-white shadow-lg active:scale-95"><Check className="w-4 h-4" /></button>
                        </div>
                    ) : (
                        <>
                            <p 
                                onClick={() => startEditing(task)}
                                className={twMerge(
                                    "text-slate-200 transition-all truncate cursor-text hover:text-blue-400",
                                    task.completed && "line-through decoration-slate-600 text-slate-500"
                                )}
                            >
                                {task.text}
                            </p>
                            {taskTag && (
                                <div className="flex items-center gap-1.5 mt-1">
                                    <div className={twMerge("w-2 h-2 rounded-full", taskTag.color)} />
                                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{taskTag.name}</span>
                                </div>
                            )}
                        </>
                    )}
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                        onClick={() => startEditing(task)}
                        className="p-2 text-slate-600 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-all"
                    >
                        <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={() => deleteTask(task.id)}
                        className="p-2 text-slate-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
}
