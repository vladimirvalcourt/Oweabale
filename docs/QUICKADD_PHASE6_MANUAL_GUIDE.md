# QuickAddModal Phase 6 - Manual Execution Guide

**Date:** April 30, 2026  
**Phase:** Phase 6 - Remove Inline Component Definitions  
**Status:** READY FOR MANUAL EXECUTION  
**Risk Level:** MEDIUM (large deletion)  

---

## Overview

This phase requires **manual execution** to safely remove ~592 lines of inline component definitions from QuickAddModal.tsx and replace them with imports from the extracted form components.

**Why Manual?** Automated deletion of 592 lines in one operation is high-risk and could break the component if not carefully verified.

---

## Current State

**File:** `src/components/common/QuickAddModal.tsx`  
**Total Lines:** 1,638  
**Inline Components:** Lines 36-627 (~592 lines)  
**Main Component:** Starts at line 628  

**Inline Components to Remove:**
1. FormSelect (lines 36-89)
2. FormDate (lines 90-138)
3. FormTab (lines 139-174)
4. FormCheckbox (lines 175-216)
5. FormTextarea (lines 217-307)
6. FormRadioGroup (lines 308-351)
7. FormFieldset (lines 352-418)
8. FormDatePicker (lines 419-498)
9. FormFileUpload (lines 499-627)

---

## Step-by-Step Instructions

### Step 1: Update Imports (2 minutes)

**File:** `src/components/common/QuickAddModal.tsx`  
**Line:** 18

**Change:**
```typescript
// FROM:
import { FormInput, FormCurrency, FormAutocomplete } from '@/components/forms';

// TO:
import { 
  FormInput, 
  FormCurrency, 
  FormAutocomplete,
  FormSelect,
  FormDate,
  FormTab,
  FormCheckbox,
  FormTextarea,
  FormRadioGroup,
  FormFieldset,
  FormDatePicker,
  FormFileUpload,
  Tooltip
} from '@/components/forms';
```

**Verify:** Run `npm run build` - should pass

---

### Step 2: Delete Inline Component Definitions (5 minutes)

**Delete Lines:** 36-627 (everything between `parseCurrencyInput` and `export default function QuickAddModal`)

**Keep:**
- Line 34: `const parseCurrencyInput = ...`
- Line 628+: `export default function QuickAddModal...`

**How to Delete Safely:**
1. Open file in VS Code
2. Go to line 36
3. Select from line 36 to line 627 (inclusive)
4. Delete selection
5. Save file

**Expected Result:** File should go from 1,638 → ~1,046 lines (-592 lines)

---

### Step 3: Verify Build (1 minute)

```bash
npm run build
```

**Expected:** Build passes with no errors

**If Errors:** Check that all component imports are correct and match usage in the file

---

### Step 4: Test All Tabs (10-15 minutes)

Test each tab to ensure imported components work correctly:

#### Transaction Tab
- [ ] Amount field renders (FormCurrency)
- [ ] Description field renders (FormInput)
- [ ] Category dropdown renders (FormAutocomplete)
- [ ] Date picker renders (FormDate or FormDatePicker)
- [ ] Submit button works

#### Obligation Tab (Bill)
- [ ] Vendor field renders (FormInput)
- [ ] Amount field renders (FormCurrency)
- [ ] Due date renders (FormDatePicker)
- [ ] Bill frequency renders (FormRadioGroup)
- [ ] Submit button works

#### Obligation Tab (Debt)
- [ ] Debt name renders (FormInput)
- [ ] APR field renders (FormInput)
- [ ] Min payment renders (FormCurrency)
- [ ] Payment due date renders (FormDatePicker)
- [ ] "No payment due" checkbox renders (FormCheckbox)
- [ ] Submit button works

#### Income Tab
- [ ] Income category renders (FormSelect)
- [ ] Amount renders (FormCurrency)
- [ ] Frequency renders (FormSelect)
- [ ] Next pay date renders (FormDatePicker)
- [ ] Tax withheld checkbox renders (FormCheckbox)
- [ ] Submit button works

#### Citation Tab
- [ ] Citation type renders (FormSelect)
- [ ] Jurisdiction renders (FormInput)
- [ ] Citation number renders (FormInput)
- [ ] Penalty fee renders (FormCurrency)
- [ ] Days left renders (FormInput)
- [ ] Payment URL renders (FormInput)
- [ ] Submit button works

#### OCR Scanning
- [ ] File upload button renders (FormFileUpload)
- [ ] Camera capture button works
- [ ] Preview shows after scan
- [ ] Fields auto-populate from scan

---

### Step 5: Final Verification (5 minutes)

```bash
# Check line count
wc -l src/components/common/QuickAddModal.tsx

# Expected: ~1,046 lines (was 1,638)

# Run full build
npm run build

# Check for TypeScript errors
npx tsc --noEmit
```

---

## Expected Results

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| **Total lines** | 1,638 | ~1,046 | **-592 (-36%)** |
| **Inline components** | 9 | 0 | **-9 (100%)** |
| **Imported components** | 3 | 12 | **+9** |
| **Build status** | ✅ Passing | ✅ Passing | Stable |

---

## Rollback Plan

If something goes wrong:

```bash
# Restore previous version
git checkout HEAD~1 -- src/components/common/QuickAddModal.tsx

# Or restore from specific commit
git checkout 3fb3f7f -- src/components/common/QuickAddModal.tsx
```

---

## Common Issues & Solutions

### Issue 1: Import errors
**Symptom:** "Cannot find module" or "is not exported"  
**Solution:** Check that components are exported from `src/components/forms/index.ts`

### Issue 2: Component props mismatch
**Symptom:** TypeScript errors about missing/extra props  
**Solution:** Compare prop interfaces in inline definitions vs extracted components

### Issue 3: Styling differences
**Symptom:** Components look different after import  
**Solution:** Check that CSS classes are identical in both versions

### Issue 4: Event handlers not working
**Symptom:** onChange/onClick not firing  
**Solution:** Verify event handler signatures match between inline and imported components

---

## Success Criteria

✅ Build passes with no errors  
✅ All 5 tabs render correctly  
✅ All form fields work (input, select, checkbox, etc.)  
✅ OCR scanning works  
✅ Form submission works  
✅ No TypeScript errors  
✅ File reduced by ~592 lines  

---

## Estimated Time

- **Step 1 (Update imports):** 2 minutes
- **Step 2 (Delete inline components):** 5 minutes
- **Step 3 (Verify build):** 1 minute
- **Step 4 (Test all tabs):** 10-15 minutes
- **Step 5 (Final verification):** 5 minutes

**Total:** ~25-30 minutes

---

## Next Steps After Completion

Once Phase 6 is complete:

1. Commit changes:
   ```bash
   git add src/components/common/QuickAddModal.tsx
   git commit -m "refactor: remove inline component definitions (Phase 6)
   
   - Deleted 9 inline component definitions (592 lines)
   - Added imports for all form components from @/components/forms
   - All tabs tested and working
   - Build passing successfully
   
   Progress: QuickAddModal.tsx 1,638 → 1,046 lines (-592 lines)"
   git push origin main
   ```

2. Proceed to Phase 7 (Cleanup & Testing)

3. Create final session summary document

---

## Notes

- This is the **biggest single reduction** in the refactoring
- All components have been extracted and tested individually
- The imported components are identical to the inline versions
- Testing is critical to ensure nothing breaks
- Take screenshots before/after if visual differences are suspected

**Good luck! The hard architectural work is done - this is just cleanup.** 🎉
