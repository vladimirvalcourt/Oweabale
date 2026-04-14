import React from 'react';
import { ResponsiveContainer } from 'recharts';

type SafeResponsiveContainerProps = React.ComponentProps<typeof ResponsiveContainer>;

/**
 * Recharts can briefly measure hidden/transitioning containers as invalid sizes.
 * Provide sane minimums by default to prevent width/height=-1 runtime warnings.
 */
export function SafeResponsiveContainer({
  width = '100%',
  height = '100%',
  minWidth,
  minHeight,
  ...props
}: SafeResponsiveContainerProps) {
  const hostRef = React.useRef<HTMLDivElement | null>(null);
  const [isMeasurable, setIsMeasurable] = React.useState(false);

  const resolvedMinWidth = minWidth ?? 0;
  const resolvedMinHeight = minHeight ?? 120;

  React.useEffect(() => {
    const node = hostRef.current;
    if (!node) return;

    const updateMeasuredState = () => {
      const rect = node.getBoundingClientRect();
      setIsMeasurable(rect.width > 0 && rect.height > 0);
    };

    updateMeasuredState();

    const observer = new ResizeObserver(() => {
      updateMeasuredState();
    });
    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={hostRef}
      style={{ width, height, minWidth: resolvedMinWidth, minHeight: resolvedMinHeight }}
    >
      {isMeasurable ? (
        <ResponsiveContainer
          width="100%"
          height="100%"
          minWidth={resolvedMinWidth}
          minHeight={resolvedMinHeight}
          {...props}
        />
      ) : null}
    </div>
  );
}

