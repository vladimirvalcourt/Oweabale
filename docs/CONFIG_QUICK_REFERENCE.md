# Configuration Quick Reference

Quick guide for using the new centralized configuration system.

---

## Site Configuration

```typescript
import { SITE_CONFIG } from '@/config/site';

// Build full URLs (respects VITE_SITE_URL env var)
SITE_CONFIG.getUrl('/pricing')  // https://www.oweable.com/pricing
SITE_CONFIG.getUrl('auth')      // https://www.oweable.com/auth (adds / if missing)

// Access page paths
SITE_CONFIG.pages.home         // '/'
SITE_CONFIG.pages.pricing      // '/pricing'
SITE_CONFIG.pages.support      // '/support'

// SEO defaults
SITE_CONFIG.defaultOgImage     // '/og-image.svg'
SITE_CONFIG.siteName           // 'Oweable'
```

**Environment Variable:** `VITE_SITE_URL` (defaults to `https://www.oweable.com`)

---

## Tax Configuration

```typescript
import { TAX_YEAR_2024, calculateStandardDeduction, calculateSelfEmploymentTax } from '@/config/taxRates';

// Get standard deduction by filing status
calculateStandardDeduction('single')                 // 14600
calculateStandardDeduction('marriedFilingJointly')   // 29200
calculateStandardDeduction('headOfHousehold')        // 21900

// Calculate self-employment tax
calculateSelfEmploymentTax(50000)  // Returns tax amount based on 15.3% of 92.35%

// Access raw constants
TAX_YEAR_2024.standardDeduction.single              // 14600
TAX_YEAR_2024.selfEmploymentTax.rate                // 0.153
TAX_YEAR_2024.socialSecurityWageBase                // 168600
TAX_YEAR_2024.recommendedReservePercentage          // 0.30 (for UI guidance)
```

**Annual Update:** Create `TAX_YEAR_2025` constant with new IRS values.

---

## External Resources

```typescript
import { EXTERNAL_RESOURCES } from '@/config/externalResources';

// Credit bureaus
EXTERNAL_RESOURCES.credit.annualReport    // https://www.annualcreditreport.com
EXTERNAL_RESOURCES.credit.experian        // https://www.experian.com
EXTERNAL_RESOURCES.credit.equifax         // https://www.equifax.com
EXTERNAL_RESOURCES.credit.transunion      // https://www.transunion.com

// Auth providers
EXTERNAL_RESOURCES.auth.googleSecurity    // https://myaccount.google.com/security
EXTERNAL_RESOURCES.auth.githubSecurity    // https://github.com/settings/security

// Security services
EXTERNAL_RESOURCES.security.cloudflareTurnstile  // https://challenges.cloudflare.com/turnstile/v0/api.js

// Documentation
EXTERNAL_RESOURCES.support.plaidDocs      // https://plaid.com/docs
EXTERNAL_RESOURCES.support.supabaseDocs   // https://supabase.com/docs
```

**Environment Variables:** `VITE_CREDIT_REPORT_URL`, `VITE_EXPERIAN_URL`, etc. (optional overrides)

---

## Currency Formatting

```typescript
import { formatCurrency, formatCurrencyCompact, formatCurrencyWithSign } from '@/lib/utils/formatCurrency';

// Standard formatting
formatCurrency(1234.56)                              // "$1,234.56"
formatCurrency(1234.56, { currency: 'EUR' })         // "€1,234.56"
formatCurrency(1234.56, { locale: 'de-DE' })         // "1.234,56 $"

// Compact notation (for dashboards/charts)
formatCurrencyCompact(1234567)                       // "$1.2M"
formatCurrencyCompact(1234)                          // "$1.2K"

// With sign indicator (for gains/losses)
formatCurrencyWithSign(500)                          // "+$500.00"
formatCurrencyWithSign(-500)                         // "-$500.00"

// Parse currency string back to number
parseCurrency("$1,234.56")                           // 1234.56
parseCurrency("€1.234,56", 'EUR')                    // 1234.56

// Get currency symbol
getCurrencySymbol('USD')                             // "$"
getCurrencySymbol('EUR')                             // "€"
```

**Supported Currencies:** USD, EUR, GBP, CAD, AUD, JPY, CHF

---

## Migration Examples

### Before (Hardcoded)
```typescript
// OLD - Hardcoded URL
canonical: 'https://www.oweable.com/pricing'

// OLD - Hardcoded tax calculation
const standardDeduction = status === 'single' ? 14600 : 29200;
const seTax = (grossGig * 0.9235) * 0.153;

// OLD - Hardcoded external link
<a href="https://www.annualcreditreport.com">Report</a>

// OLD - Manual currency formatting
<span>${amount.toFixed(2)}</span>
```

### After (Configured)
```typescript
// NEW - Dynamic URL from config
import { SITE_CONFIG } from '@/config/site';
canonical: SITE_CONFIG.getUrl('/pricing')

// NEW - Tax calculation from config
import { calculateStandardDeduction, calculateSelfEmploymentTax } from '@/config/taxRates';
const standardDeduction = calculateStandardDeduction(status === 'single' ? 'single' : 'marriedFilingJointly');
const seTax = calculateSelfEmploymentTax(grossGig);

// NEW - External link from config
import { EXTERNAL_RESOURCES } from '@/config/externalResources';
<a href={EXTERNAL_RESOURCES.credit.annualReport}>Report</a>

// NEW - Proper currency formatting
import { formatCurrency } from '@/lib/utils/formatCurrency';
<span>{formatCurrency(amount)}</span>
```

---

## Common Patterns

### SEO Metadata in Pages
```typescript
import { SITE_CONFIG } from '@/config/site';

useSEO({
  title: 'Page Title — Oweable',
  description: 'Page description here.',
  canonical: SITE_CONFIG.getUrl('/page-path'),
  ogImage: SITE_CONFIG.defaultOgImage,
});
```

### Conditional External Links
```typescript
import { EXTERNAL_RESOURCES } from '@/config/externalResources';

{authProvider === 'google' && (
  <a href={EXTERNAL_RESOURCES.auth.googleSecurity} target="_blank" rel="noopener noreferrer">
    Manage Google Account Security
  </a>
)}
```

### Dynamic Demo Data
```typescript
// Instead of hardcoded dates like "May 02"
const demoDate = new Date();
demoDate.setDate(demoDate.getDate() + 2); // 2 days from now
const formattedDate = demoDate.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
// Result: "May 02" (but always relative to current date)
```

---

## Troubleshooting

### TypeScript can't find config module
```bash
# Clear TypeScript cache
rm -rf node_modules/.vite
npm run build
```

### Environment variable not working
```bash
# Check .env file exists and has correct format
cat .env.local | grep VITE_SITE_URL

# Restart dev server after adding env vars
npm run dev
```

### Currency formatting shows wrong symbol
```typescript
// Explicitly specify currency and locale
formatCurrency(amount, { 
  currency: 'EUR', 
  locale: 'fr-FR' 
})
```

---

## Best Practices

✅ **Always use config for URLs** - Never hardcode `https://www.oweable.com`  
✅ **Use tax helpers** - Don't manually calculate deductions or SE tax  
✅ **Externalize third-party links** - Makes regional customization easy  
✅ **Format all currency** - Use `formatCurrency()` instead of template literals  
✅ **Import at top of file** - Keep imports organized and visible  
✅ **Use TypeScript types** - All configs are fully typed for autocomplete  

❌ **Don't hardcode URLs** - Even if they seem permanent  
❌ **Don't duplicate constants** - Use existing config files  
❌ **Don't inline calculations** - Use helper functions from taxRates.ts  
❌ **Don't mix formats** - Be consistent within a component  

---

**Last Updated:** 2026-04-30  
**Maintained By:** Development Team  
**Related Docs:** 
- [HARDCODED_CONTENT_AUDIT.md](./HARDCODED_CONTENT_AUDIT.md)
- [WEEK1_IMPLEMENTATION_SUMMARY.md](./WEEK1_IMPLEMENTATION_SUMMARY.md)
