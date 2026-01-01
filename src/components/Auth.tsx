import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { LogIn, UserPlus, Mail, Lock, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

const DISPOSABLE_DOMAINS = [
  'mailinator.com', 'tempmail.com', '10minutemail.com', 'guerrillamail.com',
  'sharklasers.com', 'dispostable.com', 'getnada.com', 'boun.cr'
];

const TYPO_DOMAINS: { [key: string]: string } = {
  'gmial.com': 'gmail.com',
  'gamil.com': 'gmail.com',
  'gmal.com': 'gmail.com',
  'gnail.com': 'gmail.com',
  'hotmial.com': 'hotmail.com',
  'hotnail.com': 'hotmail.com',
  'yaho.com': 'yahoo.com',
  'outlok.com': 'outlook.com',
};

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [view, setView] = useState<'login' | 'signup' | 'reset'>('login');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [country, setCountry] = useState<string>('Unknown');
  const [suggestion, setSuggestion] = useState<string | null>(null);

  // Detect Country on mount
  useEffect(() => {
    fetch('https://ipapi.co/json/')
      .then(res => res.json())
      .then(data => {
        if (data.country_name) setCountry(data.country_name);
      })
      .catch(() => console.error('Failed to detect country'));
  }, []);

  const validateEmail = (email: string) => {
    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain) return { valid: true };

    if (DISPOSABLE_DOMAINS.includes(domain)) {
      return { valid: false, error: 'عذراً، لا نقبل البريد الإلكتروني المؤقت. يرجى استخدام بريد حقيقي.' };
    }

    if (TYPO_DOMAINS[domain]) {
      return { valid: true, suggestion: TYPO_DOMAINS[domain] };
    }

    return { valid: true };
  };

  useEffect(() => {
    const result = validateEmail(email);
    if (result.suggestion) {
      setSuggestion(result.suggestion);
    } else {
      setSuggestion(null);
    }
  }, [email]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const validation = validateEmail(email);
    if (!validation.valid) {
      setError(validation.error || 'بريد غير صالح');
      setLoading(false);
      return;
    }

    try {
      if (view === 'signup') {
        const { error, data } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              country: country,
            }
          }
        });
        if (error) throw error;
        
        if (data.user && data.session) {
          setMessage('تم إنشاء الحساب بنجاح! يتم الآن تسجيل دخولك...');
        } else {
          setMessage('تم إنشاء الحساب! يمكنك الآن تسجيل الدخول.');
          setView('login');
        }
      } else if (view === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else if (view === 'reset') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        });
        if (error) throw error;
        setMessage('تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك!');
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ ما');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 font-sans selection:bg-blue-500/30" dir="rtl">
      <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-1000">
        {/* Logo/Header */}
        <div className="text-center space-y-4 animate-in fade-in slide-in-from-top-4 duration-700 delay-150">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/30 rotate-3 hover:rotate-0 hover:scale-110 transition-all duration-500 cursor-default">
            <span className="text-3xl animate-bounce-slow">🎯</span>
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-white tracking-tight">مخطط الامتحانات الذكي</h1>
            <p className="text-slate-400 text-sm">
              {view === 'reset' ? 'إعادة تعيين كلمة المرور' : 'سجل دخولك لحفظ بياناتك في السحاب'}
            </p>
          </div>
        </div>

        <div className="bg-slate-900/40 backdrop-blur-2xl border border-slate-800/60 p-8 rounded-[2.5rem] shadow-2xl space-y-6 animate-in zoom-in-95 duration-700 delay-300">
          <form onSubmit={handleAuth} className="space-y-5">
            <div className="space-y-2 group">
              <label className="text-xs font-bold text-slate-500 mr-2 uppercase tracking-widest group-focus-within:text-blue-400 transition-colors">البريد الإلكتروني</label>
              <div className="relative">
                <Mail className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-500 transition-all duration-300" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className={twMerge(
                    "w-full bg-slate-950/40 border border-slate-800 focus:border-blue-500/50 rounded-2xl px-12 py-4 outline-none transition-all placeholder:text-slate-700 text-white shadow-inner focus:shadow-blue-500/5",
                    suggestion && "border-amber-500/50"
                  )}
                />
              </div>
              {suggestion && (
                <p className="text-[11px] text-amber-400 mr-2 animate-in fade-in slide-in-from-right-2">
                  هل تقصد <button type="button" onClick={() => setEmail(email.split('@')[0] + '@' + suggestion)} className="font-bold underline hover:text-amber-300 transition-colors">{suggestion}</button>؟
                </p>
              )}
            </div>

            {view !== 'reset' && (
              <div className="space-y-2 group">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-slate-500 mr-2 uppercase tracking-widest group-focus-within:text-blue-400 transition-colors">كلمة المرور</label>
                  {view === 'login' && (
                    <button 
                      type="button" 
                      onClick={() => setView('reset')}
                      className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors font-bold"
                    >
                      نسيت كلمة المرور؟
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-500 transition-all duration-300" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-950/40 border border-slate-800 focus:border-blue-500/50 rounded-2xl px-12 py-4 outline-none transition-all placeholder:text-slate-700 text-white shadow-inner focus:shadow-blue-500/5"
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-sm animate-in slide-in-from-top-2 duration-300">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            {message && (
              <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-500 text-sm animate-in slide-in-from-top-2 duration-300">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <p>{message}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={twMerge(
                "w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-slate-800 disabled:to-slate-800 text-white rounded-2xl font-bold transition-all shadow-xl shadow-blue-500/20 active:scale-[0.98] flex items-center justify-center gap-3 mt-6 relative overflow-hidden group",
                loading && "cursor-not-allowed"
              )}
            >
              <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : view === 'signup' ? (
                <>
                  <UserPlus className="w-5 h-5 transition-transform group-hover:scale-110" />
                  <span>إنشاء حساب جديد</span>
                </>
              ) : view === 'login' ? (
                <>
                  <LogIn className="w-5 h-5 transition-transform group-hover:translate-x-[-4px]" />
                  <span>تسجيل الدخول</span>
                </>
              ) : (
                <>
                  <Mail className="w-5 h-5" />
                  <span>إرسال رابط الاستعادة</span>
                </>
              )}
            </button>
          </form>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800/50"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-[#0b1121] px-4 py-1 text-slate-500 font-medium">أو</span>
            </div>
          </div>

          <button
            onClick={() => {
              setView(view === 'signup' ? 'login' : 'signup');
              setError(null);
              setMessage(null);
            }}
            className="w-full py-4 bg-slate-800/30 hover:bg-slate-800/50 text-slate-400 hover:text-white rounded-2xl text-sm font-medium transition-all border border-slate-800"
          >
            {view === 'signup' ? 'لديك حساب بالفعل؟ سجل دخولك' : 'ليس لديك حساب؟ أنشئ حساباً جديداً'}
          </button>
          
          {view === 'reset' && (
            <button
              onClick={() => {
                setView('login');
                setError(null);
                setMessage(null);
              }}
              className="w-full mt-2 text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              العودة لتسجيل الدخول
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="text-center space-y-4 animate-in fade-in duration-1000 delay-500">
          <p className="text-slate-600 text-[11px] font-medium tracking-widest flex items-center justify-center gap-2">
            MADE WITH <span className="text-rose-500 animate-pulse">❤️</span> 2026
          </p>
        </div>
      </div>
    </div>
  );
}
