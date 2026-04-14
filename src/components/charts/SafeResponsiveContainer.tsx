import React from 'react';
import { ResponsiveContainer } from 'recharts';

type SafeResponsiveContainerProps = React.ComponentProps<typeof ResponsiveContainer>;

/**
 * Recharts can briefly measure hidden/transitioning containers as invalid sizes.
 * Provide sane minimums by default to prevent width/height=-1 runtime warnings.
 */
export function SafeResponsiveContainer({
  minWidth,
  minHeight,
  ...props
}: SafeResponsiveContainerProps) {
  return (
    <ResponsiveContainer
      minWidth={minWidth ?? 0}
      minHeight={minHeight ?? 120}
      {...props}
    />
  );
}

