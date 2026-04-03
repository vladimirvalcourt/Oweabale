import React, { useMemo, useState } from 'react';
import { useStore } from '../store/useStore';
import { Calculator, DollarSign, AlertCircle, Info } from 'lucide-react';

export default function Taxes() {
  const { incomes } = useStore();
  const [filingStatus, setFilingStatus] = useState<'single' | 'married'>('single');

  // Calculate total annual income
  const annualIncome = useMemo(() => {
    return incomes.reduce((sum, income) => {
      if (income.status !== 'active') return sum;
      let yearlyAmount = income.amount;
      if (income.frequency === 'Weekly') yearlyAmount = income.amount * 52;
      if (income.frequency === 'Bi-weekly') yearlyAmount = income.amount * 26;
      if (income.frequency === 'Monthly') yearlyAmount = income.amount * 12;
      return sum + yearlyAmount;
    }, 0);
  }, [incomes]);

  // Very simplified 2024 US Tax Brackets (for estimation purposes only)
  const calculateTaxes = (income: number, status: 'single' | 'married') => {
    const standardDeduction = status === 'single' ? 14600 : 29200;
    const taxableIncome = Math.max(0, income - standardDeduction);
    
    let tax = 0;
    let brackets = [];

    if (status === 'single') {
      brackets = [
        { limit: 11600, rate: 0.10 },
        { limit: 47150, rate: 0.12 },
        { limit: 100525, rate: 0.22 },
        { limit: 191950, rate: 0.24 },
        { limit: 243725, rate: 0.32 },
        { limit: 609350, rate: 0.35 },
        { limit: Infinity, rate: 0.37 }
      ];
    } else {
      brackets = [
        { limit: 23200, rate: 0.10 },
        { limit: 94300, rate: 0.12 },
        { limit: 201050, rate: 0.22 },
        { limit: 383900, rate: 0.24 },
        { limit: 487450, rate: 0.32 },
        { limit: 731200, rate: 0.35 },
        { limit: Infinity, rate: 0.37 }
      ];
    }

    let remainingIncome = taxableIncome;
    let previousLimit = 0;

    for (const bracket of brackets) {
      const taxableInThisBracket = Math.min(remainingIncome, bracket.limit - previousLimit);
      if (taxableInThisBracket > 0) {
        tax += taxableInThisBracket * bracket.rate;
        remainingIncome -= taxableInThisBracket;
      }
      previousLimit = bracket.limit;
      if (remainingIncome <= 0) break;
    }

    // FICA (Social Security + Medicare) roughly 7.65% for W2, 15.3% for self-employed
    // Assuming a mix or standard W2 for this simple estimator
    const ficaTax = income * 0.0765;

    return {
      taxableIncome,
      federalTax: tax,
      ficaTax,
      totalTax: tax + ficaTax,
      effectiveRate: income > 0 ? ((tax + ficaTax) / income) * 100 : 0
    };
  };

  const taxEstimate = calculateTaxes(annualIncome, filingStatus);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#FAFAFA]">Tax Estimator</h1>
          <p className="text-sm text-zinc-400 mt-1">A rough estimate of your annual tax liability based on your recorded income.</p>
        </div>
        <div className="flex bg-[#141414] border border-[#262626] rounded-lg p-1">
          <button
            onClick={() => setFilingStatus('single')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              filingStatus === 'single' ? 'bg-[#262626] text-[#FAFAFA]' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Single
          </button>
          <button
            onClick={() => setFilingStatus('married')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              filingStatus === 'married' ? 'bg-[#262626] text-[#FAFAFA]' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Married
          </button>
        </div>
      </div>

      <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
        <p className="text-sm text-indigo-200/70">
          <strong>Disclaimer:</strong> This is a highly simplified estimation using standard deductions and federal brackets. It does not account for state taxes, local taxes, specific deductions, credits, or self-employment tax nuances. Always consult a tax professional for accurate advice.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Estimate Card */}
        <div className="lg:col-span-2 bg-[#141414] rounded-lg border border-[#262626] p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-indigo-500/20 rounded-full flex items-center justify-center border border-indigo-500/30">
              <Calculator className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#FAFAFA]">Estimated Annual Taxes</h2>
              <p className="text-sm text-zinc-500">Federal + FICA</p>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center py-8 border-b border-[#262626] mb-6">
            <p className="text-5xl font-bold tabular-nums text-red-400 mb-2">
              ${taxEstimate.totalTax.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </p>
            <p className="text-zinc-400">
              Effective Tax Rate: <span className="font-medium text-[#FAFAFA]">{taxEstimate.effectiveRate.toFixed(1)}%</span>
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-zinc-400">Gross Annual Income</span>
              <span className="font-medium text-[#FAFAFA]">${annualIncome.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
            </div>
            <div className="flex justify-between items-center text-emerald-400">
              <span>Standard Deduction</span>
              <span>-${(filingStatus === 'single' ? 14600 : 29200).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center pt-4 border-t border-[#262626]">
              <span className="text-zinc-400">Taxable Income</span>
              <span className="font-medium text-[#FAFAFA]">${taxEstimate.taxableIncome.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
            </div>
          </div>
        </div>

        {/* Breakdown Card */}
        <div className="bg-[#141414] rounded-lg border border-[#262626] p-6">
          <h3 className="text-base font-semibold text-[#FAFAFA] mb-6">Tax Breakdown</h3>
          
          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-end mb-2">
                <span className="text-sm text-zinc-400">Federal Income Tax</span>
                <span className="font-medium text-[#FAFAFA]">${taxEstimate.federalTax.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
              </div>
              <div className="w-full bg-[#262626] rounded-full h-2">
                <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${(taxEstimate.federalTax / taxEstimate.totalTax) * 100}%` }}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-end mb-2">
                <span className="text-sm text-zinc-400">FICA (SS & Medicare)</span>
                <span className="font-medium text-[#FAFAFA]">${taxEstimate.ficaTax.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
              </div>
              <div className="w-full bg-[#262626] rounded-full h-2">
                <div className="bg-cyan-500 h-2 rounded-full" style={{ width: `${(taxEstimate.ficaTax / taxEstimate.totalTax) * 100}%` }}></div>
              </div>
            </div>

            <div className="pt-6 border-t border-[#262626]">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-zinc-300">Estimated Take-Home</span>
              </div>
              <p className="text-3xl font-bold tabular-nums text-emerald-400">
                ${(annualIncome - taxEstimate.totalTax).toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                ~${((annualIncome - taxEstimate.totalTax) / 12).toLocaleString('en-US', { maximumFractionDigits: 0 })} / month
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
