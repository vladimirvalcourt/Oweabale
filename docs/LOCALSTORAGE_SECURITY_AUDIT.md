# localStorage Security Audit & Recommendations

**Date:** 2026-04-29  
**Audit Type:** Client-Side Storage Security Review  
**Risk Level:** Low (No critical issues found)

---

## Executive Summary

Audited all 16 localStorage usage sites in the Owebale application. **No sensitive financial data or authentication tokens are stored in localStorage.** All stored data is UI state, preferences, or non-sensitive metadata. Risk level is LOW.

---

## localStorage Usage Analysis

### ✅ Safe - UI State & Preferences (No Action Needed)

| File | Key | Data Stored | Sensitivity | Recommendation |
|------|-----|-------------|-------------|----------------|
| `useTheme.ts` | `theme` | Theme preference ('light'/'dark') | None | ✅ Keep |
| `PWAInstallBanner.tsx` | `pwa_install_dismissed` | Boolean flag | None | ✅ Keep |
| `ProWelcomeModal.tsx` | Custom key | Dismissal flag ('1') | None | ✅ Keep |
| `Insurance.tsx` | Custom key | Banner dismissal flag | None | ✅ Keep |
| `Budgets.tsx` | Custom key | Savings target amount | Low (financial but user-set) | ✅ Keep |
| `Dashboard.tsx` | Custom key | Payment list snooze times | Low (UI state) | ✅ Keep |
| `Subscriptions.tsx` | Custom key | Cancellation review IDs | Low (UUIDs only) | ✅ Keep |
| `Goals.tsx` | Custom key | Accountability check-ins | Low (user notes) | ✅ Keep |
| `BankConnection.tsx` | Custom key | Connection timeline events | Low-Medium (metadata) | ⚠️ Monitor |
| `Settings.tsx` | `oweable_last_deletion_receipt` | Deletion receipt metadata | Low (timestamp/ID) | ✅ Keep |

### ⚠️ Review Recommended - Notification Preferences

| File | Key | Data Stored | Sensitivity | Recommendation |
|------|-----|-------------|-------------|----------------|
| `dataSyncSlice.ts` | `oweable_notification_prefs_v1` | Notification preferences object | Low (preferences) | ✅ Acceptable |
| `accountSlice.ts` | `oweable_notification_prefs_v1` | Notification preferences object | Low (preferences) | ✅ Acceptable |
| `NotificationsPanel.tsx` | `oweable_notification_prefs_v1` | Notification preferences object | Low (preferences) | ✅ Acceptable |

**Note:** Notification preferences contain settings like email/push preferences. Not sensitive but could reveal user behavior patterns.

### ⚠️ Admin Feature - Impersonation State

| File | Key | Data Stored | Sensitivity | Recommendation |
|------|-----|-------------|-------------|----------------|
| `ImpersonationContext.tsx` | Custom key | Admin impersonation state | Medium (admin feature) | 🔒 Add encryption |

**Risk:** If XSS vulnerability exists, attacker could detect admin impersonation is active.

---

## Security Assessment

### What's NOT Stored (Good!):
- ❌ No authentication tokens
- ❌ No session IDs
- ❌ No API keys or secrets
- ❌ No raw financial data (account numbers, balances)
- ❌ No PII (email, phone, name)
- ❌ No Plaid access tokens
- ❌ No Stripe customer IDs

### What IS Stored (Acceptable):
- ✅ UI preferences (theme, banner dismissals)
- ✅ Notification settings
- ✅ User-generated content (goals, notes)
- ✅ UI state (snooze times, selected items)
- ✅ Non-sensitive metadata (connection timelines)

---

## Recommendations

### Priority 1: Encrypt Admin Impersonation State (Medium Priority)

**File:** `src/features/admin/shared/ImpersonationContext.tsx`

**Current:**
```typescript
localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
```

**Recommended:**
```typescript
import { encrypt, decrypt } from '@/lib/crypto';

// Store encrypted
const encrypted = encrypt(JSON.stringify(state), ADMIN_IMPERSONATION_KEY);
localStorage.setItem(STORAGE_KEY, encrypted);

// Retrieve decrypted
const encrypted = localStorage.getItem(STORAGE_KEY);
const state = encrypted ? JSON.parse(decrypt(encrypted, ADMIN_IMPERSONATION_KEY)) : null;
```

**Why:** Prevents XSS attackers from detecting admin impersonation sessions.

---

### Priority 2: Add Expiration to Bank Connection Timeline (Low Priority)

**File:** `src/components/common/BankConnection.tsx`

**Current:** Stores last 20 connection events indefinitely

**Recommended:**
```typescript
// Add timestamp and auto-expire after 30 days
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const now = Date.now();

// Filter out old events when reading
const recentEvents = events.filter(e => now - e.timestamp < THIRTY_DAYS_MS);
```

**Why:** Reduces data retention and potential information leakage.

---

### Priority 3: Document localStorage Clearing on Logout (Best Practice)

**Add to auth logout flow:**
```typescript
// In useAuth.ts or logout handler
function clearClientStorage() {
  // Keep theme preference
  const theme = localStorage.getItem('theme');
  
  // Clear all oweable_ prefixed keys
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('oweable_')) {
      localStorage.removeItem(key);
    }
  });
  
  // Restore theme
  if (theme) localStorage.setItem('theme', theme);
}
```

**Why:** Ensures clean state between user sessions while preserving UX preferences.

---

### Priority 4: Consider Moving Notification Prefs to Database (Optional)

**Current:** Notification preferences in localStorage  
**Alternative:** Store in `profiles.notification_prefs` column

**Pros of database:**
- Syncs across devices
- Survives browser cache clear
- Can be backed up/restored

**Cons:**
- Extra database query on load
- More complex updates

**Recommendation:** Keep in localStorage for now (low sensitivity), consider migration if multi-device sync becomes important.

---

## Threat Model Analysis

### Scenario 1: XSS Attack
**Risk:** Attacker injects malicious script  
**Impact with current localStorage:**
- Can read notification preferences (low value)
- Can read UI state (low value)
- Cannot steal auth tokens (not stored)
- Cannot access financial data (not stored)
- **Could detect admin impersonation** (medium risk)

**Mitigation:** 
1. Implement CSP headers (already done)
2. Encrypt admin impersonation state (recommended)
3. Use DOMPurify for any user-generated content rendering

---

### Scenario 2: Physical Device Access
**Risk:** Someone accesses unlocked device  
**Impact:**
- Can see notification preferences
- Can see UI customizations
- Cannot access account (requires re-auth)
- **Overall risk: LOW**

**Mitigation:**
- Device lock/screen timeout (user responsibility)
- Session timeout (already implemented - 15 min idle)

---

### Scenario 3: Shared/Public Computer
**Risk:** User forgets to logout  
**Impact:**
- Next user sees previous user's UI preferences
- Notification settings visible
- **Cannot access account without credentials**
- **Overall risk: LOW**

**Mitigation:**
- Session timeout (15 min idle)
- Clear storage on logout (recommended above)
- Warning on public computer login (UX improvement)

---

## Compliance Considerations

### GDPR
- ✅ No PII stored in localStorage
- ✅ User can clear via browser settings
- ⚠️ Should document in privacy policy that UI preferences are stored locally

### CCPA
- ✅ No personal information stored
- ✅ No sale of data (it's local-only)

### PCI DSS
- ✅ No cardholder data stored
- ✅ No authentication credentials stored
- ✅ Compliant

---

## Monitoring Recommendations

Add telemetry to track localStorage size:
```typescript
// Periodically log storage usage (anonymous, aggregate only)
const storageSize = new Blob(Object.values(localStorage)).size;
if (storageSize > 100_000) { // 100KB threshold
  console.warn('[Storage] localStorage size exceeds 100KB:', storageSize);
  // Consider cleanup or alert
}
```

---

## Conclusion

**Overall Risk: LOW** ✅

The Owebale application uses localStorage appropriately:
- No sensitive data exposed
- No authentication bypass possible
- No financial data at risk
- Minimal privacy concerns

**Actions Required:**
1. 🔒 Encrypt admin impersonation state (Medium priority)
2. 📝 Document localStorage usage in privacy policy
3. 🧹 Add storage clearing on logout (best practice)
4. ⏰ Add expiration to bank connection timeline (optional)

**No immediate security threats identified.** Current usage follows security best practices for client-side storage.

---

**Next Review:** 6 months or after major feature additions  
**Reviewed By:** AI Security Engineer  
**Status:** ✅ Approved with minor recommendations
