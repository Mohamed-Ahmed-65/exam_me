import { useState, useEffect } from 'react';
import { Palette, Check, X } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

const THEMES = [
  { id: 'sapphire', name: 'ياقوتي (أزرق)', hex: '#3b82f6', data: 'sapphire' },
  { id: 'amethyst', name: 'أرجواني', hex: '#8b5cf6', data: 'amethyst' },
  { id: 'emerald', name: 'زمردي', hex: '#10b981', data: 'emerald' },
  { id: 'rose', name: 'وردي', hex: '#f43f5e', data: 'rose' },
  { id: 'amber', name: 'ذهبي', hex: '#f59e0b', data: 'amber' },
];

export default function ThemeSelector() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState('sapphire');

  useEffect(() => {
    // Load setting
    const saved = localStorage.getItem('app-theme') || 'sapphire';
    applyTheme(saved);
  }, []);

  const applyTheme = (themeId: string) => {
    setCurrentTheme(themeId);
    localStorage.setItem('app-theme', themeId);
    if (themeId === 'sapphire') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', themeId);
    }
  };

  const selectTheme = async (themeId: string) => {
    applyTheme(themeId);
    setIsOpen(false);

    if (user) {
      await supabase.from('profiles').update({
        theme_preference: themeId
      }).eq('id', user.id);
    }
  };

  return (
    <div className="fixed bottom-6 left-6 z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-12 h-12 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center text-slate-400 hover:text-white hover:border-brand transition-all shadow-2xl group"
      >
        <Palette className={twMerge("w-6 h-6 transition-transform", isOpen && "rotate-12 scale-110")} />
        
        {/* Tooltip */}
        {!isOpen && (
            <div className="absolute bottom-full mb-3 left-0 bg-slate-900 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-slate-800">
                تغيير المظهر
            </div>
        )}
      </button>

      {isOpen && (
        <div className="absolute bottom-16 left-0 bg-slate-900 border border-slate-800 p-4 rounded-3xl shadow-2xl min-w-[180px] animate-in slide-in-from-bottom-4 duration-300">
          <div className="flex justify-between items-center mb-4 px-2">
            <span className="text-xs font-bold text-slate-400">اختر لونك المفضل</span>
            <button onClick={() => setIsOpen(false)}><X className="w-4 h-4 text-slate-600 hover:text-white" /></button>
          </div>
          
          <div className="grid grid-cols-1 gap-2">
            {THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => selectTheme(t.id)}
                className={twMerge(
                  "flex items-center justify-between p-2.5 rounded-xl transition-all border",
                  currentTheme === t.id 
                    ? "bg-slate-800 border-slate-700" 
                    : "bg-transparent border-transparent hover:bg-slate-800/50"
                )}
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-5 h-5 rounded-lg shadow-lg" 
                    style={{ backgroundColor: t.hex }}
                  />
                  <span className={twMerge("text-xs font-bold", currentTheme === t.id ? "text-white" : "text-slate-400")}>
                    {t.name}
                  </span>
                </div>
                {currentTheme === t.id && <Check className="w-4 h-4 text-emerald-500" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
