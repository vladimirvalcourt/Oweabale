import React from 'react';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { formatCurrency } from '@/lib/utils';

interface NetWorthCardProps {
  totalAssets: number;
  totalDebts: number;
}

/**
 * Displays the user's total net worth, assets, and debts.
 * Includes a visual trend indicator.
 */
export function NetWorthCard({ totalAssets, totalDebts }: NetWorthCardProps) {
  const netWorth = totalAssets - totalDebts;
  const isPositive = netWorth >= 0;

   return (
    <Card className="bg-gradient-to-br from-surface-elevated to-surface-raised text-content-primary border border-surface-border shadow-xl">
      <CardContent>
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-content-tertiary text-sm font-medium mb-1">Total Net Worth</p>
            <h2 className="text-4xl font-bold tracking-tight">
              {formatCurrency(netWorth)}
            </h2>
          </div>
          <div className={`p-3 rounded-full ${isPositive ? 'bg-brand-profit/15 text-brand-profit' : 'bg-brand-expense/15 text-brand-expense'}`}>
            {isPositive ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-surface-border">
          <div>
            <p className="text-content-tertiary text-xs font-medium mb-1 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-brand-profit" aria-hidden />
              Assets
            </p>
            <p className="text-lg font-semibold text-content-primary">{formatCurrency(totalAssets)}</p>
          </div>
          <div>
            <p className="text-content-tertiary text-xs font-medium mb-1 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-brand-expense" aria-hidden />
              Debts
            </p>
            <p className="text-lg font-semibold text-content-primary">{formatCurrency(totalDebts)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
