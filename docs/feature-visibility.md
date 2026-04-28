# Feature visibility map

This map keeps the Oweable app focused after sign-in. Routes can remain available while navigation only exposes the features a user needs to understand the product.

## Primary visible path

| Feature | Route | Wire/source | Visibility |
| --- | --- | --- | --- |
| Pay List | `/pro/dashboard` | `Dashboard`, `bills`, `debts`, `subscriptions`, `citations`, `budgets`, `transactions` | Primary |
| Calendar | `/pro/calendar` | `Calendar`, obligation dates and recurring items | Primary |
| Documents | `/pro/documents` | `Ingestion`, `pendingIngestions`, mobile capture sessions | Primary |
| Settings | `/pro/settings` | `Settings`, profile, plan, connections, security, data export/deletion | Primary |

## Secondary visible path

These stay in `More` because they directly explain or power the Pay List.

| Feature | Route | Wire/source | Why visible |
| --- | --- | --- | --- |
| Spending comfort | `/pro/dashboard#safe-spend` | Dashboard safe-spend panel | Helps answer “what can I pay?” |
| Pay List details | `/pro/bills` | `Obligations`, `bills`, `debts`, `citations` | Detailed editing for what is owed |
| Due soon | `/pro/bills#due-soon` | `computeDueSoonCount`, `buildDueSoonPreview` | Urgency shortcut |
| Debt minimums | `/pro/bills?tab=debt` | `debts` | Core obligation type |
| Tolls, tickets & fines | `/pro/bills?tab=ambush` | `citations` | Core “easy to miss” obligation type |
| Subscriptions | `/pro/subscriptions` | `subscriptions` | Recurring obligations |
| Transactions | `/pro/transactions` | `transactions`, Plaid sync | Source data for budgets and cash review |
| Budgets | `/pro/budgets` | `budgets`, budget guardrails | Spending comfort support |
| Income | `/pro/income` | `incomes` | Cash timing support |

## Hidden/searchable capabilities

These should not be top-level navigation, but users can find them through search or contextual entry points.

| Capability | Current entry | Wire/source | Visibility |
| --- | --- | --- | --- |
| Form filler / document autofill | `/pro/documents` | `Ingestion`, OCR/PDF extraction, `pendingIngestions` | Searchable as “form”, “form filler”, “autofill”, “W-9”, “1099”; keep inside Documents until there is a real fill/export workflow |

## Hidden from default navigation

These routes stay wired for later use, deep links, and future progressive disclosure, but should not appear in default first-run navigation.

| Feature | Route | Reason hidden |
| --- | --- | --- |
| Freelance / gigs | `/pro/freelance` | Niche workflow; show only when user opts into variable-income work |
| Net Worth | `/pro/net-worth` | Advanced planning; not needed to use the Pay List |
| Savings | `/pro/savings` | Depends on bank sync and account classification |
| Goals | `/pro/goals` | Motivational layer; not required for first value |
| Investments | `/pro/investments` | Long-term wealth layer; distracts from obligation management |
| Insurance | `/pro/insurance` | Optional records module |
| Academy | `/pro/education` | Content layer; should be contextual, not primary nav |
| Credit Workshop | `/pro/credit` | Separate financial journey; should be introduced later |
| Taxes | `/pro/taxes` | Relevant to some users, but too specialized for default nav |
| Reports | `/pro/reports` | Analysis layer after enough data exists |
| Trends | `/pro/analytics` | Analysis layer after enough data exists |
| Categories | `/pro/categories` | System configuration; better reached from Settings |
| Notification preferences | `/pro/settings?tab=notifications` | Hide until notification channels are fully explained contextually |
| Household sharing | `/pro/settings?tab=household` | Hide until household membership is production-ready and introduced from onboarding |
| Tax preferences | `/pro/settings?tab=financial` | Hide while Taxes is hidden from default navigation |
| Support tickets | `/pro/settings?tab=support` | Use the public Support page instead of burying a second support surface in Settings |
| Feedback | `/pro/settings?tab=feedback` | Hide as internal product feedback, not a core account setting |

## Not built yet

| Feature | Intended home | Required wiring before visibility |
| --- | --- | --- |
| True fillable-form generator | `/pro/documents` | PDF field detection, saved profile fields, review UI, export/download, audit trail |

## Rule

Default app navigation should answer three questions:

1. What do I owe?
2. When is it due?
3. What document or setting do I need to fix it?

Everything else should be contextual, searchable, or settings-driven until the user has enough data and intent to need it.
