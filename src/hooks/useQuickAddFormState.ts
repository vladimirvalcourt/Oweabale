import { useState, useCallback } from 'react';
import { formatLocalISODate } from '@/lib/api/services/quickEntryNlp';

/**
 * Hook for managing QuickAddModal form state.
 * 
 * Centralizes all form field state and provides update handlers
 * for different entry types (transaction, obligation, income, citation).
 * 
 * @param activeTab - Current active tab to determine which fields to track
 * @returns Form state object and field update handlers
 */
export function useQuickAddFormState(activeTab: 'transaction' | 'obligation' | 'income' | 'citation') {
    // Common fields
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(() => formatLocalISODate());

    // Transaction-specific
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('food');
    const [transactionLedgerKind, setTransactionLedgerKind] = useState<'expense' | 'income'>('expense');
    const [txIncomeCategory, setTxIncomeCategory] = useState('Reimbursements');
    const [memoNotes, setMemoNotes] = useState('');
    const [allowBudgetOverride, setAllowBudgetOverride] = useState(false);

    // Obligation-specific
    const [vendor, setVendor] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [obligationKind, setObligationKind] = useState<'bill-weekly' | 'bill-biweekly' | 'bill-monthly' | 'debt-card' | 'debt-loan'>('bill-monthly');
    const [debtNoPaymentDue, setDebtNoPaymentDue] = useState(false);
    const [apr, setApr] = useState('19.99');
    const [minPayment, setMinPayment] = useState('');

    // Income-specific
    const [incomeCategory, setIncomeCategory] = useState('Salary');
    const [incomeFrequency, setIncomeFrequency] = useState<'Weekly' | 'Bi-weekly' | 'Monthly' | 'Yearly'>('Monthly');
    const [incomeTaxWithheld, setIncomeTaxWithheld] = useState(false);

    // Citation-specific
    const [citationType, setCitationType] = useState('Toll Violation');
    const [jurisdiction, setJurisdiction] = useState('');
    const [citationNumber, setCitationNumber] = useState('');
    const [penaltyFee, setPenaltyFee] = useState('');
    const [daysLeft, setDaysLeft] = useState('30');
    const [citationDueDate, setCitationDueDate] = useState('');
    const [paymentUrl, setPaymentUrl] = useState('');

    // NLP input
    const [nlpText, setNlpText] = useState('');

    /** Reset all form fields while preserving active tab */
    const resetForm = useCallback(() => {
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
    }, []);

    /** Get complete form data object */
    const getFormData = useCallback(() => ({
        amount,
        date,
        description,
        category,
        transactionLedgerKind,
        txIncomeCategory,
        memoNotes,
        allowBudgetOverride,
        vendor,
        dueDate,
        obligationKind,
        debtNoPaymentDue,
        apr,
        minPayment,
        incomeCategory,
        incomeFrequency,
        incomeTaxWithheld,
        citationType,
        jurisdiction,
        citationNumber,
        penaltyFee,
        daysLeft,
        citationDueDate,
        paymentUrl,
        nlpText,
    }), [
        amount, date, description, category, transactionLedgerKind, txIncomeCategory,
        memoNotes, allowBudgetOverride, vendor, dueDate, obligationKind, debtNoPaymentDue,
        apr, minPayment, incomeCategory, incomeFrequency, incomeTaxWithheld,
        citationType, jurisdiction, citationNumber, penaltyFee, daysLeft,
        citationDueDate, paymentUrl, nlpText,
    ]);

    return {
        // State
        amount, setAmount,
        date, setDate,
        description, setDescription,
        category, setCategory,
        transactionLedgerKind, setTransactionLedgerKind,
        txIncomeCategory, setTxIncomeCategory,
        memoNotes, setMemoNotes,
        allowBudgetOverride, setAllowBudgetOverride,
        vendor, setVendor,
        dueDate, setDueDate,
        obligationKind, setObligationKind,
        debtNoPaymentDue, setDebtNoPaymentDue,
        apr, setApr,
        minPayment, setMinPayment,
        incomeCategory, setIncomeCategory,
        incomeFrequency, setIncomeFrequency,
        incomeTaxWithheld, setIncomeTaxWithheld,
        citationType, setCitationType,
        jurisdiction, setJurisdiction,
        citationNumber, setCitationNumber,
        penaltyFee, setPenaltyFee,
        daysLeft, setDaysLeft,
        citationDueDate, setCitationDueDate,
        paymentUrl, setPaymentUrl,
        nlpText, setNlpText,

        // Utilities
        resetForm,
        getFormData,
    };
}
