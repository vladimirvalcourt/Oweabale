/**
 * Site Configuration
 * Centralized site URLs and metadata for consistent SEO and navigation
 */

export const SITE_CONFIG = {
    // Base URL - use environment variable in production
    baseUrl: import.meta.env.VITE_SITE_URL || 'https://www.oweable.com',

    // Social/SEO defaults
    defaultOgImage: '/og-image.svg',
    siteName: 'Oweable',
    siteDescription: 'Take control of your financial obligations',

    // Page-specific paths (for easy maintenance)
    pages: {
        home: '/',
        pricing: '/pricing',
        auth: '/auth',
        onboarding: '/onboarding',
        privacy: '/privacy',
        terms: '/terms',
        faq: '/faq',
        security: '/security',
        support: '/support',
    },

    // Helper to build full URLs
    getUrl: (path: string) => {
        const cleanPath = path.startsWith('/') ? path : `/${path}`;
        return `${SITE_CONFIG.baseUrl}${cleanPath}`;
    },
};
