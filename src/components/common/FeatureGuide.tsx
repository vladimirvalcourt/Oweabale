import React, { useState, useLayoutEffect } from 'react';
import { X, HelpCircle, ChevronRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export type GuideStep = {
    title: string;
    description: string;
    action?: {
        label: string;
        onClick: () => void;
    };
};

export type FeatureGuideProps = {
    featureId: string;
    steps: GuideStep[];
    position?: 'top' | 'bottom' | 'left' | 'right';
    autoShow?: boolean;
    onDismiss?: () => void;
    onComplete?: () => void;
};

const STORAGE_KEY = 'oweable_feature_guides_dismissed';

function getDismissedGuides(): Set<string> {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
        return new Set();
    }
}

function dismissGuide(featureId: string) {
    const dismissed = getDismissedGuides();
    dismissed.add(featureId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...dismissed]));
}

export function FeatureGuide({
    featureId,
    steps,
    position = 'bottom',
    autoShow = false,
    onDismiss,
    onComplete,
}: FeatureGuideProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);

    useLayoutEffect(() => {
        const dismissed = getDismissedGuides();
        if (autoShow && !dismissed.has(featureId)) {
            setIsVisible(true);
        }
    }, [featureId, autoShow]);

    const handleDismiss = () => {
        dismissGuide(featureId);
        setIsVisible(false);
        onDismiss?.();
    };

    const handleComplete = () => {
        dismissGuide(featureId);
        setIsVisible(false);
        onComplete?.();
    };

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            handleComplete();
        }
    };

    if (!isVisible || steps.length === 0) return null;

    const step = steps[currentStep];
    const positionClasses = {
        top: 'bottom-full mb-2',
        bottom: 'top-full mt-2',
        left: 'right-full mr-2',
        right: 'left-full ml-2',
    };

    return (
        <div
            className={cn(
                'absolute z-50 w-72 rounded-lg border border-surface-border bg-surface-raised p-4 shadow-lg',
                positionClasses[position],
            )}
            role="dialog"
            aria-label={`Guide: ${step.title}`}
        >
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 text-brand-indigo" />
                    <p className="text-xs font-semibold uppercase tracking-wider text-content-muted">
                        Step {currentStep + 1} of {steps.length}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={handleDismiss}
                    className="rounded p-1 text-content-tertiary hover:bg-surface-elevated hover:text-content-primary transition-colors"
                    aria-label="Dismiss guide"
                >
                    <X className="h-3.5 w-3.5" />
                </button>
            </div>

            {/* Content */}
            <div className="mt-3">
                <h3 className="text-sm font-semibold text-content-primary">{step.title}</h3>
                <p className="mt-1.5 text-xs leading-5 text-content-secondary">{step.description}</p>
            </div>

            {/* Actions */}
            <div className="mt-4 flex items-center justify-between gap-2">
                {step.action ? (
                    <button
                        type="button"
                        onClick={() => {
                            step.action?.onClick();
                            handleNext();
                        }}
                        className="inline-flex items-center gap-1.5 rounded-md bg-brand-indigo px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-hover transition-colors"
                    >
                        {step.action.label}
                        <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                ) : (
                    <div />
                )}

                <button
                    type="button"
                    onClick={handleNext}
                    className="inline-flex items-center gap-1.5 rounded-md border border-surface-border px-3 py-1.5 text-xs font-medium text-content-secondary hover:bg-surface-elevated hover:text-content-primary transition-colors"
                >
                    {currentStep < steps.length - 1 ? 'Next' : 'Got it'}
                    {currentStep >= steps.length - 1 && <Check className="h-3.5 w-3.5" />}
                </button>
            </div>

            {/* Progress dots */}
            {steps.length > 1 && (
                <div className="mt-3 flex justify-center gap-1.5">
                    {steps.map((_, idx) => (
                        <div
                            key={idx}
                            className={cn(
                                'h-1.5 w-1.5 rounded-full transition-colors',
                                idx === currentStep ? 'bg-brand-indigo' : 'bg-surface-border',
                            )}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
