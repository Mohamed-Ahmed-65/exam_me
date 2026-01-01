import { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, GripVertical, X, CheckCircle2, Circle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { twMerge } from 'tailwind-merge';

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface DumpTask {
  id: string;
  text: string;
  completed: boolean;
  tagId?: string;
}

const TAG_COLORS = [
  'bg-blue-500', 'bg-purple-500', 'bg-rose-500', 'bg-emerald-500', 
  'bg-amber-500', 'bg-slate-500', 'bg-indigo-500', 'bg-pink-500'
];

export default function BrainDump() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<DumpTask[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [newTaskText, setNewTaskText] = useState('');
  const [selectedTagId, setSelectedTagId] = useState<string | undefined>();
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0]);

  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  // Fetch data from Supabase
  useEffect(() => {
    if (user) {
      const fetchData = async () => {
        try {
          const [tasksRes, tagsRes] = await Promise.all([
            supabase.from('brain_dump_tasks').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
            supabase.from('tags').select('*').eq('user_id', user.id).eq('type', 'brain_dump')
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
          console.error('Error fetching brain dump data:', err);
        } finally {
          setLoading(false);
        }
      };

      fetchData();
    }
  }, [user]);

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim() || !user) return;

    const tempId = crypto.randomUUID();
    const newTask: DumpTask = {
      id: tempId,
      text: newTaskText.trim(),
      completed: false,
      tagId: selectedTagId
    };

    // Optimistic update
    setTasks([newTask, ...tasks]);
    setNewTaskText('');

    const { data, error } = await supabase.from('brain_dump_tasks').insert({
      user_id: user.id,
      text: newTask.text,
      completed: false,
      tag_id: newTask.tagId
    }).select().single();

    if (error) {
      console.error('Error adding task:', error);
      setTasks(tasks.filter(t => t.id !== tempId));
    } else if (data) {
      // Update with real ID from Supabase
      setTasks(prev => prev.map(t => t.id === tempId ? { ...t, id: data.id } : t));
    }
  };

  const toggleTask = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const newStatus = !task.completed;
    
    // Optimistic update
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: newStatus } : t));

    const { error } = await supabase
      .from('brain_dump_tasks')
      .update({ completed: newStatus })
      .eq('id', id);

    if (error) {
      console.error('Error toggling task:', error);
      setTasks(tasks.map(t => t.id === id ? { ...t, completed: !newStatus } : t));
    }
  };

  const deleteTask = async (id: string) => {
    const backup = [...tasks];
    setTasks(tasks.filter(t => t.id !== id));

    const { error } = await supabase
      .from('brain_dump_tasks')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting task:', error);
      setTasks(backup);
    }
  };

  const addTag = async () => {
    if (!newTagName.trim() || !user) return;
    
    const { data, error } = await supabase.from('tags').insert({
      user_id: user.id,
      name: newTagName.trim(),
      color: newTagColor,
      type: 'brain_dump'
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

  const deleteTag = async (id: string) => {
    const { error } = await supabase.from('tags').delete().eq('id', id);
    if (error) {
      console.error('Error deleting tag:', error);
      return;
    }
    setTags(tags.filter(t => t.id !== id));
    setTasks(tasks.map(t => t.tagId === id ? { ...t, tagId: undefined } : t));
  };

  // Reordering logic (Keep local only for now, or add sort_order column to DB later)
  const handleSort = () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    const _tasks = [...tasks];
    const draggedItemContent = _tasks.splice(dragItem.current, 1)[0];
    _tasks.splice(dragOverItem.current, 0, draggedItemContent);
    dragItem.current = null;
    dragOverItem.current = null;
    setTasks(_tasks);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-900/90 lg:bg-slate-900/50 backdrop-blur-3xl border-l border-slate-800 p-6 animate-in slide-in-from-right duration-500 shadow-2xl lg:shadow-none">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
          <span className="p-2 bg-blue-500/10 rounded-xl text-blue-400">
            🧠
          </span>
          فرغ دماغك
        </h2>
      </div>

      {/* Add Task Form */}
      <form onSubmit={addTask} className="space-y-4 mb-8">
        <div className="relative group">
          <input
            type="text"
            value={newTaskText}
            onChange={(e) => setNewTaskText(e.target.value)}
            placeholder="اكتب ما يدور في ذهنك..."
            className="w-full bg-slate-950/50 border border-slate-800 focus:border-blue-500/50 rounded-2xl px-5 py-4 outline-none transition-all placeholder:text-slate-600 shadow-inner"
          />
          <button
            type="submit"
            className="absolute left-2.5 top-1/2 -translate-y-1/2 p-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all shadow-lg active:scale-95"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Tag Selector */}
        <div className="flex flex-wrap gap-2">
          {tags.map(tag => (
            <button
              key={tag.id}
              type="button"
              onClick={() => setSelectedTagId(selectedTagId === tag.id ? undefined : tag.id)}
              className={twMerge(
                "group relative px-3 py-1.5 rounded-lg text-xs font-bold transition-all border flex items-center gap-2",
                selectedTagId === tag.id 
                  ? `${tag.color} text-white border-white/20 shadow-lg` 
                  : "bg-slate-800 text-slate-400 border-transparent hover:bg-slate-700 shadow-sm"
              )}
            >
              <div className={twMerge("w-1.5 h-1.5 rounded-full", tag.color, "bg-white/50")} />
              {tag.name}
              {selectedTagId === tag.id && (
                <span 
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteTag(tag.id);
                  }}
                  className="ms-1 hover:text-rose-200 transition-colors"
                >
                  <X className="w-3 h-3" />
                </span>
              )}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setIsAddingTag(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800/50 text-slate-500 border border-slate-700/50 hover:bg-slate-800 transition-all border-dashed"
          >
            + تاغ جديد
          </button>
        </div>
      </form>

      {/* Tags Manager UI (Hidden modal-like) */}
      {isAddingTag && (
        <div className="mb-8 p-4 bg-slate-950/50 border border-slate-800 rounded-2xl animate-in zoom-in-95 duration-200 shadow-2xl">
          <div className="flex justify-between mb-4">
            <span className="text-xs font-bold text-slate-400">إنشاء تاغ جديد</span>
            <button onClick={() => setIsAddingTag(false)}><X className="w-4 h-4 text-slate-500" /></button>
          </div>
          <input
            type="text"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            placeholder="اسم التاغ..."
            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm mb-3 outline-none shadow-inner"
          />
          <div className="flex gap-2 mb-4">
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
          <button 
            onClick={addTag}
            className="w-full py-2 bg-slate-100 text-slate-900 rounded-lg text-xs font-bold hover:bg-white transition-all shadow-lg active:scale-95"
          >
            إضافة التاغ
          </button>
        </div>
      )}

      {/* Tasks List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1">
        {tasks.map((task, index) => {
          const taskTag = tags.find(t => t.id === task.tagId);
          return (
            <div
              key={task.id}
              draggable
              onDragStart={() => (dragItem.current = index)}
              onDragEnter={() => (dragOverItem.current = index)}
              onDragEnd={handleSort}
              onDragOver={(e) => e.preventDefault()}
              className={twMerge(
                "group flex items-center gap-4 p-4 rounded-2xl border transition-all cursor-grab active:cursor-grabbing",
                task.completed 
                  ? "bg-slate-900/40 border-slate-800/50 opacity-60" 
                  : "bg-slate-950/50 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80 shadow-lg hover:shadow-blue-500/5"
              )}
            >
              <div className="text-slate-600 group-hover:text-slate-400 transition-colors shrink-0">
                <GripVertical className="w-4 h-4" />
              </div>

              <button 
                onClick={() => toggleTask(task.id)}
                className={twMerge(
                  "transition-all shrink-0",
                  task.completed ? "text-blue-500" : "text-slate-600 hover:text-slate-500"
                )}
              >
                {task.completed ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
              </button>

              <div className="flex-1 min-w-0">
                <p className={twMerge(
                  "text-sm font-medium text-slate-200 truncate",
                  task.completed && "line-through text-slate-500"
                )}>
                  {task.text}
                </p>
                {taskTag && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className={twMerge("w-2 h-2 rounded-full", taskTag.color)} />
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{taskTag.name}</span>
                  </div>
                )}
              </div>

              <button 
                onClick={() => deleteTask(task.id)}
                className="opacity-0 group-hover:opacity-100 p-2 text-slate-600 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-all shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          );
        })}

        {tasks.length === 0 && (
          <div className="text-center py-12 border-2 border-dashed border-slate-800/50 rounded-3xl animate-in fade-in duration-500">
            <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-800">
              <Plus className="w-6 h-6 text-slate-700" />
            </div>
            <p className="text-slate-500 text-sm italic">أفرغ ما في رأسك هنا لتركز في دراستك</p>
          </div>
        )}
      </div>
    </div>
  );
}
