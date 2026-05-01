/**
 * Tax Calculation Constants
 * Updated annually for tax year compliance
 * 
 * Source: IRS Publication 17, Tax Year 2024
 * Last Updated: 2026-04-30
 */

export const TAX_YEAR_2024 = {
  // Standard Deduction amounts (IRS)
  standardDeduction: {
    single: 14600,
    marriedFilingJointly: 29200,
    headOfHousehold: 21900,
    marriedFilingSeparately: 14600,
  },

  // Self-Employment Tax (Schedule SE)
  selfEmploymentTax: {
    // Combined Social Security (12.4%) + Medicare (2.9%)
    rate: 0.153,
    // Net earnings from self-employment factor
    netEarningsFactor: 0.9235,
  },

  // Social Security wage base limit (2024)
  socialSecurityWageBase: 168600,

  // Additional Medicare Tax threshold
  additionalMedicareTax: {
    threshold: {
      single: 200000,
      marriedFilingJointly: 250000,
      marriedFilingSeparately: 125000,
    },
    rate: 0.009, // 0.9%
  },

  // Estimated tax payment safe harbor percentages
  estimatedTaxSafeHarbor: {
    // Pay 90% of current year tax OR 100% of prior year tax
    currentYearPercentage: 0.90,
    priorYearPercentage: 1.00,
  },

  // General tax reserve recommendation (for UI guidance)
  recommendedReservePercentage: 0.30, // 30% for self-employed
};

// Helper functions for common calculations
export const calculateStandardDeduction = (filingStatus: keyof typeof TAX_YEAR_2024.standardDeduction): number => {
  return TAX_YEAR_2024.standardDeduction[filingStatus];
};

export const calculateSelfEmploymentTax = (netEarnings: number): number => {
  const taxableEarnings = netEarnings * TAX_YEAR_2024.selfEmploymentTax.netEarningsFactor;
  return taxableEarnings * TAX_YEAR_2024.selfEmploymentTax.rate;
};
