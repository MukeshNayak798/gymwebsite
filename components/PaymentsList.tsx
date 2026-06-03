'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { Payment } from '@/lib/api';
import { Search, CheckCircle, Clock, AlertCircle, Filter } from 'lucide-react';

interface PaymentsListProps {
  refreshTrigger: number;
  onPaymentProcessed: () => void;
}

export const PaymentsList: React.FC<PaymentsListProps> = ({ refreshTrigger, onPaymentProcessed }) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState<number | null>(null);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const res = await api.getPayments(search, statusFilter);
      setPayments(res);
    } catch (err) {
      console.error('Error fetching payments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter, refreshTrigger]);

  const handlePay = async (id: number) => {
    setPayingId(id);
    try {
      await api.payPayment(id);
      fetchPayments();
      onPaymentProcessed();
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to record payment');
    } finally {
      setPayingId(null);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const getStatusBadge = (status: Payment['payment_status']) => {
    switch (status) {
      case 'Paid':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-500/10 text-green-500 border border-green-500/20 flex items-center gap-1 w-max">
            <CheckCircle className="h-3 w-3" />Paid
          </span>
        );
      case 'Pending':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center gap-1 w-max">
            <Clock className="h-3 w-3" />Pending
          </span>
        );
      case 'Overdue':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500/10 text-red-500 border border-red-500/20 flex items-center gap-1 w-max animate-pulse">
            <AlertCircle className="h-3 w-3" />Overdue
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">

      <div>
        <h2 className="text-xl font-bold text-foreground">Fee Payments Tracker</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Track, audit, and log gym membership invoice payments</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="relative sm:col-span-2">
          <span className="absolute inset-y-0 left-3.5 flex items-center text-muted-foreground">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            placeholder="Search payments by member name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-card border border-border rounded-xl py-2.5 pl-11 pr-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all shadow-sm"
          />
        </div>

        <div className="relative">
          <span className="absolute inset-y-0 left-3.5 flex items-center text-muted-foreground pointer-events-none">
            <Filter className="h-4 w-4" />
          </span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-card border border-border rounded-xl py-2.5 pl-10 pr-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all shadow-sm appearance-none"
          >
            <option value="">All Invoices</option>
            <option value="Paid">Paid</option>
            <option value="Pending">Pending</option>
            <option value="Overdue">Overdue</option>
          </select>
          <span className="absolute inset-y-0 right-3.5 flex items-center text-muted-foreground pointer-events-none">▼</span>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-20 text-center">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-sm text-muted-foreground mt-4">Loading invoice ledger...</p>
            </div>
          ) : payments.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground text-sm">No fee invoices found.</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-secondary/40 border-b border-border text-xs font-bold tracking-wider text-muted-foreground uppercase">
                  <th className="py-4 px-6">Member Name</th>
                  <th className="py-4 px-6">Phone</th>
                  <th className="py-4 px-6">Plan Duration</th>
                  <th className="py-4 px-6">Amount</th>
                  <th className="py-4 px-6">Due Date</th>
                  <th className="py-4 px-6">Payment Date</th>
                  <th className="py-4 px-6">Invoice Status</th>
                  <th className="py-4 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-secondary/10 transition-colors">
                    <td className="py-3.5 px-6 font-bold text-foreground">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full overflow-hidden border border-border bg-secondary/50 flex items-center justify-center flex-shrink-0">
                          {p.member_photo ? (
                            <img src={p.member_photo} className="h-full w-full object-cover" alt="" />
                          ) : (
                            <span className="text-[10px] font-black text-muted-foreground">
                              {p.member_name ? p.member_name.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase() : ''}
                            </span>
                          )}
                        </div>
                        <span>{p.member_name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-6 text-muted-foreground">{p.phone || '—'}</td>
                    <td className="py-3.5 px-6 text-foreground">{p.plan_duration || '—'}</td>
                    <td className="py-3.5 px-6 font-extrabold text-foreground">
                      <span className="inline-flex items-center">
                        <span className="text-primary font-black mr-0.5">₹</span>
                        {p.amount.toLocaleString('en-IN')}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-muted-foreground font-semibold">{formatDate(p.due_date)}</td>
                    <td className="py-3.5 px-6 text-muted-foreground">{formatDate(p.payment_date)}</td>
                    <td className="py-3.5 px-6">{getStatusBadge(p.payment_status)}</td>
                    <td className="py-3.5 px-6 text-right">
                      {p.payment_status !== 'Paid' ? (
                        <button
                          onClick={() => handlePay(p.id)}
                          disabled={payingId === p.id}
                          className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1.5 rounded-xl hover:opacity-90 transition-opacity shadow-sm shadow-primary/10 disabled:opacity-50"
                        >
                          {payingId === p.id ? 'Updating...' : 'Mark Paid'}
                        </button>
                      ) : (
                        <span className="text-xs text-green-500 font-bold px-3 py-1.5">Processed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

    </div>
  );
};
