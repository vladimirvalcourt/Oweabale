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
  /\b(finance|financial|money|money\s+management|bill|bills|biller|debt|debts|loan|loans|budget|budgets|save|saving|spend|spending|expense|income|paycheck|salary|wage|subscription|subscriptions|cash|checking|savings|liquid|afford|buy|buys|buying|bought|purchase|purchases|shopping|shop|splurge|due|payment|payments|min(imum)?\s+payment|apr|interest|compound\s+interest|simple\s+interest|credit|credit\s*card|credit\s*score|fico|utilization|statement\s+balance|minimum\s+due|debt\s*to\s*income|dti|mortgage|rent|utility|utilities|electric|grocer|tax|taxes|1099|w2|freelance|invoice|goal|goals|transaction|transactions|category|categories|net\s*worth|asset|assets|liabilities|balance|surplus|deficit|overdraft|emergency\s+fund|sinking\s+fund|refinance|refinancing|collection|collections|delinquent|late\s+fee|grace\s+period|principal|amortization|401k|ira|roth|hsa|invest|investment|portfolio|crypto|bitcoin|stock|stocks|bond|bonds|etf|ticker|cite|citation|fine|fines|ticket|owe|owed|obligation|cash\s*flow|safe\s*to\s*spend|disposable)\b/i;

const PERSONAL_OR_APP =
  /\b(i|i'?m|i'?ve|i'?d|my|me|mine|our|ours|myself|we|we'?re)\b|\b(oweable|my\s+data|my\s+account|this\s+app|in\s+oweable|on\s+my\s+dashboard|my\s+records|what\s+i\s+have|how\s+much\s+do\s+i|how\s+am\s+i\s+doing|can\s+i\s+afford|what\s+can\s+i|should\s+i\s+buy|can\s+i\s+buy|can\s+i\s+get)\b/i;

/** Questions about concrete records without always saying "my". */
const DATA_QUERY =
  /\b(what|which|when|where|how\s+much|how\s+many|list|show|summarize|summary|explain|break\s*down|compare|prioritize|remind|upcoming|overdue|next|due)\b/i;

/** General finance education intent (allowed when clearly financial). */
const EDUCATION_QUERY =
  /\b(what\s+is|what'?s|how\s+does|how\s+do|explain|teach\s+me|help\s+me\s+understand|difference\s+between|pros?\s+and\s+cons?|best\s+way\s+to|tips?\s+for|tell\s+me\s+about|tell\s+me\s+more|walk\s+me\s+through|overview|i\s+want\s+to\s+learn|academy|course|lesson|curriculum|beginner|beginner-friendly|from\s+scratch|basics|fundamentals)\b/i;

const SOCIAL_OPENER =
  /^(hi|hello|hey|heya|howdy|good\s+(morning|afternoon|evening))(?:[!. ]+.*)?$|^(how\s+are\s+you|how'?s\s+it\s+going|what'?s\s+up)\b/i;

const SHORT_GRATITUDE = /^(thanks|thank\s+you|appreciate\s+it|got\s+it|ok(?:ay)?|cool)\b/i;

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
          'I can help with your money in Oweable. Ask about bills, income, debts, subscriptions, budgets, goals, or cash flow.',
      };
    }
  }

  const socialOpener = text.length <= 160 && SOCIAL_OPENER.test(text);
  if (socialOpener) return { ok: true };

  const shortGratitude = text.length <= 80 && SHORT_GRATITUDE.test(text);
  if (shortGratitude) return { ok: true };

  const shortFollowUp =
    opts.hasRecentAssistant &&
    text.length <= 48 &&
    /^(why|how|what|when|where|ok|yes|no|thanks|thank you|explain|elaborate|more|details?|really|sure)\b/i.test(text);
  if (shortFollowUp) return { ok: true };

  const finance = FINANCE_DOMAIN.test(text);
  const personal = PERSONAL_OR_APP.test(text);
  const dataAsk = DATA_QUERY.test(text) && finance;
  const educationAsk = EDUCATION_QUERY.test(text) && finance;

  if (finance && (personal || dataAsk)) return { ok: true };
  if (educationAsk) return { ok: true };

  if (finance && !personal && !dataAsk) {
    return {
      ok: false,
      code: 'NOT_USER_DATA',
      userMessage:
        'I can definitely help. Ask it in the context of your money, or ask a finance concept question (for example: “What is APR?” or “How should I budget?”).',
    };
  }

  return {
    ok: false,
    code: 'OFF_TOPIC',
    userMessage:
      'I stay focused on personal finance here. Try bills, cash flow, debts, subscriptions, budgets, goals, or a finance education question.',
  };
}
