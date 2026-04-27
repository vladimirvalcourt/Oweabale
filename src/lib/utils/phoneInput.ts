/** US-style display: (978) 786-2540 from digits-only national number (10 digits for +1). */
export function formatUsNational(digits: string): string {
  const d = digits.replace(/\D/g, '').slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

export function nationalDigitsFromStored(phone: string | undefined | null): string {
  if (!phone) return '';
  const d = phone.replace(/\D/g, '');
  if (phone.startsWith('+1') && d.length >= 11) return d.slice(1, 11);
  if (d.length === 10) return d;
  return d.slice(0, 10);
}

export function toE164(dialCode: string, nationalDigits: string): string {
  const digits = nationalDigits.replace(/\D/g, '');
  const code = dialCode.replace(/\D/g, '');
  if (!code || !digits) return '';
  return `+${code}${digits}`;
}
