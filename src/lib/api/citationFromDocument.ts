/**
 * Detect toll / traffic / parking notices from OCR or PDF text.
 * Used by Quick Add scan and Review Inbox ingestion.
 */
const CITATION_DOC =
  /toll|violation|citation|ticket|fine|infraction|notice of|penalty|mvd|dmv|traffic|speed|red light|parking (fine|violation|notice)|e-zpass|sunpass|fastrak|pikepass/i;

export function looksLikeCitationDocument(fullText: string): boolean {
  return CITATION_DOC.test(fullText);
}

export interface ExtractedCitationFields {
  citationType: string;
  jurisdiction: string;
  citationNumber: string;
  penaltyFee: string;
  daysLeft: string;
  citationDueDate: string;
}

export function extractCitationFieldsFromText(fullText: string): ExtractedCitationFields {
  const out: ExtractedCitationFields = {
    citationType: 'Toll Violation',
    jurisdiction: '',
    citationNumber: '',
    penaltyFee: '',
    daysLeft: '30',
    citationDueDate: '',
  };

  const citNumMatch = fullText.match(
    /(?:citation|notice|ticket|case|ref(?:erence)?|no\.?|#)\s*[:\-]?\s*([A-Z0-9\-]{4,20})/i
  );
  if (citNumMatch) out.citationNumber = citNumMatch[1].trim();

  const jurisdictionMatch = fullText.match(
    /(?:issued by|jurisdiction|county of|city of|state of|court)[:\s]+([A-Za-z\s]{3,40})/i
  );
  if (jurisdictionMatch) out.jurisdiction = jurisdictionMatch[1].trim().substring(0, 40);

  const allAmountMatches = fullText.match(/\$?\s*\d{1,6}\.\d{2}/g);
  if (allAmountMatches) {
    const amounts = allAmountMatches
      .map((m) => parseFloat(m.replace(/[^0-9.]/g, '')))
      .filter((n) => !isNaN(n) && n > 0)
      .sort((a, b) => b - a);
    if (amounts.length >= 2) out.penaltyFee = amounts[1].toFixed(2);
  }

  const dueDateMatch = fullText.match(
    /(?:due|pay by|payment due|deadline)[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i
  );
  if (dueDateMatch) {
    try {
      const dueD = new Date(dueDateMatch[1]);
      if (!isNaN(dueD.getTime())) {
        const days = Math.max(0, Math.round((dueD.getTime() - Date.now()) / 86400000));
        out.daysLeft = String(days);
        out.citationDueDate = dueD.toISOString().split('T')[0];
      }
    } catch {
      /* ignore */
    }
  }

  if (/e-zpass|ezpass/i.test(fullText)) out.citationType = 'Toll Violation';
  else if (/speed|mph|velocity/i.test(fullText)) out.citationType = 'Speed Camera';
  else if (/red light|signal/i.test(fullText)) out.citationType = 'Red Light Camera';
  else if (/parking/i.test(fullText)) out.citationType = 'Parking Ticket';
  else if (/traffic|moving/i.test(fullText)) out.citationType = 'Traffic Citation';
  else if (/toll/i.test(fullText)) out.citationType = 'Toll Violation';

  return out;
}
