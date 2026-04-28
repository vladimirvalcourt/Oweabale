# Content Audit: Humanizing Robotic Language

**Date:** April 27, 2026  
**Scope:** All pages with payment, billing, and subscription-related content  
**Goal:** Replace robotic, corporate, and technical language with warm, human-friendly copy

---

## Summary of Changes

### 1. **BillingPanel.tsx** - Most Critical Area
**File:** `/src/pages/settings/BillingPanel.tsx`

#### State Labels
- ❌ `'Access locked'` → ✅ `'Trial ended'`
- ❌ `'Subscribe to continue using Oweable.'` → ✅ `'Add a plan to keep using Oweable.'`
- ❌ `'Access locked'` (expired trial) → ✅ `'Paused'`
- ❌ `'Your 14-day trial ended. Subscribe to continue using Oweable.'` → ✅ `'Your trial wrapped up. Pick a plan to jump back in.'`

#### Status Messages
- ❌ `'Your 14-day Full Suite trial is active until [date]. Add a payment method before then if you want billing to continue without interruption.'`
- ✅ `'You're all set until [date]. Want to keep things running smoothly? Add your payment details before then.'`

- ❌ `'Subscription ${sub.status}. Current period ends ${endDate}.'`
- ✅ `'All good — you're set through ${endDate}.'`

- ❌ `'Subscription ${sub.status}.'`
- ✅ `'You're all set with Full Suite.'`

#### Trial Ended Banner
- ❌ `'Your account is locked until billing is active. Start a subscription to continue using your Pay List...'`
- ✅ `'Your account is paused until you pick a plan. Start a subscription to get back to your Pay List...'`

#### Active Subscription Card
- ❌ `'Start paid billing whenever you are ready so your card is on file before the trial ends.'`
- ✅ `'Start paid billing whenever you are ready so everything keeps working after the trial ends.'`

#### Button Labels
- ❌ `'Add payment method'` → ✅ `'Add payment details'`
- ❌ `'Manage billing'` → ✅ `'Open billing portal'`
- ❌ `'Manage in Stripe Portal'` → ✅ `'Open billing portal'`

#### Helper Text
- ❌ `'Adding a payment method starts Stripe checkout so your subscription is ready before trial access ends.'`
- ✅ `'Adding payment details starts checkout so your subscription is ready before trial access ends.'`

- ❌ `"Manage billing opens Stripe's customer portal to update payment methods and invoices."`
- ✅ `"Open billing portal to update payment methods and view invoices."`

#### Payment Methods Section
- ❌ `'Cards on file'` → ✅ `'Payment methods'`
- ❌ `'No payment method on file'` → ✅ `'No payment method yet'`
- ❌ `'You are in the trial period and do not have a payment method on file yet.'`
- ✅ `'You are in the trial period and do not need to add payment details yet.'`
- ❌ `'Add, remove, or replace cards in the Stripe Customer Portal.'`
- ✅ `'Update or change your card anytime in the billing portal.'`
- ❌ `'Add a payment method by starting Full Suite.'`
- ✅ `'Add your payment details when you start Full Suite.'`

#### Cancel Dialogs
- ❌ `'Immediate cancel ends paid access today. Your data is retained for 30 days per policy.'`
- ✅ `'Immediate cancel ends paid access today. We'll keep your data safe for 30 days so you can come back if needed.'`

- ❌ `'After that, app access locks until billing is active again. Your data is retained.'`
- ✅ `'After that, app access pauses until you pick a plan again. Your data stays safe.'`

#### Upgrade Cards
- ❌ `'Subscribe to continue'` → ✅ `'Pick a plan to continue'`
- ❌ `'Start Full Suite for $X/month to unlock your account again.'`
- ✅ `'Start Full Suite for $X/month to get back into your account.'`

---

### 2. **Pricing.tsx**
**File:** `/src/pages/Pricing.tsx`

#### Buttons
- ❌ `'Starting checkout...'` → ✅ `'Getting things ready...'`
- ❌ `'Unlock Full Suite'` → ✅ `'Start Full Suite'`
- ❌ `'Upgrade to Full Suite'` → ✅ `'Start Full Suite'`

#### FAQ Answers
- ❌ `'If you do nothing, your signed-in app locks after 14 days. You can add billing before the trial ends or subscribe later to continue using Oweable.'`
- ✅ `'If you do nothing, your signed-in app pauses after 14 days. You can add your payment details before the trial ends or pick a plan later to keep using Oweable.'`

- ❌ `'Yes. If you upgrade, you can manage or cancel your subscription from your account settings without needing to talk to anyone.'`
- ✅ `'Yes. Once you start Full Suite, you can pause or cancel your subscription from your account settings — no need to talk to anyone.'`

---

### 3. **Trial Warning Email**
**File:** `/supabase/functions/trial-warning-email/index.ts`

#### Email Body
- ❌ `'Your Full Suite trial ends in X days. After that, app access locks unless billing is active.'`
- ✅ `'Your Full Suite trial ends in X days. Want to keep everything running? Add your payment details before then.'`

- ❌ `'Add billing before the trial ends to keep using your Pay List, documents, calendar, and settings without interruption.'`
- ✅ `'Add your payment details before the trial ends so your Pay List, documents, calendar, and settings keep working without interruption.'`

- ❌ `'Upgrade now to keep everything:'` → ✅ `'Pick a plan to keep going:'`
- ❌ `'View Plans & Upgrade →'` → ✅ `'See Plans & Start →'`
- ❌ `'No surprise charges. You can add billing now, or subscribe later to unlock the app again.'`
- ✅ `'No surprise charges. Add your payment details now, or pick a plan later to get back in.'`

#### Plain Text Version
Same changes applied to the text-only version of the email.

---

### 4. **Support.tsx**
**File:** `/src/pages/Support.tsx`

#### Quick Help FAQ
- ❌ `'Full Suite renews on your billing cycle and can be managed from your settings.'`
- ✅ `'Full Suite renews on your billing cycle and you can manage it from your settings.'`

- ❌ `'Use the same sign-in method you originally used. If access still fails, send support the email tied to the account and a short description of what happened so we can help faster.'`
- ✅ `'Use the same sign-in method you originally used. If that still does not work, send support the email tied to your account and a quick note about what happened so we can help faster.'`

- ❌ `'You can cancel from billing settings. Access remains active through the end of the current paid period.'`
- ✅ `'You can pause or cancel from your billing settings. Your access stays active until the end of your current paid period.'`

---

### 5. **Obligations.tsx**
**File:** `/src/pages/Obligations.tsx`

#### Toast Messages
- ❌ `'Loans and credit cards are a Full Suite feature. Upgrade to add debt.'`
- ✅ `'Loans and credit cards need Full Suite. Start a plan to add debt.'`

#### Gate Card
- ❌ `'Unlock Avalanche/Snowball strategy modeling, debt-free projections, and interest-saved analytics.'`
- ✅ `'Start Full Suite to get Avalanche/Snowball strategy modeling, debt-free projections, and interest-saved analytics.'`

---

### 6. **FreeDashboard.tsx**
**File:** `/src/pages/FreeDashboard.tsx`

#### Upgrade Banner
- ❌ `'Unlock Full Suite'` → ✅ `'Start Full Suite'`
- ❌ `'Loading...'` → ✅ `'Getting things ready...'`
- ❌ `'Upgrade — $X/mo'` → ✅ `'Start Full Suite — $X/mo'`

---

### 7. **Education.tsx**
**File:** `/src/pages/Education.tsx`

#### Gate Card
- ❌ `'Upgrade to unlock guided finance tracks, saved lesson progress, and deeper curriculum content.'`
- ✅ `'Start Full Suite to get guided finance tracks, saved lesson progress, and deeper curriculum content.'`

---

### 8. **FullSuiteGate.tsx Component**
**File:** `/src/components/guards/FullSuiteGate.tsx`

#### Button Label
- ❌ `'Starting checkout...'` → ✅ `'Getting things ready...'`
- ❌ `'Upgrade — $X/mo'` → ✅ `'Start Full Suite — $X/mo'`

#### Gate Card Description
- ❌ `'Upgrade to unlock this advanced tool.'`
- ✅ `'Start Full Suite to get access to this advanced tool.'`

---

### 9. **QuickAddModal.tsx**
**File:** `/src/components/common/QuickAddModal.tsx`

#### Toast Messages
- ❌ `'Tracker (free) includes bills and tickets here. Upgrade to Full Suite for ledger and income entries.'`
- ✅ `'Tracker (free) includes bills and tickets here. Start Full Suite for ledger and income entries.'`

- ❌ `'Adding loans and credit cards requires Full Suite.'`
- ✅ `'Adding loans and credit cards needs Full Suite.'`

---

## Key Principles Applied

### 1. **Avoid Corporate/Technical Jargon**
- ❌ "billing is active" → ✅ "pick a plan"
- ❌ "payment method on file" → ✅ "payment details"
- ❌ "Stripe Customer Portal" → ✅ "billing portal"
- ❌ "access locks" → ✅ "access pauses"

### 2. **Use Conversational Language**
- ❌ "Subscribe to continue" → ✅ "Pick a plan to continue"
- ❌ "Your data is retained" → ✅ "We'll keep your data safe"
- ❌ "Manage billing" → ✅ "Open billing portal"

### 3. **Focus on Benefits, Not Features**
- ❌ "so your card is on file" → ✅ "so everything keeps working"
- ❌ "to unlock your account" → ✅ "to get back into your account"

### 4. **Soften Negative States**
- ❌ "Access locked" → ✅ "Trial ended" / "Paused"
- ❌ "locked" → ✅ "paused"
- ❌ "retained per policy" → ✅ "kept safe so you can come back"

### 5. **Make Actions Feel Voluntary**
- ❌ "Upgrade to unlock" → ✅ "Start Full Suite to get"
- ❌ "requires Full Suite" → ✅ "needs Full Suite"

### 6. **Use Warmth Over Precision**
- ❌ "Current period ends [date]" → ✅ "You're set through [date]"
- ❌ "All good — you're set" instead of "Subscription active"

---

## Impact

These changes make the application feel:
- ✅ More human and approachable
- ✅ Less corporate and transactional
- ✅ More trustworthy and transparent
- ✅ Easier to understand for non-technical users
- ✅ Aligned with the brand voice of being helpful, not pushy

The language now sounds like a helpful friend explaining options, rather than a system enforcing rules.
