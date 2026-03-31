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
          <h1 className="text-2xl font-semibold text-gray-900">Bills</h1>
          <p className="text-sm text-gray-500 mt-1">Manage and track your recurring payments.</p>
        </div>
        <Link to="/bills/add" className="px-4 py-2 bg-[#28a745] hover:bg-[#218838] text-white rounded-md text-sm font-medium transition-colors shadow-sm flex items-center gap-2 self-start sm:self-auto focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#28a745]">
          <Plus className="w-4 h-4" />
          Add Bill
        </Link>
      </div>

      {bills.length === 0 ? (
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 border-dashed py-20 px-6 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-4">
            <Receipt className="w-8 h-8 text-[#28a745]" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No bills added yet</h2>
          <p className="text-gray-500 max-w-md mb-8">
            Keep track of your recurring payments, subscriptions, and utilities all in one place. Add your first bill to get started.
          </p>
          <Link to="/bills/add" className="px-6 py-3 bg-[#28a745] hover:bg-[#218838] text-white rounded-md text-sm font-medium transition-colors shadow-sm flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#28a745]">
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
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-[#28a745] focus:border-[#28a745] sm:text-sm transition-colors shadow-sm"
                placeholder="Search bills..."
              />
            </div>
            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-[#28a745] focus:border-[#28a745] sm:text-sm rounded-md shadow-sm border bg-white"
              >
                <option value="all">All Statuses</option>
                <option value="upcoming">Upcoming</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
          </div>

          {/* Data Table */}
          <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
            {filteredBills.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                  <Search className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900">No matching bills found</h3>
                <p className="mt-1 text-sm text-gray-500 max-w-sm">
                  No bills match your current search or filter criteria. Try adjusting your filters.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                  }}
                  className="mt-6 px-4 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md text-sm font-medium transition-colors shadow-sm"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Biller</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Frequency</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredBills.map((bill) => (
                  <tr key={bill.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{bill.biller}</div>
                      <div className="text-sm text-gray-500">{bill.category}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        bill.status === 'overdue' ? 'bg-red-50 text-red-700' :
                        bill.status === 'paid' ? 'bg-green-50 text-green-700' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {bill.status.charAt(0).toUpperCase() + bill.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{bill.dueDate}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{bill.frequency}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                      ${bill.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Menu as="div" className="relative inline-block text-left">
                        <div>
                          <Menu.Button className="flex items-center text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#28a745] rounded-full p-1">
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
                          <Menu.Items className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                            <div className="py-1">
                              {bill.status !== 'paid' && (
                                <Menu.Item>
                                  {({ active }) => (
                                    <button
                                      onClick={() => handleMarkPaid(bill.id)}
                                      className={`${active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'} group flex items-center px-4 py-2 text-sm w-full`}
                                    >
                                      <CheckCircle className="mr-3 h-4 w-4 text-green-500" aria-hidden="true" />
                                      Mark as Paid
                                    </button>
                                  )}
                                </Menu.Item>
                              )}
                              <Menu.Item>
                                {({ active }) => (
                                  <Link
                                    to={`/bills/edit/${bill.id}`}
                                    className={`${active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'} group flex items-center px-4 py-2 text-sm w-full`}
                                  >
                                    <Edit className="mr-3 h-4 w-4 text-gray-400 group-hover:text-gray-500" aria-hidden="true" />
                                    Edit
                                  </Link>
                                )}
                              </Menu.Item>
                              <Menu.Item>
                                {({ active }) => (
                                  <button
                                    onClick={() => handleDelete(bill.id)}
                                    className={`${active ? 'bg-gray-100 text-red-900' : 'text-red-700'} group flex items-center px-4 py-2 text-sm w-full`}
                                  >
                                    <Trash2 className="mr-3 h-4 w-4 text-red-400 group-hover:text-red-500" aria-hidden="true" />
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
