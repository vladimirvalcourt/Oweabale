/** Server-side guardrails: Owe-AI only handles personal finance questions tied to the user's Oweable data. */

const MAX_LEN = 2000;

/** Obvious non-finance or abuse patterns — block even if other heuristics pass. */
const OFF_TOPIC_BLOCKLIST: RegExp[] = [
  /\bweather\b/i,
  /\btemperature\b/i,
  /\brecipe\b/i,
  /\bcook\b/i,
  /\bpython\b|\bjavascript\b|\btypescript\b|\breact\b|\bnode\.?js\b/i,
  /\bwrite\s+(me\s+)?(a\s+)?(poem|story|song|essay)/i,
  /\bdebug\b.*\b(code|error)\b/i,
  /\bwho\s+won\b|\bsuper\s*bowl\b|\bworld\s+cup\b/i,
  /\btranslate\b.*\b(to|into)\s+\w+/i,
  /\bignore\s+(previous|all)\s+instructions\b/i,
  /\bjailbreak\b|\bdan\s+mode\b/i,
];

/** Domain terms: money / obligations / app data. */
const FINANCE_DOMAIN =
  /\b(bill|bills|biller|debt|debts|loan|loans|budget|budgets|save|saving|spend|spending|expense|income|paycheck|salary|wage|subscription|subscriptions|cash|checking|savings|liquid|afford|buy|buys|buying|bought|purchase|purchases|shopping|shop|splurge|due|payment|payments|min(imum)?\s+payment|apr|interest|credit\s*card|mortgage|rent|utility|utilities|electric|grocer|tax|taxes|1099|freelance|invoice|goal|goals|transaction|transactions|category|categories|net\s*worth|asset|assets|balance|surplus|deficit|overdraft|401k|ira|roth|invest|investment|portfolio|crypto|bitcoin|stock|stocks|ticker|cite|citation|fine|fines|ticket|owe|owed|obligation|cash\s*flow|safe\s*to\s*spend|disposable)\b/i;

const PERSONAL_OR_APP =
  /\b(i|i'?m|i'?ve|i'?d|my|me|mine|our|ours|myself|we|we'?re)\b|\b(oweable|my\s+data|my\s+account|this\s+app|in\s+oweable|on\s+my\s+dashboard|my\s+records|what\s+i\s+have|how\s+much\s+do\s+i|how\s+am\s+i\s+doing|can\s+i\s+afford|what\s+can\s+i|should\s+i\s+buy|can\s+i\s+buy|can\s+i\s+get)\b/i;

/** Questions about concrete records without always saying "my". */
const DATA_QUERY =
  /\b(what|which|when|where|how\s+much|how\s+many|list|show|summarize|summary|explain|break\s*down|compare|prioritize|remind|upcoming|overdue|next|due)\b/i;

export type GuardFail = { ok: false; code: 'EMPTY' | 'TOO_LONG' | 'OFF_TOPIC' | 'NOT_USER_DATA'; userMessage: string };
export type GuardOk = { ok: true };
export type GuardResult = GuardOk | GuardFail;

export function guardOweAiMessage(
  raw: string,
  opts: { hasRecentAssistant: boolean },
): GuardResult {
  const text = raw.trim();
  if (!text) {
    return {
      ok: false,
      code: 'EMPTY',
      userMessage: 'Type a question about your money in Oweable.',
    };
  }
  if (text.length > MAX_LEN) {
    return {
      ok: false,
      code: 'TOO_LONG',
      userMessage: 'That message is too long. Please shorten it (max 2,000 characters).',
    };
  }

  for (const r of OFF_TOPIC_BLOCKLIST) {
    if (r.test(text)) {
      return {
        ok: false,
        code: 'OFF_TOPIC',
        userMessage:
          'Owe-AI only answers questions about **your personal finances** using your Oweable data. Try bills, income, debts, subscriptions, budgets, goals, or cash flow.',
      };
    }
  }

  const shortFollowUp =
    opts.hasRecentAssistant &&
    text.length <= 48 &&
    /^(why|how|what|when|where|ok|yes|no|thanks|thank you|explain|elaborate|more|details?|really|sure)\b/i.test(text);
  if (shortFollowUp) return { ok: true };

  const finance = FINANCE_DOMAIN.test(text);
  const personal = PERSONAL_OR_APP.test(text);
  const dataAsk = DATA_QUERY.test(text) && finance;

  if (finance && (personal || dataAsk)) return { ok: true };

  if (finance && !personal && !dataAsk) {
    return {
      ok: false,
      code: 'NOT_USER_DATA',
      userMessage:
        'Owe-AI only discusses **your** situation using data in Oweable. Ask how something applies to *your* bills, income, debts, budgets, or goals.',
    };
  }

  return {
    ok: false,
    code: 'OFF_TOPIC',
    userMessage:
      'That does not look like a personal finance question about your Oweable data. Ask about your bills, cash flow, debts, subscriptions, budgets, or goals.',
  };
}
