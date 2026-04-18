import React, { useState, startTransition } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';

interface CollapsibleModuleProps {
  title: string;
  icon?: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
  extraHeader?: React.ReactNode;
  className?: string;
}

export function CollapsibleModule({
  title,
  icon: Icon,
  children,
  defaultOpen = true,
  extraHeader,
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
        className="w-full text-left px-6 py-3 bg-surface-elevated/80 border-b border-surface-border flex items-center justify-between cursor-pointer group active:translate-y-[1px] hover:bg-surface-highlight transition-all border-t border-t-white/5 focus-app"
      >
        <div className="flex items-center gap-3">
          {Icon && <Icon className="w-3.5 h-3.5 text-content-tertiary group-hover:text-content-secondary transition-colors" />}
          <h3 className="brand-header-text group-hover:text-content-primary transition-colors text-[10px]">{title}</h3>
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
