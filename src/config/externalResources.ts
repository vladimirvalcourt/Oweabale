/**
 * External Resource URLs
 * Centralized configuration for third-party services and external links
 */

export const EXTERNAL_RESOURCES = {
    // Credit reporting and monitoring
    credit: {
        annualReport: import.meta.env.VITE_CREDIT_REPORT_URL || 'https://www.annualcreditreport.com',
        experian: import.meta.env.VITE_EXPERIAN_URL || 'https://www.experian.com',
        equifax: import.meta.env.VITE_EQUIFAX_URL || 'https://www.equifax.com',
        transunion: import.meta.env.VITE_TRANSUNION_URL || 'https://www.transunion.com',
    },

    // Authentication providers
    auth: {
        googleSecurity: 'https://myaccount.google.com/security',
        githubSecurity: 'https://github.com/settings/security',
    },

    // Security/Compliance
    security: {
        cloudflareTurnstile: 'https://challenges.cloudflare.com/turnstile/v0/api.js',
    },

    // Support/Documentation
    support: {
        plaidDocs: 'https://plaid.com/docs',
        supabaseDocs: 'https://supabase.com/docs',
    },
};
