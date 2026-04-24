import { useState, useEffect } from 'react';

/**
 * M3 Window Size Classes
 * Based on Material Design 3 adaptive layout specifications
 * https://m3.material.io/foundations/adaptive-design/large-screens/overview
 */
export type WindowSizeClass = 'compact' | 'medium' | 'expanded' | 'large' | 'extraLarge';

export interface WindowSizeDimensions {
  width: number;
  height: number;
  sizeClass: WindowSizeClass;
}

/**
 * M3 Breakpoints (in dp/px)
 * - Compact: < 600dp (single column, bottom navigation)
 * - Medium: 600-839dp (two-pane optional, navigation rail)
 * - Expanded: 840-1199dp (two-pane side-by-side, navigation drawer)
 * - Large: 1200-1599dp (multi-pane with max-width)
 * - Extra Large: ≥ 1600dp (multi-column, generous margins)
 */
const BREAKPOINTS = {
  compact: 0,
  medium: 600,
  expanded: 840,
  large: 1200,
  extraLarge: 1600,
};

function getWindowSizeClass(width: number): WindowSizeClass {
  if (width >= BREAKPOINTS.extraLarge) return 'extraLarge';
  if (width >= BREAKPOINTS.large) return 'large';
  if (width >= BREAKPOINTS.expanded) return 'expanded';
  if (width >= BREAKPOINTS.medium) return 'medium';
  return 'compact';
}

/**
 * Hook to detect M3 Window Size Classes
 * Provides responsive layout information based on viewport width
 * 
 * @returns Object containing width, height, and sizeClass
 * 
 * @example
 * ```tsx
 * const { width, height, sizeClass } = useWindowSizeClass();
 * 
 * // Use for adaptive navigation
 * const NavigationComponent = () => {
 *   if (sizeClass === 'compact') return <BottomNavigation />;
 *   if (sizeClass === 'medium') return <NavigationRail />;
 *   return <NavigationDrawer />;
 * };
 * 
 * // Use for layout columns
 * const gridCols = {
 *   compact: 'grid-cols-4',
 *   medium: 'grid-cols-8',
 *   expanded: 'grid-cols-12',
 *   large: 'grid-cols-12',
 *   extraLarge: 'grid-cols-12',
 * }[sizeClass];
 * ```
 */
export function useWindowSizeClass(): WindowSizeDimensions {
  const [dimensions, setDimensions] = useState<WindowSizeDimensions>(() => {
    // Initialize with SSR-safe defaults
    if (typeof window === 'undefined') {
      return { width: 0, height: 0, sizeClass: 'compact' };
    }
    
    const width = window.innerWidth;
    const height = window.innerHeight;
    return {
      width,
      height,
      sizeClass: getWindowSizeClass(width),
    };
  });

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const handleResize = () => {
      // Debounce resize events for performance (150ms)
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        setDimensions({
          width,
          height,
          sizeClass: getWindowSizeClass(width),
        });
      }, 150);
    };

    window.addEventListener('resize', handleResize, { passive: true });
    
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, []);

  return dimensions;
}

/**
 * Helper hook to check if current size class matches or exceeds a threshold
 * 
 * @param minimumSizeClass - The minimum size class to check against
 * @returns boolean indicating if current size meets the threshold
 * 
 * @example
 * ```tsx
 * const isExpandedOrLarger = useIsMinWindowSizeClass('expanded');
 * 
 * if (isExpandedOrLarger) {
 *   // Show two-pane layout
 * }
 * ```
 */
export function useIsMinWindowSizeClass(minimumSizeClass: WindowSizeClass): boolean {
  const { sizeClass } = useWindowSizeClass();
  
  const sizeClassOrder: WindowSizeClass[] = [
    'compact',
    'medium',
    'expanded',
    'large',
    'extraLarge',
  ];
  
  const currentIndex = sizeClassOrder.indexOf(sizeClass);
  const minimumIndex = sizeClassOrder.indexOf(minimumSizeClass);
  
  return currentIndex >= minimumIndex;
}

/**
 * Layout grid configuration based on M3 specifications
 * - Compact: 4 columns, 16dp margin, 8dp gutter
 * - Medium: 8 columns, 24dp margin, 16dp gutter
 * - Expanded+: 12 columns, 24dp margin, 24dp gutter
 */
export function getLayoutGridConfig(sizeClass: WindowSizeClass) {
  switch (sizeClass) {
    case 'compact':
      return {
        columns: 4,
        margin: 16, // dp
        gutter: 8,  // dp
        gridClass: 'grid-cols-4',
        marginClass: 'mx-4', // 16px ≈ 4 * 4px
        gapClass: 'gap-2',   // 8px ≈ 2 * 4px
      };
    case 'medium':
      return {
        columns: 8,
        margin: 24, // dp
        gutter: 16, // dp
        gridClass: 'grid-cols-8',
        marginClass: 'mx-6', // 24px ≈ 6 * 4px
        gapClass: 'gap-4',   // 16px ≈ 4 * 4px
      };
    default: // expanded, large, extraLarge
      return {
        columns: 12,
        margin: 24, // dp
        gutter: 24, // dp
        gridClass: 'grid-cols-12',
        marginClass: 'mx-6', // 24px ≈ 6 * 4px
        gapClass: 'gap-6',   // 24px ≈ 6 * 4px
      };
  }
}
