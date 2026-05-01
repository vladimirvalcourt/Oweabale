import React, { useState, useEffect, useRef } from 'react';
import { Dialog } from '@headlessui/react';
import { motion, AnimatePresence } from 'motion/react';
import { X, AlertCircle, Loader2, Camera, Eye, EyeOff, AlertTriangle, Upload } from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { ThemeBackdrop } from './ThemeBackdrop';
import { toast } from 'sonner';
import { useStore, type IncomeSource, type TabType } from '@/store';
import { guessCategory } from '@/lib/api/services/categorizer';
import { validateIngestionFile } from '@/lib/api/security';
import { extractCitationFieldsFromText, looksLikeCitationDocument } from '@/lib/api';
import { yieldForPaint } from '@/lib/utils';
import { EXPENSE_CATEGORY_OPTGROUPS, INCOME_CATEGORY_OPTIONS } from '@/lib/api/services/quickEntryCategories';
import { formatLocalISODate, parseQuickEntryDateHint } from '@/lib/api/services/quickEntryNlp';
import { useFullSuiteAccess } from '@/hooks';
import { clampQuickAddTabForTier, canUseQuickAddTab, isTrackerObligationDebtBlocked } from '@/app/constants';
import { getCustomIcon } from '@/lib/utils';
import { FormInput, FormCurrency, FormAutocomplete, FormSelect, FormDate, FormTab, FormCheckbox, FormTextarea, FormRadioGroup, FormFieldset, FormDatePicker, FormFileUpload, Tooltip } from '@/components/forms';
import {
  useQuickAddOCR,
  useQuickAddValidation,
  useQuickAddSubmission,
  useQuickAddFormState,
} from '@/hooks';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/** Quick Add → Bill/Debt: bill cadence or debt instrument (card vs loan). */
type ObligationKind = 'bill-weekly' | 'bill-biweekly' | 'bill-monthly' | 'debt-card' | 'debt-loan';

export default function QuickAddModal({ isOpen, onClose }: QuickAddModalProps) {
  const NlpIcon = getCustomIcon('nlp');
  const UploadIcon = getCustomIcon('upload');
  const { hasFullSuite } = useFullSuiteAccess();
  const trackerOnly = !hasFullSuite;
  const {
    quickAddTab,
    addTransaction,
    addBill,
    addDebt,
    addIncome,
    addCitation,
    lastBudgetGuardrail,
    clearLastBudgetGuardrail,
  } = useStore();
  const [activeTab, setActiveTab] = useState<'transaction' | 'obligation' | 'income' | 'citation'>('transaction');

  // Initialize form state hook (will replace individual useState calls incrementally)
  const formState = useQuickAddFormState(activeTab);

  // Form states - Using formState hook (all form fields managed by hook)
  const {
    amount, setAmount,
    description, setDescription,
    date, setDate,
    category, setCategory,
    vendor, setVendor,
    obligationKind, setObligationKind,
    dueDate, setDueDate,
    incomeCategory, setIncomeCategory,
    incomeFrequency, setIncomeFrequency,
    transactionLedgerKind, setTransactionLedgerKind,
    txIncomeCategory, setTxIncomeCategory,
    memoNotes, setMemoNotes,
    citationType, setCitationType,
    jurisdiction, setJurisdiction,
    citationNumber, setCitationNumber,
    penaltyFee, setPenaltyFee,
    apr, setApr,
    minPayment, setMinPayment,
    daysLeft, setDaysLeft,
    paymentUrl, setPaymentUrl,
    citationDueDate, setCitationDueDate,
    nlpText, setNlpText,
    allowBudgetOverride, setAllowBudgetOverride,
  } = formState;

  // Non-form state (UI state, not managed by formState hook)
  /** Closed card / no statement cycle — omit payment due date on debt. */
  const [debtNoPaymentDue, setDebtNoPaymentDue] = useState(false);
  const [incomeTaxWithheld, setIncomeTaxWithheld] = useState(false);

  // Initialize validation hook with form data
  const validation = useQuickAddValidation(activeTab, {
    amount,
    description,
    vendor,
    date,
    dueDate,
    jurisdiction,
    obligationKind,
    debtNoPaymentDue,
  });
  const { errors, validateForm, clearErrors, clearFieldError } = validation;

  // Initialize OCR hook
  const ocr = useQuickAddOCR();
  const { isScanning, scannedPreviewUrl, showPreview, setShowPreview, scanFile, clearScan } = ocr;

  // Non-scan UI state
  const scanFileInputRef = useRef<HTMLInputElement>(null);
  const scanCameraInputRef = useRef<HTMLInputElement>(null);

  // Replace resetFormPreserveTab with formState.resetForm + additional resets
  const resetFormPreserveTab = React.useCallback(() => {
    formState.resetForm();
    setNlpText('');
    clearErrors();
    clearScan();
    if (scanFileInputRef.current) scanFileInputRef.current.value = '';
    if (scanCameraInputRef.current) scanCameraInputRef.current.value = '';
    setAllowBudgetOverride(false);
    clearLastBudgetGuardrail();
  }, [formState, clearLastBudgetGuardrail]);

  // Initialize submission hook
  const submission = useQuickAddSubmission({
    activeTab,
    hasFullSuite,
    storeActions: {
      addTransaction,
      addBill,
      addDebt,
      addIncome,
      addCitation,
    },
    resetForm: resetFormPreserveTab,
    onClose,
  });
  const { submit: submitEntry, isSubmitting } = submission;

  // Wrapper for OCR hook's scanFile with component state callbacks
  const handleScanFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const success = await scanFile(file, {
      onAmount: setAmount,
      onDescription: setDescription,
      onVendor: setVendor,
      onCategory: setCategory,
      onDate: setDate,
      onDueDate: setDueDate,
      onCitationFields: (cit) => {
        if (cit.citationNumber) setCitationNumber(cit.citationNumber);
        if (cit.jurisdiction) setJurisdiction(cit.jurisdiction);
        if (cit.penaltyFee) setPenaltyFee(cit.penaltyFee);
        setDaysLeft(cit.daysLeft);
        if (cit.citationDueDate) setCitationDueDate(cit.citationDueDate);
        setCitationType(cit.citationType);
      },
      onActiveTabChange: setActiveTab,
      getActiveTab: () => activeTab,
      hasFullSuite,
    });

    if (success && e.target) e.target.value = '';
  };

  // Revoke preview blob URL whenever the modal closes to prevent memory leak
  useEffect(() => {
    if (!isOpen) {
      clearScan();
    }
  }, [isOpen, clearScan]);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(clampQuickAddTabForTier(quickAddTab, hasFullSuite));
      resetFormPreserveTab();
    }
  }, [isOpen, quickAddTab, resetFormPreserveTab, hasFullSuite]);

  useEffect(() => {
    if (!trackerOnly) return;
    if (obligationKind.startsWith('debt-')) {
      setObligationKind('bill-monthly');
      setDebtNoPaymentDue(false);
    }
  }, [trackerOnly, obligationKind]);

  useEffect(() => {
    if (trackerOnly && (activeTab === 'transaction' || activeTab === 'income')) {
      setActiveTab('obligation');
    }
  }, [trackerOnly, activeTab]);

  useEffect(() => {
    setShowPreview(false);
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'obligation' && vendor.length > 2) {
      const guessed = guessCategory(vendor);
      if (guessed) setCategory(guessed);
    } else if (activeTab === 'transaction' && transactionLedgerKind === 'expense' && description.length > 2) {
      const guessed = guessCategory(description);
      if (guessed) setCategory(guessed);
    }
  }, [vendor, description, activeTab, transactionLedgerKind]);

  // validateForm is now provided by useQuickAddValidation hook

  const handleNLPInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNlpText(val);

    const hinted = parseQuickEntryDateHint(val);
    if (hinted) setDate(hinted);

    const lower = val.toLowerCase();
    if (/\b(refund|reimburse|reimbursement|deposit from|money back|cashback)\b/i.test(val)) {
      if (hasFullSuite) {
        setActiveTab('transaction');
        setTransactionLedgerKind('income');
        if (/reimburse/i.test(val)) setTxIncomeCategory('Reimbursements');
        else if (/cashback/i.test(val)) setTxIncomeCategory('Other');
        else setTxIncomeCategory('Other');
      } else {
        toast.message('Tracker tier: use Bill or Ticket. Full Suite adds income & expense ledger.');
        setActiveTab('obligation');
      }
    }

    const parts = val.trim().split(/\s+/);
    if (parts.length < 1) return;

    const amountPart = parts.find((p) => /^\$?\d+(\.\d{1,2})?$/.test(p.replace(/,/g, '')));
    if (amountPart) {
      const normalized = amountPart.replace(/[$,]/g, '');
      setAmount(normalized);

      const stripTokens = new Set(
        [
          'today',
          'yesterday',
          'tomorrow',
          'next',
          'week',
          'month',
          'the',
          'of',
          'end',
          'start',
          'bill',
          'due',
          'paid',
          'me',
          'earned',
          'income',
          'refund',
          'reimbursement',
        ].flatMap((w) => [w, `${w}.`]),
      );
      const namePart = parts
        .filter((p) => p !== amountPart && !stripTokens.has(p.toLowerCase()))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (lower.includes('bill') || /\bdue\b/.test(lower)) {
        setActiveTab('obligation');
        if (namePart) setVendor(namePart);
      } else if (hasFullSuite && (lower.includes('earned') || lower.includes('paid me') || /\bpaycheck\b/.test(lower))) {
        setActiveTab('income');
        if (namePart) setDescription(namePart);
      } else if (hasFullSuite && !/\b(refund|reimburse|deposit from|money back|cashback)\b/i.test(val)) {
        setActiveTab('transaction');
        if (namePart) setDescription(namePart);
      } else if (!hasFullSuite && namePart && !/\b(refund|reimburse|deposit from|money back|cashback)\b/i.test(val)) {
        setActiveTab('obligation');
        setVendor(namePart);
      }
    }
  };

  // Wrapper for submission hook with validation and form data
  const handleSubmit = async (addAnother: boolean) => {
    if (!validateForm()) return;

    await submitEntry({
      amount,
      description,
      vendor,
      date,
      dueDate,
      category,
      obligationKind,
      debtNoPaymentDue,
      apr,
      minPayment,
      transactionLedgerKind,
      txIncomeCategory,
      memoNotes,
      allowBudgetOverride,
      incomeCategory,
      incomeFrequency,
      incomeTaxWithheld,
      citationType,
      jurisdiction,
      daysLeft,
      penaltyFee,
      citationNumber,
      paymentUrl,
    }, { addAnother });
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void submitEntry(false);
  };

  const tabOrder = (trackerOnly ? (['obligation', 'citation'] as const) : (['transaction', 'obligation', 'income', 'citation'] as const));
  const focusTabAt = (idx: number) => {
    const tab = tabOrder[idx];
    if (!tab) return;
    setActiveTab(tab as TabType);
    clearErrors();
  };
  const onTabListKeyDown = (e: React.KeyboardEvent) => {
    const i = tabOrder.findIndex((t) => t === activeTab);
    if (i < 0) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      focusTabAt((i + 1) % tabOrder.length);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      focusTabAt((i - 1 + tabOrder.length) % tabOrder.length);
    } else if (e.key === 'Home') {
      e.preventDefault();
      focusTabAt(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      focusTabAt(tabOrder.length - 1);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog
          open={isOpen}
          onClose={onClose}
          className="relative z-50"
        >
          {/* Backdrop */}
          <ThemeBackdrop />

          <div className="fixed inset-0 flex items-center justify-center p-4 sm:p-0">
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-full sm:max-w-xl"
            >
              <Dialog.Panel className="flex max-h-[90vh] min-h-0 flex-col overflow-hidden rounded-lg border border-surface-border bg-surface-elevated shadow-elevated">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border bg-surface-raised shrink-0">
                  <Dialog.Title className="text-sm font-sans font-semibold text-content-primary">
                    Add what&apos;s due
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="text-content-tertiary hover:text-content-primary transition-colors focus-app rounded-lg"
                  >
                    <span className="sr-only">Close</span>
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto scrollbar-hide w-full">
                  {/* Scan Document Strip */}
                  <div className="bg-surface-base border-b border-surface-border">
                    <div className="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_minmax(16rem,18rem)] sm:items-start sm:px-6">
                      <div className="min-w-0">
                        <p className="text-xs font-sans font-medium uppercase tracking-[0.08em] text-content-secondary">
                          Scan receipt, image or PDF
                        </p>
                        <p className="mt-1 text-xs font-mono uppercase tracking-[0.12em] text-content-muted">
                          JPG · PNG · WEBP · PDF
                        </p>
                        <p className="mt-2 max-w-prose text-xs leading-5 text-content-tertiary">
                          Review amount, entry type, and category before saving — OCR can misread symbols or merchants.
                        </p>
                      </div>
                      <div className="flex min-w-0 items-start gap-2 sm:justify-end">
                        {scannedPreviewUrl && (
                          <button
                            type="button"
                            onClick={() => setShowPreview(p => !p)}
                            className={`min-h-10 shrink-0 rounded-lg border px-3 transition-all ${showPreview ? 'border-surface-border text-content-primary bg-content-primary/[0.06]' : 'border-surface-border text-content-tertiary hover:text-content-primary hover:bg-surface-elevated'}`}
                            title={showPreview ? 'Hide document' : 'Show document'}
                          >
                            {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        )}
                        <div className="grid min-w-0 flex-1 grid-cols-2 gap-2">
                          {/* Camera Button (keep native for mobile camera access) */}
                          <label className={`relative flex min-h-10 w-full cursor-pointer select-none items-center justify-center gap-2 overflow-hidden rounded-lg border px-3 py-2 text-center text-xs font-sans font-medium transition-all
                            ${isScanning
                              ? 'border-surface-border bg-content-primary/[0.06] text-content-secondary cursor-not-allowed'
                              : 'border-surface-border bg-surface-raised text-content-secondary hover:text-content-primary hover:bg-content-primary/[0.04]'
                            }`}>
                            <input
                              ref={scanCameraInputRef}
                              type="file"
                              accept="image/*"
                              capture="environment"
                              className="absolute inset-0 z-20 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
                              onChange={handleScanFile}
                              disabled={isScanning}
                            />
                            <Camera className="relative z-10 h-3.5 w-3.5 shrink-0" aria-hidden />
                            <span className="relative z-10 truncate">Camera</span>
                          </label>

                          {/* File Upload using FormFileUpload component */}
                          <FormFileUpload
                            id="scan-file"
                            label=""
                            buttonLabel="Upload"
                            onFileSelect={(file) => {
                              if (file) {
                                const event = { target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>;
                                handleScanFile(event);
                              }
                            }}
                            accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                            maxSize={10}
                            disabled={isScanning}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Document Preview Panel */}
                    <AnimatePresence>
                      {showPreview && scannedPreviewUrl && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.15 }}
                          className="border-t border-surface-border relative z-0"
                        >
                          <div className="relative flex min-h-[7rem] max-h-[min(14rem,42svh)] w-full items-center justify-center bg-surface-base px-2 py-3">
                            <img
                              src={scannedPreviewUrl}
                              alt="Scanned document"
                              className="max-h-[min(14rem,42svh)] w-full object-contain object-center relative z-0"
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Smart Input Bar */}
                  <div className="bg-surface-base p-6 border-b border-surface-border">
                    <div className="flex items-center gap-2 mb-3">
                      <NlpIcon className="w-4 h-4 text-content-secondary" />
                      <span className="text-xs font-sans font-medium text-content-secondary">Natural language speed input</span>
                    </div>

                    <textarea
                      placeholder={hasFullSuite ? "e.g. Rent 1200 on the 1st · Comcast bill 120 next Tuesday · Parking ticket 65 due Friday" : "e.g. Rent 1200 on the 1st · Internet bill 80 next Tuesday · Parking ticket 65 due Friday"}
                      value={nlpText}
                      onChange={handleNLPInput}
                      className="w-full bg-surface-raised border border-surface-border radius-input focus-app-field text-sm font-sans text-content-primary placeholder:text-content-muted p-3 resize-none transition-colors hover:border-content-primary/15"
                      rows={2}
                    />
                  </div>

                  {/* Tabs */}
                  <div
                    role="tablist"
                    aria-label="Record type"
                    onKeyDown={onTabListKeyDown}
                    className="grid grid-cols-[repeat(auto-fit,minmax(7.25rem,1fr))] gap-1 border-b border-surface-border bg-surface-raised p-1"
                  >
                    {hasFullSuite && (
                      <FormTab
                        id="qa-tab-transaction"
                        label="Expense"
                        isActive={activeTab === 'transaction'}
                        onClick={() => {
                          setActiveTab('transaction');
                          clearErrors();
                        }}
                      />
                    )}
                    <FormTab
                      id="qa-tab-obligation"
                      label={hasFullSuite ? 'Bill or debt' : 'Bill'}
                      isActive={activeTab === 'obligation'}
                      onClick={() => {
                        setActiveTab('obligation');
                        clearErrors();
                      }}
                    />
                    {hasFullSuite && (
                      <FormTab
                        id="qa-tab-income"
                        label="Income"
                        isActive={activeTab === 'income'}
                        onClick={() => {
                          setActiveTab('income');
                          clearErrors();
                        }}
                      />
                    )}
                    <FormTab
                      id="qa-tab-citation"
                      label="Toll or ticket"
                      isActive={activeTab === 'citation'}
                      onClick={() => {
                        setActiveTab('citation');
                        clearErrors();
                      }}
                      icon={<AlertTriangle className="w-3 h-3 shrink-0" aria-hidden />}
                      variant="citation"
                    />
                  </div>

                  {/* Form Body */}
                  <form
                    id="quick-add-form"
                    onSubmit={handleFormSubmit}
                    role="tabpanel"
                    aria-labelledby={`qa-tab-${activeTab}`}
                    aria-live="polite"
                    aria-busy={isSubmitting}
                    className="space-y-5 p-5 sm:p-6"
                  >

                    {/* AMOUNT FIELD (ALWAYS PRESENT) */}
                    <FormCurrency
                      id="amount"
                      label="Amount"
                      value={amount}
                      onChange={(value) => { setAmount(value); if (errors.amount) clearFieldError('amount'); }}
                      placeholder="0.00"
                      error={errors.amount}
                      required
                    />

                    {/* TRANSACTION (expense or income/refund) */}
                    {activeTab === 'transaction' && (
                      <>
                        {lastBudgetGuardrail && transactionLedgerKind === 'expense' && (
                          <div
                            className={`rounded-lg border px-3 py-2 text-xs ${lastBudgetGuardrail.type === 'hard'
                              ? 'border-[var(--color-status-rose-border)] bg-[var(--color-status-rose-bg)] text-[var(--color-status-rose-text)]'
                              : 'border-[var(--color-status-amber-border)] bg-[var(--color-status-amber-bg)] text-[var(--color-status-amber-text)]'
                              }`}
                          >
                            <p className="font-medium">{lastBudgetGuardrail.message}</p>
                            <p className="mt-1 text-content-secondary">
                              Allowed ${lastBudgetGuardrail.allowed.toFixed(2)} this {lastBudgetGuardrail.period.toLowerCase()},
                              attempted ${lastBudgetGuardrail.attempted.toFixed(2)}.
                            </p>
                            {lastBudgetGuardrail.type === 'soft' && (
                              <label className="mt-2 inline-flex items-center gap-2 text-xs cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={allowBudgetOverride}
                                  onChange={(e) => setAllowBudgetOverride(e.target.checked)}
                                  className="h-3.5 w-3.5 rounded border-surface-border bg-surface-base text-[var(--color-status-amber-text)] focus-app"
                                />
                                Save anyway for this one transaction
                              </label>
                            )}
                          </div>
                        )}

                        <div>
                          <div className="flex gap-3">
                            <div className="min-w-0 flex-1">
                              <FormInput
                                id="description"
                                label="Description"
                                value={description}
                                onChange={(e) => { setDescription(e.target.value); if (errors.description) clearFieldError('description'); }}
                                placeholder="E.g., Whole Foods"
                                error={errors.description}
                                required
                                maxLength={100}
                              />
                            </div>
                            {description.length > 2 && (
                              <div className="shrink-0 flex items-center justify-center bg-surface-base border border-surface-border radius-card w-10">
                                <BrandLogo name={description} size="sm" />
                              </div>
                            )}
                          </div>
                        </div>

                        <FormRadioGroup
                          id="ledger-kind"
                          name="ledgerKind"
                          label="Ledger"
                          value={transactionLedgerKind}
                          onChange={(value) => setTransactionLedgerKind(value as 'expense' | 'income')}
                          options={[
                            { value: 'expense', label: 'Expense' },
                            { value: 'income', label: 'Income / Refund' }
                          ]}
                          hint="Refunds and deposits save as income; choose the category that matches the source."
                        />

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div>
                            <FormSelect
                              id="transaction-category"
                              label={transactionLedgerKind === 'expense' ? 'Expense category' : 'Income category'}
                              value={transactionLedgerKind === 'expense' ? category : txIncomeCategory}
                              onChange={(e) => transactionLedgerKind === 'expense' ? setCategory(e.target.value) : setTxIncomeCategory(e.target.value)}
                            >
                              {transactionLedgerKind === 'expense' ? (
                                EXPENSE_CATEGORY_OPTGROUPS.map((g) => (
                                  <optgroup key={g.label} label={g.label}>
                                    {g.options.map((o) => (
                                      <option key={o.value} value={o.value}>
                                        {o.label}
                                      </option>
                                    ))}
                                  </optgroup>
                                ))
                              ) : (
                                INCOME_CATEGORY_OPTIONS.map((o) => (
                                  <option key={o.value} value={o.value}>
                                    {o.label}
                                  </option>
                                ))
                              )}
                            </FormSelect>
                          </div>
                          <div>
                            <FormDatePicker
                              id="date"
                              label="Date"
                              value={date}
                              onChange={setDate}
                            />
                          </div>
                        </div>

                        <FormTextarea
                          id="memoNotes"
                          label={
                            <span>
                              Notes <span className="text-content-muted font-normal">(optional)</span>
                            </span>
                          }
                          value={memoNotes}
                          onChange={(e) => setMemoNotes(e.target.value)}
                          placeholder="Split with roommate, business trip, etc."
                          rows={2}
                          maxLength={200}
                          hint="Add context to help you remember this transaction later"
                        />
                      </>
                    )}

                    {/* OBLIGATION FIELDS */}
                    {activeTab === 'obligation' && (
                      <>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div>
                            <FormSelect
                              id="obligation-kind"
                              label="Type"
                              value={obligationKind}
                              onChange={(e) => {
                                const v = e.target.value as ObligationKind;
                                setObligationKind(v);
                                if (v.startsWith('bill-')) setDebtNoPaymentDue(false);
                              }}
                            >
                              <option value="bill-weekly">Weekly bill</option>
                              <option value="bill-biweekly">Bi-weekly bill</option>
                              <option value="bill-monthly">Monthly bill</option>
                              {hasFullSuite && (
                                <>
                                  <option value="debt-card">Credit card</option>
                                  <option value="debt-loan">Loan</option>
                                </>
                              )}
                            </FormSelect>
                            <p className="text-xs font-mono text-content-tertiary mt-1.5 leading-snug" id="obligation-kind-hint">
                              {obligationKind.startsWith('bill-')
                                ? 'Amount is per bill cycle (weekly, bi-weekly, or monthly).'
                                : 'Balance owed; APR and minimum payment are optional.'}
                            </p>
                          </div>
                          <div>
                            <FormDatePicker
                              id="dueDate"
                              label={obligationKind.startsWith('debt-') ? 'Payment due date' : 'Due Date'}
                              value={dueDate}
                              onChange={(val) => { setDueDate(val); if (errors.dueDate) clearFieldError('dueDate'); }}
                              error={errors.dueDate}
                              disabled={obligationKind.startsWith('debt-') && debtNoPaymentDue}
                              showDaysLeft={obligationKind.startsWith('bill-')}
                            />
                            {obligationKind.startsWith('debt-') && (
                              <FormCheckbox
                                id="no-payment-due"
                                label="No payment due date (closed card, charge-off, etc.)"
                                checked={debtNoPaymentDue}
                                onChange={(e) => {
                                  setDebtNoPaymentDue(e.target.checked);
                                  if (e.target.checked && errors.dueDate) clearFieldError('dueDate');
                                }}
                                description="Skip payment due date for closed accounts"
                                className="mt-2"
                              />
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div>
                            <FormAutocomplete
                              id="vendor"
                              label="Biller Name"
                              value={vendor}
                              onChange={(value) => { setVendor(value); if (errors.vendor) clearFieldError('vendor'); }}
                              placeholder={
                                obligationKind.startsWith('bill-')
                                  ? 'E.g., AT&T'
                                  : obligationKind === 'debt-card'
                                    ? 'E.g., Chase Sapphire'
                                    : 'E.g., SoFi Personal Loan'
                              }
                              error={errors.vendor}
                              required
                              maxLength={80}
                              suggestions={[
                                'AT&T', 'Verizon', 'Comcast', 'T-Mobile', 'Sprint',
                                'Electric Company', 'Water Utility', 'Gas Company',
                                'Internet Provider', 'Phone Service',
                                'Rent', 'Mortgage', 'Car Payment', 'Student Loan',
                                'Chase', 'Bank of America', 'Wells Fargo', 'Citibank',
                                'Capital One', 'American Express', 'Discover'
                              ]}
                              hint="Start typing to see suggestions from your previous entries"
                            />
                          </div>
                          <div>
                            <FormSelect
                              id="billCategory"
                              label="Category"
                              value={category}
                              onChange={(e) => setCategory(e.target.value)}
                            >
                              {EXPENSE_CATEGORY_OPTGROUPS.map((g) => (
                                <optgroup key={g.label} label={g.label}>
                                  {g.options.map((o) => (
                                    <option key={o.value} value={o.value}>
                                      {o.label}
                                    </option>
                                  ))}
                                </optgroup>
                              ))}
                            </FormSelect>
                          </div>
                        </div>
                        {obligationKind.startsWith('debt-') && (
                          <FormFieldset legend="Debt Details" hint="Optional details help calculate interest and track payments">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                              <div>
                                <label htmlFor="apr" className="block text-xs font-sans font-medium text-content-tertiary mb-1.5">
                                  <Tooltip content="Annual Percentage Rate - the yearly cost of borrowing money">
                                    APR (%)
                                  </Tooltip>
                                </label>
                                <input
                                  id="apr"
                                  type="number"
                                  step="0.01"
                                  value={apr}
                                  onChange={(e) => setApr(e.target.value)}
                                  placeholder="19.99"
                                  aria-describedby="apr-hint"
                                  className="w-full bg-surface-base border border-surface-border radius-input focus-app-field px-3 py-2 text-sm font-sans text-content-primary transition-colors hover:border-content-primary/15"
                                />
                                <p id="apr-hint" className="sr-only">Enter the annual interest rate as a percentage</p>
                              </div>
                              <div>
                                <FormCurrency
                                  id="minPayment"
                                  label={
                                    <Tooltip content="Minimum monthly payment required to avoid late fees">
                                      Min Payment ($)
                                    </Tooltip>
                                  }
                                  value={minPayment}
                                  onChange={setMinPayment}
                                  placeholder="Auto"
                                  hint="Leave blank to calculate automatically based on balance and APR"
                                />
                              </div>
                            </div>
                          </FormFieldset>
                        )}
                      </>
                    )}

                    {/* CITATION FIELDS */}
                    {activeTab === 'citation' && (
                      <>
                        <FormFieldset legend="Citation Information" hint="Details from your toll violation or traffic ticket">
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                              <label className="block text-xs font-sans font-medium text-content-tertiary mb-1.5">Type</label>
                              <select
                                value={citationType}
                                onChange={(e) => setCitationType(e.target.value)}
                                aria-describedby="citation-type-hint"
                                className="w-full bg-surface-base border border-surface-border radius-input focus-app-field px-3 py-2 text-sm font-sans text-content-primary cursor-pointer transition-colors hover:border-content-primary/15"
                              >
                                <option value="Toll Violation">Toll Violation</option>
                                <option value="Traffic Citation">Traffic Citation</option>
                                <option value="Parking Ticket">Parking Ticket</option>
                                <option value="Speed Camera">Speed Camera</option>
                                <option value="Red Light Camera">Red Light Camera</option>
                                <option value="HOV Violation">HOV Violation</option>
                                <option value="Other Fine">Other Fine</option>
                              </select>
                              <p id="citation-type-hint" className="sr-only">Select the type of violation or fine</p>
                            </div>
                            <div>
                              <FormDatePicker
                                id="citation-due-date"
                                label="Payment Due Date"
                                value={citationDueDate}
                                onChange={(val) => {
                                  setCitationDueDate(val);
                                  if (val) {
                                    const days = Math.max(0, Math.round((new Date(val).getTime() - Date.now()) / 86400000));
                                    setDaysLeft(String(days));
                                  }
                                }}
                                showDaysLeft
                                hint="Date by which payment must be made to avoid additional penalties"
                              />
                            </div>
                          </div>
                          <div>
                            <FormAutocomplete
                              id="jurisdiction"
                              label={
                                <span>
                                  Issuing Jurisdiction <span className="text-[var(--color-status-rose-text)]">*</span>
                                </span>
                              }
                              value={jurisdiction}
                              onChange={(value) => { setJurisdiction(value); if (errors.jurisdiction) clearFieldError('jurisdiction'); }}
                              placeholder="E.g., Dallas County, TX"
                              error={errors.jurisdiction}
                              required
                              maxLength={100}
                              suggestions={[
                                'Dallas County, TX', 'Harris County, TX', 'Tarrant County, TX',
                                'Bexar County, TX', 'Travis County, TX', 'Collin County, TX',
                                'Los Angeles County, CA', 'San Diego County, CA', 'Orange County, CA',
                                'Cook County, IL', 'DuPage County, IL', 'Lake County, IL',
                                'Maricopa County, AZ', 'Pima County, AZ',
                                'King County, WA', 'Pierce County, WA',
                                'Miami-Dade County, FL', 'Broward County, FL',
                                'New York County, NY', 'Kings County, NY', 'Queens County, NY'
                              ]}
                              hint="Start typing to see common jurisdictions"
                            />
                          </div>
                        </FormFieldset>

                        <FormFieldset legend="Payment Details" hint="Financial information and reference numbers">
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                              <label className="block text-xs font-sans font-medium text-content-tertiary mb-1.5">Citation / Ticket #</label>
                              <input
                                type="text"
                                value={citationNumber}
                                onChange={(e) => setCitationNumber(e.target.value)}
                                placeholder="E.g., TN-20394857"
                                maxLength={50}
                                aria-describedby="citation-number-count"
                                className="w-full bg-surface-base border border-surface-border radius-input focus-app-field px-3 py-2.5 text-sm font-mono text-content-primary placeholder:text-content-muted transition-colors uppercase hover:border-content-primary/15"
                              />
                              <p id="citation-number-count" className="text-xs font-mono text-content-muted mt-1" aria-live="polite">
                                {citationNumber.length}/50 characters
                              </p>
                            </div>
                            <div>
                              <FormCurrency
                                id="penaltyFee"
                                label="Penalty / Late Fee ($)"
                                value={penaltyFee}
                                onChange={setPenaltyFee}
                                placeholder="0.00"
                                hint="Additional fees charged for late payment"
                              />
                            </div>
                          </div>
                          <div className="mt-4">
                            <label className="block text-xs font-sans font-medium text-content-tertiary mb-1.5">Payment URL <span className="text-content-muted">(optional)</span></label>
                            <input
                              type="url"
                              value={paymentUrl}
                              onChange={(e) => setPaymentUrl(e.target.value)}
                              placeholder="https://..."
                              aria-describedby="payment-url-hint"
                              className="w-full bg-surface-base border border-surface-border radius-input focus-app-field px-3 py-2.5 text-sm font-sans text-content-primary placeholder:text-content-muted transition-colors hover:border-content-primary/15"
                            />
                            <p id="payment-url-hint" className="text-xs text-content-muted mt-1">Direct link to the payment portal</p>
                          </div>
                        </FormFieldset>

                        <div>
                          <FormDatePicker
                            id="incident-date"
                            label="Incident Date"
                            value={date}
                            onChange={setDate}
                            hint="Date when the violation occurred"
                          />
                        </div>
                      </>
                    )}

                    {/* INCOME FIELDS */}
                    {activeTab === 'income' && (
                      <>
                        <div>
                          <label htmlFor="incomeName" className="block text-xs font-sans font-medium text-content-tertiary mb-1.5">Name</label>
                          <input
                            id="incomeName"
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="E.g., Google Paycheck, Client Invoice"
                            className="w-full bg-surface-base border border-surface-border radius-input focus-app-field px-3 py-2.5 text-sm font-sans text-content-primary placeholder:text-content-muted transition-colors hover:border-content-primary/15"
                          />
                        </div>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div>
                            <label className="block text-xs font-sans font-medium text-content-tertiary mb-1.5">Income category</label>
                            <select
                              value={incomeCategory}
                              onChange={(e) => setIncomeCategory(e.target.value)}
                              className="w-full bg-surface-base border border-surface-border radius-input focus-app-field px-3 py-2 text-sm font-sans text-content-primary cursor-pointer transition-colors hover:border-content-primary/15"
                            >
                              {INCOME_CATEGORY_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-sans font-medium text-content-tertiary mb-1.5">Frequency</label>
                            <select
                              value={incomeFrequency}
                              onChange={(e) => setIncomeFrequency(e.target.value as IncomeSource['frequency'])}
                              className="w-full bg-surface-base border border-surface-border radius-input focus-app-field px-3 py-2 text-sm font-sans text-content-primary cursor-pointer transition-colors hover:border-content-primary/15"
                            >
                              <option value="Weekly">Weekly</option>
                              <option value="Bi-weekly">Bi-weekly</option>
                              <option value="Monthly">Monthly</option>
                              <option value="Yearly">Yearly</option>
                            </select>
                          </div>
                        </div>
                        <div>
                          <FormDatePicker
                            id="incDate"
                            label="Next pay date"
                            value={date}
                            onChange={(val) => { setDate(val); if (errors.date) clearFieldError('date'); }}
                            error={errors.date}
                          />
                        </div>
                        <FormCheckbox
                          id="tax-withheld"
                          label={
                            <>
                              Taxes withheld (typical W-2 paycheck). Leave off for gross 1099 or contract pay.
                            </>
                          }
                          checked={incomeTaxWithheld}
                          onChange={(e) => setIncomeTaxWithheld(e.target.checked)}
                          description="Indicates whether taxes are automatically deducted"
                        />
                      </>
                    )}

                  </form>
                </div>

                {/* Footer Controls */}
                <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-surface-border bg-surface-raised px-5 py-4 sm:flex-row sm:items-center sm:justify-end sm:gap-3 sm:px-6">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isSubmitting}
                    aria-busy={isSubmitting}
                    className="min-h-10 rounded px-4 py-2 text-sm font-sans font-medium text-content-tertiary transition-colors hover:text-content-primary focus-app"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void submitEntry(true)}
                    disabled={isSubmitting}
                    aria-busy={isSubmitting}
                    className="min-h-10 border border-surface-border px-4 py-2 text-sm font-sans font-medium text-content-secondary transition-colors radius-button hover:bg-surface-elevated hover:text-content-primary focus-app disabled:opacity-50"
                  >
                    {isSubmitting ? 'Getting things ready...' : 'Save & add another'}
                  </button>
                  <button
                    form="quick-add-form"
                    type="submit"
                    disabled={isSubmitting}
                    aria-busy={isSubmitting}
                    className={`min-h-10 px-5 py-2 text-sm font-sans font-medium transition-colors radius-button focus-app disabled:opacity-50 ${activeTab === 'citation'
                      ? 'bg-brand-cta text-surface-base hover:bg-brand-cta-hover border border-surface-border'
                      : 'bg-brand-cta text-surface-base hover:bg-brand-cta-hover'
                      }`}
                  >
                    {isSubmitting ? 'Getting things ready...' : 'Save entry'}
                  </button>
                </div>
              </Dialog.Panel>
            </motion.div>
          </div>
        </Dialog>
      )}
    </AnimatePresence>
  );
}
