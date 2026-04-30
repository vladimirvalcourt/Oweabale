import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';

/** Tooltip component for complex fields */
interface TooltipProps {
    content: string;
    children: React.ReactNode;
}

export function Tooltip({ content, children }: TooltipProps) {
    const [isVisible, setIsVisible] = useState(false);

    return (
        <div className="relative inline-flex items-center gap-1">
            {children}
            <button
                type="button"
                onMouseEnter={() => setIsVisible(true)}
                onMouseLeave={() => setIsVisible(false)}
                onFocus={() => setIsVisible(true)}
                onBlur={() => setIsVisible(false)}
                className="text-content-muted hover:text-content-secondary transition-colors focus-app rounded"
                aria-label={`More information about ${content}`}
                aria-describedby={isVisible ? 'tooltip-content' : undefined}
            >
                <AlertCircle className="w-3.5 h-3.5" />
            </button>
            {isVisible && (
                <div
                    id="tooltip-content"
                    role="tooltip"
                    className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-surface-elevated border border-surface-border radius-card text-xs text-content-secondary shadow-lg z-50 max-w-[200px] text-center"
                >
                    {content}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
                        <div className="border-4 border-transparent border-t-surface-border" />
                    </div>
                </div>
            )}
        </div>
    );
}
