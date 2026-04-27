export const guessCategory = (text: string): string | null => {
  if (!text) return null;
  const t = text.toLowerCase();

  if (/(water|electric|power|gas bill|gas company|phone|internet|at&t|verizon|comcast|xfinity|spectrum|utility|pg&e|trash|sewer|cable|wifi|broadband|cox|centurylink|frontier)/.test(t)) return 'utilities';
  if (/(rent|mortgage|apartment|lease|hoa|property|landlord|realty|real estate)/.test(t)) return 'housing';
  if (/(netflix|spotify|hulu|disney\+|hbo|max|subscription|prime video|apple tv|youtube premium|peacock|paramount|twitch|patreon|dropbox|icloud|adobe)/.test(t)) return 'subscriptions';
  if (/(geico|state farm|insurance|allstate|progressive|assurance|medicare|aetna|cigna|bluecross|nationwide|liberty mutual|farmers)/.test(t)) return 'insurance';
  if (/(car payment|auto loan|honda|toyota|ford|subaru|bmw|tesla|vehicle|mechanic|jiffy lube|firestone|autozone|napa auto|advance auto|o'reilly|pep boys|dealership|car wash|oil change|dmv|registration)/.test(t)) return 'auto';
  if (/(medical|doctor|hospital|therapy|pharmacy|cvs|walgreens|health|dental|vision|optometrist|urgent care|clinic|lab corp|quest diagnostics|anthem|humana)/.test(t)) return 'health';
  if (/(student loan|college|university|tuition|school|education|sallie mae|navient|coursera|udemy|skillshare|khan academy|textbook)/.test(t)) return 'education';
  if (/(daycare|day care|preschool|pre-k|kindergarten)/.test(t)) return 'daycare';
  if (/(child care|babysitter|nanny|after school)/.test(t)) return 'childcare';
  if (/(child support paid|paying child support|child support to)/.test(t)) return 'child_support';
  if (/(alimony paid|spousal support paid)/.test(t)) return 'alimony';
  if (/(gym|planet fitness|hair|salon|barber|nails|nail salon|personal care|massage|spa|equinox|anytime fitness|la fitness|crunch|waxing|tattoo)/.test(t)) return 'personal';
  if (/(tax|irs|revenue|customs|h&r block|turbotax)/.test(t)) return 'taxes';
  if (/(aws|google cloud|azure|domain|hosting|github|figma|slack|notion|linear|vercel|software|saas|business|office 365|microsoft 365|zoom|hubspot|salesforce|quickbooks|stripe)/.test(t)) return 'business';
  if (/(coffee|starbucks|dunkin|mcdonalds|chipotle|doordash|uber eats|grubhub|instacart|kroger|whole foods|publix|safeway|aldi|trader joe|costco|sam's club|restaurant|food|dining|grocery|pizza|taco|burger|sushi|deli|bakery|cafe|bar|donut)/.test(t)) return 'food';
  if (/(uber|lyft|gas station|shell|chevron|bp|exxon|mobil|speedway|sunoco|transport|transit|mta|bart|metro|flight|airline|amtrak|train|bus|parking|toll|zipcar)/.test(t)) return 'transport';
  if (/(home depot|lowe's|lowes|menards|ace hardware|harbor freight|tool|tools|drill|wrench|hammer|saw|plumb|lumber|screw|nail|paint|flooring|tile|appliance|home improvement|garden|gardening|hardware|wayfair|ikea|ashley furniture|crate and barrel|restoration hardware)/.test(t)) return 'shopping';
  if (/(amazon|target|walmart|ebay|etsy|best buy|costco|apple store|samsung|electronics|clothing|shoes|nike|adidas|gap|h&m|zara|nordstrom|tj maxx|marshalls|ross|old navy|macy's|shopping|department store|mall|retail)/.test(t)) return 'shopping';
  if (/(entertainment|movie|cinema|amc|regal|concert|ticket|ticketmaster|stubhub|eventbrite|netflix|gaming|playstation|xbox|steam|nintendo|bowling|arcade|museum|theater|comedy|sport|live event)/.test(t)) return 'entertainment';
  if (/(debt|loan|credit card|chase|citi|bank of america|capital one|discover|wells fargo|amex|american express|synchrony|payment|minimum payment)/.test(t)) return 'debt';

  return null;
};
