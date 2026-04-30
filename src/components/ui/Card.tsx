import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Reusable Card component for dashboard widgets and layout sections.
 * @param children - The content to display inside the card
 * @param className - Optional additional CSS classes
 */
export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("premium-panel overflow-hidden", className)}>
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
    <div className={cn("flex items-center justify-between border-b border-surface-border px-5 py-4", className)}>
      <h2 className="text-base font-semibold tracking-[-0.01em] text-content-primary leading-snug">{title}</h2>
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
    <div className={cn("p-5 sm:p-6", className)}>
      {children}
    </div>
  );
}
