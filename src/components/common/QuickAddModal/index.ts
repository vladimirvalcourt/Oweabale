/**
 * QuickAddModal - Modular refactored components
 * 
 * This directory contains the refactored QuickAddModal components,
 * extracted from the original 1,844-line monolithic file.
 * 
 * @see REFACTORING_PLAN.md for detailed migration strategy
 */

// Export extracted components as they are created
// export { ScanDocumentStrip } from './ScanDocumentStrip';
// export { TransactionForm } from './forms/TransactionForm';
// export { ObligationForm } from './forms/ObligationForm';
// export { IncomeForm } from './forms/IncomeForm';
// export { CitationForm } from './forms/CitationForm';

// Re-export hooks as they are created
// export { useQuickAddOCR } from './hooks/useQuickAddOCR';
// export { useQuickAddValidation } from './hooks/useQuickAddValidation';
// export { useQuickAddSubmission } from './hooks/useQuickAddSubmission';

// For now, continue using the main component from parent directory
export { default } from '@/QuickAddModal';
