import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Filter, MoreHorizontal, Receipt, Edit, CheckCircle, Trash2 } from 'lucide-react';
import { Menu, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { useStore } from '../store/useStore';
import { toast } from 'sonner';

export default function Bills() {
  const { bills, markBillPaid, deleteBill } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredBills = useMemo(() => {
    return bills.filter((bill) => {
      const matchesSearch = bill.biller.toLowerCase().includes(searchQuery.toLowerCase()) || bill.category.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || bill.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [bills, searchQuery, statusFilter]);

  const handleMarkPaid = (id: string) => {
    markBillPaid(id);
    toast.success('Bill marked as paid');
  };

  const handleDelete = (id: string) => {
    deleteBill(id);
    toast.success('Bill deleted successfully');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#FAFAFA]">Bills</h1>
          <p className="text-sm text-zinc-400 mt-1">Manage and track your recurring payments.</p>
        </div>
        <Link to="/bills/add" className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-md text-sm font-medium transition-colors flex items-center gap-2 self-start sm:self-auto focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0A0A0A] focus:ring-indigo-500">
          <Plus className="w-4 h-4" />
          Add Bill
        </Link>
      </div>

      {bills.length === 0 ? (
        <div className="bg-[#141414] rounded-lg border border-[#262626] border-dashed py-20 px-6 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 border border-[#262626] rounded-full flex items-center justify-center mb-4">
            <Receipt className="w-8 h-8 text-zinc-500" />
          </div>
          <h2 className="text-xl font-semibold tracking-tight text-[#FAFAFA] mb-2">No bills added yet</h2>
          <p className="text-zinc-400 max-w-md mb-8">
            Keep track of your recurring payments, subscriptions, and utilities all in one place. Add your first bill to get started.
          </p>
          <Link to="/bills/add" className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-md text-sm font-medium transition-colors flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0A0A0A] focus:ring-indigo-500">
            <Plus className="w-5 h-5" />
            Add Your First Bill
          </Link>
        </div>
      ) : (
        <>
          {/* Filters and Search */}
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div className="relative max-w-md w-full">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-zinc-500" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-[#262626] rounded-md leading-5 bg-[#141414] text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors"
                placeholder="Search bills..."
              />
            </div>
            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="block w-full pl-3 pr-10 py-2 text-base border-[#262626] focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md border bg-[#141414] text-zinc-200"
              >
                <option value="all">All Statuses</option>
                <option value="upcoming">Upcoming</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
          </div>

          {/* Data Table */}
          <div className="bg-[#141414] rounded-lg border border-[#262626] overflow-hidden">
            {filteredBills.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                <div className="w-16 h-16 border border-[#262626] rounded-full flex items-center justify-center mb-4">
                  <Search className="w-8 h-8 text-zinc-500" />
                </div>
                <h3 className="text-lg font-semibold tracking-tight text-[#FAFAFA]">No matching bills found</h3>
                <p className="mt-1 text-sm text-zinc-400 max-w-sm">
                  No bills match your current search or filter criteria. Try adjusting your filters.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                  }}
                  className="mt-6 px-4 py-2 bg-transparent border border-[#262626] text-zinc-300 hover:bg-[#1C1C1C] rounded-md text-sm font-medium transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
              <thead className="bg-[#0A0A0A] border-b border-[#1F1F1F]">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Biller</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Due Date</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Frequency</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-zinc-500 uppercase tracking-wider">Amount</th>
                  <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="bg-[#141414] divide-y divide-[#1F1F1F]">
                {filteredBills.map((bill) => (
                  <tr key={bill.id} className="hover:bg-[#1C1C1C] transition-colors">
                    <td className="px-6 py-3 whitespace-nowrap">
                      <div className="text-sm font-medium text-[#FAFAFA]">{bill.biller}</div>
                      <div className="text-sm text-zinc-500">{bill.category}</div>
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center text-sm font-medium ${
                        bill.status === 'overdue' ? 'text-[#EF4444]' :
                        bill.status === 'paid' ? 'text-[#22C55E]' :
                        'text-zinc-400'
                      }`}>
                        {bill.status.charAt(0).toUpperCase() + bill.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm text-[#FAFAFA]">{bill.dueDate}</td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm text-zinc-400">{bill.frequency}</td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm text-[#FAFAFA] text-right font-bold tabular-nums">
                      ${bill.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-right text-sm font-medium">
                      <Menu as="div" className="relative inline-block text-left">
                        <div>
                          <Menu.Button className="flex items-center text-zinc-500 hover:text-zinc-300 focus:outline-none rounded-md p-1">
                            <span className="sr-only">Open options</span>
                            <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
                          </Menu.Button>
                        </div>

                        <Transition
                          as={Fragment}
                          enter="transition ease-out duration-100"
                          enterFrom="transform opacity-0 scale-95"
                          enterTo="transform opacity-100 scale-100"
                          leave="transition ease-in duration-75"
                          leaveFrom="transform opacity-100 scale-100"
                          leaveTo="transform opacity-0 scale-95"
                        >
                          <Menu.Items className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-xl bg-[#141414] border border-[#262626] focus:outline-none z-10 py-1">
                            <div className="py-1">
                              {bill.status !== 'paid' && (
                                <Menu.Item>
                                  {({ active }) => (
                                    <button
                                      onClick={() => handleMarkPaid(bill.id)}
                                      className={`${active ? 'bg-[#1C1C1C] text-zinc-200' : 'text-zinc-400'} group flex items-center px-4 py-2 text-sm w-full`}
                                    >
                                      <CheckCircle className="mr-3 h-4 w-4 text-zinc-500" aria-hidden="true" />
                                      Mark as Paid
                                    </button>
                                  )}
                                </Menu.Item>
                              )}
                              <Menu.Item>
                                {({ active }) => (
                                  <Link
                                    to={`/bills/edit/${bill.id}`}
                                    className={`${active ? 'bg-[#1C1C1C] text-zinc-200' : 'text-zinc-400'} group flex items-center px-4 py-2 text-sm w-full`}
                                  >
                                    <Edit className="mr-3 h-4 w-4 text-zinc-500" aria-hidden="true" />
                                    Edit
                                  </Link>
                                )}
                              </Menu.Item>
                              <Menu.Item>
                                {({ active }) => (
                                  <button
                                    onClick={() => handleDelete(bill.id)}
                                    className={`${active ? 'bg-[#1C1C1C] text-[#EF4444]' : 'text-[#7F1D1D]'} group flex items-center px-4 py-2 text-sm w-full`}
                                  >
                                    <Trash2 className="mr-3 h-4 w-4 text-current" aria-hidden="true" />
                                    Delete
                                  </button>
                                )}
                              </Menu.Item>
                            </div>
                          </Menu.Items>
                        </Transition>
                      </Menu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
