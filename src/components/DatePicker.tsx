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
  placeholder = 'DD-MM-YYYY'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [typedValue, setTypedValue] = useState('');

  // Parse initial date or default to today
  const today = new Date();
  const parsedDate = useMemo(() => (value ? new Date(value) : null), [value]);
  const initialYear = parsedDate && !isNaN(parsedDate.getTime()) ? parsedDate.getFullYear() : today.getFullYear();
  const initialMonth = parsedDate && !isNaN(parsedDate.getTime()) ? parsedDate.getMonth() : today.getMonth();

  const [currentYear, setCurrentYear] = useState(initialYear);
  const [currentMonth, setCurrentMonth] = useState(initialMonth);

  // Format YYYY-MM-DD date string to DD-MM-YYYY
  const formattedValue = (dateVal: string) => {
    if (!dateVal) return '';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  };

  // Parse typed string of digits (e.g. 150726 or 15072026 or 15-07-2026) and return YYYY-MM-DD or null
  const parseAndValidateDate = (input: string): string | null => {
    const digits = input.replace(/\D/g, '');
    
    if (digits.length === 6) {
      const dd = parseInt(digits.substring(0, 2));
      const mm = parseInt(digits.substring(2, 4));
      const yy = parseInt(digits.substring(4, 6));
      // Standard year threshold: 40 or below -> 2000s, otherwise -> 1900s
      const year = yy <= 40 ? 2000 + yy : 1900 + yy;
      
      const d = new Date(year, mm - 1, dd);
      if (d.getFullYear() === year && d.getMonth() === mm - 1 && d.getDate() === dd) {
        return `${year}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
      }
    } else if (digits.length === 8) {
      const dd = parseInt(digits.substring(0, 2));
      const mm = parseInt(digits.substring(2, 4));
      const yyyy = parseInt(digits.substring(4, 8));
      
      const d = new Date(yyyy, mm - 1, dd);
      if (d.getFullYear() === yyyy && d.getMonth() === mm - 1 && d.getDate() === dd) {
        return `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
      }
    }
    return null;
  };

  // Sync year, month and typed value when parent value changes
  useEffect(() => {
    setTypedValue(formattedValue(value));
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
    for (let y = current - 70; y <= current + 5; y++) {
      years.push(y);
    }
    return years.sort((a, b) => b - a);
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTypedValue(val);

    const parsed = parseAndValidateDate(val);
    if (parsed) {
      onChange(parsed);
    }
  };

  const handleBlur = () => {
    const parsed = parseAndValidateDate(typedValue);
    if (parsed) {
      onChange(parsed);
      setTypedValue(formattedValue(parsed));
    } else {
      // Revert to original valid value
      setTypedValue(formattedValue(value));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
      setIsOpen(false);
    }
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
    <div className="relative font-sans" ref={containerRef}>
      <div 
        className="flex items-center justify-between border border-slate-200 rounded-lg bg-white hover:border-slate-300 transition-colors focus-within:ring-1 focus-within:ring-blue-500 overflow-hidden text-slate-700"
      >
        <input
          type="text"
          value={typedValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full px-3 py-2.5 text-sm bg-transparent font-medium focus:outline-none text-slate-800"
        />
        <div 
          onClick={() => setIsOpen(!isOpen)}
          className="px-3 py-2.5 cursor-pointer border-l border-slate-100 hover:bg-slate-50 flex items-center justify-center"
        >
          <CalendarIcon className="w-4 h-4 text-slate-400" />
        </div>
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
