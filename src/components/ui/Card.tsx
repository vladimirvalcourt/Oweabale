import React from 'react';
import { cn } from '../../lib/utils';

/**
 * Reusable Card component for dashboard widgets and layout sections.
 * @param children - The content to display inside the card
 * @param className - Optional additional CSS classes
 */
export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("bg-surface-raised rounded-lg border border-surface-border overflow-hidden shadow-none hover:bg-white/[0.02] transition-colors", className)}>
      {children}
    </div>
  );
}

/**
 * CardHeader component for displaying titles and actions within a Card.
 * @param title - The main heading of the card
 * @param action - Optional action button or link (e.g., "View all")
 * @param className - Optional additional CSS classes
 */
export function CardHeader({ title, action, className }: { title: string; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("px-6 py-4 border-b border-surface-border flex items-center justify-between", className)}>
      <h2 className="text-base font-semibold tracking-tight text-content-primary">{title}</h2>
      {action && <div>{action}</div>}
    </div>
  );
}

/**
 * CardContent component for the main body of a Card.
 * @param children - The content to display
 * @param className - Optional additional CSS classes
 */
export function CardContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("p-6", className)}>
      {children}
    </div>
  );
}
