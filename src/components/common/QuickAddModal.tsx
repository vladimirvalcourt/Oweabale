import React, { useState, useEffect, useRef } from 'react';
import { Dialog } from '@headlessui/react';
import { motion, AnimatePresence } from 'motion/react';
import { X, AlertCircle, Loader2, Camera, Eye, EyeOff, AlertTriangle, Upload } from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { ThemeBackdrop } from './ThemeBackdrop';
import { toast } from 'sonner';
import { useStore, type IncomeSource, type TabType } from '../../store';
import { guessCategory } from '../../lib/api/services/categorizer';
import { validateIngestionFile } from '../../lib/api/security';
import { extractCitationFieldsFromText, looksLikeCitationDocument } from '../../lib/api';
import { yieldForPaint } from '../../lib/utils';
import { EXPENSE_CATEGORY_OPTGROUPS, INCOME_CATEGORY_OPTIONS } from '../../lib/api/services/quickEntryCategories';
import { formatLocalISODate, parseQuickEntryDateHint } from '../../lib/api/services/quickEntryNlp';
import { useFullSuiteAccess } from '../../hooks';
import { clampQuickAddTabForTier, canUseQuickAddTab, isTrackerObligationDebtBlocked } from '../../app/constants';
import { getCustomIcon } from '../../lib/utils';
import { FormInput, FormCurrency, FormAutocomplete } from '../forms';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/** Quick Add → Bill/Debt: bill cadence or debt instrument (card vs loan). */
type ObligationKind = 'bill-weekly' | 'bill-biweekly' | 'bill-monthly' | 'debt-card' | 'debt-loan';

const parseCurrencyInput = (value: string) => parseFloat(value.replace(/,/g, ''));

/** Reusable select field with label and ARIA support */
interface FormSelectProps {
  id: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  children: React.ReactNode;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

function FormSelect({
  id,
  label,
  value,
  onChange,
  children,
  required,
  disabled,
  className = '',
}: FormSelectProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-sans font-medium text-content-tertiary mb-1.5">
        {label}
        {required && <span className="ml-0.5 text-[var(--color-status-rose-text)]">*</span>}
      </label>
      <select
        id={id}
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
        aria-required={required}
        className={`w-full bg-surface-base border border-surface-border radius-input focus-app-field px-3 py-2 text-sm font-sans text-content-primary cursor-pointer transition-colors hover:border-content-primary/15 disabled:opacity-40 ${className}`}
      >
        {children}
      </select>
    </div>
  );
}

/** Reusable date input with label and ARIA support */
interface FormDateProps {
  id: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
}

function FormDate({
  id,
  label,
  value,
  onChange,
  error,
  required,
  disabled,
}: FormDateProps) {
  const errorId = `${id}-error`;
  const hasError = !!error;

  return (
    <div>
      <label htmlFor={id} className="block text-xs font-sans font-medium text-content-tertiary mb-1.5">
        {label}
        {required && <span className="ml-0.5 text-[var(--color-status-rose-text)]">*</span>}
      </label>
      <input
        id={id}
        type="date"
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
        aria-invalid={hasError}
        aria-describedby={hasError ? errorId : undefined}
        aria-required={required}
        className={`input-date-dark w-full bg-surface-base border ${hasError ? 'border-[var(--color-status-rose-border)]' : 'border-surface-border'} radius-input focus-app-field px-3 py-2 text-sm font-sans transition-colors hover:border-content-primary/15 disabled:opacity-40 disabled:hover:border-surface-border`}
      />
      {hasError && (
        <p id={errorId} className="mt-1.5 text-xs text-[var(--color-status-rose-text)]" role="alert" aria-live="polite">
          {error}
        </p>
      )}
    </div>
  );
}

/** Reusable tab button with ARIA support */
interface FormTabProps {
  id: string;
  label: string;
  isActive: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  variant?: 'default' | 'citation';
}

function FormTab({ id, label, isActive, onClick, icon, variant = 'default' }: FormTabProps) {
  return (
    <button
      type="button"
      role="tab"
      id={id}
      aria-selected={isActive}
      aria-controls="quick-add-form"
      tabIndex={isActive ? 0 : -1}
      onClick={onClick}
      className={`min-h-10 min-w-0 px-3 py-2 text-xs font-sans font-medium transition-all rounded-lg focus-app ${variant === 'citation'
        ? isActive
          ? 'bg-content-primary/[0.08] text-content-primary border border-surface-border'
          : 'text-content-tertiary hover:text-content-primary hover:bg-surface-elevated'
        : isActive
          ? 'bg-brand-cta text-surface-base'
          : 'text-content-tertiary hover:text-content-primary hover:bg-surface-elevated'
        }`}
    >
      {icon && <span className="inline-flex min-w-0 items-center justify-center gap-1.5">{icon}<span className="truncate">{label}</span></span>}
      {!icon && <span className="truncate">{label}</span>}
    </button>
  );
}

/** Reusable checkbox with label and ARIA support */
interface FormCheckboxProps {
  id: string;
  label: string | React.ReactNode;
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  className?: string;
  description?: string;
}

function FormCheckbox({ id, label, checked, onChange, disabled, className = '', description }: FormCheckboxProps) {
  return (
    <label
      htmlFor={id}
      className={`flex items-start gap-2.5 text-xs text-content-secondary cursor-pointer ${className}`}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        aria-describedby={description ? `${id}-desc` : undefined}
        className="mt-0.5 rounded border-surface-border bg-surface-base focus-app disabled:opacity-40"
      />
      <span>
        {label}
        {description && (
          <span id={`${id}-desc`} className="sr-only">
            {description}
          </span>
        )}
      </span>
    </label>
  );
}

/** Reusable textarea with label, character count, and ARIA support */
interface FormTextareaProps {
  id: string;
  label: string | React.ReactNode;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  rows?: number;
  maxLength?: number;
  hint?: string;
}

function FormTextarea({
  id,
  label,
  value,
  onChange,
  placeholder,
  error,
  required,
  disabled,
  rows = 2,
  maxLength,
  hint,
}: FormTextareaProps) {
  const errorId = `${id}-error`;
  const hintId = hint ? `${id}-hint` : undefined;
  const hasError = !!error;
  const charCount = value.length;
  const showProgress = maxLength !== undefined;
  const progressPercentage = maxLength ? (charCount / maxLength) * 100 : 0;
  const isNearLimit = progressPercentage > 75;

  return (
    <div>
      <label htmlFor={id} className="block text-xs font-sans font-medium text-content-tertiary mb-1.5">
        {label}
        {required && <span className="ml-0.5 text-[var(--color-status-rose-text)]">*</span>}
      </label>
      <textarea
        id={id}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        rows={rows}
        maxLength={maxLength}
        aria-invalid={hasError}
        aria-describedby={[hasError ? errorId : undefined, hintId, maxLength ? `${id}-count` : undefined].filter(Boolean).join(' ') || undefined}
        aria-required={required}
        className={`w-full bg-surface-base border ${hasError ? 'border-[var(--color-status-rose-border)]' : 'border-surface-border'} radius-input focus-app-field px-3 py-2.5 text-sm font-sans text-content-primary placeholder:text-content-muted resize-none transition-colors hover:border-content-primary/15 disabled:opacity-40 disabled:hover:border-surface-border`}
      />
      {hint && <p id={hintId} className="text-xs text-content-muted mt-1">{hint}</p>}
      {hasError && (
        <p id={errorId} className="mt-1.5 flex items-center gap-1.5 text-xs text-[var(--color-status-rose-text)]" role="alert" aria-live="polite">
          <AlertCircle className="w-3 h-3" aria-hidden />
          {error}
        </p>
      )}
      {showProgress && (
        <div className="mt-1.5">
          <div className="flex items-center justify-between mb-1">
            <p id={`${id}-count`} className={`text-xs font-mono ${isNearLimit ? 'text-[var(--color-status-amber-text)]' : 'text-content-muted'}`} aria-live="polite">
              {charCount}/{maxLength} characters
            </p>
            {isNearLimit && (
              <div className="flex-1 ml-2 h-1 bg-surface-raised rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-200 ${progressPercentage > 90 ? 'bg-[var(--color-status-rose-text)]' : 'bg-[var(--color-status-amber-text)]'}`}
                  style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                  role="progressbar"
                  aria-valuenow={charCount}
                  aria-valuemin={0}
                  aria-valuemax={maxLength}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Reusable radio group with ARIA support */
interface RadioOption {
  value: string;
  label: string;
}

interface FormRadioGroupProps {
  id: string;
  name: string;
  label: string | React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  options: RadioOption[];
  required?: boolean;
  disabled?: boolean;
  hint?: string;
}

function FormRadioGroup({ id, name, label, value, onChange, options, required, disabled, hint }: FormRadioGroupProps) {
  const groupId = `${id}-group`;
  const hintId = hint ? `${id}-hint` : undefined;

  return (
    <fieldset id={groupId} className="rounded-lg border border-surface-border bg-surface-base p-3" role="radiogroup" aria-required={required}>
      <legend className="text-xs font-sans font-medium text-content-tertiary mb-2">
        {label}
        {required && <span className="ml-0.5 text-[var(--color-status-rose-text)]">*</span>}
      </legend>
      <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center">
        <div className="flex rounded-lg border border-surface-border p-0.5 bg-surface-raised gap-0.5 w-full sm:w-auto">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={value === option.value}
              tabIndex={value === option.value ? 0 : -1}
              onClick={() => !disabled && onChange(option.value)}
              disabled={disabled}
              className={`flex-1 rounded-full px-3 py-1.5 text-xs font-sans font-medium transition-colors focus-app text-center ${value === option.value
                ? 'bg-brand-cta text-surface-base'
                : 'text-content-tertiary hover:text-content-primary'
                } disabled:opacity-40`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      {hint && <p id={hintId} className="text-xs text-content-muted mt-2 leading-snug">{hint}</p>}
    </fieldset>
  );
}

/** Reusable fieldset wrapper for grouping related inputs */
interface FormFieldsetProps {
  legend: string;
  children: React.ReactNode;
  className?: string;
  hint?: string;
}

function FormFieldset({ legend, children, className = '', hint }: FormFieldsetProps) {
  const hintId = hint ? `fieldset-${legend.toLowerCase().replace(/\s+/g, '-')}-hint` : undefined;

  return (
    <fieldset className={`rounded-lg border border-surface-border bg-surface-base p-3 ${className}`}>
      <legend className="text-xs font-sans font-medium text-content-tertiary mb-2">{legend}</legend>
      {children}
      {hint && <p id={hintId} className="text-xs text-content-muted mt-2 leading-snug">{hint}</p>}
    </fieldset>
  );
}

/** Tooltip component for complex fields */
interface TooltipProps {
  content: string;
  children: React.ReactNode;
}

function Tooltip({ content, children }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative inline-flex items-center gap-1">
      {children}
      <button
        type="button"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
        className="text-content-muted hover:text-content-secondary transition-colors focus-app rounded"
        aria-label={`More information about ${content}`}
        aria-describedby={isVisible ? 'tooltip-content' : undefined}
      >
        <AlertCircle className="w-3.5 h-3.5" />
      </button>
      {isVisible && (
        <div
          id="tooltip-content"
          role="tooltip"
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-surface-elevated border border-surface-border radius-card text-xs text-content-secondary shadow-lg z-50 max-w-[200px] text-center"
        >
          {content}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1">
            <div className="border-4 border-transparent border-t-surface-border" />
          </div>
        </div>
      )}
    </div>
  );
}

/** Enhanced date picker with calendar widget support */
interface FormDatePickerProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  min?: string;
  max?: string;
  hint?: string;
  showDaysLeft?: boolean;
}

function FormDatePicker({
  id,
  label,
  value,
  onChange,
  error,
  required,
  disabled,
  min,
  max,
  hint,
  showDaysLeft = false,
}: FormDatePickerProps) {
  const errorId = `${id}-error`;
  const hintId = hint ? `${id}-hint` : undefined;
  const hasError = !!error;

  const calculateDaysLeft = () => {
    if (!value) return null;
    const targetDate = new Date(value);
    const today = new Date();
    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysLeft = showDaysLeft ? calculateDaysLeft() : null;

  return (
    <div>
      <label htmlFor={id} className="block text-xs font-sans font-medium text-content-tertiary mb-1.5">
        {label}
        {required && <span className="ml-0.5 text-[var(--color-status-rose-text)]">*</span>}
      </label>
      <input
        id={id}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        disabled={disabled}
        min={min}
        max={max}
        aria-invalid={hasError}
        aria-describedby={[hintId, hasError ? errorId : undefined].filter(Boolean).join(' ') || undefined}
        aria-required={required}
        className={`input-date-dark w-full bg-surface-base border ${hasError ? 'border-[var(--color-status-rose-border)]' : 'border-surface-border'} radius-input focus-app-field px-3 py-2 text-sm font-sans transition-colors hover:border-content-primary/15 disabled:opacity-40 disabled:hover:border-surface-border`}
      />
      {daysLeft !== null && (
        <p className={`mt-1 text-xs font-mono ${daysLeft < 0 ? 'text-[var(--color-status-rose-text)]' : daysLeft <= 7 ? 'text-[var(--color-status-amber-text)]' : 'text-content-muted'}`} aria-live="polite">
          {daysLeft < 0 ? `${Math.abs(daysLeft)} days overdue` : daysLeft === 0 ? 'Due today' : `${daysLeft} days remaining`}
        </p>
      )}
      {hint && !showDaysLeft && <p id={hintId} className="text-xs text-content-muted mt-1">{hint}</p>}
      {hasError && (
        <p id={errorId} className="mt-1.5 text-xs text-[var(--color-status-rose-text)]" role="alert" aria-live="polite">
          {error}
        </p>
      )}
    </div>
  );
}

/** File upload with preview support */
interface FormFileUploadProps {
  id: string;
  label: string;
  buttonLabel?: string;
  onFileSelect: (file: File | null) => void;
  accept?: string;
  maxSize?: number; // in MB
  error?: string;
  required?: boolean;
  disabled?: boolean;
  hint?: string;
  previewUrl?: string | null;
  onPreviewToggle?: () => void;
  showPreview?: boolean;
}

function FormFileUpload({
  id,
  label,
  buttonLabel = 'Choose file',
  onFileSelect,
  accept = 'image/*,.pdf',
  maxSize = 10,
  error,
  required,
  disabled,
  hint,
  previewUrl,
  onPreviewToggle,
  showPreview = false,
}: FormFileUploadProps) {
  const errorId = `${id}-error`;
  const hintId = hint ? `${id}-hint` : undefined;
  const hasError = !!error;
  const [fileName, setFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      onFileSelect(null);
      setFileName('');
      return;
    }

    // Validate file size
    if (file.size > maxSize * 1024 * 1024) {
      toast.error(`File too large. Maximum size is ${maxSize}MB.`);
      onFileSelect(null);
      setFileName('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setFileName(file.name);
    onFileSelect(file);
  };

  const clearFile = () => {
    setFileName('');
    onFileSelect(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="min-w-0">
      {label ? (
        <label htmlFor={id} className="mb-1.5 block text-xs font-sans font-medium text-content-tertiary">
          {label}
          {required && <span className="ml-0.5 text-[var(--color-status-rose-text)]">*</span>}
        </label>
      ) : null}

      <div className="space-y-2">
        <div className="flex min-w-0 gap-2">
          <label
            className={`flex min-h-10 min-w-0 flex-1 cursor-pointer items-center justify-center gap-2 overflow-hidden border px-3 py-2.5 transition-all radius-input ${disabled
              ? 'border-surface-border bg-surface-raised text-content-muted cursor-not-allowed'
              : fileName
                ? 'border-[var(--color-status-emerald-border)] bg-[var(--color-status-emerald-bg)] text-[var(--color-status-emerald-text)]'
                : 'border-surface-border bg-surface-raised text-content-secondary hover:text-content-primary hover:bg-content-primary/[0.04]'
              }`}
          >
            <input
              ref={fileInputRef}
              id={id}
              type="file"
              accept={accept}
              onChange={handleFileChange}
              disabled={disabled}
              required={required && !fileName}
              className="hidden"
              aria-describedby={[hintId, hasError ? errorId : undefined].filter(Boolean).join(' ') || undefined}
            />
            {fileName ? (
              <>
                <span className="min-w-0 max-w-full truncate text-xs">{fileName}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    clearFile();
                  }}
                  className="ml-auto text-content-muted hover:text-content-primary"
                  aria-label="Remove file"
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 shrink-0" aria-hidden />
                <span className="truncate text-xs">{buttonLabel}</span>
              </>
            )}
          </label>

          {previewUrl && onPreviewToggle && (
            <button
              type="button"
              onClick={onPreviewToggle}
              className={`min-h-10 shrink-0 border px-3 py-2.5 transition-all radius-input ${showPreview
                ? 'border-surface-border text-content-primary bg-content-primary/[0.06]'
                : 'border-surface-border text-content-tertiary hover:text-content-primary hover:bg-surface-elevated'
                }`}
              title={showPreview ? 'Hide preview' : 'Show preview'}
            >
              {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          )}
        </div>

        {hint && <p id={hintId} className="text-xs text-content-muted">{hint}</p>}

        {hasError && (
          <p id={errorId} className="flex items-center gap-1.5 text-xs text-[var(--color-status-rose-text)]" role="alert" aria-live="polite">
            <AlertCircle className="w-3 h-3" aria-hidden />
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

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
  const [allowBudgetOverride, setAllowBudgetOverride] = useState(false);

  // Form states
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('food');
  const [date, setDate] = useState(() => formatLocalISODate());
  const [obligationKind, setObligationKind] = useState<ObligationKind>('bill-monthly');
  /** Closed card / no statement cycle — omit payment due date on debt. */
  const [debtNoPaymentDue, setDebtNoPaymentDue] = useState(false);
  const [dueDate, setDueDate] = useState('');
  const [vendor, setVendor] = useState('');
  const [incomeCategory, setIncomeCategory] = useState('Salary');
  const [incomeFrequency, setIncomeFrequency] = useState<IncomeSource['frequency']>('Monthly');
  /** Transaction tab: expense vs income/refund (stored as income row). */
  const [transactionLedgerKind, setTransactionLedgerKind] = useState<'expense' | 'income'>('expense');
  const [txIncomeCategory, setTxIncomeCategory] = useState('Reimbursements');
  const [incomeTaxWithheld, setIncomeTaxWithheld] = useState(false);
  const [memoNotes, setMemoNotes] = useState('');
  // Citation-specific states
  const [citationType, setCitationType] = useState('Toll Violation');
  const [jurisdiction, setJurisdiction] = useState('');
  const [citationNumber, setCitationNumber] = useState('');
  const [penaltyFee, setPenaltyFee] = useState('');
  const [apr, setApr] = useState('19.99');
  const [minPayment, setMinPayment] = useState('');
  const [daysLeft, setDaysLeft] = useState('30');
  const [paymentUrl, setPaymentUrl] = useState('');
  // Citation due date (separate from incident date, drives daysLeft)
  const [citationDueDate, setCitationDueDate] = useState('');
  // NLP input state
  const [nlpText, setNlpText] = useState('');
  // Validation state
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Scan state
  const [isScanning, setIsScanning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [scannedPreviewUrl, setScannedPreviewUrl] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const scanFileInputRef = useRef<HTMLInputElement>(null);
  const scanCameraInputRef = useRef<HTMLInputElement>(null);

  const resetFormPreserveTab = React.useCallback(() => {
    setAmount('');
    setDescription('');
    setVendor('');
    setCategory('food');
    setDate(formatLocalISODate());
    setTransactionLedgerKind('expense');
    setTxIncomeCategory('Reimbursements');
    setMemoNotes('');
    setIncomeTaxWithheld(false);
    setObligationKind('bill-monthly');
    setDueDate('');
    setIncomeCategory('Salary');
    setIncomeFrequency('Monthly');
    setNlpText('');
    setIsScanning(false);
    setErrors({});
    if (scanFileInputRef.current) scanFileInputRef.current.value = '';
    if (scanCameraInputRef.current) scanCameraInputRef.current.value = '';
    setScannedPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setShowPreview(false);
    setCitationType('Toll Violation');
    setJurisdiction('');
    setCitationNumber('');
    setPenaltyFee('');
    setApr('19.99');
    setMinPayment('');
    setDebtNoPaymentDue(false);
    setDaysLeft('30');
    setCitationDueDate('');
    setPaymentUrl('');
    setAllowBudgetOverride(false);
    clearLastBudgetGuardrail();
  }, [clearLastBudgetGuardrail]);

  // Noise patterns that should be skipped when finding a merchant name
  const RECEIPT_NOISE = /^(receipt|invoice|thank you|thanks|welcome|store|branch|tel:|phone:|www\.|http|address:|date:|time:|cashier|order #|order:|transaction|subtotal|total|tax|amount|change|cash|card|approved|auth|ref:|refund|void|copy|customer|#\d+|\d{3}[-.\s]\d{3}[-.\s]\d{4}|\d{1,5}\s+\w+\s+(st|ave|blvd|rd|dr|lane|ln|way|ct|pl|suite))/i;

  const extractMerchantName = (lines: string[]): string | null => {
    // Prefer lines that look like business names: mixed/upper case, no digits-only, not noise
    for (const line of lines.slice(0, 10)) {
      const trimmed = line.trim();
      if (trimmed.length < 3 || trimmed.length > 60) continue;
      if (RECEIPT_NOISE.test(trimmed)) continue;
      if (/^\d+$/.test(trimmed)) continue; // pure number line
      if (/^\$[\d.,]+$/.test(trimmed)) continue; // pure dollar amount
      return trimmed.substring(0, 50);
    }
    return null;
  };

  const handleScanFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateIngestionFile(file);
    if (!validation.ok) {
      toast.error(validation.error);
      e.target.value = '';
      return;
    }

    // Generate preview URL for images; show PDF placeholder
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setScannedPreviewUrl(url);
      setShowPreview(true);
    } else {
      setScannedPreviewUrl(null);
      setShowPreview(false);
    }

    setIsScanning(true);
    try {
      let fullText = '';

      if (file.type.startsWith('image/')) {
        const Tesseract = (await import('tesseract.js')).default;
        const result = await Tesseract.recognize(file, 'eng');
        fullText = result.data.text;
      } else if (file.type === 'application/pdf') {
        const pdfjsLib = await import('pdfjs-dist');
        const pdfjsWorkerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
        pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const pages = Math.min(pdf.numPages, 3);
        for (let i = 1; i <= pages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          fullText += textContent.items.map((item: any) => item.str).join(' ') + '\n';
        }
      }

      // ── Extract amount: largest dollar value, ignoring obvious tax/subtotal lines ──
      const amountMatches = fullText.match(/\$?\s*\d{1,6}\.\d{2}/g);
      if (amountMatches) {
        const amounts = amountMatches
          .map(m => parseFloat(m.replace(/[^0-9.]/g, '')))
          .filter(n => !isNaN(n) && n > 0 && n < 100_000);
        if (amounts.length > 0) setAmount(Math.max(...amounts).toFixed(2));
      }

      // ── Auto-detect toll / traffic ticket and switch tab ──
      const isCitationDoc = looksLikeCitationDocument(fullText);
      if (isCitationDoc && activeTab !== 'citation') {
        setActiveTab('citation');
      }

      // ── Extract merchant: skip noise, find first meaningful line ──
      const lines = fullText.split('\n').filter(l => l.trim().length > 2);
      const merchantName = extractMerchantName(lines);
      if (merchantName && !isCitationDoc) {
        if (activeTab === 'transaction') setDescription(merchantName);
        else if (activeTab === 'obligation') setVendor(merchantName);
        const guessed = guessCategory(merchantName);
        if (guessed && !(activeTab === 'transaction' && transactionLedgerKind === 'income')) setCategory(guessed);
      }

      if (!merchantName) {
        const guessed = guessCategory(fullText.substring(0, 500));
        if (guessed && !(activeTab === 'transaction' && transactionLedgerKind === 'income')) setCategory(guessed);
      }

      if (isCitationDoc) {
        const cit = extractCitationFieldsFromText(fullText);
        if (cit.citationNumber) setCitationNumber(cit.citationNumber);
        if (cit.jurisdiction) setJurisdiction(cit.jurisdiction);
        if (cit.penaltyFee) setPenaltyFee(cit.penaltyFee);
        setDaysLeft(cit.daysLeft);
        if (cit.citationDueDate) setCitationDueDate(cit.citationDueDate);
        setCitationType(cit.citationType);
      }

      // ── Extract date ──
      const dateMatch = fullText.match(/\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/);
      if (dateMatch) {
        try {
          const parsed = new Date(dateMatch[0]);
          if (!isNaN(parsed.getTime())) {
            const dateStr = parsed.toISOString().split('T')[0];
            setDate(dateStr);
            if (activeTab === 'obligation') setDueDate(dateStr);
          }
        } catch (error) {
          console.warn('[QuickAdd] Date parsing failed:', error);
          toast.warning('Could not detect date — please enter manually');
        }
      }

      if (!hasFullSuite && !isCitationDoc) {
        setActiveTab('obligation');
        if (merchantName) setVendor(merchantName);
      }

      if (!fullText.trim()) {
        toast.warning('Could not extract text — fill in the fields manually.');
      } else {
        toast.success('Document scanned — review the pre-filled fields and save.');
      }
    } catch {
      toast.error('Could not read document. Try a clearer photo or PDF.');
    } finally {
      setIsScanning(false);
      e.target.value = '';
    }
  };

  // Revoke preview blob URL whenever the modal closes to prevent memory leak
  useEffect(() => {
    if (!isOpen) {
      setScannedPreviewUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null; });
      setShowPreview(false);
    }
  }, [isOpen]);

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

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    const parsedAmount = parseCurrencyInput(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) newErrors.amount = "Please enter a valid amount greater than zero.";

    if (activeTab === 'transaction') {
      if (!description.trim()) newErrors.description = "Please describe the transaction.";
    } else if (activeTab === 'obligation') {
      if (!vendor.trim()) newErrors.vendor = "Please specify who is being paid.";
      const needDue =
        obligationKind.startsWith('bill-') ||
        (obligationKind.startsWith('debt-') && !debtNoPaymentDue);
      if (needDue && !dueDate) newErrors.dueDate = "Please select a due date.";
    } else if (activeTab === 'income') {
      if (!date) newErrors.date = "Please select a date.";
    } else if (activeTab === 'citation') {
      if (!jurisdiction.trim()) newErrors.jurisdiction = "Please enter the issuing jurisdiction.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

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

  const submitEntry = async (addAnother: boolean) => {
    if (isSubmitting) return;
    if (!validateForm()) return;

    if (trackerOnly) {
      if (!canUseQuickAddTab(activeTab, hasFullSuite)) {
        toast.error('Full Suite access is needed for ledger and income entries.');
        return;
      }
      if (trackerOnly && activeTab === 'obligation' && isTrackerObligationDebtBlocked(obligationKind, hasFullSuite)) {
        toast.error('Adding loans and credit cards needs Full Suite.');
        return;
      }
    }

    const numAmount = parseCurrencyInput(amount);

    setIsSubmitting(true);
    await yieldForPaint();
    try {
      if (activeTab === 'transaction') {
        const isIncome = transactionLedgerKind === 'income';
        const ok = await addTransaction(
          {
            name: description,
            amount: numAmount,
            category: isIncome ? txIncomeCategory : category,
            date: date,
            type: isIncome ? 'income' : 'expense',
            notes: memoNotes.trim() || undefined,
          },
          { allowBudgetOverride: isIncome ? false : allowBudgetOverride },
        );
        if (!ok) return;
        toast.success(isIncome ? 'Income saved to ledger' : 'Transaction saved');
      } else if (activeTab === 'obligation') {
        if (obligationKind.startsWith('bill-')) {
          const freq =
            obligationKind === 'bill-weekly'
              ? 'Weekly'
              : obligationKind === 'bill-biweekly'
                ? 'Bi-weekly'
                : 'Monthly';
          const ok = await addBill({
            biller: vendor,
            amount: numAmount,
            category: category,
            dueDate: dueDate || date,
            frequency: freq,
            status: 'upcoming',
            autoPay: false
          });
          if (!ok) return;
          toast.success(`Bill added`);
        } else {
          const ok = await addDebt({
            name: vendor,
            type: obligationKind === 'debt-card' ? 'Credit Card' : 'Loan',
            apr: parseFloat(apr) || 0,
            remaining: numAmount,
            minPayment: parseCurrencyInput(minPayment) || 0,
            paid: 0,
            paymentDueDate: debtNoPaymentDue ? null : dueDate || null,
          });
          if (!ok) return;
          toast.success(`Debt recorded`);
        }
      } else if (activeTab === 'income') {
        const ok = await addIncome({
          name: description.trim() || incomeCategory,
          amount: numAmount,
          frequency: incomeFrequency,
          category: incomeCategory,
          nextDate: date,
          status: 'active',
          isTaxWithheld: incomeTaxWithheld,
        });
        if (!ok) return;
        toast.success(`Income recorded`);
      } else if (activeTab === 'citation') {
        const ok = await addCitation({
          type: citationType,
          jurisdiction: jurisdiction.trim(),
          daysLeft: parseInt(daysLeft) || 30,
          amount: numAmount,
          penaltyFee: parseCurrencyInput(penaltyFee) || 0,
          date: date,
          citationNumber: citationNumber.trim(),
          paymentUrl: (() => {
            const u = paymentUrl.trim();
            if (!u) return '';
            try {
              const parsed = new URL(u);
              return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? u : '';
            } catch { return ''; }
          })(),
          status: 'open',
        });
        if (!ok) return;
        toast.success(`Citation recorded`);
        if (addAnother) {
          resetFormPreserveTab();
          return;
        }
        onClose();
        return;
      }
      if (addAnother) {
        resetFormPreserveTab();
        return;
      }
      onClose();
    } catch (error) {
      toast.error('Failed to save to ledger');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
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
    setErrors({});
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
                          setErrors({});
                        }}
                      />
                    )}
                    <FormTab
                      id="qa-tab-obligation"
                      label={hasFullSuite ? 'Bill or debt' : 'Bill'}
                      isActive={activeTab === 'obligation'}
                      onClick={() => {
                        setActiveTab('obligation');
                        setErrors({});
                      }}
                    />
                    {hasFullSuite && (
                      <FormTab
                        id="qa-tab-income"
                        label="Income"
                        isActive={activeTab === 'income'}
                        onClick={() => {
                          setActiveTab('income');
                          setErrors({});
                        }}
                      />
                    )}
                    <FormTab
                      id="qa-tab-citation"
                      label="Toll or ticket"
                      isActive={activeTab === 'citation'}
                      onClick={() => {
                        setActiveTab('citation');
                        setErrors({});
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
                      onChange={(value) => { setAmount(value); if (errors.amount) setErrors({ ...errors, amount: '' }); }}
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
                                onChange={(e) => { setDescription(e.target.value); if (errors.description) setErrors({ ...errors, description: '' }); }}
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
                              onChange={(val) => { setDueDate(val); if (errors.dueDate) setErrors({ ...errors, dueDate: '' }); }}
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
                                  if (e.target.checked && errors.dueDate) setErrors({ ...errors, dueDate: '' });
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
                              onChange={(value) => { setVendor(value); if (errors.vendor) setErrors({ ...errors, vendor: '' }); }}
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
                                'Internet Provider', 'Phone Service', 'Insurance',
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
                              onChange={(value) => { setJurisdiction(value); if (errors.jurisdiction) setErrors({ ...errors, jurisdiction: '' }); }}
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
                            onChange={(val) => { setDate(val); if (errors.date) setErrors({ ...errors, date: '' }); }}
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
