import React from 'react';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { Card, CardContent } from '../../../components/ui/Card';
import { formatCurrency } from '../../../lib/utils';

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
    <Card className="bg-gradient-to-br from-gray-900 to-gray-800 text-white border-none shadow-xl">
      <CardContent>
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-gray-400 text-sm font-medium mb-1">Total Net Worth</p>
            <h2 className="text-4xl font-bold tracking-tight">
              {formatCurrency(netWorth)}
            </h2>
          </div>
          <div className={`p-3 rounded-full ${isPositive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
            {isPositive ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-700/50">
          <div>
            <p className="text-gray-400 text-xs font-medium mb-1 flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-400"></div>
              Assets
            </p>
            <p className="text-lg font-semibold text-gray-100">{formatCurrency(totalAssets)}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs font-medium mb-1 flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-400"></div>
              Debts
            </p>
            <p className="text-lg font-semibold text-gray-100">{formatCurrency(totalDebts)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
