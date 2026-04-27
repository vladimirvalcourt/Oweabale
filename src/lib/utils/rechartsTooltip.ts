/**
 * Recharts v3 mounts the tooltip (incl. ul.recharts-tooltip-item-list) inside `.recharts-wrapper`.
 * Disabling animation avoids transform transitions fighting layout when the tooltip box size updates.
 */
export const rechartsTooltipStableProps = {
  isAnimationActive: false,
} as const;
