/**
 * Lightweight CSV parser with proper quote/escape support.
 * Returns array of objects using the first row as headers.
 */
export function parseCsv(text: string): Record<string, string>[] {
  const lines: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        current += '"';
        i++; // skip doubled quote
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === '\n') {
        lines.push(current);
        current = '';
      } else if (char === '\r') {
        // handle \r\n
        if (next === '\n') i++;
        lines.push(current);
        current = '';
      } else {
        current += char;
      }
    }
  }

  if (current || text.endsWith('\n') || text.endsWith('\r')) {
    lines.push(current);
  }

  const trimmed = lines.map((l) => l.trim()).filter((l) => l.length > 0);
  if (trimmed.length === 0) return [];

  const headers = trimmed[0].split(',').map((h) => h.trim());

  const rows: Record<string, string>[] = [];
  for (let i = 1; i < trimmed.length; i++) {
    const values: string[] = [];
    let val = '';
    let inQ = false;
    const line = trimmed[i];

    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      const next = line[j + 1];

      if (inQ) {
        if (char === '"' && next === '"') {
          val += '"';
          j++;
        } else if (char === '"') {
          inQ = false;
        } else {
          val += char;
        }
      } else {
        if (char === '"') {
          inQ = true;
        } else if (char === ',') {
          values.push(val.trim());
          val = '';
        } else {
          val += char;
        }
      }
    }
    values.push(val.trim());

    const row: Record<string, string> = {};
    for (let h = 0; h < headers.length; h++) {
      row[headers[h]] = values[h] ?? '';
    }
    rows.push(row);
  }

  return rows;
}

/**
 * Normalize a parsed CSV row into a transaction shape.
 */
export function normalizeTransactionRow(row: Record<string, string>): {
  amount: number | null;
  description: string;
  category: string;
  transaction_date: string;
  source_type: string;
} | null {
  const amount =
    row.Amount ?? row.amount ?? row.Price ?? row.price ?? row.Total ?? row.total ?? '';
  const description =
    row.Description ?? row.description ?? row.Desc ?? row.desc ?? row.Name ?? row.name ?? row.Note ?? row.note ?? '';
  const category =
    row.Category ?? row.category ?? row.Type ?? row.type ?? 'uncategorized';
  const date =
    row.Date ?? row.date ?? row['Transaction Date'] ?? row['transaction_date'] ?? '';
  const source =
    row.Source ?? row.source ?? row.Type ?? row.type ?? 'import';

  if (!amount || !description || !date) return null;

  const parsedAmount = Number(amount.replace(/[$,]/g, ''));
  if (Number.isNaN(parsedAmount) || parsedAmount === 0) return null;

  // Try to parse date — accept ISO, US-style (MM/DD/YYYY), or DD-MM-YYYY
  let isoDate = '';
  const isoMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    isoDate = date;
  } else {
    const usMatch = date.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (usMatch) {
      const [, m, d, y] = usMatch;
      isoDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    } else {
      const euMatch = date.match(/^(\d{1,2})-(\d{1,2})-(\d{4})/);
      if (euMatch) {
        const [, d, m, y] = euMatch;
        isoDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      }
    }
  }

  if (!isoDate) return null;

  return {
    amount: parsedAmount,
    description,
    category: category.toLowerCase(),
    transaction_date: isoDate,
    source_type: source.toLowerCase(),
  };
}
