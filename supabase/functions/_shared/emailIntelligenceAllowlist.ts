/** Known financial sender domains + subject keywords for Email Intelligence pre-filter. */

export const FINANCIAL_SENDER_DOMAINS = new Set(
  [
    't-mobile.com',
    'verizon.com',
    'att.com',
    'visible.com',
    'boostmobile.com',
    'cricketwireless.com',
    'cricket.com',
    'nationalgrid.com',
    'eversource.com',
    'xcelenergy.com',
    'duke-energy.com',
    'dominionenergy.com',
    'coned.com',
    'pge.com',
    'sce.com',
    'sdge.com',
    'pepco.com',
    'bge.com',
    'comed.com',
    'e-zpass.com',
    'ezpass.com',
    'sunpass.com',
    'pikepass.com',
    'txtag.org',
    'goodtogousa.com',
    'fastrak.org',
    'sezzle.com',
    'afterpay.com',
    'klarna.com',
    'affirm.com',
    'zip.co',
    'splitit.com',
    'navient.com',
    'nelnet.net',
    'sofi.com',
    'mohela.com',
    'aidvantage.com',
    'greatlakes.org',
    'myfedloan.org',
    'midlandcredit.com',
    'portfoliorecovery.com',
    'convergentusa.com',
    'convergent.com',
    'amsher.com',
    'progressive.com',
    'geico.com',
    'statefarm.com',
    'allstate.com',
    'irs.gov',
    'turbotax.intuit.com',
    'intuit.com',
    'hrblock.com',
    'chase.com',
    'bankofamerica.com',
    'wellsfargo.com',
    'citi.com',
    'capitalone.com',
    'discover.com',
    'americanexpress.com',
    'synchronybank.com',
    'paypal.com',
    'venmo.com',
    'stripe.com',
  ].map((d) => d.toLowerCase()),
);

const BILLING_LOCALPARTS = ['billing', 'statements', 'noreply', 'no-reply', 'payments', 'accounts', 'alerts', 'notify'];

export const SUBJECT_KEYWORD_RX = new RegExp(
  [
    'statement available',
    'payment due',
    'past due',
    'final notice',
    'amount owed',
    'balance due',
    'your bill is ready',
    '\\binvoice\\b',
    'collection notice',
    'account past due',
    'autopay',
    'renewal',
    'subscription renewal',
    'payment reminder',
    'payment confirmation',
    '\\breceipt\\b',
    '\\bcharged\\b',
    'toll violation',
    '\\bcitation\\b',
    '\\bpenalty\\b',
  ].join('|'),
  'i',
);

function extractDomain(fromHeader: string): string | null {
  const m = fromHeader.match(/@([a-z0-9.-]+\.[a-z]{2,})/i);
  return m ? m[1].toLowerCase() : null;
}

function rootDomain(host: string): string {
  const parts = host.split('.').filter(Boolean);
  if (parts.length >= 2) return parts.slice(-2).join('.');
  return host;
}

export function senderMatchesAllowlist(fromHeader: string): boolean {
  const domain = extractDomain(fromHeader);
  if (!domain) return false;
  if (FINANCIAL_SENDER_DOMAINS.has(domain)) return true;
  const root = rootDomain(domain);
  for (const d of FINANCIAL_SENDER_DOMAINS) {
    if (d === root || domain.endsWith(`.${d}`)) return true;
  }
  const angle = fromHeader.match(/^([^<]+)</)?.[1] ?? fromHeader;
  const localMatch = angle.match(/([a-z0-9._-]+)@/i);
  const local = localMatch ? localMatch[1].toLowerCase().split('+')[0] : '';
  if (local && BILLING_LOCALPARTS.some((p) => local === p || local.startsWith(`${p}.`))) {
    return true;
  }
  return false;
}

export function subjectMatchesKeywords(subject: string): boolean {
  return SUBJECT_KEYWORD_RX.test(subject || '');
}

export function shouldConsiderEmail(fromHeader: string, subject: string): boolean {
  return senderMatchesAllowlist(fromHeader) || subjectMatchesKeywords(subject);
}
