/**
 * Calendar — Financial Events Calendar
 * Full monthly grid showing bills, income, subscriptions, and goals from the store.
 */
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, Receipt, TrendingUp, Repeat, Target, CalendarDays
} from 'lucide-react';
import { CollapsibleModule } from '../components/common';
import { useStore } from '../store';
import { getCustomIcon } from '../lib/utils';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

interface CalendarEvent {
  id: string;
  date: number; // day of month
  label: string;
  amount?: number;
  type: 'bill' | 'income' | 'subscription' | 'goal';
}

interface PopoverState {
  day: number;
  events: CalendarEvent[];
  x: number;
  y: number;
} 

export default function Calendar() {
  const CalendarIcon = getCustomIcon('calendar');
  const OverviewIcon = getCustomIcon('overview');
  const location = useLocation();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [popover, setPopover] = useState<PopoverState | null>(null);

  const { bills, incomes, subscriptions, goals, transactions } = useStore();

  useEffect(() => {
    if (!popover) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPopover(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [popover]);

  useEffect(() => {
    if (location.hash === '#calendar-view') {
      requestAnimationFrame(() => {
        document.getElementById('calendar-view')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }, [location.hash]);

  const prevMonth = useCallback(() => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
    setPopover(null);
  }, [month]);
  const nextMonth = useCallback(() => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
    setPopover(null);
  }, [month]);

  // Calendar grid
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;

  // Build events map: day -> events[]
  const eventsByDay = useMemo(() => {
    const map = new Map<number, CalendarEvent[]>();

    const addEvent = (day: number, event: CalendarEvent) => {
      const list = map.get(day) || [];
      map.set(day, [...list, event]);
    };

    // Bills
    bills.forEach(b => {
      const d = new Date(b.dueDate);
      if (d.getFullYear() === year && d.getMonth() === month) {
        addEvent(d.getDate(), { id: `bill-${b.id}`, date: d.getDate(), label: b.biller, amount: b.amount, type: 'bill' });
      }
    });

    // Income
    incomes.filter(i => i.status === 'active').forEach(inc => {
      const d = new Date(inc.nextDate);
      if (d.getFullYear() === year && d.getMonth() === month) {
        addEvent(d.getDate(), { id: `inc-${inc.id}`, date: d.getDate(), label: inc.name, amount: inc.amount, type: 'income' });
      }
    });

    // Subscriptions
    subscriptions.filter(s => s.status === 'active').forEach(sub => {
      const d = new Date(sub.nextBillingDate);
      if (d.getFullYear() === year && d.getMonth() === month) {
        addEvent(d.getDate(), { id: `sub-${sub.id}`, date: d.getDate(), label: sub.name, amount: sub.amount, type: 'subscription' });
      }
    });

    // Goals
    goals.forEach(g => {
      const d = new Date(g.deadline);
      if (d.getFullYear() === year && d.getMonth() === month) {
        addEvent(d.getDate(), { id: `goal-${g.id}`, date: d.getDate(), label: g.name, type: 'goal' });
      }
    });

    return map;
  }, [bills, incomes, subscriptions, goals, year, month]);

  const monthCashPressure = useMemo(() => {
    const monthlyIncome = incomes
      .filter((i) => i.status === 'active' && i.nextDate)
      .filter((i) => {
        const d = new Date(i.nextDate);
        return d.getFullYear() === year && d.getMonth() === month;
      })
      .reduce((sum, i) => sum + (i.amount || 0), 0);

    const monthlyBills = bills
      .filter((b) => b.dueDate)
      .filter((b) => {
        const d = new Date(b.dueDate);
        return d.getFullYear() === year && d.getMonth() === month;
      })
      .reduce((sum, b) => sum + (b.amount || 0), 0);

    const monthlySubscriptions = subscriptions
      .filter((s) => s.status === 'active' && s.nextBillingDate)
      .filter((s) => {
        const d = new Date(s.nextBillingDate);
        return d.getFullYear() === year && d.getMonth() === month;
      })
      .reduce((sum, s) => sum + (s.amount || 0), 0);

    const dueTotal = monthlyBills + monthlySubscriptions;
    const ratio = monthlyIncome > 0 ? (dueTotal / monthlyIncome) * 100 : null;
    return { monthlyIncome, dueTotal, ratio };
  }, [bills, incomes, subscriptions, year, month]);

  const billIncreaseAlerts = useMemo(() => {
    const alerts: Array<{ billId: string; biller: string; previous: number; current: number; pct: number }> = [];
    for (const bill of bills) {
      const matches = (transactions || [])
        .filter((tx) => tx.type === 'expense')
        .filter((tx) => {
          const txName = tx.name.toLowerCase();
          const biller = bill.biller.toLowerCase();
          return txName.includes(biller) || biller.includes(txName);
        })
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      if (matches.length < 2) continue;
      const previous = matches[matches.length - 2]?.amount ?? 0;
      const current = matches[matches.length - 1]?.amount ?? 0;
      if (previous <= 0 || current <= previous) continue;
      const pct = ((current - previous) / previous) * 100;
      if (pct < 5) continue;
      alerts.push({ billId: bill.id, biller: bill.biller, previous, current, pct });
    }
    return alerts.sort((a, b) => b.pct - a.pct);
  }, [bills, transactions]);

  const EVENT_CONFIG = {
    bill: { color: 'bg-red-500', text: 'text-red-400', icon: Receipt },
    income: { color: 'bg-emerald-500', text: 'text-emerald-400', icon: TrendingUp },
    subscription: { color: 'bg-amber-500', text: 'text-amber-400', icon: Repeat },
    goal: { color: 'bg-blue-500', text: 'text-blue-400', icon: Target },
  };

  const handleDayClick = useCallback((dayNum: number, e: React.MouseEvent<HTMLDivElement>) => {
    const events = eventsByDay.get(dayNum);
    if (!events || events.length === 0) { setPopover(null); return; }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPopover({ day: dayNum, events, x: rect.left, y: rect.bottom + window.scrollY + 4 });
  }, [eventsByDay]);

  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    if (!(e.target as HTMLElement).closest('[data-day]')) setPopover(null);
  }, []);

  return (
    <div className="space-y-6" onClick={handleContainerClick}>
      {/* Header anchor for Pay List details month view */}
      <div
        id="calendar-view"
        className="scroll-mt-24 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-content-primary sm:text-3xl">Financial calendar</h1>
          <p className="text-sm text-content-tertiary mt-1">
            All financial events plotted in time. Pairs with the 30 / 60 / 90 outlook on Pay List details.
          </p>
        </div>
        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4">
          {(['bill', 'income', 'subscription', 'goal'] as const).map(type => {
            const cfg = EVENT_CONFIG[type];
            return (
              <div key={type} className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-none ${cfg.color}`} />
                <span className="text-[11px] font-mono text-content-tertiary capitalize">{type}</span>
              </div>
            );
          })}
        </div>
      </div>      {/* Month Navigation & Grid */}
      <CollapsibleModule 
        title="Financial Calendar"
        icon={CalendarIcon}
        extraHeader={<span className="text-[10px] font-mono text-content-tertiary uppercase tracking-widest">{Array.from(eventsByDay.values()).flat().length} Events Detected</span>}
      >
        <div className="bg-surface-raised border border-surface-border rounded-lg overflow-hidden -mx-6 -my-6">
          {billIncreaseAlerts.length > 0 && (
            <div className="px-6 py-3 border-b border-amber-500/30 bg-amber-500/10">
              <p className="text-xs text-amber-200 font-medium">
                Bill amount changes detected: {billIncreaseAlerts.length} {billIncreaseAlerts.length === 1 ? 'service' : 'services'} increased recently.
              </p>
              <p className="mt-1 text-[11px] text-content-secondary">
                {billIncreaseAlerts
                  .slice(0, 2)
                  .map((a) => `${a.biller} +${a.pct.toFixed(0)}%`)
                  .join(' • ')}
              </p>
            </div>
          )}
          <div className="px-6 py-3 border-b border-surface-border bg-surface-base/80">
            <p className="text-xs text-content-secondary">
              Due this month: <span className="font-mono text-content-primary">${monthCashPressure.dueTotal.toFixed(0)}</span>
              {monthCashPressure.monthlyIncome > 0 ? (
                <>
                  {' '}vs income{' '}
                  <span className="font-mono text-content-primary">${monthCashPressure.monthlyIncome.toFixed(0)}</span>
                  {' '}(
                  <span className={monthCashPressure.ratio !== null && monthCashPressure.ratio >= 80 ? 'text-amber-300 font-medium' : 'text-content-primary'}>
                    {monthCashPressure.ratio?.toFixed(0)}%
                  </span>
                  ).
                </>
              ) : (
                ' (add income events for ratio context).'
              )}
            </p>
          </div>
          <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border bg-surface-elevated">
            <button
              onClick={prevMonth}
              className="p-1.5 text-content-tertiary hover:text-content-primary hover:bg-surface-border rounded-lg transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="text-center">
              <h2 className="text-base font-mono font-bold text-content-primary uppercase tracking-widest">
                {MONTHS[month]} {year}
              </h2>
            </div>
            <button
              onClick={nextMonth}
              className="p-1.5 text-content-tertiary hover:text-content-primary hover:bg-surface-border rounded-lg transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Day Labels */}
          <div className="grid grid-cols-7 border-b border-surface-border bg-surface-base">
            {DAYS.map(d => (
              <div key={d} className="py-2 text-center text-[10px] font-mono text-content-secondary uppercase tracking-wider">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7">
            {Array.from({ length: totalCells }, (_, i) => {
              const dayNum = i - firstDay + 1;
              const isCurrentMonth = dayNum >= 1 && dayNum <= daysInMonth;
              const isToday = isCurrentMonth && dayNum === today.getDate() && month === today.getMonth() && year === today.getFullYear();
              const events = isCurrentMonth ? (eventsByDay.get(dayNum) || []) : [];
              const isLastRow = i >= totalCells - 7;
              const isLastCol = (i % 7) === 6;

              return (
                <div
                  key={i}
                  data-day={dayNum}
                  onClick={(e) => isCurrentMonth && handleDayClick(dayNum, e)}
                  className={`min-h-[80px] p-1.5 relative cursor-pointer transition-colors
                    ${!isLastRow ? 'border-b border-surface-border' : ''}
                    ${!isLastCol ? 'border-r border-surface-border' : ''}
                    ${isCurrentMonth ? 'hover:bg-surface-elevated' : 'bg-surface-base'}
                    ${events.length > 0 ? 'cursor-pointer' : ''}
                  `}
                >
                  {isCurrentMonth && (
                    <>
                      <div className={`w-6 h-6 flex items-center justify-center text-xs font-mono mb-1 rounded-lg
                        ${isToday ? 'bg-brand-cta text-surface-base font-bold' : 'text-content-primary'}
                      `}>
                        {dayNum}
                      </div>
                      <div className="space-y-0.5">
                        {events.slice(0, 3).map(ev => {
                          const cfg = EVENT_CONFIG[ev.type];
                          return (
                            <div
                              key={ev.id}
                              className={`flex items-center gap-1 px-1 py-0.5 rounded-lg bg-surface-elevated border border-surface-border`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-none shrink-0 ${cfg.color}`} />
                              <span className="text-[9px] font-mono text-content-primary truncate">{ev.label}</span>
                            </div>
                          );
                        })}
                        {events.length > 3 && (
                          <div className="text-[9px] font-mono text-content-muted pl-1">+{events.length - 3} more</div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </CollapsibleModule>

      {/* Popover */}
      {popover && (
        <div
          className="fixed z-50 bg-surface-raised border border-surface-border rounded-lg shadow-2xl p-4 min-w-[220px] max-w-xs"
          style={{ top: popover.y, left: Math.min(popover.x, window.innerWidth - 240) }}
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center gap-2 mb-3 pb-3 border-b border-surface-border">
            <CalendarDays className="w-3.5 h-3.5 text-content-tertiary" />
            <span className="text-xs font-mono font-bold text-content-primary uppercase tracking-wider">
              {MONTHS[month]} {popover.day}
            </span>
          </div>
          <div className="space-y-2">
            {popover.events.map(ev => {
              const cfg = EVENT_CONFIG[ev.type];
              const Icon = cfg.icon;
              return (
                <div key={ev.id} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-3 h-3 ${cfg.text}`} />
                    <span className="text-xs font-mono text-content-secondary">{ev.label}</span>
                  </div>
                  {ev.amount !== undefined && (
                    <span className={`text-xs font-mono font-bold ${ev.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {ev.type === 'income' ? '+' : '-'}${ev.amount.toFixed(2)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Upcoming Events List */}
      <CollapsibleModule title="Upcoming Events" icon={OverviewIcon}>
        <div className="space-y-2 -mx-6 -my-6 p-6">
          {Array.from(eventsByDay.entries())
            .filter(([day]) => day >= today.getDate() || month !== today.getMonth() || year !== today.getFullYear())
            .sort(([a], [b]) => a - b)
            .flatMap(([day, events]) => events.map(ev => ({ ...ev, day })))
            .slice(0, 8)
            .map(ev => {
              const cfg = EVENT_CONFIG[ev.type];
              const Icon = cfg.icon;
              return (
                <div key={ev.id} className="flex items-center justify-between py-2 border-b border-surface-raised last:border-0 hover:bg-surface-elevated transition-colors rounded-lg px-2">
                  <div className="flex items-center gap-3">
                    <div className={`text-[10px] font-mono text-content-tertiary w-8 text-center uppercase tracking-widest`}>{ev.day}</div>
                    <Icon className={`w-3.5 h-3.5 ${cfg.text}`} />
                    <span className="text-sm font-mono text-content-secondary uppercase tracking-widest">{ev.label}</span>
                    <span className={`text-[9px] font-mono ${cfg.text} uppercase tracking-widest border border-surface-border px-1.5 rounded-lg bg-surface-base`}>{ev.type}</span>
                  </div>
                  {ev.amount !== undefined && (
                    <span className={`text-sm font-mono font-bold tabular-nums ${ev.type === 'income' ? 'text-emerald-500' : 'text-red-400'}`}>
                      {ev.type === 'income' ? '+' : '-'}${ev.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  )}
                </div>
              );
            })}
          {Array.from(eventsByDay.values()).flat().length === 0 && (
            <p className="text-sm font-mono text-content-tertiary text-center py-4 uppercase tracking-[0.2em]">No upcoming events</p>
          )}
        </div>
      </CollapsibleModule>
    </div>
  );
}
