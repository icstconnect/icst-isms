import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

interface DatePickerProps {
  value: string; // Format: YYYY-MM-DD
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  required = false,
  placeholder = 'Select Date'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse initial date or default to today
  const today = new Date();
  const parsedDate = useMemo(() => (value ? new Date(value) : null), [value]);
  const initialYear = parsedDate && !isNaN(parsedDate.getTime()) ? parsedDate.getFullYear() : today.getFullYear();
  const initialMonth = parsedDate && !isNaN(parsedDate.getTime()) ? parsedDate.getMonth() : today.getMonth();

  const [currentYear, setCurrentYear] = useState(initialYear);
  const [currentMonth, setCurrentMonth] = useState(initialMonth);

  // Sync year and month if value changes
  useEffect(() => {
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        setCurrentYear(d.getFullYear());
        setCurrentMonth(d.getMonth());
      }
    }
  }, [value]);

  // Close calendar popup if clicked outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const yearsRange = useMemo(() => {
    const current = new Date().getFullYear();
    const years = [];
    // Dynamic DOB range from 1950 to current year + 5
    for (let y = current - 70; y <= current + 5; y++) {
      years.push(y);
    }
    return years.sort((a, b) => b - a); // descending order
  }, []);

  const daysInMonth = useMemo(() => {
    return new Date(currentYear, currentMonth + 1, 0).getDate();
  }, [currentYear, currentMonth]);

  const firstDayIndex = useMemo(() => {
    return new Date(currentYear, currentMonth, 1).getDay();
  }, [currentYear, currentMonth]);

  const handleSelectDay = (day: number) => {
    const monthStr = String(currentMonth + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const dateString = `${currentYear}-${monthStr}-${dayStr}`;
    onChange(dateString);
    setIsOpen(false);
  };

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const formattedValue = () => {
    if (!value) return '';
    const d = new Date(value);
    if (isNaN(d.getTime())) return '';
    // Format: DD/MM/YYYY
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  const isSelected = (day: number) => {
    if (!value) return false;
    const d = new Date(value);
    if (isNaN(d.getTime())) return false;
    return d.getFullYear() === currentYear && d.getMonth() === currentMonth && d.getDate() === day;
  };

  const isToday = (day: number) => {
    return today.getFullYear() === currentYear && today.getMonth() === currentMonth && today.getDate() === day;
  };

  return (
    <div className="relative" ref={containerRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between border border-slate-200 p-2.5 text-sm rounded-lg bg-white cursor-pointer hover:border-slate-300 transition-colors focus-within:ring-1 focus-within:ring-blue-500 text-slate-700"
      >
        <span className={value ? 'text-slate-800 font-medium' : 'text-slate-400'}>
          {formattedValue() || placeholder}
        </span>
        <CalendarIcon className="w-4 h-4 text-slate-400" />
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl p-4 w-72 left-0 top-full select-none">
          {/* Calendar Header with Dropdowns */}
          <div className="flex items-center justify-between mb-3 border-b pb-2">
            <button 
              type="button"
              onClick={handlePrevMonth}
              className="p-1 hover:bg-slate-100 rounded text-slate-500 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex space-x-1.5">
              <select
                value={currentMonth}
                onChange={(e) => setCurrentMonth(Number(e.target.value))}
                className="text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 px-1 py-1 rounded cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {MONTHS.map((m, idx) => (
                  <option key={m} value={idx}>{m}</option>
                ))}
              </select>

              <select
                value={currentYear}
                onChange={(e) => setCurrentYear(Number(e.target.value))}
                className="text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 px-1 py-1 rounded cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {yearsRange.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <button 
              type="button"
              onClick={handleNextMonth}
              className="p-1 hover:bg-slate-100 rounded text-slate-500 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekdays row */}
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            <span>Su</span>
            <span>Mo</span>
            <span>Tu</span>
            <span>We</span>
            <span>Th</span>
            <span>Fr</span>
            <span>Sa</span>
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* prefix spacers */}
            {Array.from({ length: firstDayIndex }).map((_, idx) => (
              <span key={`empty-${idx}`} />
            ))}

            {/* active month days */}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const day = idx + 1;
              const selected = isSelected(day);
              const todayDay = isToday(day);

              return (
                <button
                  key={`day-${day}`}
                  type="button"
                  onClick={() => handleSelectDay(day)}
                  className={`h-7 w-7 text-xs rounded-full font-bold flex items-center justify-center transition-all cursor-pointer ${
                    selected 
                      ? 'bg-blue-600 text-white shadow-sm font-black' 
                      : todayDay
                      ? 'bg-blue-50 text-blue-600 border border-blue-200'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Quick Actions */}
          <div className="mt-3 pt-2 border-t border-slate-100 flex justify-between items-center text-[11px]">
            <button
              type="button"
              onClick={() => {
                const monthStr = String(today.getMonth() + 1).padStart(2, '0');
                const dayStr = String(today.getDate()).padStart(2, '0');
                onChange(`${today.getFullYear()}-${monthStr}-${dayStr}`);
                setIsOpen(false);
              }}
              className="text-blue-600 hover:underline font-bold cursor-pointer"
            >
              Select Today
            </button>
            {required && !value && (
              <span className="text-red-500 font-semibold">* Required</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
