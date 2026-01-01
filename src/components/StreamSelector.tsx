import { FlaskConical } from 'lucide-react';
import type { Stream } from '../data/exams';

interface StreamSelectorProps {
  onSelect: (stream: Stream) => void;
}

export default function StreamSelector({ onSelect }: StreamSelectorProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 space-y-8 animate-in fade-in duration-700">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold text-slate-100">أهلاً بك يا بطل</h1>
        <p className="text-slate-400 text-lg">الشعبة الدراسية: علمي</p>
      </div>

      <div className="w-full max-w-sm">
        <button
          onClick={() => onSelect('scientific')}
          className="group relative w-full flex flex-col items-center p-8 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-blue-500/50 rounded-2xl transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-1"
        >
          <div className="p-4 bg-blue-500/10 rounded-full mb-4 group-hover:scale-110 transition-transform duration-300">
            <FlaskConical className="w-12 h-12 text-blue-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-100 mb-2">الشعبة العلمية</h2>
          <p className="text-slate-400 text-sm">رياضيات • فيزياء • كيمياء</p>
          <div className="absolute inset-0 border-2 border-transparent group-hover:border-blue-500/20 rounded-2xl transition-colors duration-300" />
          <div className="mt-6 px-6 py-2 bg-blue-500 text-white rounded-xl font-bold group-hover:bg-blue-600 transition-colors">
            دخول
          </div>
        </button>
      </div>
    </div>
  );
}

