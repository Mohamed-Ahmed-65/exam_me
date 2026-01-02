import { useState, useEffect } from 'react';
import { Play, Pause, RotateCw, Settings, Coffee, Brain, ChevronDown, Check } from 'lucide-react';
import { useWebWorkerTimer } from '../hooks/useWebWorkerTimer';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { twMerge } from 'tailwind-merge';

type TimerMode = 'work' | 'break';

const COLORS = [
  { id: 'blue', name: 'ياقوتي', bg: 'bg-blue-500', text: 'text-blue-400', ring: 'ring-blue-500/20' },
  { id: 'purple', name: 'أرجواني', bg: 'bg-purple-500', text: 'text-purple-400', ring: 'ring-purple-500/20' },
  { id: 'rose', name: 'وردي', bg: 'bg-rose-500', text: 'text-rose-400', ring: 'ring-rose-500/20' },
  { id: 'emerald', name: 'زمردي', bg: 'bg-emerald-500', text: 'text-emerald-400', ring: 'ring-emerald-500/20' },
  { id: 'amber', name: 'ذهبي', bg: 'bg-amber-500', text: 'text-amber-400', ring: 'ring-amber-500/20' },
];

export default function PomodoroTimer() {
  const { user } = useAuth();
  const [mode, setMode] = useState<TimerMode>('work');
  const [workDuration, setWorkDuration] = useState(25);
  const [breakDuration, setBreakDuration] = useState(5);
  const [accentId, setAccentId] = useState('blue');
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // We use the custom hook which uses the Web Worker internally
  const { timeLeft, isActive, start, pause, reset, setTimeLeft } = useWebWorkerTimer(
    workDuration * 60,
    () => handleTimerComplete() // Callback when timer ends
  );

  const accent = COLORS.find(c => c.id === accentId) || COLORS[0];

  // Helper to sync changes to Supabase
  const persistSettings = async (newWork: number, newBreak: number, newColor: string) => {
    if (user) {
      await supabase.from('profiles').update({
        pomodoro_settings: { work: newWork, break: newBreak, color: newColor }
      }).eq('id', user.id);
    }
  };

  const handleTimerComplete = () => {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audio.play().catch(() => {});
    
    // Auto-switch mode
    const nextMode = mode === 'work' ? 'break' : 'work';
    setMode(nextMode);
    reset(nextMode === 'work' ? workDuration * 60 : breakDuration * 60);
  };

  const toggleTimer = () => {
    if (isActive) {
      pause();
    } else {
      start(); // Resume
    }
  };

  const handleReset = () => {
    reset(mode === 'work' ? workDuration * 60 : breakDuration * 60);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const totalTime = mode === 'work' ? workDuration * 60 : breakDuration * 60;
  const progress = ((totalTime - timeLeft) / totalTime) * 100;

  // -- Data Syncing --
  useEffect(() => {
    if (user) {
      const fetchSettings = async () => {
        const { data } = await supabase.from('profiles').select('pomodoro_settings').eq('id', user.id).single();
        if (data?.pomodoro_settings) {
          setWorkDuration(data.pomodoro_settings.work);
          setBreakDuration(data.pomodoro_settings.break);
          setAccentId(data.pomodoro_settings.color);
          
          // Only update timeLeft if timer is NOT running to avoid jumping
          if (!isActive) {
             const newDur = mode === 'work' ? data.pomodoro_settings.work : data.pomodoro_settings.break;
             setTimeLeft(newDur * 60);
          }
        }
      };
      
      fetchSettings();

      const channel = supabase.channel(`pomo-${user.id}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` }, (payload: any) => {
            const s = payload.new.pomodoro_settings;
            if (s) {
                setWorkDuration(s.work);
                setBreakDuration(s.break);
                setAccentId(s.color);
            }
        })
        .subscribe();

      return () => { channel.unsubscribe(); };
    }
  }, [user]);

  // If settings change while inactive, update display
  useEffect(() => {
    if (!isActive) {
       setTimeLeft(mode === 'work' ? workDuration * 60 : breakDuration * 60);
    }
  }, [workDuration, breakDuration, mode]);


  return (
    <>
      {/* Expanded Overlay */}
      {isExpanded && (
        <div 
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[90] animate-in fade-in duration-300"
          onClick={() => setIsExpanded(false)}
        />
      )}

      {/* Main Dock Container */}
      <div 
        className={twMerge(
          "fixed bottom-6 z-[200] transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]",
          isExpanded 
            ? "right-1/2 translate-x-1/2 bottom-1/2 translate-y-1/2 w-[90%] max-w-sm" // Centered on screen
            : "right-6 w-auto" // Bottom Right Dock
        )}
      >
        {/* The Card Itself */}
        <div className={twMerge(
            "relative bg-slate-900/90 backdrop-blur-2xl border border-slate-800 shadow-2xl overflow-hidden transition-all duration-500",
            isExpanded ? "rounded-[2.5rem] p-8" : "rounded-full p-2 pr-6 hover:bg-slate-800/80 cursor-pointer group"
        )}>
            
            {/* --- Mini Mode UI --- */}
            {!isExpanded && (
                <div className="flex items-center gap-4" onClick={() => setIsExpanded(true)}>
                    <div className="flex items-center gap-3">
                         {/* Mini Progress Ring */}
                         <div className="relative w-10 h-10 flex items-center justify-center">
                            <svg className="w-full h-full -rotate-90">
                                <circle cx="20" cy="20" r="18" fill="none" strokeWidth="3" className="stroke-slate-800" />
                                <circle 
                                    cx="20" cy="20" r="18" fill="none" strokeWidth="3" 
                                    className={twMerge("transition-all duration-500", accent.text)}
                                    strokeDasharray={113}
                                    strokeDashoffset={113 - (113 * progress) / 100}
                                    strokeLinecap="round"
                                />
                            </svg>
                            <span className="absolute inset-0 flex items-center justify-center">
                                {isActive 
                                    ? <Pause className={twMerge("w-4 h-4 fill-current", accent.text)} />
                                    : <Play className={twMerge("w-4 h-4 fill-current ml-0.5", accent.text)} />
                                }
                            </span>
                         </div>
                         
                         <div className="flex flex-col">
                             <span className={twMerge("text-lg font-bold font-mono leading-none tabular-nums", accent.text)}>
                                {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
                             </span>
                             <span className="text-[10px] text-slate-500 font-medium">
                                {mode === 'work' ? 'وقت التركيز' : 'استراحة'}
                             </span>
                         </div>
                    </div>

                    <div className="w-px h-8 bg-slate-800 mx-1" />
                    
                    <button 
                        onClick={(e) => { e.stopPropagation(); toggleTimer(); }}
                        className={twMerge(
                            "p-2 rounded-full transition-all active:scale-95 hover:bg-white/5",
                            isActive ? "bg-amber-500/10 text-amber-500" : "text-slate-400"
                        )}
                    >
                         {isActive ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                    </button>
                </div>
            )}

            {/* --- Expanded Mode UI --- */}
            {isExpanded && (
                <div className="flex flex-col items-center animate-in slide-in-from-bottom-8 duration-500">
                    
                    {/* Header */}
                    <div className="w-full flex justify-between items-center mb-8">
                        <button 
                             onClick={() => setShowSettings(!showSettings)}
                             className={twMerge("p-2 rounded-xl transition-all", showSettings ? "bg-slate-800 text-white" : "text-slate-500 hover:text-slate-300")}
                        >
                            <Settings className="w-5 h-5" />
                        </button>
                        
                        <div className="bg-slate-950/50 p-1 rounded-full border border-slate-800 flex text-xs font-bold">
                             <button 
                                onClick={() => { setMode('work'); reset(workDuration * 60); }}
                                className={twMerge(
                                    "px-4 py-1.5 rounded-full transition-all",
                                    mode === 'work' ? `${accent.bg} text-white shadow-lg` : "text-slate-500 hover:text-slate-300"
                                )}
                             >
                                تركيز
                             </button>
                             <button 
                                onClick={() => { setMode('break'); reset(breakDuration * 60); }}
                                className={twMerge(
                                    "px-4 py-1.5 rounded-full transition-all",
                                    mode === 'break' ? "bg-emerald-500 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
                                )}
                             >
                                راحة
                             </button>
                        </div>

                        <button onClick={() => setIsExpanded(false)}>
                            <ChevronDown className="w-6 h-6 text-slate-500 hover:text-white" />
                        </button>
                    </div>

                    {showSettings ? (
                        /* Settings View */
                        <div className="w-full space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="space-y-4">
                                <div className="flex justify-between text-sm font-bold text-slate-400">
                                    <span>مدة التركيز</span>
                                    <span className={accent.text}>{workDuration} دقيقة</span>
                                </div>
                                <input 
                                    type="range" min="5" max="60" step="5"
                                    value={workDuration}
                                    onChange={(e) => {
                                        const v = parseInt(e.target.value);
                                        setWorkDuration(v);
                                        persistSettings(v, breakDuration, accentId);
                                    }}
                                    className="w-full h-2 bg-slate-800 rounded-full appearance-none cursor-pointer accent-current" 
                                    style={{ color: 'var(--color-brand)' }} // Little hack for accent color
                                />
                            </div>

                             <div className="space-y-4">
                                <div className="flex justify-between text-sm font-bold text-slate-400">
                                    <span>مدة الراحة</span>
                                    <span className="text-emerald-400">{breakDuration} دقيقة</span>
                                </div>
                                <input 
                                    type="range" min="1" max="30" step="1"
                                    value={breakDuration}
                                    onChange={(e) => {
                                        const v = parseInt(e.target.value);
                                        setBreakDuration(v);
                                        persistSettings(workDuration, v, accentId);
                                    }}
                                    className="w-full h-2 bg-slate-800 rounded-full appearance-none cursor-pointer accent-emerald-500" 
                                />
                            </div>

                             <div className="pt-4 border-t border-slate-800">
                                <span className="text-xs font-bold text-slate-500 mb-3 block">لون المظهر</span>
                                <div className="flex justify-between">
                                    {COLORS.map(c => (
                                        <button
                                            key={c.id}
                                            onClick={() => {
                                                setAccentId(c.id);
                                                persistSettings(workDuration, breakDuration, c.id);
                                            }}
                                            className={twMerge(
                                                "w-8 h-8 rounded-full border-2 transition-all grid place-items-center",
                                                c.bg,
                                                accentId === c.id ? "border-white scale-110 shadow-lg" : "border-transparent opacity-50 hover:opacity-100"
                                            )}
                                        >
                                            {accentId === c.id && <Check className="w-4 h-4 text-white" />}
                                        </button>
                                    ))}
                                </div>
                             </div>

                             <button 
                                onClick={() => setShowSettings(false)}
                                className="w-full py-3 bg-slate-800 rounded-xl text-slate-300 font-bold hover:bg-slate-700 transition-all mt-4"
                             >
                                تم
                             </button>
                        </div>
                    ) : (
                        /* Timer View */
                        <>
                            {/* Big Circle */}
                            <div className="relative w-64 h-64 mb-8 grid place-items-center">
                                {/* Background glow */}
                                <div className={twMerge("absolute inset-0 rounded-full blur-3xl opacity-20 animate-pulse", mode === 'work' ? accent.bg : "bg-emerald-500")} />
                                
                                <svg className="w-full h-full -rotate-90 drop-shadow-2xl">
                                    <circle cx="128" cy="128" r="120" fill="none" strokeWidth="8" className="stroke-slate-950" />
                                    <circle cx="128" cy="128" r="120" fill="none" strokeWidth="8" className="stroke-slate-800/30" />
                                    <circle 
                                        cx="128" cy="128" r="120" fill="none" strokeWidth="8" 
                                        className={twMerge("transition-all duration-1000", mode === 'work' ? accent.text : "text-emerald-500")}
                                        strokeDasharray={753}
                                        strokeDashoffset={753 - (753 * progress) / 100}
                                        strokeLinecap="round"
                                    />
                                </svg>
                                
                                <div className="absolute flex flex-col items-center">
                                    {mode === 'work' 
                                        ? <Brain className={twMerge("w-8 h-8 mb-2 opacity-80", accent.text)} />
                                        : <Coffee className="w-8 h-8 mb-2 text-emerald-500 opacity-80" />
                                    }
                                    <span className={twMerge("text-6xl font-black font-mono tracking-tighter", mode === 'work' ? accent.text : "text-white")}>
                                        {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
                                    </span>
                                    <span className="text-sm font-bold text-slate-500 mt-1 uppercase tracking-widest">
                                        {isActive ? 'جاري التركيز...' : 'متوقف'}
                                    </span>
                                </div>
                            </div>

                            {/* Controls */}
                            <div className="flex items-center gap-6">
                                <button 
                                    onClick={handleReset}
                                    className="p-4 rounded-2xl bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-white transition-all hover:rotate-180 active:scale-90"
                                >
                                    <RotateCw className="w-6 h-6" />
                                </button>

                                <button 
                                    onClick={toggleTimer}
                                    className={twMerge(
                                        "p-6 rounded-[2rem] shadow-2xl transition-all active:scale-95 group relative overflow-hidden",
                                        isActive 
                                            ? "bg-amber-500 text-white shadow-amber-500/20" 
                                            : mode === 'work' ? `${accent.bg} text-white shadow-${accentId}-500/30` : "bg-emerald-500 text-white shadow-emerald-500/30"
                                    )}
                                >   
                                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 rounded-[2rem]" />
                                    {isActive ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
      </div>
    </>
  );
}
