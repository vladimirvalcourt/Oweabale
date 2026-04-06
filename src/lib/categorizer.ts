export const guessCategory = (text: string): string | null => {
  if (!text) return null;
  const t = text.toLowerCase();
  
  if (/(water|electric|power|gas|phone|internet|at&t|verizon|comcast|spectrum|utility|pg&e|trash|sewer|cable)/.test(t)) return 'utilities';
  if (/(rent|mortgage|apartment|lease|hoa|property)/.test(t)) return 'housing';
  if (/(netflix|spotify|hulu|disney|hbomax|subscription|prime|apple|youtube)/.test(t)) return 'subscriptions';
  if (/(geico|state farm|insurance|allstate|progressive|assurance|medicare)/.test(t)) return 'insurance';
  if (/(car|auto|honda|toyota|ford|subaru|bmw|tesla|vehicle|mechanic)/.test(t)) return 'auto';
  if (/(medical|doctor|therapy|pharmacy|cvs|walgreens|health|dental|vision)/.test(t)) return 'health';
  if (/(student|loan|college|university|tuition|school|education)/.test(t)) return 'education';
  if (/(daycare|child|babysitter|nanny)/.test(t)) return 'childcare';
  if (/(gym|planet fitness|hair|salon|barber|nails|personal|massage|spa)/.test(t)) return 'personal';
  if (/(tax|irs|revenue|customs)/.test(t)) return 'taxes';
  if (/(software|hosting|aws|google cloud|domain|business)/.test(t)) return 'business';
  if (/(coffee|starbucks|mcdonalds|kroger|whole foods|publix|restaurant|food|dining|grocery)/.test(t)) return 'food';
  if (/(uber|lyft|gas|shell|chevron|bp|transport|transit|flight|airline|train)/.test(t)) return 'transport';
  if (/(amazon|target|walmart|shopping|mall|clothing|shoes)/.test(t)) return 'shopping';
  
  return null;
};
