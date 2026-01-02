import React, { useState } from 'react';
import { 
  format, addMonths, subMonths, startOfMonth, endOfMonth, 
  startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, 
  isSameDay, isToday 
} from 'date-fns';
import { arEG } from 'date-fns/locale';
import { ChevronRight, ChevronLeft, Calendar as CalendarIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { twMerge } from 'tailwind-merge';

interface CustomDatePickerProps {
  selectedDate: Date | null;
  onChange: (date: Date) => void;
  onClose: () => void;
}

export default function CustomDatePicker({ selectedDate, onChange, onClose }: CustomDatePickerProps) {
  const [currentMonth, setCurrentMonth] = useState(selectedDate || new Date());

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 6 }), // Start on Saturday (Common in Egypt)
    end: endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 6 })
  });

  const weekDays = ['سبت', 'أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة'];

  return (
    <>
        {/* Backdrop */}
        <div className="fixed inset-0 z-[60]" onClick={onClose} />
        
        {/* Calendar Modal */}
        <motion.div 
            initial={{ opacity: 0, scale: 0.9, x: '-50%', y: '-50%' }}
            animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%' }}
            exit={{ opacity: 0, scale: 0.9, x: '-50%', y: '-50%' }}
            transition={{ type: "spring", duration: 0.3 }}
            className="fixed top-1/2 left-1/2 w-72 bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl z-[200] overflow-hidden origin-center"
        >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
                <button onClick={prevMonth} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
                    <ChevronRight className="w-5 h-5" />
                </button>
                <h3 className="text-sm font-bold text-white capitalize">
                    {format(currentMonth, 'MMMM yyyy', { locale: arEG })}
                </h3>
                <button onClick={nextMonth} className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
                    <ChevronLeft className="w-5 h-5" />
                </button>
            </div>

            {/* Grid */}
            <div className="p-4">
                {/* Week Days */}
                <div className="grid grid-cols-7 mb-2 text-center">
                    {weekDays.map(day => (
                        <span key={day} className="text-[10px] font-bold text-slate-500 uppercase">{day}</span>
                    ))}
                </div>

                {/* Days */}
                <div className="grid grid-cols-7 gap-1">
                    {days.map((day, i) => {
                        const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
                        const isCurrentMonth = isSameMonth(day, currentMonth);
                        const isTodayDate = isToday(day);

                        return (
                            <button
                                key={i}
                                onClick={() => { onChange(day); onClose(); }}
                                className={twMerge(
                                    "h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all relative",
                                    !isCurrentMonth && "text-slate-700",
                                    isCurrentMonth && !isSelected && "text-slate-300 hover:bg-slate-800",
                                    isSelected && "bg-blue-600 text-white shadow-lg shadow-blue-600/20 scale-105",
                                    isTodayDate && !isSelected && "text-blue-400 bg-blue-500/10 border border-blue-500/20"
                                )}
                            >
                                {format(day, 'd')}
                                {isTodayDate && !isSelected && (
                                    <div className="absolute -bottom-0.5 w-1 h-1 bg-blue-500 rounded-full" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
            
            {/* Quick Actions */}
            <div className="p-3 bg-slate-950/30 border-t border-slate-800 flex justify-center">
                 <button 
                    onClick={() => { onChange(new Date()); onClose(); }}
                    className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-blue-500/10 transition-colors"
                 >
                     <CalendarIcon className="w-3.5 h-3.5" />
                     اليوم
                 </button>
            </div>
        </motion.div>
    </>
  );
}
