import React from 'react';

type Size = { w: number; h: number };

export type SafeResponsiveContainerProps = {
  /** Host box width (CSS), e.g. `"100%"` or `160`. */
  width?: React.CSSProperties['width'];
  /** Host box height (CSS), e.g. `"100%"` or `260`. */
  height?: React.CSSProperties['height'];
  minWidth?: number;
  minHeight?: number;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactElement;
};

/**
 * Recharts `ResponsiveContainer` can still compute width/height as -1 during nested
 * `%` layout / transition frames. We measure the host in pixels and pass numeric
 * `width` / `height` straight to the chart instead.
 */
export function SafeResponsiveContainer({
  width = '100%',
  height = '100%',
  minWidth = 0,
  minHeight = 120,
  className,
  style,
  children,
}: SafeResponsiveContainerProps) {
  const hostRef = React.useRef<HTMLDivElement | null>(null);
  const [dims, setDims] = React.useState<Size>({ w: 0, h: 0 });

  const updateDims = React.useCallback(() => {
    const node = hostRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const w = Math.max(0, Math.floor(rect.width));
    const h = Math.max(0, Math.floor(rect.height));
    setDims((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
  }, []);

  React.useLayoutEffect(() => {
    const node = hostRef.current;
    if (!node) return;

    updateDims();

    let raf = 0;
    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => updateDims());
    };

    const ro = new ResizeObserver(() => schedule());
    ro.observe(node);
    window.addEventListener('resize', schedule);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('resize', schedule);
    };
  }, [updateDims]);

  const child = React.Children.only(children);

  return (
    <div
      ref={hostRef}
      className={className}
      style={{
        width,
        height,
        minWidth,
        minHeight,
        boxSizing: 'border-box',
        position: 'relative',
        ...style,
      }}
    >
      {dims.w > 0 && dims.h > 0
        ? React.cloneElement(child as React.ReactElement<{ width?: number; height?: number }>, {
            width: dims.w,
            height: dims.h,
          })
        : null}
    </div>
  );
}
