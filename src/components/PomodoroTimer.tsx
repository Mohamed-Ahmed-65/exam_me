import { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCw, Settings, Coffee, Brain, Maximize2, Minimize2, ChevronDown, ChevronUp } from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { twMerge } from 'tailwind-merge';

type TimerMode = 'work' | 'break';

const COLORS = [
  { id: 'blue', name: 'أزرق', bg: 'bg-blue-500', text: 'text-blue-400', ring: 'ring-blue-500/20', border: 'border-blue-500/30', hover: 'hover:bg-blue-500' },
  { id: 'purple', name: 'بنفسجي', bg: 'bg-purple-500', text: 'text-purple-400', ring: 'ring-purple-500/20', border: 'border-purple-500/30', hover: 'hover:bg-purple-500' },
  { id: 'rose', name: 'وردي', bg: 'bg-rose-500', text: 'text-rose-400', ring: 'ring-rose-500/20', border: 'border-rose-500/30', hover: 'hover:bg-rose-500' },
  { id: 'emerald', name: 'زمردي', bg: 'bg-emerald-500', text: 'text-emerald-400', ring: 'ring-emerald-500/20', border: 'border-emerald-500/30', hover: 'hover:bg-emerald-500' },
  { id: 'amber', name: 'كهرماني', bg: 'bg-amber-500', text: 'text-amber-400', ring: 'ring-amber-500/20', border: 'border-amber-500/30', hover: 'hover:bg-amber-500' },
];

export default function PomodoroTimer() {
  const { user } = useAuth();
  const [workDuration, setWorkDuration] = useState(25);
  const [breakDuration, setBreakDuration] = useState(5);
  const [accentColorId, setAccentColorId] = useState('blue');
  const [dbLoading, setDbLoading] = useState(true);

  const [pos, setPos] = useLocalStorage('pomodoro-pos', { x: 24, y: 24 });
  
  // Persistence states (Keep in localStorage for immediate state on refresh)
  const [mode, setMode] = useLocalStorage<TimerMode>('pomodoro-mode', 'work');
  const [isActive, setIsActive] = useLocalStorage('pomodoro-active', false);
  const [targetEndTime, setTargetEndTime] = useLocalStorage<number | null>('pomodoro-target', null);
  const [remainingWhenPaused, setRemainingWhenPaused] = useLocalStorage('pomodoro-remaining', workDuration * 60);

  const [timeLeft, setTimeLeft] = useState(remainingWhenPaused);
  const [showSettings, setShowSettings] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMini, setIsMini] = useState(false);

  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const timerRef = useRef<HTMLDivElement>(null);

  const accentColor = COLORS.find(c => c.id === accentColorId) || COLORS[0];

  // Fetch settings from Supabase
  useEffect(() => {
    if (user) {
      const fetchSettings = async () => {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('pomodoro_settings')
            .eq('id', user.id)
            .single();

          if (error) throw error;

          if (data?.pomodoro_settings) {
            setWorkDuration(data.pomodoro_settings.work);
            setBreakDuration(data.pomodoro_settings.break);
            setAccentColorId(data.pomodoro_settings.color);
          }
        } catch (err) {
          console.error('Error fetching pomodoro settings:', err);
        } finally {
          setDbLoading(false);
        }
      };

      fetchSettings();
    }
  }, [user]);

  // Synchronize internal timeLeft with targetEndTime or remainingWhenPaused
  useEffect(() => {
    const updateTimer = () => {
      if (isActive && targetEndTime) {
        const now = Date.now();
        const diff = Math.max(0, Math.round((targetEndTime - now) / 1000));
        setTimeLeft(diff);

        if (diff === 0) {
          handleTimerEnd();
        }
      } else {
        setTimeLeft(remainingWhenPaused);
      }
    };

    updateTimer();
    const interval = window.setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [isActive, targetEndTime, remainingWhenPaused]);

  // Handle settings changes when not active
  useEffect(() => {
    if (!isActive) {
      const newDuration = mode === 'work' ? workDuration * 60 : breakDuration * 60;
      setRemainingWhenPaused(newDuration);
      setTimeLeft(newDuration);
    }
  }, [workDuration, breakDuration, mode, isActive]);

  const handleTimerEnd = () => {
    setIsActive(false);
    setTargetEndTime(null);
    const nextMode = mode === 'work' ? 'break' : 'work';
    setMode(nextMode);
    const nextDuration = nextMode === 'work' ? workDuration * 60 : breakDuration * 60;
    setRemainingWhenPaused(nextDuration);
    
    // Play sound
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audio.play().catch(() => {});
  };

  const toggleTimer = () => {
    if (!isActive) {
      // Start
      const end = Date.now() + timeLeft * 1000;
      setTargetEndTime(end);
      setIsActive(true);
    } else {
      // Pause
      setIsActive(false);
      setRemainingWhenPaused(timeLeft);
      setTargetEndTime(null);
    }
  };

  const resetTimer = () => {
    setIsActive(false);
    setTargetEndTime(null);
    const duration = mode === 'work' ? workDuration * 60 : breakDuration * 60;
    setRemainingWhenPaused(duration);
    setTimeLeft(duration);
  };

  const saveToSupabase = async (work: number, breakD: number, color: string) => {
    if (!user) return;
    await supabase.from('profiles').update({
      pomodoro_settings: { work, break: breakD, color }
    }).eq('id', user.id);
  };

  // Handle Dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const newX = e.clientX - dragStartPos.current.x;
      const newY = window.innerHeight - e.clientY - dragStartPos.current.y;
      
      // Keep within bounds
      const boundedX = Math.max(0, Math.min(newX, window.innerWidth - (timerRef.current?.offsetWidth || 0)));
      const boundedY = Math.max(0, Math.min(newY, window.innerHeight - (timerRef.current?.offsetHeight || 0)));
      
      setPos({ x: boundedX, y: boundedY });
    };

    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      document.body.style.userSelect = 'none';
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, setPos]);

  const startDrag = (e: React.MouseEvent) => {
    if (isExpanded) return; // Disable drag when centered
    setIsDragging(true);
    dragStartPos.current = {
      x: e.clientX - pos.x,
      y: window.innerHeight - e.clientY - pos.y
    };
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  if (dbLoading) return null;

  return (
    <>
      {/* Overlay when expanded */}
      {isExpanded && (
        <div 
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 animate-in fade-in duration-500"
          onClick={() => setIsExpanded(false)}
        />
      )}

      <div 
        ref={timerRef}
        style={{ 
          left: isExpanded ? '50%' : `${pos.x}px`,
          bottom: isExpanded ? '50%' : `${pos.y}px`,
          transform: isExpanded ? 'translate(-50%, 50%) scale(1.1)' : 'none',
        }}
        className={twMerge(
          "fixed z-50 transition-[transform,width,height,background-color,padding] duration-500 cubic-bezier(0.4, 0, 0.2, 1) border bg-slate-900/90 backdrop-blur-xl shadow-2xl rounded-[2.5rem] select-none",
          isExpanded ? "w-[90%] max-w-md p-10" : isMini ? "w-60 p-3 px-5" : "w-80 p-8",
          accentColor.ring,
          accentColor.border,
          (isExpanded || isDragging) && "ring-4",
          isDragging ? "cursor-grabbing scale-105 shadow-blue-500/20" : "cursor-default"
        )}
      >
          {/* Universal Edge Drag Handles */}
          {!isExpanded && (
            <div className="absolute inset-0 rounded-[2.5rem] overflow-hidden pointer-events-none z-0">
              <div 
                onMouseDown={startDrag}
                className="absolute top-0 inset-x-0 h-6 pointer-events-auto cursor-grab active:cursor-grabbing"
              />
              <div 
                onMouseDown={startDrag}
                className="absolute bottom-0 inset-x-0 h-6 pointer-events-auto cursor-grab active:cursor-grabbing"
              />
              <div 
                onMouseDown={startDrag}
                className="absolute left-0 inset-y-0 w-6 pointer-events-auto cursor-grab active:cursor-grabbing"
              />
              <div 
                onMouseDown={startDrag}
                className="absolute right-0 inset-y-0 w-6 pointer-events-auto cursor-grab active:cursor-grabbing"
              />
              
              {/* Optional: Visual hint (subtle line at top) */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-8 h-1 bg-slate-800/20 rounded-full" />
            </div>
          )}

          {/* Header Area */}
          <div className={twMerge(
            "flex justify-between items-center transition-all duration-500",
             isMini ? "gap-4" : "flex-col gap-6 mb-8 text-center"
          )}>
              <div className={twMerge("flex flex-col transition-all duration-500", isMini ? "flex-1" : "w-full items-center")}>
                  {!isMini && (
                    <div className={twMerge(
                      "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] mb-4 border transition-all",
                      mode === 'work' ? `${accentColor.text} ${accentColor.border} bg-${accentColorId}-500/10` : "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
                    )}>
                        {mode === 'work' ? 'وقت التركيز' : 'وقت الراحة'}
                    </div>
                  )}

                  <div className={twMerge("flex items-center transition-all duration-500", isMini ? "gap-3" : "flex-col gap-4")}>
                      {isMini && (
                        <button 
                          onClick={toggleTimer}
                          className={twMerge(
                            "p-2 rounded-xl text-white shadow-lg transition-all transform active:scale-90",
                            isActive ? "bg-amber-500 shadow-amber-500/30" : `${accentColor.bg} shadow-${accentColorId}-500/30`
                          )}
                        >
                          {isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                        </button>
                      )}

                      <div className="flex items-center gap-4">
                        {mode === 'work' ? (
                          <Brain className={twMerge(isMini ? "w-4 h-4" : "w-8 h-8", accentColor.text)} />
                        ) : (
                          <Coffee className={twMerge(isMini ? "w-4 h-4" : "w-8 h-8", "text-emerald-400")} />
                        )}
                        
                        <div className={twMerge(
                          "font-bold font-mono transition-all duration-500 leading-none tracking-tight",
                          isExpanded ? "text-7xl" : isMini ? "text-xl" : "text-5xl",
                          accentColor.text
                        )}>
                            {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
                        </div>
                      </div>
                  </div>
              </div>

              {/* Controls & Toggles Group */}
              <div className={twMerge(
                "flex items-center transition-all duration-500",
                isMini ? "gap-2" : "w-full justify-center gap-4"
              )}>
                 {!isMini && (
                    <>
                      <button 
                          onClick={() => setIsExpanded(!isExpanded)}
                          className="p-3 rounded-2xl text-slate-500 hover:text-slate-200 hover:bg-slate-800/50 transition-all border border-transparent hover:border-slate-700"
                          title={isExpanded ? "تصغير" : "تكبير الشاشة"}
                      >
                          {isExpanded ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                      </button>
                      <button 
                          onClick={() => setShowSettings(!showSettings)}
                          className={twMerge(
                            "p-3 rounded-2xl transition-all border",
                            showSettings 
                              ? `${accentColor.bg}/10 ${accentColor.text} ${accentColor.border} rotate-90` 
                              : "text-slate-500 hover:text-slate-200 hover:bg-slate-800/50 border-transparent hover:border-slate-700"
                          )}
                          title="الإعدادات"
                      >
                          <Settings className="w-5 h-5" />
                      </button>
                    </>
                 )}

                  {/* Mode Toggle (Mini/Normal) */}
                  {!isExpanded && (
                    <button 
                      onClick={() => setIsMini(!isMini)}
                      className={twMerge(
                        "p-2 rounded-xl text-slate-500 hover:text-slate-300 hover:bg-slate-800/80 transition-all border border-transparent hover:border-slate-700",
                        !isMini && "absolute top-4 right-4"
                      )}
                      title={isMini ? "الوضع الطبيعي" : "تصغير كلي"}
                    >
                      {isMini ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  )}
              </div>
          </div>

          {/* Main Content Area (Normal/Expanded only) */}
          {!isMini && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              {showSettings ? (
                  <div className="space-y-8 py-2 border-t border-slate-800/50 mt-4 pt-8">
                      <div className="space-y-4">
                          <div className="flex justify-between items-end">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">مدة التركيز</span>
                            <span className={twMerge("text-lg font-bold font-mono", accentColor.text)}>{workDuration}m</span>
                          </div>
                          <input 
                              type="range" min="1" max="60" 
                              value={workDuration} 
                              onChange={(e) => {
                                const val = parseInt(e.target.value);
                                setWorkDuration(val);
                                saveToSupabase(val, breakDuration, accentColorId);
                              }}
                              className={twMerge("w-full h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer", accentColor.bg)}
                          />
                      </div>

                      <div className="space-y-4">
                          <div className="flex justify-between items-end">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">مدة الراحة</span>
                            <span className="text-lg font-bold font-mono text-emerald-400">{breakDuration}m</span>
                          </div>
                          <input 
                              type="range" min="1" max="30" 
                              value={breakDuration} 
                              onChange={(e) => {
                                const val = parseInt(e.target.value);
                                setBreakDuration(val);
                                saveToSupabase(workDuration, val, accentColorId);
                              }}
                              className="w-full h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer accent-emerald-500"
                          />
                      </div>
                      
                      <div className="space-y-4">
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block">مظهر المؤقت</label>
                          <div className="grid grid-cols-5 gap-3">
                            {COLORS.map(c => (
                              <button
                                key={c.id}
                                onClick={() => {
                                  setAccentColorId(c.id);
                                  saveToSupabase(workDuration, breakDuration, c.id);
                                }}
                                className={twMerge(
                                  "aspect-square rounded-2xl border-4 transition-all transform hover:scale-110 active:scale-90 shadow-lg",
                                  c.bg,
                                  accentColorId === c.id ? "border-white/40 shadow-xl" : "border-transparent"
                                )}
                                title={c.name}
                              />
                            ))}
                          </div>
                      </div>

                      <button 
                          onClick={() => setShowSettings(false)}
                          className={twMerge(
                            "w-full py-4 rounded-[1.5rem] text-sm font-bold transition-all border shadow-lg active:scale-95",
                            "bg-slate-800/50 text-slate-300 border-slate-700 hover:bg-slate-800 hover:text-white"
                          )}
                      >
                          حفظ التعديلات
                      </button>
                  </div>
              ) : (
                  <div className="space-y-8 transition-all">
                      <div className="flex gap-4">
                          <button 
                              onClick={toggleTimer}
                              className={twMerge(
                                "flex-[3] flex items-center justify-center gap-4 py-5 rounded-[2rem] font-bold text-lg transition-all transform active:scale-95 shadow-2xl overflow-hidden relative group",
                                isActive 
                                    ? 'bg-amber-500/10 text-amber-500 border border-amber-500/30 hover:bg-amber-500/20' 
                                    : mode === 'work' 
                                        ? `${accentColor.bg} text-white hover:brightness-110 shadow-${accentColorId}-500/40`
                                        : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-emerald-500/40'
                              )}
                          >
                              {isActive ? (
                                <>
                                  <Pause className="w-6 h-6 fill-current" />
                                  <span>توقف مؤقت</span>
                                </>
                              ) : (
                                <>
                                  <Play className="w-6 h-6 fill-current ml-1" />
                                  <span>ابدأ التركيز</span>
                                </>
                              )}
                          </button>
                          <button 
                              onClick={resetTimer}
                              className="flex-1 flex items-center justify-center bg-slate-800/50 text-slate-400 hover:text-slate-100 rounded-[2rem] hover:bg-slate-800 transition-all active:rotate-180 duration-700 border border-slate-700/50 shadow-inner"
                              title="إعادة ضبط"
                          >
                              <RotateCw className="w-6 h-6" />
                          </button>
                      </div>

                      {/* Spacious Progress Bar */}
                      <div className="relative h-2.5 bg-slate-800/50 rounded-full overflow-hidden border border-slate-700/30 shadow-inner">
                          <div 
                              className={twMerge(
                                "absolute inset-y-0 left-0 transition-all duration-1000 shadow-[0_0_10px_rgba(255,255,255,0.2)]",
                                mode === 'work' ? accentColor.bg : 'bg-emerald-500'
                              )}
                              style={{ width: `${(timeLeft / (mode === 'work' ? workDuration * 60 : breakDuration * 60)) * 100}%` }}
                          />
                      </div>
                  </div>
              )}
            </div>
          )}

          {/* Mini Mode Bottom Progress */}
          {isMini && (
            <div className="absolute inset-x-0 bottom-0 h-1 bg-slate-800/20 overflow-hidden rounded-b-[2.5rem]">
              <div 
                className={twMerge("h-full transition-all duration-1000 opacity-60", mode === 'work' ? accentColor.bg : 'bg-emerald-500')}
                style={{ width: `${(timeLeft / (mode === 'work' ? workDuration * 60 : breakDuration * 60)) * 100}%` }}
              />
            </div>
          )}
      </div>
    </>
  );
}

