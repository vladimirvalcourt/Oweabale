import { useState } from 'react';
import { ToggleRight } from 'lucide-react';

interface Props {
  platformSettings: { feature_flags?: Record<string, boolean> } | null;
  onSetFeatureFlag: (scope: 'global', key: string, value: boolean) => Promise<void>;
}

const GLOBAL_FLAGS = [
  { key: 'owe_ai_enabled', label: 'Owe-AI Assistant' },
  { key: 'goals_enabled', label: 'Goals' },
  { key: 'budgets_enabled', label: 'Budgets' },
  { key: 'credit_workshop_enabled', label: 'Credit Workshop' },
  { key: 'academy_enabled', label: 'Academy' },
];

export function AdminFeatureFlagsPanel({ platformSettings, onSetFeatureFlag }: Props) {
  const [loadingFlag, setLoadingFlag] = useState<string | null>(null);

  async function handleToggle(key: string, currentValue: boolean) {
    setLoadingFlag(key);
    try {
      await onSetFeatureFlag('global', key, !currentValue);
    } finally {
      setLoadingFlag(null);
    }
  }

  return (
    <div className="border border-surface-border rounded-sm bg-surface-raised p-5">
      <h2 className="text-sm font-semibold text-content-primary flex items-center gap-2 mb-4">
        <ToggleRight className="w-4 h-4" /> Feature Flags
      </h2>

      <div className="space-y-2">
        {platformSettings === null
          ? GLOBAL_FLAGS.map((flag) => (
              <div
                key={flag.key}
                className="flex items-center justify-between py-1"
              >
                <div className="h-3 w-32 rounded-sm bg-surface-elevated animate-pulse" />
                <div className="h-5 w-9 rounded-full bg-surface-elevated animate-pulse" />
              </div>
            ))
          : GLOBAL_FLAGS.map((flag) => {
              const currentValue =
                platformSettings?.feature_flags?.[flag.key] ?? true;
              const isLoading = loadingFlag === flag.key;

              return (
                <div key={flag.key} className="flex items-center justify-between py-1">
                  <span className="text-xs text-content-primary">{flag.label}</span>
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => handleToggle(flag.key, currentValue)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus-visible:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
                      currentValue ? 'bg-indigo-500' : 'bg-surface-elevated'
                    }`}
                    aria-pressed={currentValue}
                    aria-label={flag.label}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                        currentValue ? 'translate-x-4' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
              );
            })}
      </div>
    </div>
  );
}
