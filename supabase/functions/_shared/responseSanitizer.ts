/**
 * Response Sanitization Utilities for Edge Functions
 * Prevents sensitive field exposure in API responses
 */

/**
 * Fields to always exclude from user profile responses
 */
const SENSITIVE_PROFILE_FIELDS = [
    'stripe_customer_id',
    'internal_notes',
    'admin_flags',
    'last_login_ip',
    'password_hash',
    'reset_token',
    'verification_token',
];

/**
 * Fields to exclude from transaction responses
 */
const SENSITIVE_TRANSACTION_FIELDS = [
    'plaid_account_number',
    'plaid_routing_number',
    'raw_merchant_data',
    'internal_category_id',
];

/**
 * Fields to exclude from Plaid item responses
 */
const SENSITIVE_PLAID_FIELDS = [
    'access_token',
    'item_id',
    'institution_credentials',
    'raw_response',
];

/**
 * Sanitize user profile for API response
 * Removes sensitive fields while preserving necessary data
 */
export function sanitizeUserProfile(profile: Record<string, any>): Record<string, any> {
    if (!profile) return profile;

    const sanitized = { ...profile };

    // Remove sensitive fields
    for (const field of SENSITIVE_PROFILE_FIELDS) {
        delete sanitized[field];
    }

    // Return only necessary fields
    return {
        id: sanitized.id,
        email: sanitized.email,
        firstName: sanitized.first_name,
        lastName: sanitized.last_name,
        avatar: sanitized.avatar,
        phone: sanitized.phone,
        timezone: sanitized.timezone,
        plan: sanitized.plan,
        trialStartedAt: sanitized.trial_started_at,
        trialEndsAt: sanitized.trial_ends_at,
        trialExpired: sanitized.trial_expired,
        hasCompletedOnboarding: sanitized.has_completed_onboarding,
        notificationPrefs: sanitized.notification_prefs,
        createdAt: sanitized.created_at,
        updatedAt: sanitized.updated_at,
    };
}

/**
 * Sanitize transaction list for API response
 */
export function sanitizeTransaction(tx: Record<string, any>): Record<string, any> {
    if (!tx) return tx;

    const sanitized = { ...tx };

    // Remove sensitive fields
    for (const field of SENSITIVE_TRANSACTION_FIELDS) {
        delete sanitized[field];
    }

    return {
        id: sanitized.id,
        userId: sanitized.user_id,
        amount: sanitized.amount,
        currency: sanitized.currency,
        date: sanitized.date,
        name: sanitized.name,
        merchantName: sanitized.merchant_name,
        category: sanitized.category,
        subcategory: sanitized.subcategory,
        platform: sanitized.platform,
        isRecurring: sanitized.is_recurring,
        createdAt: sanitized.created_at,
    };
}

/**
 * Sanitize Plaid item info (never expose access tokens!)
 */
export function sanitizePlaidItem(item: Record<string, any>): Record<string, any> {
    if (!item) return item;

    const sanitized = { ...item };

    // CRITICAL: Remove all sensitive Plaid fields
    for (const field of SENSITIVE_PLAID_FIELDS) {
        delete sanitized[field];
    }

    return {
        id: sanitized.id,
        userId: sanitized.user_id,
        institutionName: sanitized.institution_name,
        institutionId: sanitized.institution_id,
        accounts: sanitized.accounts?.map((acc: any) => ({
            id: acc.account_id,
            name: acc.name,
            type: acc.type,
            subtype: acc.subtype,
            mask: acc.mask, // Last 4 digits only - safe to show
            balance: acc.balance,
        })),
        lastSyncAt: sanitized.last_sync_at,
        lastSyncError: sanitized.last_sync_error,
        loginRequired: sanitized.item_login_required,
        createdAt: sanitized.created_at,
        updatedAt: sanitized.updated_at,
    };
}

/**
 * Sanitize billing/payment information
 */
export function sanitizePayment(payment: Record<string, any>): Record<string, any> {
    if (!payment) return payment;

    return {
        id: payment.id,
        amountTotal: payment.amount_total,
        currency: payment.currency,
        status: payment.status,
        productKey: payment.product_key,
        createdAt: payment.created_at,
        // Note: stripe_payment_intent_id is OK to include for support/debugging
        stripeCheckoutSessionId: payment.stripe_checkout_session_id,
    };
}

/**
 * Sanitize subscription information
 */
export function sanitizeSubscription(subscription: Record<string, any>): Record<string, any> {
    if (!subscription) return subscription;

    return {
        id: subscription.id,
        status: subscription.status,
        currentPeriodEnd: subscription.current_period_end,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        createdAt: subscription.created_at,
        updatedAt: subscription.updated_at,
        // Include Stripe IDs for customer support
        stripeSubscriptionId: subscription.stripe_subscription_id,
        stripeCustomerId: subscription.stripe_customer_id,
    };
}

/**
 * Generic sanitizer - removes specified fields from any object
 */
export function sanitizeObject<T extends Record<string, any>>(
    obj: T,
    fieldsToRemove: string[]
): Partial<T> {
    if (!obj) return obj;

    const sanitized = { ...obj };
    for (const field of fieldsToRemove) {
        delete sanitized[field];
    }

    return sanitized;
}

/**
 * Sanitize array of objects
 */
export function sanitizeArray<T extends Record<string, any>>(
    items: T[],
    sanitizer: (item: T) => Partial<T>
): Partial<T>[] {
    if (!Array.isArray(items)) return [];
    return items.map(sanitizer);
}

/**
 * Middleware helper - automatically sanitize response
 */
export function createSanitizedResponse(
    data: any,
    sanitizer?: (data: any) => any,
    corsHeaders?: Record<string, string>
): Response {
    const sanitized = sanitizer ? sanitizer(data) : data;

    return new Response(
        JSON.stringify({ data: sanitized }),
        {
            status: 200,
            headers: {
                ...(corsHeaders || {}),
                'Content-Type': 'application/json',
            },
        }
    );
}
