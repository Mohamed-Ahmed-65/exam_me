import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { LogIn, UserPlus, Mail, Lock, AlertCircle, Loader2, Globe } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

const DISPOSABLE_DOMAINS = [
  'mailinator.com', 'tempmail.com', '10minutemail.com', 'guerrillamail.com',
  'sharklasers.com', 'dispostable.com', 'getnada.com', 'boun.cr'
];

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [country, setCountry] = useState<string>('Unknown');

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
    const domain = email.split('@')[1];
    if (DISPOSABLE_DOMAINS.includes(domain)) {
      return false;
    }
    return true;
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    // Validate Disposable Email
    if (isSignUp && !validateEmail(email)) {
      setError('عذراً، لا نقبل البريد الإلكتروني المؤقت. يرجى استخدام بريد حقيقي.');
      setLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              country: country,
            }
          }
        });
        if (error) throw error;
        
        // Profiles are usually created via DB triggers, 
        // but we'll ensure we can store it in metadata for now.
        setMessage('تأكد من بريدك الإلكتروني لتنشيط الحساب!');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ ما');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 font-sans" dir="rtl">
      <div className="w-full max-w-md space-y-8 animate-in fade-in zoom-in duration-500">
        {/* Logo/Header */}
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/20 rotate-3 hover:rotate-0 transition-transform duration-300">
            <span className="text-3xl">🎯</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">مخطط الامتحانات الذكي</h1>
          <p className="text-slate-400">سجل دخولك لحفظ بياناتك في السحاب</p>
          
          <div className="flex items-center justify-center gap-2 text-[10px] text-slate-500 bg-slate-900/50 w-fit mx-auto px-3 py-1 rounded-full border border-slate-800">
            <Globe className="w-3 h-3" />
            <span>موقعك المكتشف: {country}</span>
          </div>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-8 rounded-[2rem] shadow-2xl space-y-6">
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 mr-2">البريد الإلكتروني</label>
              <div className="relative group">
                <Mail className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@mail.com"
                  className="w-full bg-slate-950/50 border border-slate-800 focus:border-blue-500/50 rounded-xl px-12 py-3.5 outline-none transition-all placeholder:text-slate-700 text-white shadow-inner"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 mr-2">كلمة المرور</label>
              <div className="relative group">
                <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950/50 border border-slate-800 focus:border-blue-500/50 rounded-xl px-12 py-3.5 outline-none transition-all placeholder:text-slate-700 text-white shadow-inner"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm animate-in slide-in-from-top-2 duration-300">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            {message && (
              <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-500 text-sm animate-in slide-in-from-top-2 duration-300">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p>{message}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={twMerge(
                "w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white rounded-xl font-bold transition-all shadow-xl shadow-blue-500/20 active:scale-[0.98] flex items-center justify-center gap-3 mt-4",
                loading && "cursor-not-allowed"
              )}
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isSignUp ? (
                <>
                  <UserPlus className="w-5 h-5" />
                  <span>إنشاء حساب جديد</span>
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  <span>تسجيل الدخول</span>
                </>
              )}
            </button>
          </form>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-slate-900 border border-slate-800 px-4 py-1 text-slate-500 rounded-full">أو</span>
            </div>
          </div>

          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="w-full py-3 bg-transparent hover:bg-slate-800/50 text-slate-400 hover:text-white rounded-xl text-sm font-medium transition-all border border-transparent hover:border-slate-800"
          >
            {isSignUp ? 'لديك حساب بالفعل؟ سجل دخولك' : 'ليس لديك حساب؟ أنشئ حساباً جديداً'}
          </button>
        </div>

        {/* Footer */}
        <p className="text-center text-slate-600 text-xs">
          بواسطة الذكاء الاصطناعي لفريق DeepMind &copy; 2026
        </p>
      </div>
    </div>
  );
}
