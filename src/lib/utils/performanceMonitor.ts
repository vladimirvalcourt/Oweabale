/**
 * Performance monitoring and crash recovery utilities
 * Helps identify and recover from main thread blocking issues
 */

/**
 * Defer non-critical initialization until after page load
 * Prevents blocking the main thread during initial render
 */
export function deferNonCriticalTasks(callback: () => void, delay = 0) {
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(() => {
      setTimeout(callback, delay);
    }, { timeout: 2000 });
  } else {
    // Fallback for browsers without requestIdleCallback
    setTimeout(callback, Math.max(delay, 100));
  }
}

/**
 * Batch DOM reads and writes to prevent forced reflows
 * Reads layout properties before making DOM changes
 */
export function batchDOMOperations(readFn: () => void, writeFn: () => void) {
  // Read phase
  readFn();
  
  // Write phase - schedule for next frame
  requestAnimationFrame(() => {
    writeFn();
  });
}

/**
 * Monitor long tasks and report them
 * Helps identify what's blocking the main thread
 */
export function monitorLongTasks(threshold = 50) {
  if (!('PerformanceObserver' in window)) return;

  try {
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.duration > threshold) {
          console.warn(`[Performance] Long task detected: ${entry.duration.toFixed(2)}ms`, entry);
          
          // Report to analytics if available
          if (typeof window !== 'undefined' && (window as any).gtag) {
            (window as any).gtag('event', 'long_task', {
              event_category: 'performance',
              event_label: `duration_${Math.round(entry.duration)}ms`,
              value: Math.round(entry.duration),
            });
          }
        }
      });
    });

    observer.observe({ entryTypes: ['longtask'] });
    
    return () => observer.disconnect();
  } catch (error) {
    console.warn('[Performance] Failed to set up long task monitoring:', error);
  }
}

/**
 * Detect if page is unresponsive and offer recovery options
 */
export function detectUnresponsivePage(timeout = 5000) {
  let lastHeartbeat = Date.now();
  let checkInterval: number;

  const heartbeat = () => {
    lastHeartbeat = Date.now();
  };

  // Update heartbeat on user interactions
  const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
  events.forEach(event => {
    window.addEventListener(event, heartbeat, { passive: true });
  });

  // Check for unresponsiveness
  checkInterval = window.setInterval(() => {
    const timeSinceLastHeartbeat = Date.now() - lastHeartbeat;
    
    if (timeSinceLastHeartbeat > timeout) {
      console.warn('[Performance] Page appears unresponsive');
      
      // Attempt recovery
      attemptRecovery();
    }
  }, 1000);

  return () => {
    clearInterval(checkInterval);
    events.forEach(event => {
      window.removeEventListener(event, heartbeat);
    });
  };
}

/**
 * Attempt to recover from unresponsive state
 */
function attemptRecovery() {
  // Clear any pending animations
  document.getAnimations().forEach(anim => {
    try {
      anim.cancel();
    } catch {
      // Ignore errors
    }
  });

  // Force garbage collection hint (if available)
  if ((window as any).gc) {
    try {
      (window as any).gc();
    } catch {
      // Ignore errors
    }
  }

  console.info('[Performance] Attempted automatic recovery');
}

/**
 * Lazy initialize heavy features after critical rendering path
 */
export class LazyInitializer {
  private initialized = new Set<string>();
  private queue: Array<{ name: string; fn: () => Promise<void> }> = [];

  /**
   * Register a feature for lazy initialization
   */
  register(name: string, fn: () => Promise<void>) {
    if (this.initialized.has(name)) return;
    
    this.queue.push({ name, fn });
  }

  /**
   * Initialize all registered features
   */
  async initializeAll() {
    // Process queue sequentially to avoid overwhelming main thread
    for (const item of this.queue) {
      if (this.initialized.has(item.name)) continue;

      try {
        await item.fn();
        this.initialized.add(item.name);
        console.info(`[LazyInit] Initialized: ${item.name}`);
      } catch (error) {
        console.error(`[LazyInit] Failed to initialize ${item.name}:`, error);
      }

      // Yield to main thread between initializations
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  /**
   * Initialize features when browser is idle
   */
  initializeWhenIdle() {
    deferNonCriticalTasks(() => {
      this.initializeAll();
    });
  }
}

// Global lazy initializer instance
export const lazyInit = new LazyInitializer();
