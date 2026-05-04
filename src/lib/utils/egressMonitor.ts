/**
 * Supabase Transfer Monitoring Utility
 * 
 * Tracks egress usage during project migration to prevent exceeding 5GB limit.
 * Logs detailed metrics to help identify high-usage patterns.
 */

interface EgressMetrics {
    totalRequests: number;
    totalBytesEstimated: number;
    requestsByTable: Record<string, number>;
    bytesByTable: Record<string, number>;
    lastResetTime: number;
}

const STORAGE_KEY = 'oweable_egress_monitoring_v1';
const WARNING_THRESHOLD_BYTES = 3.5 * 1024 * 1024 * 1024; // 3.5 GB warning
const CRITICAL_THRESHOLD_BYTES = 4.5 * 1024 * 1024 * 1024; // 4.5 GB critical

let metrics: EgressMetrics = {
    totalRequests: 0,
    totalBytesEstimated: 0,
    requestsByTable: {},
    bytesByTable: {},
    lastResetTime: Date.now(),
};

// Load metrics from localStorage on init
try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        metrics = JSON.parse(stored);
    }
} catch (err) {
    console.warn('[EgressMonitor] Failed to load metrics:', err);
}

/**
 * Track a Supabase request for egress monitoring
 */
export function trackEgressRequest(
    table: string,
    estimatedRows: number = 0,
    estimatedBytesPerRow: number = 500 // Average row size estimate
) {
    const estimatedBytes = estimatedRows * estimatedBytesPerRow;

    metrics.totalRequests++;
    metrics.totalBytesEstimated += estimatedBytes;
    metrics.requestsByTable[table] = (metrics.requestsByTable[table] || 0) + 1;
    metrics.bytesByTable[table] = (metrics.bytesByTable[table] || 0) + estimatedBytes;

    // Save to localStorage
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(metrics));
    } catch (err) {
        console.warn('[EgressMonitor] Failed to save metrics:', err);
    }

    // Check thresholds and warn
    checkThresholds();
}

/**
 * Check if egress is approaching limits
 */
function checkThresholds() {
    const bytesUsed = metrics.totalBytesEstimated;
    const gbUsed = bytesUsed / (1024 * 1024 * 1024);

    if (bytesUsed >= CRITICAL_THRESHOLD_BYTES) {
        console.error(
            `[EgressMonitor] 🚨 CRITICAL: Approaching 5GB limit!\n` +
            `Used: ${gbUsed.toFixed(2)} GB / 5 GB\n` +
            `Remaining: ${(5 - gbUsed).toFixed(2)} GB\n` +
            `Consider reducing query frequency or data volume.`
        );

        // Could trigger toast notification here if needed
        // import('sonner').then(({ toast }) => {
        //   toast.error('Supabase egress nearing 5GB limit!', {
        //     description: `${gbUsed.toFixed(2)} GB used. Contact support.`,
        //   });
        // });
    } else if (bytesUsed >= WARNING_THRESHOLD_BYTES) {
        console.warn(
            `[EgressMonitor] ⚠️ WARNING: Egress usage high\n` +
            `Used: ${gbUsed.toFixed(2)} GB / 5 GB\n` +
            `Remaining: ${(5 - gbUsed).toFixed(2)} GB`
        );
    }
}

/**
 * Get current egress metrics
 */
export function getEgressMetrics(): EgressMetrics & { gbUsed: number; gbRemaining: number } {
    const gbUsed = metrics.totalBytesEstimated / (1024 * 1024 * 1024);
    return {
        ...metrics,
        gbUsed,
        gbRemaining: Math.max(0, 5 - gbUsed),
    };
}

/**
 * Reset metrics (call at start of new billing period)
 */
export function resetEgressMetrics() {
    metrics = {
        totalRequests: 0,
        totalBytesEstimated: 0,
        requestsByTable: {},
        bytesByTable: {},
        lastResetTime: Date.now(),
    };

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(metrics));
        console.warn('[EgressMonitor] Metrics reset');
    } catch (err) {
        console.error('[EgressMonitor] Failed to reset metrics:', err);
    }
}

/**
 * Log summary to console for debugging
 */
export function logEgressSummary() {
    const { gbUsed, gbRemaining, totalRequests, requestsByTable, bytesByTable } = getEgressMetrics();

    console.warn('📊 Supabase Egress Summary');
    console.warn(`Total Requests: ${totalRequests}`);
    console.warn(`Estimated Usage: ${gbUsed.toFixed(3)} GB / 5 GB`);
    console.warn(`Remaining: ${gbRemaining.toFixed(3)} GB`);
    console.warn(`\nRequests by Table:`);
    Object.entries(requestsByTable)
        .sort((a, b) => b[1] - a[1])
        .forEach(([table, count]) => {
            const bytes = bytesByTable[table] || 0;
            const mb = bytes / (1024 * 1024);
            console.warn(`  ${table}: ${count} requests (~${mb.toFixed(2)} MB)`);
        });
}

// Auto-log summary every 5 minutes in dev mode
if (import.meta.env.DEV) {
    setInterval(() => {
        logEgressSummary();
    }, 5 * 60 * 1000);
}
