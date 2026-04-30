import { useState, useCallback } from 'react';

const parseCurrencyInput = (value: string) => parseFloat(value.replace(/,/g, ''));

/**
 * Hook for QuickAddModal form validation.
 * 
 * Validates different entry types (transaction, obligation, income, citation)
 * with tab-specific rules and real-time error management.
 * 
 * @param activeTab - Current active tab type
 * @param formData - Form data to validate
 * @returns Validation functions and error state
 */
export function useQuickAddValidation(
    activeTab: 'transaction' | 'obligation' | 'income' | 'citation',
    formData: {
        amount: string;
        description?: string;
        vendor?: string;
        date?: string;
        dueDate?: string;
        jurisdiction?: string;
        obligationKind?: string;
        debtNoPaymentDue?: boolean;
    }
) {
    const [errors, setErrors] = useState<Record<string, string>>({});

    /** Validate form based on active tab */
    const validateForm = useCallback(() => {
        const newErrors: Record<string, string> = {};
        const parsedAmount = parseCurrencyInput(formData.amount);

        // Amount is required for all tabs
        if (!formData.amount || isNaN(parsedAmount) || parsedAmount <= 0) {
            newErrors.amount = "Please enter a valid amount greater than zero.";
        }

        // Tab-specific validation
        if (activeTab === 'transaction') {
            if (!formData.description?.trim()) {
                newErrors.description = "Please describe the transaction.";
            }
        } else if (activeTab === 'obligation') {
            if (!formData.vendor?.trim()) {
                newErrors.vendor = "Please specify who is being paid.";
            }

            const needDue =
                formData.obligationKind?.startsWith('bill-') ||
                (formData.obligationKind?.startsWith('debt-') && !formData.debtNoPaymentDue);

            if (needDue && !formData.dueDate) {
                newErrors.dueDate = "Please select a due date.";
            }
        } else if (activeTab === 'income') {
            if (!formData.date) {
                newErrors.date = "Please select a date.";
            }
        } else if (activeTab === 'citation') {
            if (!formData.jurisdiction?.trim()) {
                newErrors.jurisdiction = "Please enter the issuing jurisdiction.";
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [activeTab, formData]);

    /** Clear all validation errors */
    const clearErrors = useCallback(() => {
        setErrors({});
    }, []);

    /** Clear specific field error */
    const clearFieldError = useCallback((field: string) => {
        setErrors(prev => {
            const next = { ...prev };
            delete next[field];
            return next;
        });
    }, []);

    /** Check if form has any errors */
    const hasErrors = Object.keys(errors).length > 0;

    return {
        errors,
        validateForm,
        clearErrors,
        clearFieldError,
        hasErrors,
    };
}
