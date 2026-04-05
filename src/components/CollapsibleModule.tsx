import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface CollapsibleModuleProps {
  title: string;
  icon?: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
  extraHeader?: React.ReactNode;
  className?: string;
}

export function CollapsibleModule({ title, icon: Icon, children, defaultOpen = true, extraHeader, className = "" }: CollapsibleModuleProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`bg-surface-raised border border-surface-border rounded-sm overflow-hidden flex flex-col ${className}`}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="px-6 py-3 bg-surface-elevated border-b border-surface-border flex items-center justify-between cursor-pointer group hover:bg-surface-highlight transition-colors"
      >
        <div className="flex items-center gap-3">
          {Icon && <Icon className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300 transition-colors" />}
          <h3 className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-zinc-400 group-hover:text-content-primary transition-colors">{title}</h3>
        </div>
        <div className="flex items-center gap-4">
          {!isOpen && extraHeader}
          <div className="flex items-center justify-center w-5 h-5">
            {isOpen ? <ChevronUp className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-400 transition-colors" /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-400 transition-colors" />}
          </div>
        </div>
      </div>
      <motion.div
        initial={false}
        animate={{ height: isOpen ? 'auto' : 0, opacity: isOpen ? 1 : 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="overflow-hidden"
      >
        <div className="p-6">
          {children}
        </div>
      </motion.div>
    </div>
  );
}
