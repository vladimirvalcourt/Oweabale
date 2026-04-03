import React, { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, AlertCircle } from 'lucide-react';

export default function Calendar() {
  const { bills, subscriptions } = useStore();
  const [currentDate, setCurrentDate] = useState(new Date());

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const monthName = currentDate.toLocaleString('default', { month: 'long' });
  const year = currentDate.getFullYear();

  // Map events to days
  const eventsByDay = useMemo(() => {
    const events: Record<number, any[]> = {};
    
    // Add bills
    bills.forEach(bill => {
      const billDate = new Date(bill.dueDate);
      // If it's a monthly bill, we might want to show it in the current month even if the year/month doesn't match exactly, 
      // but for simplicity, let's just check if the day matches for monthly, or exact date.
      // A better approach is to check if the bill is due this month based on frequency.
      // For this simple calendar, we'll just map the day of the month if it's active.
      
      // Let's just use the day of the month for all bills/subs for the current view
      const day = billDate.getDate();
      if (!events[day]) events[day] = [];
      events[day].push({ ...bill, type: 'bill' });
    });

    // Add subscriptions
    subscriptions.forEach(sub => {
      if (sub.status !== 'active') return;
      const subDate = new Date(sub.nextBillingDate);
      const day = subDate.getDate();
      if (!events[day]) events[day] = [];
      events[day].push({ ...sub, type: 'subscription' });
    });

    return events;
  }, [bills, subscriptions, currentDate]);

  const renderDays = () => {
    const days = [];
    const today = new Date();
    const isCurrentMonth = today.getMonth() === currentDate.getMonth() && today.getFullYear() === currentDate.getFullYear();

    // Empty cells for days before the 1st
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="min-h-[100px] p-2 border border-[#262626] bg-[#0A0A0A]/50"></div>);
    }

    // Actual days
    for (let day = 1; day <= daysInMonth; day++) {
      const isToday = isCurrentMonth && day === today.getDate();
      const dayEvents = eventsByDay[day] || [];
      const totalDue = dayEvents.reduce((sum, e) => sum + e.amount, 0);

      days.push(
        <div key={day} className={`min-h-[100px] p-2 border border-[#262626] ${isToday ? 'bg-indigo-500/10 border-indigo-500/50' : 'bg-[#141414]'} transition-colors hover:bg-[#1C1C1C]`}>
          <div className="flex justify-between items-start mb-2">
            <span className={`text-sm font-medium ${isToday ? 'text-indigo-400 bg-indigo-500/20 w-6 h-6 rounded-full flex items-center justify-center' : 'text-zinc-400'}`}>
              {day}
            </span>
            {totalDue > 0 && (
              <span className="text-xs font-bold text-red-400">${totalDue.toLocaleString()}</span>
            )}
          </div>
          <div className="space-y-1">
            {dayEvents.map((event, idx) => (
              <div 
                key={idx} 
                className={`text-[10px] px-1.5 py-1 rounded truncate ${
                  event.type === 'bill' 
                    ? event.status === 'paid' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                    : 'bg-purple-500/20 text-purple-400'
                }`}
                title={`${event.biller || event.name} - $${event.amount}`}
              >
                {event.biller || event.name}
              </div>
            ))}
          </div>
        </div>
      );
    }

    return days;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#FAFAFA]">Bill Calendar</h1>
          <p className="text-sm text-zinc-400 mt-1">Visualize your upcoming payments and expensive weeks.</p>
        </div>
        <div className="flex items-center gap-4 bg-[#141414] border border-[#262626] rounded-lg p-1">
          <button onClick={prevMonth} className="p-2 hover:bg-[#262626] rounded-md transition-colors text-zinc-400 hover:text-[#FAFAFA]">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="w-32 text-center font-medium text-[#FAFAFA]">
            {monthName} {year}
          </div>
          <button onClick={nextMonth} className="p-2 hover:bg-[#262626] rounded-md transition-colors text-zinc-400 hover:text-[#FAFAFA]">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="bg-[#141414] rounded-lg border border-[#262626] overflow-hidden">
        {/* Days of week header */}
        <div className="grid grid-cols-7 border-b border-[#262626] bg-[#0A0A0A]">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="py-3 text-center text-xs font-medium text-zinc-500 uppercase tracking-wider">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar Grid */}
        <div className="grid grid-cols-7">
          {renderDays()}
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-sm text-zinc-400">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-red-500/20 border border-red-500/50"></div>
          <span>Unpaid Bill</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-emerald-500/20 border border-emerald-500/50"></div>
          <span>Paid Bill</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-purple-500/20 border border-purple-500/50"></div>
          <span>Subscription</span>
        </div>
      </div>
    </div>
  );
}
