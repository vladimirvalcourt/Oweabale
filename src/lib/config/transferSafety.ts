/**
 * Transfer Safety Configuration
 * 
 * Conservative settings to prevent egress overload during Supabase project migration.
 * Import and apply these settings before starting the transfer process.
 */

export const TRANSFER_SAFETY_CONFIG = {
    // ============================================
    // EGRESS PROTECTION LIMITS
    // ============================================

    /** Maximum transactions to fetch per page (reduced from 50 for transfer) */
    MAX_TRANSACTIONS_PER_PAGE: 25,

    /** Maximum records for Phase 2 queries (reduced from 100 for transfer) */
    MAX_PHASE2_RECORDS: 50,

    /** Data freshness threshold - skip refetch if data is this recent (ms) */
    DATA_FRESHNESS_THRESHOLD_MS: 10 * 60 * 1000, // 10 minutes (increased from 5)

    /** Maximum concurrent requests allowed */
    MAX_CONCURRENT_REQUESTS: 3,

    /** Delay between batch requests (ms) */
    BATCH_REQUEST_DELAY_MS: 2000,

    // ============================================
    // CACHING OPTIMIZATIONS
    // ============================================

    /** Enable aggressive caching during transfer */
    ENABLE_AGGRESSIVE_CACHING: true,

    /** Cache duration for user profile (ms) */
    PROFILE_CACHE_DURATION_MS: 30 * 60 * 1000, // 30 minutes

    /** Cache duration for financial records (ms) */
    RECORDS_CACHE_DURATION_MS: 15 * 60 * 1000, // 15 minutes

    // ============================================
    // MONITORING & ALERTING
    // ============================================

    /** Log every request to console during transfer */
    LOG_ALL_REQUESTS: true,

    /** Alert when approaching egress limit (bytes) */
    EGRESS_WARNING_THRESHOLD: 3.5 * 1024 * 1024 * 1024, // 3.5 GB

    /** Critical alert threshold (bytes) */
    EGRESS_CRITICAL_THRESHOLD: 4.5 * 1024 * 1024 * 1024, // 4.5 GB

    // ============================================
    // REQUEST THROTTLING
    // ============================================

    /** Minimum time between identical queries (ms) */
    QUERY_DEBOUNCE_MS: 5000,

    /** Maximum retries for failed requests */
    MAX_RETRY_ATTEMPTS: 2,

    /** Backoff multiplier for retries */
    RETRY_BACKOFF_MULTIPLIER: 2,
} as const;

/**
 * Apply transfer safety settings to the application
 * Call this at app initialization during transfer period
 */
export function applyTransferSafetySettings() {
    console.warn('[Transfer Safety] Applying conservative egress protection settings');
    console.warn('[Transfer Safety] Transaction limit:', TRANSFER_SAFETY_CONFIG.MAX_TRANSACTIONS_PER_PAGE);
    console.warn('[Transfer Safety] Phase 2 limit:', TRANSFER_SAFETY_CONFIG.MAX_PHASE2_RECORDS);
    console.warn('[Transfer Safety] Data freshness:', TRANSFER_SAFETY_CONFIG.DATA_FRESHNESS_THRESHOLD_MS / 60000, 'minutes');
    console.warn('[Transfer Safety] Max concurrent requests:', TRANSFER_SAFETY_CONFIG.MAX_CONCURRENT_REQUESTS);

    // Store config in sessionStorage for runtime access
    try {
        sessionStorage.setItem('transfer_safety_config', JSON.stringify(TRANSFER_SAFETY_CONFIG));
    } catch (err) {
        console.warn('[Transfer Safety] Could not store config in sessionStorage:', err);
    }
}

/**
 * Check if transfer safety mode is active
 */
export function isTransferSafetyMode(): boolean {
    try {
        return sessionStorage.getItem('transfer_safety_config') !== null;
    } catch {
        return false;
    }
}

/**
 * Get current transfer safety config
 */
export function getTransferSafetyConfig(): typeof TRANSFER_SAFETY_CONFIG {
    try {
        const stored = sessionStorage.getItem('transfer_safety_config');
        if (stored) {
            return JSON.parse(stored);
        }
    } catch {
        // Ignore parse errors
    }
    return TRANSFER_SAFETY_CONFIG;
}

/**
 * Disable transfer safety mode (after transfer is complete)
 */
export function disableTransferSafetyMode() {
    sessionStorage.removeItem('transfer_safety_config');
    console.warn('[Transfer Safety] Transfer safety mode disabled');
}
