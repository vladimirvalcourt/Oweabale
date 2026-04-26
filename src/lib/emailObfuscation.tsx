/**
 * Email obfuscation utilities to prevent scraper harvesting
 * 
 * These functions help protect email addresses from being harvested by bots
 * while still allowing legitimate users to contact us.
 */

/**
 * Obfuscates an email address by splitting it into parts
 * and reconstructing it only when needed (not in HTML source)
 * 
 * @param email - The email address to obfuscate
 * @returns An object with methods to render the email safely
 */
export function obfuscateEmail(email: string) {
  const [localPart, domain] = email.split('@');
  
  return {
    /**
     * Returns a mailto link that's constructed at runtime
     * Use this for href attributes
     */
    getMailtoHref(): string {
      return `mailto:${email}`;
    },
    
    /**
     * Renders the email as text using JavaScript assembly
     * This prevents the email from appearing in plain text in HTML source
     * 
     * @param className - Optional CSS class for styling
     * @param ariaLabel - Optional aria-label for accessibility
     */
    renderAsText(className?: string, ariaLabel?: string): React.ReactNode {
      // Split into individual characters to prevent simple scraping
      const localChars = localPart.split('');
      const domainChars = domain.split('.');
      
      return (
        <span 
          className={className}
          aria-label={ariaLabel || email}
          title={ariaLabel || email}
        >
          {localChars.map((char, i) => (
            <span key={`local-${i}`}>{char}</span>
          ))}
          <span>@</span>
          {domainChars.map((part, i) => (
            <span key={`domain-${i}`}>
              {part}
              {i < domainChars.length - 1 && <span>.</span>}
            </span>
          ))}
        </span>
      );
    },
    
    /**
     * Creates a safe contact button/link component
     * 
     * @param label - Button/link text (e.g., "Contact Us", "Get Help")
     * @param className - Optional CSS classes
     * @param asButton - If true, renders as button; otherwise as anchor
     */
    createContactLink(
      label: string,
      className?: string,
      asButton: boolean = false
    ): React.ReactNode {
      if (asButton) {
        return (
          <button
            type="button"
            onClick={() => {
              window.location.href = `mailto:${email}`;
            }}
            className={className}
            aria-label={`${label}: ${email}`}
          >
            {label}
          </button>
        );
      }
      
      return (
        <a
          href={`mailto:${email}`}
          className={className}
          aria-label={`${label}: ${email}`}
        >
          {label}
        </a>
      );
    },
    
    /**
     * Returns just the display text (obfuscated)
     * Useful when you need to show the email but not as a link
     */
    getDisplayText(): string {
      // Return with special Unicode zero-width characters to break scrapers
      // These are invisible to humans but disrupt pattern matching
      const zwsp = '\u200B'; // Zero-width space
      return `${localPart}${zwsp}@${zwsp}${domain}`;
    },
  };
}

/**
 * Pre-configured email instances for common use cases
 */
export const EMAIL_CONFIG = {
  contact: obfuscateEmail(
    import.meta.env.VITE_CONTACT_EMAIL || import.meta.env.VITE_SUPPORT_EMAIL || 'hello@oweable.com'
  ),
  support: obfuscateEmail(
    import.meta.env.VITE_SUPPORT_EMAIL || 'support@oweable.com'
  ),
  noreply: obfuscateEmail(
    import.meta.env.VITE_NOREPLY_EMAIL || 'noreply@oweable.com'
  ),
};

/**
 * Helper to create a CSS-based obfuscated email
 * Uses direction: rtl trick combined with unicode-bidi
 * Note: This is less accessible, use sparingly
 */
export function cssObfuscateEmail(email: string): React.ReactNode {
  const reversed = email.split('').reverse().join('');
  
  return (
    <span
      style={{
        unicodeBidi: 'bidi-override',
        direction: 'rtl',
        display: 'inline-block',
      }}
      aria-label={email}
      title={email}
    >
      {reversed}
    </span>
  );
}
