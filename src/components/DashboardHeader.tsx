import { CalendarDays } from 'lucide-react';

export default function DashboardHeader() {
  const date = new Date().toLocaleDateString('ar-EG', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <header className="flex flex-col md:flex-row justify-between items-center bg-slate-900/50 p-6 rounded-2xl border border-slate-800 backdrop-blur-sm">
      <div className="text-center md:text-right mb-4 md:mb-0">
        <h1 className="text-2xl font-bold text-slate-100 mb-2">صباح الخير يا بطل 💪</h1>
        <p className="text-slate-400">كل ثانية بتقربك لحلمك، استمر!</p>
      </div>
      <div className="flex items-center gap-2 text-slate-300 bg-slate-800/50 px-4 py-2 rounded-xl border border-slate-700">
        <CalendarDays className="w-5 h-5 text-blue-400" />
        <span className="font-medium font-mono pt-1">{date}</span>
      </div>
    </header>
  );
}
