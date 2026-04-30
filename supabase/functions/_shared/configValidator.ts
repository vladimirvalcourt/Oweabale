/**
 * Configuration Validator for Edge Functions
 * Validates required environment variables at startup
 */

export interface ConfigRequirement {
    name: string;
    description: string;
    sensitive?: boolean;
}

/**
 * Validate that all required environment variables are set
 * Throws error with helpful message if any are missing
 */
export function validateConfig(requirements: ConfigRequirement[]): void {
    const missing: string[] = [];
    const invalid: string[] = [];

    for (const req of requirements) {
        const value = Deno.env.get(req.name);

        if (!value) {
            missing.push(req.name);
            continue;
        }

        // Additional validation for specific patterns
        if (req.name.includes('STRIPE_SECRET_KEY') && !value.startsWith('sk_')) {
            invalid.push(`${req.name} (must start with sk_)`);
        }

        if (req.name.includes('STRIPE_WEBHOOK_SECRET') && !value.startsWith('whsec_')) {
            invalid.push(`${req.name} (must start with whsec_)`);
        }

        if (req.name.includes('SUPABASE_URL') && !value.startsWith('https://')) {
            invalid.push(`${req.name} (must be HTTPS URL)`);
        }
    }

    if (missing.length > 0 || invalid.length > 0) {
        const errorMessage = [
            '[FATAL] Configuration validation failed:',
            ...missing.map(name => `  - Missing: ${name}`),
            ...invalid.map(name => `  - Invalid: ${name}`),
            '',
            'Please check your Supabase Edge Function secrets.',
        ].join('\n');

        console.error(errorMessage);
        throw new Error('Server misconfiguration - see logs for details');
    }

    // Log successful validation (without revealing values)
    console.log(`[Config] Validated ${requirements.length} environment variables ✓`);
}

/**
 * Standard configuration requirements for most Edge Functions
 */
export const STANDARD_CONFIG: ConfigRequirement[] = [
    {
        name: 'SUPABASE_URL',
        description: 'Supabase project URL',
    },
    {
        name: 'SUPABASE_SERVICE_ROLE_KEY',
        description: 'Supabase service role key',
        sensitive: true,
    },
];

/**
 * Configuration requirements for Stripe-related functions
 */
export const STRIPE_CONFIG: ConfigRequirement[] = [
    ...STANDARD_CONFIG,
    {
        name: 'STRIPE_SECRET_KEY',
        description: 'Stripe secret API key',
        sensitive: true,
    },
];

/**
 * Configuration requirements for Plaid-related functions
 */
export const PLAID_CONFIG: ConfigRequirement[] = [
    ...STANDARD_CONFIG,
    {
        name: 'PLAID_CLIENT_ID',
        description: 'Plaid client ID',
        sensitive: true,
    },
    {
        name: 'PLAID_SECRET',
        description: 'Plaid secret key',
        sensitive: true,
    },
    {
        name: 'PLAID_ENV',
        description: 'Plaid environment (sandbox/development/production)',
    },
];

/**
 * Configuration requirements for email-sending functions
 */
export const EMAIL_CONFIG: ConfigRequirement[] = [
    ...STANDARD_CONFIG,
    {
        name: 'RESEND_API_KEY',
        description: 'Resend API key for email delivery',
        sensitive: true,
    },
    {
        name: 'RESEND_FROM_EMAIL',
        description: 'Default sender email address',
    },
];

/**
 * Get safe environment info for logging (no secrets)
 */
export function getSafeEnvironmentInfo(): Record<string, string> {
    return {
        DENO_ENV: Deno.env.get('DENO_ENV') ?? 'unknown',
        SUPABASE_ENV: Deno.env.get('SUPABASE_ENV') ?? 'unknown',
        VERCEL_ENV: Deno.env.get('VERCEL_ENV') ?? 'unknown',
        HAS_STRIPE_KEY: Deno.env.get('STRIPE_SECRET_KEY') ? 'yes' : 'no',
        HAS_PLAID_KEYS: Deno.env.get('PLAID_CLIENT_ID') ? 'yes' : 'no',
        HAS_RESEND_KEY: Deno.env.get('RESEND_API_KEY') ? 'yes' : 'no',
    };
}
