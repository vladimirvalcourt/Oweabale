import React, { useRef, useState } from 'react';
import { Upload, X, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

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

export function FormFileUpload({
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
