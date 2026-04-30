import React, { useState, startTransition } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CollapsibleModuleProps {
  title: string;
  icon?: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
  extraHeader?: React.ReactNode;
  /** One-line status shown when the panel is collapsed (e.g. current setting summary). */
  summaryWhenCollapsed?: string;
  className?: string;
}

export function CollapsibleModule({
  title,
  icon: Icon,
  children,
  defaultOpen = true,
  extraHeader,
  summaryWhenCollapsed,
  className = '',
}: CollapsibleModuleProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const panelId = React.useId();

  return (
    <div className={`bg-surface-raised border border-surface-border rounded-lg overflow-hidden flex flex-col ${className}`}>
      <button
        type="button"
        id={`${panelId}-trigger`}
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => startTransition(() => setIsOpen((o) => !o))}
        className="w-full text-left px-6 py-3 bg-surface-elevated/80 border-b border-surface-border flex items-center justify-between cursor-pointer group active:translate-y-[1px] hover:bg-surface-highlight transition-all border-t border-t-content-primary/5 focus-app"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {Icon && <Icon className="w-4 h-4 shrink-0 text-content-tertiary group-hover:text-content-secondary transition-colors" aria-hidden />}
          <div className="min-w-0">
            <h3 className="section-label group-hover:text-content-secondary transition-colors truncate">{title}</h3>
            {!isOpen && summaryWhenCollapsed ? (
              <p className="mt-0.5 text-xs font-medium text-content-tertiary truncate">{summaryWhenCollapsed}</p>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-4">
          {!isOpen && extraHeader}
          <div className="flex items-center justify-center w-5 h-5" aria-hidden>
            {isOpen ? (
              <ChevronUp className="w-3.5 h-3.5 text-content-muted group-hover:text-content-tertiary transition-colors" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-content-muted group-hover:text-content-tertiary transition-colors" />
            )}
          </div>
        </div>
      </button>

      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-300 ease-out',
          isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        )}
      >
        <div id={panelId} role="region" aria-labelledby={`${panelId}-trigger`} className="min-h-0 overflow-hidden">
          <div className="p-6">{isOpen ? children : null}</div>
        </div>
      </div>
    </div>
  );
}
