import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getExamsByStream } from '../data/exams';
import type { Stream, Exam } from '../data/exams';
import DashboardHeader from './DashboardHeader';
import CountdownTimer from './CountdownTimer';
import ExamList from './ExamList';
import BrainDump from './BrainDump';
import { twMerge } from 'tailwind-merge';

interface DashboardProps {
  stream: Stream;
  onOpenSubTasks: (exam: Exam) => void;
}

export default function Dashboard({ stream, onOpenSubTasks }: DashboardProps) {
  const exams = getExamsByStream(stream);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 pb-24 flex overflow-hidden">
      {/* Main Content Area */}
      <div className={twMerge(
        "flex-1 transition-all duration-700 ease-in-out",
        isSidebarOpen ? "mr-[20rem] md:mr-[24rem]" : "mr-0"
      )}>
        <div className="max-w-5xl mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-500">
          
          {/* Header & Controls */}
          <div className="space-y-6">
              <div className="flex justify-between items-start">
                 <DashboardHeader />
              </div>
              
              <CountdownTimer exams={exams} />
          </div>


          {/* Main Content */}
          <main>
            <div className="flex items-center gap-4 mb-6">
              <h2 className="text-xl font-bold text-slate-200 border-r-4 border-blue-500 pr-4">
                جدول الامتحانات
              </h2>
              <div className="h-px bg-slate-800 flex-1" />
            </div>
            
            <ExamList stream={stream} onOpenSubTasks={onOpenSubTasks} />
          </main>
        </div>
      </div>

      {/* Vertical Toggle Bar */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className={twMerge(
          "fixed top-0 bottom-0 z-50 w-6 group flex items-center justify-center transition-all duration-700",
          isSidebarOpen ? "right-[20rem] md:right-[24rem]" : "right-0"
        )}
      >
        {/* Visual Line */}
        <div className="absolute inset-y-0 right-0 w-px bg-slate-800 group-hover:bg-blue-500/30 transition-colors" />
        
        {/* Toggle Handle */}
        <div className={twMerge(
          "relative z-10 w-8 h-12 bg-slate-900 border border-slate-800 rounded-l-xl flex items-center justify-center text-slate-400 group-hover:text-blue-400 shadow-xl transition-all",
          !isSidebarOpen && "translate-x-full opacity-0 group-hover:translate-x-0 group-hover:opacity-100"
        )}>
          {isSidebarOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4 ml-1" />}
        </div>

        {/* Floating Label when closed */}
        {!isSidebarOpen && (
          <div className="absolute top-1/2 -translate-y-1/2 right-8 flex flex-col items-center gap-2 group-hover:opacity-100 opacity-0 transition-opacity">
            <div className="[writing-mode:vertical-rl] text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
              فرغ دماغك
            </div>
          </div>
        )}
      </button>

      {/* Side Sidebar Panel */}
      <aside className={twMerge(
        "fixed top-0 bottom-0 right-0 z-40 bg-slate-950 transition-all duration-700 ease-in-out border-l border-slate-800",
        isSidebarOpen ? "w-[20rem] md:w-[24rem]" : "w-0 overflow-hidden border-none"
      )}>
        <BrainDump />
      </aside>
    </div>
  );
}
