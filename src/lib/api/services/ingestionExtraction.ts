/**
 * Review Inbox — OCR/PDF text → pending row type + fields.
 * Shared between desktop upload and mobile sync re-scan.
 */
import { guessCategory } from './categorizer';
import { extractCitationFieldsFromText, looksLikeCitationDocument } from '@/lib/api/citation';
import type { PendingIngestion } from '@/store';

const RECEIPT_NOISE =
  /^(receipt|invoice|thank you|thanks|welcome|store|branch|tel:|phone:|www\.|http|address:|date:|time:|cashier|order #|order:|transaction|subtotal|total|tax|amount|change|cash|card|approved|auth|ref:|refund|void|copy|customer|#\d+|\d{3}[-.\s]\d{3}[-.\s]\d{4}|\d{1,5}\s+\w+\s+(st|ave|blvd|rd|dr|lane|ln|way|ct|pl|suite))/i;

function extractMerchantName(lines: string[]): string | null {
  for (const line of lines.slice(0, 12)) {
    const trimmed = line.trim();
    if (trimmed.length < 3 || trimmed.length > 60) continue;
    if (RECEIPT_NOISE.test(trimmed)) continue;
    if (/^\d+$/.test(trimmed)) continue;
    if (/^\$[\d.,]+$/.test(trimmed)) continue;
    return trimmed.substring(0, 50);
  }
  return null;
}

function firstAmount(fullText: string): number {
  const amountMatches = fullText.match(/\$?\s*\d{1,6}\.\d{2}/g);
  if (!amountMatches) return 0;
  const amounts = amountMatches
    .map((m) => parseFloat(m.replace(/[^0-9.]/g, '')))
    .filter((n) => !isNaN(n) && isFinite(n) && n > 0 && n < 100_000);
  return amounts.length > 0 ? Math.max(...amounts) : 0;
}

function parseFirstDate(fullText: string): { dueDate: string; incidentDate: string } {
  const fallback = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const dateMatch = fullText.match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/);
  if (!dateMatch) return { dueDate: fallback, incidentDate: fallback };
  try {
    const parsed = new Date(dateMatch[0]);
    if (isNaN(parsed.getTime())) return { dueDate: fallback, incidentDate: fallback };
    const iso = parsed.toISOString().split('T')[0];
    return { dueDate: iso, incidentDate: iso };
  } catch {
    return { dueDate: fallback, incidentDate: fallback };
  }
}

/** Map guessCategory slug to bill/transaction labels used across the app. */
function categoryLabel(slug: string | null): string {
  if (!slug) return 'other';
  const map: Record<string, string> = {
    utilities: 'utilities',
    housing: 'housing',
    subscriptions: 'subscriptions',
    insurance: 'insurance',
    auto: 'auto',
    health: 'health',
    education: 'education',
    childcare: 'childcare',
    personal: 'personal',
    taxes: 'taxes',
    business: 'business',
    food: 'food',
    transport: 'transport',
    shopping: 'shopping',
    entertainment: 'entertainment',
    debt: 'debt',
  };
  return map[slug] ?? slug;
}

export function buildScanExtraction(fullText: string): Pick<PendingIngestion, 'type' | 'extractedData'> {
  const lines = fullText.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
  const merchantName = extractMerchantName(lines);
  const roughLine =
    lines.find((l) => l.length > 3 && !RECEIPT_NOISE.test(l)) || 'Unknown Payee';
  const biller = merchantName || roughLine.substring(0, 50);

  const maxAmount = firstAmount(fullText);
  const { dueDate, incidentDate } = parseFirstDate(fullText);

  const guessed = guessCategory(fullText.substring(0, 800)) ?? guessCategory(biller) ?? guessCategory(merchantName || '');
  const category = categoryLabel(guessed);

  if (looksLikeCitationDocument(fullText)) {
    const cit = extractCitationFieldsFromText(fullText);
    const j0 = (cit.jurisdiction || '').trim();
    const jurisdiction =
      j0 ||
      biller ||
      roughLine.substring(0, 40) ||
      'Issuing authority (verify)';

    const penaltyParsed = cit.penaltyFee ? parseFloat(cit.penaltyFee) : 0;

    return {
      type: 'citation',
      extractedData: {
        biller: jurisdiction.substring(0, 50),
        jurisdiction: jurisdiction.substring(0, 80),
        citationType: cit.citationType,
        citationNumber: cit.citationNumber,
        penaltyFee: Number.isFinite(penaltyParsed) ? penaltyParsed : 0,
        daysLeft: Number.isFinite(parseInt(cit.daysLeft, 10)) ? parseInt(cit.daysLeft, 10) : 30,
        amount: maxAmount,
        dueDate: cit.citationDueDate || dueDate,
        date: incidentDate,
        category: 'transport',
        paymentUrl: '',
      },
    };
  }

  return {
    type: 'bill',
    extractedData: {
      biller: biller.substring(0, 50),
      name: biller.substring(0, 50),
      amount: maxAmount,
      dueDate,
      date: incidentDate,
      category,
    },
  };
}
