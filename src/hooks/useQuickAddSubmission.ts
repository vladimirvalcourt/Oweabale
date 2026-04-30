import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { yieldForPaint } from '@/lib/utils';
import { canUseQuickAddTab, isTrackerObligationDebtBlocked } from '@/app/constants';

/**
 * Hook for handling QuickAddModal form submission.
 * 
 * Routes to correct store action based on active tab (transaction, obligation, income, citation),
 * handles success/error toasts, and manages form reset or modal close.
 * 
 * @param activeTab - Current active tab type
 * @param hasFullSuite - Whether user has full suite access
 * @param storeActions - Store action methods
 * @param resetForm - Function to reset form state
 * @param onClose - Function to close modal
 * @returns Submission handler and state
 */
export function useQuickAddSubmission({
    activeTab,
    hasFullSuite,
    storeActions,
    resetForm,
    onClose,
}: {
    activeTab: 'transaction' | 'obligation' | 'income' | 'citation';
    hasFullSuite: boolean;
    storeActions: {
        addTransaction: any;
        addBill: any;
        addDebt: any;
        addIncome: any;
        addCitation: any;
    };
    resetForm: () => void;
    onClose: () => void;
}) {
    const [isSubmitting, setIsSubmitting] = useState(false);

    const parseCurrencyInput = (value: string) => parseFloat(value.replace(/,/g, ''));

    /** Submit entry to store */
    const submit = useCallback(async (formData: any, options: { addAnother?: boolean } = {}) => {
        if (isSubmitting) return false;

        const trackerOnly = !hasFullSuite;

        // Check tier restrictions
        if (trackerOnly) {
            if (!canUseQuickAddTab(activeTab, hasFullSuite)) {
                toast.error('Full Suite access is needed for ledger and income entries.');
                return false;
            }
            if (
                trackerOnly &&
                activeTab === 'obligation' &&
                formData.obligationKind &&
                isTrackerObligationDebtBlocked(formData.obligationKind, hasFullSuite)
            ) {
                toast.error('Adding loans and credit cards needs Full Suite.');
                return false;
            }
        }

        const numAmount = parseCurrencyInput(formData.amount);

        setIsSubmitting(true);
        await yieldForPaint();

        try {
            let success = false;

            if (activeTab === 'transaction') {
                const isIncome = formData.transactionLedgerKind === 'income';
                success = await storeActions.addTransaction(
                    {
                        name: formData.description,
                        amount: numAmount,
                        category: isIncome ? formData.txIncomeCategory : formData.category,
                        date: formData.date,
                        type: isIncome ? 'income' : 'expense',
                        notes: formData.memoNotes?.trim() || undefined,
                    },
                    { allowBudgetOverride: isIncome ? false : formData.allowBudgetOverride },
                );
                if (!success) return false;
                toast.success(isIncome ? 'Income saved to ledger' : 'Transaction saved');
            } else if (activeTab === 'obligation') {
                if (formData.obligationKind.startsWith('bill-')) {
                    const freq =
                        formData.obligationKind === 'bill-weekly'
                            ? 'Weekly'
                            : formData.obligationKind === 'bill-biweekly'
                                ? 'Bi-weekly'
                                : 'Monthly';

                    success = await storeActions.addBill({
                        biller: formData.vendor,
                        amount: numAmount,
                        category: formData.category,
                        dueDate: formData.dueDate || formData.date,
                        frequency: freq,
                        status: 'upcoming',
                        autoPay: false,
                    });
                    if (!success) return false;
                    toast.success('Bill added');
                } else {
                    success = await storeActions.addDebt({
                        name: formData.vendor,
                        type: formData.obligationKind === 'debt-card' ? 'Credit Card' : 'Loan',
                        apr: parseFloat(formData.apr) || 0,
                        remaining: numAmount,
                        minPayment: parseCurrencyInput(formData.minPayment) || 0,
                        paid: 0,
                        paymentDueDate: formData.debtNoPaymentDue ? null : formData.dueDate || null,
                    });
                    if (!success) return false;
                    toast.success('Debt recorded');
                }
            } else if (activeTab === 'income') {
                success = await storeActions.addIncome({
                    name: formData.description?.trim() || formData.incomeCategory,
                    amount: numAmount,
                    frequency: formData.incomeFrequency,
                    category: formData.incomeCategory,
                    nextDate: formData.date,
                    status: 'active',
                    isTaxWithheld: formData.incomeTaxWithheld,
                });
                if (!success) return false;
                toast.success('Income recorded');
            } else if (activeTab === 'citation') {
                success = await storeActions.addCitation({
                    type: formData.citationType,
                    jurisdiction: formData.jurisdiction.trim(),
                    daysLeft: parseInt(formData.daysLeft) || 30,
                    amount: numAmount,
                    penaltyFee: parseCurrencyInput(formData.penaltyFee) || 0,
                    date: formData.date,
                    citationNumber: formData.citationNumber.trim(),
                    paymentUrl: (() => {
                        const u = formData.paymentUrl?.trim();
                        if (!u) return '';
                        try {
                            const parsed = new URL(u);
                            return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? u : '';
                        } catch {
                            return '';
                        }
                    })(),
                    status: 'open',
                });
                if (!success) return false;
                toast.success('Citation recorded');
            }

            // Handle post-submission behavior
            if (options.addAnother) {
                resetForm();
                return true;
            }

            onClose();
            return true;
        } catch (error) {
            toast.error('Failed to save to ledger');
            console.error('[useQuickAddSubmission] Error:', error);
            return false;
        } finally {
            setIsSubmitting(false);
        }
    }, [activeTab, hasFullSuite, storeActions, resetForm, onClose, isSubmitting]);

    return {
        submit,
        isSubmitting,
    };
}
