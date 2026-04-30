# QuickAddModal Refactoring Plan

**Status:** In Progress  
**Started:** April 30, 2026  
**Target Completion:** May 7, 2026

---

## Current State

**File:** `src/components/common/QuickAddModal.tsx`  
**Lines:** 1,844  
**Complexity:** HIGH - Multiple concerns mixed together

### Component Structure (Current)
```
QuickAddModal (1,844 lines)
├── Form Components (already extracted, lines 30-620)
│   ├── FormSelect (30 lines)
│   ├── FormDate (40 lines)
│   ├── FormTab (25 lines)
│   ├── FormCheckbox (40 lines)
│   ├── FormTextarea (35 lines)
│   ├── FormRadioGroup (45 lines)
│   ├── FormFieldset (20 lines)
│   ├── Tooltip (15 lines)
│   ├── FormDatePicker (80 lines)
│   └── FormFileUpload (120 lines)
├── Main Component (lines 622-1844)
│   ├── State Management (~100 lines)
│   ├── OCR/PDF Scanning Logic (~150 lines)
│   ├── Form Submission Handlers (~200 lines)
│   └── Render/JSX (~900 lines)
```

---

## Refactoring Strategy

### Phase 1: Extract Scan Document Strip ✅ IN PROGRESS
**Target File:** `QuickAddModal/ScanDocumentStrip.tsx`  
**Expected Size:** ~300 lines

**Responsibilities:**
- File upload handling (images + PDFs)
- Camera capture for mobile
- OCR text extraction (Tesseract.js)
- PDF text extraction (pdfjs-dist)
- Merchant name detection
- Amount extraction
- Date parsing
- Citation auto-detection
- Category suggestion

**Benefits:**
- Isolates complex async logic
- Easier to test OCR functionality
- Reduces main component by ~15%

**Status:** File created but has import path issues. Will integrate directly into main component refactor instead.

---

### Phase 2: Extract Form Sections
**Target Files:**
- `QuickAddModal/TransactionForm.tsx` (~250 lines)
- `QuickAddModal/ObligationForm.tsx` (~200 lines)
- `QuickAddModal/IncomeForm.tsx` (~150 lines)
- `QuickAddModal/CitationForm.tsx` (~180 lines)

**Each form component receives:**
```typescript
interface FormProps {
  formData: FormData;
  onChange: (field: string, value: any) => void;
  errors: Record<string, string>;
  onSubmit: () => void;
}
```

**Benefits:**
- Each tab becomes a focused, testable unit
- Reduces render complexity in main modal
- Easier to add new entry types

---

### Phase 3: Extract Business Logic Hooks
**Target Files:**
- `hooks/useQuickAddOCR.ts` (~100 lines)
- `hooks/useQuickAddValidation.ts` (~80 lines)
- `hooks/useQuickAddSubmission.ts` (~120 lines)

**Hook Responsibilities:**

#### useQuickAddOCR
```typescript
const {
  scanFile,
  isScanning,
  scannedData,
  clearScan,
} = useQuickAddOCR();
```
- Handles file validation
- Manages OCR/PDF extraction
- Returns structured data

#### useQuickAddValidation
```typescript
const {
  validateForm,
  errors,
  clearErrors,
} = useQuickAddValidation(formData, activeTab);
```
- Tab-specific validation rules
- Real-time field validation
- Error message management

#### useQuickAddSubmission
```typescript
const {
  submit,
  isSubmitting,
  resetForm,
} = useQuickAddSubmission(activeTab, formData);
```
- Routes to correct store action
- Handles success/error toasts
- Resets form state

---

### Phase 4: Simplified Main Component
**Target Size:** ~400 lines (down from 1,200+)

**New Structure:**
```typescript
export default function QuickAddModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('transaction');
  
  // Custom hooks handle complexity
  const { scanFile, isScanning, scannedData } = useQuickAddOCR();
  const { formData, updateField } = useQuickAddFormState(activeTab);
  const { validateForm, errors } = useQuickAddValidation(formData, activeTab);
  const { submit, isSubmitting, resetForm } = useQuickAddSubmission(activeTab, formData);
  
  // Apply scanned data to form
  useEffect(() => {
    if (scannedData) applyScannedData(scannedData);
  }, [scannedData]);
  
  return (
    <Dialog>
      <ScanDocumentStrip onScan={scanFile} isScanning={isScanning} />
      <QuickAddTabs activeTab={activeTab} onChange={setActiveTab} />
      
      {/* Conditional form rendering */}
      {activeTab === 'transaction' && (
        <TransactionForm data={formData} onChange={updateField} errors={errors} />
      )}
      {activeTab === 'obligation' && (
        <ObligationForm data={formData} onChange={updateField} errors={errors} />
      )}
      {/* ... other tabs */}
      
      <FormActions
        onSubmit={submit}
        onCancel={onClose}
        isSubmitting={isSubmitting}
      />
    </Dialog>
  );
}
```

---

## Implementation Timeline

### Week 1 (Current)
- [x] Create refactoring plan
- [ ] Extract ScanDocumentStrip component
- [ ] Move form components to separate files
- [ ] Create useQuickAddOCR hook

### Week 2
- [ ] Create form components (Transaction, Obligation, Income, Citation)
- [ ] Extract validation logic to hook
- [ ] Extract submission logic to hook
- [ ] Update main component to use new structure

### Week 3
- [ ] Write unit tests for extracted components
- [ ] Write integration tests for hooks
- [ ] Performance testing (ensure no regression)
- [ ] Code review and cleanup

---

## Success Metrics

### Before Refactoring
- **File size:** 1,844 lines
- **Cyclomatic complexity:** High (estimated 50+)
- **Testability:** Low (mixed concerns)
- **Maintainability:** Difficult (large file, many responsibilities)

### After Refactoring (Target)
- **Main file size:** ~400 lines (-78%)
- **Total files:** 8-10 (modular)
- **Cyclomatic complexity:** Low per file (<15 each)
- **Testability:** High (isolated units)
- **Maintainability:** Easy (single responsibility per file)

---

## Migration Safety

### Backward Compatibility
✅ No API changes - component props remain the same  
✅ All existing functionality preserved  
✅ No breaking changes for consumers  

### Testing Strategy
1. **Manual testing** before each commit
2. **Visual regression** - compare UI before/after
3. **Functional testing** - verify all tabs work
4. **OCR testing** - ensure scanning still works
5. **Performance monitoring** - check for regressions

### Rollback Plan
If issues arise:
1. Revert to previous commit
2. Original QuickAddModal.tsx remains unchanged until full refactor complete
3. New files can be deleted without affecting existing code

---

## Technical Decisions

### Why Extract Components vs Keep Inline?
**Pros of Extraction:**
- Single Responsibility Principle
- Easier to test in isolation
- Clearer code ownership
- Better TypeScript inference
- Reduced cognitive load

**Cons Mitigated:**
- More files to navigate → Use barrel exports (`index.ts`)
- Prop drilling → Use custom hooks for state management
- Import complexity → Use `@/` path aliases (planned)

### Why Custom Hooks?
- Separate business logic from UI
- Reusable across components
- Easier to mock in tests
- Clear separation of concerns

### Why Not Context API?
- QuickAddModal is self-contained
- No need for global state
- Props + hooks sufficient
- Avoids unnecessary complexity

---

## Next Steps

1. **Complete ScanDocumentStrip extraction** - Fix import paths and integrate
2. **Move inline form components** to `QuickAddModal/forms/` directory
3. **Create first custom hook** - `useQuickAddOCR`
4. **Refactor one tab** as proof of concept (Transaction tab)
5. **Apply pattern** to remaining tabs
6. **Final cleanup** and documentation

---

## Related Files

- [`QuickAddModal.tsx`](file:///Users/vladimirv/Desktop/Owebale/src/components/common/QuickAddModal.tsx) - Original component
- [`ScanDocumentStrip.tsx`](file:///Users/vladimirv/Desktop/Owebale/src/components/common/QuickAddModal/ScanDocumentStrip.tsx) - Extracted scan component (WIP)
- [`STRUCTURAL_AUDIT_REPORT.md`](file:///Users/vladimirv/Desktop/Owebale/docs/STRUCTURAL_AUDIT_REPORT.md) - Full audit findings
- [`AUDIT_PROGRESS.md`](file:///Users/vladimirv/Desktop/Owebale/docs/AUDIT_PROGRESS.md) - Implementation tracking

---

**Owner:** Development Team  
**Priority:** HIGH - Largest file in codebase  
**Risk:** LOW - Incremental refactoring, easy rollback
