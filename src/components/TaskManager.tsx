import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Flag, Trash2, CheckCircle2, 
  Clock, Check, X, ArrowUp, Pencil
} from 'lucide-react';
import CustomDatePicker from './CustomDatePicker';
import { format, isToday, isPast } from 'date-fns';
import { arEG } from 'date-fns/locale';
import { twMerge } from 'tailwind-merge';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

type Priority = 'low' | 'medium' | 'high';
type Status = 'todo' | 'in_progress' | 'done';

interface Task {
  id: string;
  text: string;
  description?: string;
  priority: Priority;
  due_date?: string;
  status: Status;
  completed: boolean; // Keep for backward compatibility
  tags?: string[];
}

const PRIORITIES: { [key in Priority]: { color: string, label: string, icon: any } } = {
  high: { color: 'text-rose-500 bg-rose-500/10 border-rose-500/20', label: 'عالية', icon: Flag },
  medium: { color: 'text-amber-500 bg-amber-500/10 border-amber-500/20', label: 'متوسطة', icon: Flag },
  low: { color: 'text-blue-500 bg-blue-500/10 border-blue-500/20', label: 'منخفضة', icon: Flag },
};

export default function TaskManager({ onClose }: { onClose?: () => void }) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<'all' | 'today' | 'upcoming' | 'high'>('all');
  const [newTaskText, setNewTaskText] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  
  // New Task State
  const [newPriority, setNewPriority] = useState<Priority>('medium');
  const [newDueDate, setNewDueDate] = useState<string>('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Editing State
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editPriority, setEditPriority] = useState<Priority>('medium');
  const [editDueDate, setEditDueDate] = useState('');
  const [editShowDatePicker, setEditShowDatePicker] = useState(false);

  // Fetch Tasks
  useEffect(() => {
    if (!user) return;

    // Fetch initial data
    const fetchTasks = async () => {
      const { data } = await supabase
        .from('brain_dump_tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (data) {
        // Map old data to new structure if fields act missing
        const mapped: Task[] = data.map((t: any) => ({
          ...t,
          priority: t.priority || 'medium',
          status: t.status || (t.completed ? 'done' : 'todo'),
          due_date: t.due_date
        }));
        setTasks(mapped);
      }
    };
    fetchTasks();

    // Realtime Subs
    const channel = supabase
      .channel(`tasks-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'brain_dump_tasks', filter: `user_id=eq.${user.id}` }, (payload) => {
         if (payload.eventType === 'INSERT') {
             const t = payload.new;
             setTasks(prev => [{ ...t, priority: t.priority || 'medium', status: t.status || 'todo' } as Task, ...prev]);
         } else if (payload.eventType === 'UPDATE') {
             setTasks(prev => prev.map(t => t.id === payload.new.id ? { ...payload.new, priority: payload.new.priority || 'medium' } as Task : t));
         } else if (payload.eventType === 'DELETE') {
             setTasks(prev => prev.filter(t => t.id !== payload.old.id));
         }
      })
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [user]);

  const addTask = async () => {
    if (!newTaskText.trim() || !user) return;

    // Optimistic Update
    const tempId = Math.random().toString();
    const newTask: Task = {
      id: tempId,
      text: newTaskText,
      priority: newPriority,
      due_date: newDueDate || undefined,
      status: 'todo',
      completed: false
    };

    setTasks(prev => [newTask, ...prev]);
    setNewTaskText('');
    setIsAdding(false);

    const { error } = await supabase.from('brain_dump_tasks').insert({
      user_id: user.id,
      text: newTask.text,
      priority: newTask.priority,
      due_date: newTask.due_date,
      status: 'todo',
      completed: false
    });

    if (error) {
        console.error("Error adding task:", error);
        setTasks(prev => prev.filter(t => t.id !== tempId));
    }
  };

  const toggleTask = async (id: string, currentCompleted: boolean) => {
      const newStatus = currentCompleted ? 'todo' : 'done';
      const newCompleted = !currentCompleted;
      
      // Optimistic
      setTasks(prev => prev.map(t => t.id === id ? { ...t, status: newStatus, completed: newCompleted } : t));

      await supabase.from('brain_dump_tasks').update({
          status: newStatus,
          completed: newCompleted
      }).eq('id', id);
  };

  const startEditing = (task: Task) => {
      setEditingTaskId(task.id);
      setEditText(task.text);
      setEditPriority(task.priority || 'medium');
      setEditDueDate(task.due_date || '');
      setEditShowDatePicker(false);
  };

  const cancelEditing = () => {
      setEditingTaskId(null);
      setEditText('');
      setEditPriority('medium');
      setEditDueDate('');
  };

  const saveTaskUpdate = async () => {
      if (!editingTaskId || !editText.trim()) return;

      const previousTasks = [...tasks];
      // Optimistic Update
      setTasks(prev => prev.map(t => 
          t.id === editingTaskId 
              ? { ...t, text: editText, priority: editPriority, due_date: editDueDate || undefined } 
              : t
      ));

      try {
          const { error } = await supabase.from('brain_dump_tasks')
              .update({ 
                  text: editText, 
                  priority: editPriority, 
                  due_date: editDueDate || null 
              })
              .eq('id', editingTaskId);

          if (error) throw error;
          
          setEditingTaskId(null);
      } catch (err) {
          console.error('Error updating task:', err);
          setTasks(previousTasks); // Rollback
      }
  };

  const deleteTask = async (id: string) => {
      setTasks(prev => prev.filter(t => t.id !== id));
      await supabase.from('brain_dump_tasks').delete().eq('id', id);
  };

  const filteredTasks = useMemo(() => {
    let result = tasks;
    if (filter === 'today') {
        result = result.filter(t => t.due_date && isToday(new Date(t.due_date)));
    } else if (filter === 'upcoming') {
        result = result.filter(t => t.due_date && new Date(t.due_date) > new Date());
    } else if (filter === 'high') {
        result = result.filter(t => t.priority === 'high');
    }
    // Always sort done to bottom
    return result.sort((a, b) => (a.status === 'done' ? 1 : 0) - (b.status === 'done' ? 1 : 0));
  }, [tasks, filter]);

  return (
    <div className="w-full h-full flex flex-col p-4 sm:p-6 overflow-hidden" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 mt-2">
        <div>
           <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-l from-blue-400 to-purple-400">
             المهام
           </h2>
           <p className="text-slate-400 mt-1 text-sm font-medium">أنجز مهامك، خطوة بخطوة 🚀</p>
        </div>
        
        <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsAdding(!isAdding)}
              className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all"
            >
              <motion.div animate={{ rotate: isAdding ? 45 : 0 }}>
                 <Plus className="w-6 h-6" />
              </motion.div>
            </button>
            
            {onClose && (
                <button 
                    onClick={onClose}
                    className="w-10 h-10 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 flex items-center justify-center transition-all lg:hidden"
                >
                    <X className="w-5 h-5" />
                </button>
            )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide mb-2">
        {[
            { id: 'all', label: 'الكل' },
            { id: 'today', label: 'اليوم' },
            { id: 'upcoming', label: 'قادم' },
            { id: 'high', label: 'هام جداً' }
        ].map(tab => (
            <button
               key={tab.id}
               onClick={() => setFilter(tab.id as any)}
               className={twMerge(
                   "px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all border",
                   filter === tab.id 
                     ? "bg-slate-800 border-slate-700 text-white shadow-sm" 
                     : "bg-transparent border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800/50"
               )}
            >
                {tab.label}
            </button>
        ))}
      </div>

      {/* Add Task Input (Collapsible) */}
      <AnimatePresence>
        {isAdding && (
            <motion.div
               initial={{ opacity: 0, y: -10 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: -10 }}
               className="mb-6 relative z-50"
            >
               <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-3 space-y-3 shadow-xl">
                   <input 
                      type="text" 
                      placeholder="ما الذي تريد إنجازه؟" 
                      value={newTaskText}
                      onChange={(e) => setNewTaskText(e.target.value)}
                      className="w-full bg-transparent text-lg font-bold text-white placeholder-slate-600 outline-none"
                      autoFocus
                      onKeyDown={(e) => e.key === 'Enter' && addTask()}
                   />
                   
                   <div className="flex items-center gap-2 flex-wrap">
                       {/* Priority Selector */}
                       <div className="relative group shrink-0">
                           <button className={twMerge("h-9 px-3 rounded-xl text-xs font-bold flex items-center gap-2 transition-all border", PRIORITIES[newPriority].color)}>
                               <Flag className="w-4 h-4" />
                               <span>{PRIORITIES[newPriority].label}</span>
                           </button>
                           {/* Dropdown */}
                           <div className="absolute bottom-full right-0 mb-2 bg-slate-900 border border-slate-800 rounded-xl p-2 hidden group-hover:block z-50 min-w-[120px] shadow-2xl">
                               {(Object.keys(PRIORITIES) as Priority[]).map(p => (
                                   <button 
                                       key={p} 
                                       onClick={() => setNewPriority(p)}
                                       className="w-full p-2 rounded-lg text-right text-xs font-bold text-slate-400 hover:bg-slate-800 hover:text-white flex items-center gap-2"
                                   >
                                       <div className={`w-2 h-2 rounded-full ${p === 'high' ? 'bg-rose-500' : p === 'medium' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                                       {PRIORITIES[p].label}
                                   </button>
                               ))}
                           </div>
                       </div>

                       {/* Date Selector (Custom UI) */}
                       <div className="relative shrink-0">
                           <button 
                               onClick={() => setShowDatePicker(!showDatePicker)}
                               className="h-9 px-3 bg-slate-800/50 border border-slate-700/50 rounded-xl flex items-center gap-2 text-xs font-bold text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-all"
                           >
                               <Clock className="w-4 h-4" />
                               <span>{newDueDate ? format(new Date(newDueDate), 'd MMM', { locale: arEG }) : 'التاريخ'}</span>
                           </button>

                           <AnimatePresence>
                               {showDatePicker && (
                                   <CustomDatePicker 
                                      selectedDate={newDueDate ? new Date(newDueDate) : null}
                                      onChange={(date) => setNewDueDate(format(date, 'yyyy-MM-dd'))}
                                      onClose={() => setShowDatePicker(false)}
                                   />
                               )}
                           </AnimatePresence>
                       </div>

                       <button 
                          onClick={addTask}
                          disabled={!newTaskText.trim()}
                          className="h-9 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 shrink-0"
                       >
                           <span className="text-sm font-bold">إضافة</span>
                           <motion.div whileHover={{ y: -2 }}>
                               <ArrowUp className="w-4 h-4" />
                           </motion.div>
                       </button>
                   </div>
               </div>
            </motion.div>
        )}
      </AnimatePresence>

      {/* Task List */}
      <motion.div layout className="space-y-3 flex-1 overflow-y-auto pb-24 pr-2 scrollbar-thin scrollbar-thumb-slate-800">
              <AnimatePresence mode="popLayout">
                {filteredTasks.length === 0 ? (
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }}
                        className="text-center text-slate-500 py-12"
                    >
                        <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle2 className="w-8 h-8 opacity-50" />
                        </div>
                        <p className="font-bold text-lg">لا توجد مهام هنا</p>
                        <p className="text-sm opacity-70">أضف مهام جديدة للبدء</p>
                    </motion.div>
                ) : (
                    filteredTasks.map(task => (
                    <motion.div
                        key={task.id}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="group relative bg-slate-800/40 backdrop-blur-md border border-slate-700/50 rounded-2xl p-4 hover:bg-slate-800/60 transition-all hover:shadow-lg hover:shadow-black/20"
                    >
                        {editingTaskId === task.id ? (
                            /* --- Edit Mode --- */
                            <div className="flex flex-col gap-3">
                                <input 
                                   type="text"
                                   value={editText}
                                   onChange={(e) => setEditText(e.target.value)}
                                   className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-white font-bold text-sm outline-none focus:border-blue-500 transition-colors"
                                   autoFocus
                                />
                                
                                <div className="flex items-center gap-2 flex-wrap">
                                    {/* Edit Priority */}
                                    <div className="relative group/prio">
                                        <button className={twMerge("h-8 px-2 rounded-lg text-xs font-bold flex items-center gap-2 border", PRIORITIES[editPriority].color)}>
                                            <Flag className="w-3.5 h-3.5" />
                                            {PRIORITIES[editPriority].label}
                                        </button>
                                        <div className="absolute bottom-full right-0 mb-2 bg-slate-900 border border-slate-800 rounded-xl p-2 hidden group-hover/prio:block z-[60] min-w-[120px] shadow-xl">
                                            {(Object.keys(PRIORITIES) as Priority[]).map(p => (
                                                <button key={p} onClick={() => setEditPriority(p)} className="w-full p-2 rounded-lg text-right text-xs font-bold text-slate-400 hover:bg-slate-800 hover:text-white flex items-center gap-2">
                                                    <div className={`w-2 h-2 rounded-full ${p === 'high' ? 'bg-rose-500' : p === 'medium' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                                                    {PRIORITIES[p].label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Edit Date */}
                                    <div className="relative">
                                        <button onClick={() => setEditShowDatePicker(!editShowDatePicker)} className="h-8 px-2 bg-slate-800 border border-slate-700 rounded-lg flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white">
                                            <Clock className="w-3.5 h-3.5" />
                                            {editDueDate ? format(new Date(editDueDate), 'd MMM', { locale: arEG }) : 'التاريخ'}
                                        </button>
                                        <AnimatePresence>
                                            {editShowDatePicker && (
                                                <CustomDatePicker 
                                                    selectedDate={editDueDate ? new Date(editDueDate) : null} 
                                                    onChange={(d) => setEditDueDate(format(d, 'yyyy-MM-dd'))} 
                                                    onClose={() => setEditShowDatePicker(false)} 
                                                />
                                            )}
                                        </AnimatePresence>
                                    </div>

                                    <div className="flex-1" />

                                    <button onClick={saveTaskUpdate} className="p-2 bg-blue-500/10 text-blue-400 rounded-full hover:bg-blue-500 hover:text-white transition-all">
                                        <Check className="w-4 h-4" />
                                    </button>
                                    <button onClick={cancelEditing} className="p-2 bg-slate-700/50 text-slate-400 rounded-full hover:bg-rose-500 hover:text-white transition-all">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            /* --- View Mode --- */
                            <div className="flex items-start gap-4">
                                <button 
                                    onClick={() => toggleTask(task.id, task.completed)}
                                    className={twMerge(
                                        "mt-1 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                                        task.completed 
                                            ? "bg-emerald-500 border-emerald-500" 
                                            : `border-slate-600 hover:border-${PRIORITIES[task.priority || 'medium'].color.split('-')[1]}-500`
                                    )}
                                >
                                    {task.completed && <Check className="w-3.5 h-3.5 text-white" />}
                                </button>
                                
                                <div className="flex-1 min-w-0">
                                    <p className={twMerge(
                                        "text-sm font-bold text-slate-200 leading-relaxed break-words transition-all duration-300",
                                        task.completed && "text-slate-500 line-through"
                                    )}>
                                        {task.text}
                                    </p>
                                    
                                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                                        {task.priority && task.priority !== 'medium' && (
                                            <span className={twMerge("text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-900/50 border border-slate-700", PRIORITIES[task.priority].color)}>
                                                {PRIORITIES[task.priority].label}
                                            </span>
                                        )}
                                        
                                        {task.due_date && (
                                            <span className={twMerge(
                                                "flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-900/50 border border-slate-700",
                                                isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date)) && !task.completed ? "text-rose-400 border-rose-500/30" : 
                                                isToday(new Date(task.due_date)) ? "text-amber-400 border-amber-500/30" : "text-slate-400"
                                            )}>
                                                <Clock className="w-3 h-3" />
                                                {format(new Date(task.due_date), 'd MMM', { locale: arEG })}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity absolute top-4 left-4 sm:relative sm:top-auto sm:left-auto pl-2 bg-slate-900/80 sm:bg-transparent rounded-lg backdrop-blur-sm sm:backdrop-blur-none">
                                    <button 
                                        onClick={() => startEditing(task)} 
                                        className="p-1.5 text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all"
                                    >
                                        <Pencil className="w-4 h-4" />
                                    </button>
                                    <button 
                                        onClick={() => deleteTask(task.id)}
                                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </motion.div>
                    ))
                )}
            </AnimatePresence>
      </motion.div>
    </div>
  );
}
