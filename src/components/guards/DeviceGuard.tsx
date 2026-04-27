import React from 'react';

/**
 * Pass-through wrapper for authenticated app chrome. Reserved for future
 * device- or viewport-specific gates (e.g. mobile-only capture flows).
 */
export default function DeviceGuard({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
