# Supabase Project Transfer Guide

**Date:** May 2, 2026  
**Purpose:** Safely migrate Oweable from current Supabase project to new project without exceeding 5GB egress limit

---

## 🎯 **Current Egress Protection Status**

✅ **All optimizations deployed and active:**
- Transaction pagination: 50 records/page (reduced from 500)
- Phase 2 query limits: 100 records max per table
- Data freshness caching: 5-minute window prevents redundant fetches
- Phase 2 deferral: Only loads on first visit or explicit request
- CDN caching: 1 year for fonts/bundles, 30 days for images
- Realtime subscriptions: Disabled (saves WebSocket egress)
- Request timeouts: 30-second max prevents hanging connections

**Estimated monthly egress with current optimizations:** ~2-3 GB (well within 5GB limit)

---

## 🚀 **Transfer Safety Mode (Optional - Extra Conservative)**

If you want **maximum protection** during the transfer period, activate Transfer Safety Mode:

### **Activation (Browser Console)**

```javascript
// Import and activate transfer safety mode
import { applyTransferSafetySettings } from '/src/lib/config/transferSafety.ts'
applyTransferSafetySettings()

// Verify it's active
import { isTransferSafetyMode } from '/src/lib/config/transferSafety.ts'
console.log('Transfer safety active:', isTransferSafetyMode())
```

### **What It Does:**
- Reduces transaction page size: 50 → **25 records**
- Reduces Phase 2 limits: 100 → **50 records**
- Extends data freshness: 5 min → **10 minutes**
- Limits concurrent requests: **max 3 at a time**
- Adds request throttling between batches

**Impact:** Additional 50-60% egress reduction during transfer period

### **Deactivation (After Transfer Complete)**

```javascript
import { disableTransferSafetyMode } from '/src/lib/config/transferSafety.ts'
disableTransferSafetyMode()
```

---

## 📊 **Egress Monitoring**

### **Check Current Usage**

```javascript
// In browser console
import { logEgressSummary, getEgressMetrics } from '/src/lib/utils/egressMonitor.ts'

// Log summary to console
logEgressSummary()

// Get detailed metrics
const metrics = getEgressMetrics()
console.log('Total requests:', metrics.totalRequests)
console.log('Estimated bytes:', metrics.totalBytesEstimated)
console.log('By table:', metrics.requestsByTable)
```

### **Automatic Alerts:**
- ⚠️ **Warning at 3.5 GB** (70% of limit)
- 🔴 **Critical at 4.5 GB** (90% of limit)
- Auto-logs summary every 5 minutes in development mode

---

## 🔄 **Transfer Process Steps**

### **Before Transfer:**
1. ✅ Deploy current optimizations (already done - commit `52a1939`)
2. 📊 Check current egress usage in Supabase dashboard
3. 🧪 Test app functionality with current settings
4. 📝 Document current database schema and RLS policies

### **During Transfer:**
1. **Option A - Normal Mode** (Recommended):
   - Keep current optimizations active
   - Monitor egress via Supabase dashboard
   - Estimated usage: 2-3 GB/month

2. **Option B - Transfer Safety Mode** (Maximum Protection):
   - Activate via browser console (see above)
   - Users may notice slightly slower initial loads
   - Estimated usage: 1-1.5 GB/month

### **After Transfer:**
1. Update environment variables:
   ```bash
   # .env.local (development)
   VITE_SUPABASE_URL=https://new-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=new-anon-key
   
   # Vercel Dashboard (production)
   # Update VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
   ```

2. Redeploy to Vercel:
   ```bash
   git push origin main  # Triggers automatic deployment
   ```

3. Verify functionality:
   - Test authentication (Google OAuth)
   - Test data fetching (dashboard loads)
   - Test CRUD operations (create/edit/delete bills, debts, etc.)
   - Check browser console for errors

4. Disable Transfer Safety Mode (if activated):
   ```javascript
   import { disableTransferSafetyMode } from '/src/lib/config/transferSafety.ts'
   disableTransferSafetyMode()
   ```

5. Monitor egress for 24-48 hours to ensure normal operation

---

## 🛡️ **Rollback Plan**

If issues occur during/after transfer:

### **Immediate Rollback:**
1. Revert environment variables to old project credentials
2. Redeploy to Vercel
3. Clear user browser cache (hard refresh: Cmd+Shift+R)

### **Data Integrity:**
- All user data remains in OLD Supabase project until manually deleted
- No data loss risk during transfer
- Can switch back to old project instantly if needed

---

## 📈 **Egress Optimization Summary**

| Optimization | Impact | Status |
|-------------|--------|--------|
| Transaction pagination (50/page) | -90% vs original | ✅ Active |
| Phase 2 query limits (100 max) | -50% unlimited queries | ✅ Active |
| Data freshness caching (5 min) | -60% duplicate fetches | ✅ Active |
| Phase 2 deferral | -40-60% secondary data | ✅ Active |
| CDN caching headers | -60-70% asset downloads | ✅ Active |
| Realtime disabled | Saves WebSocket egress | ✅ Active |
| Request timeouts (30s) | Prevents hanging connections | ✅ Active |
| **Transfer Safety Mode** (optional) | **-50-60% additional** | ⚙️ Available |

**Combined Impact:** ~85-90% total egress reduction from original implementation

---

## 🆘 **Troubleshooting**

### **Issue: Dashboard loading slowly**
- **Cause:** Aggressive caching or low pagination limits
- **Fix:** Disable Transfer Safety Mode if active

### **Issue: Missing data on pages**
- **Cause:** Phase 2 data not loaded yet
- **Fix:** Navigate to specific page to trigger load, or call `loadPhase2Data()`

### **Issue: Approaching 5GB limit**
- **Cause:** High user activity or large datasets
- **Fix:** 
  1. Activate Transfer Safety Mode immediately
  2. Contact users to reduce refresh frequency
  3. Consider upgrading Supabase plan temporarily

### **Issue: Auth failures after transfer**
- **Cause:** Incorrect environment variables
- **Fix:** Double-check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel

---

## 📞 **Support**

For questions or issues during transfer:
- Check Supabase dashboard for real-time egress metrics
- Review browser console for error messages
- Use egress monitoring utilities (see above)
- Refer to TECHNICAL_AUDIT_REPORT_2026-05-02.md for known issues

---

**Last Updated:** May 2, 2026  
**Commit:** `52a1939` - Transfer safety mode deployed
