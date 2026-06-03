'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { DashboardStats } from '@/lib/api';
import { Users, UserCheck, AlertTriangle, CreditCard, Plus, CheckSquare, RefreshCw, Bell, Calendar, Phone } from 'lucide-react';

interface DashboardProps {
  onAddNewMember: () => void;
  onMarkAttendance: () => void;
  onRenewClick: () => void;
  onViewMember: (id: number) => void;
  refreshTrigger: number;
  onRefresh: () => void;
  onViewImage?: (url: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onAddNewMember,
  onMarkAttendance,
  onRenewClick,
  onViewMember,
  refreshTrigger,
  onRefresh,
  onViewImage,
}) => {
  const [data, setData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState<number | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await api.getDashboardStats();
      setData(res);
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [refreshTrigger]);

  const handlePay = async (id: number) => {
    setPayingId(id);
    try {
      await api.payPayment(id);
      fetchDashboardData();
      onRefresh();
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to record payment');
    } finally {
      setPayingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  if (loading || !data) {
    return (
      <div className="py-20 text-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-sm text-muted-foreground mt-4 font-semibold">Loading dashboard intelligence...</p>
      </div>
    );
  }

  const { stats, alerts } = data;

  return (
    <div className="space-y-8">

      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <h2 className="text-xl font-bold text-foreground">Fitness Analytics Dashboard</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Real-time indicators and management tools</p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={onAddNewMember}
            className="bg-primary text-primary-foreground font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 hover:opacity-95 shadow-md shadow-primary/20 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Add New Member
          </button>
          <button
            onClick={onMarkAttendance}
            className="bg-secondary text-foreground hover:bg-secondary-foreground/10 border border-border font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <CheckSquare className="h-4 w-4" />
            Mark Attendance
          </button>
          <button
            onClick={onRenewClick}
            className="bg-secondary text-foreground hover:bg-secondary-foreground/10 border border-border font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" />
            Renew Membership
          </button>
        </div>
      </div>

      {/* Statistics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">

        <div className="bg-card border border-border p-5 rounded-2xl flex items-center justify-between shadow-sm group">
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider block">Total Members</span>
            <span className="text-3xl font-black text-foreground block">{stats.total}</span>
          </div>
          <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
            <Users className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-card border border-border p-5 rounded-2xl flex items-center justify-between shadow-sm group">
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider block">Active Members</span>
            <span className="text-3xl font-black text-foreground block">{stats.active}</span>
          </div>
          <div className="h-12 w-12 rounded-xl bg-green-500/10 border border-green-500/20 text-green-500 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
            <UserCheck className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-card border border-border p-5 rounded-2xl flex items-center justify-between shadow-sm group">
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider block">Expired Plans</span>
            <span className="text-3xl font-black text-foreground block">{stats.expired}</span>
          </div>
          <div className="h-12 w-12 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
            <AlertTriangle className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-card border border-border p-5 rounded-2xl flex items-center justify-between shadow-sm group">
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider block">Pending Fees</span>
            <span className="text-3xl font-black text-foreground block">{stats.pendingPayments}</span>
          </div>
          <div className="h-12 w-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
            <CreditCard className="h-5 w-5" />
          </div>
        </div>

      </div>

      {/* ALERTS SECTION */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Expired Memberships */}
        <div className="xl:col-span-2 bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-red-500">
            <Bell className="h-5 w-5 animate-bounce" />
            <h3 className="text-sm font-bold text-foreground">Expired Memberships ({alerts.expired.length})</h3>
          </div>

          <div className="overflow-x-auto">
            {alerts.expired.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-xs">No active membership expirations logged.</div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-secondary/40 border-b border-border text-muted-foreground font-bold uppercase tracking-wider">
                    <th className="py-2.5 px-4">Member Name</th>
                    <th className="py-2.5 px-4">Phone Number</th>
                    <th className="py-2.5 px-4">Expiry Date</th>
                    <th className="py-2.5 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-medium">
                  {alerts.expired.slice(0, 5).map((m) => (
                    <tr key={m.id} className="hover:bg-secondary/10 transition-colors">
                      <td className="py-2 px-4">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full overflow-hidden border border-border bg-secondary/50 flex items-center justify-center flex-shrink-0">
                            {m.photo ? (
                              <img
                                src={m.photo}
                                className="h-full w-full object-cover cursor-zoom-in"
                                alt="Expired member profile"
                                onClick={(e) => { e.stopPropagation(); onViewImage?.(m.photo!); }}
                              />
                            ) : (
                              <span className="text-[8px] font-black text-muted-foreground">
                                {m.name.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <button onClick={() => onViewMember(m.id)} className="font-bold text-foreground hover:underline text-left cursor-pointer">
                            {m.name}
                          </button>
                        </div>
                      </td>
                      <td className="py-2 px-4 text-muted-foreground">{m.phone || '—'}</td>
                      <td className="py-2 px-4 text-red-500 font-bold">{formatDate(m.expiry_date)}</td>
                      <td className="py-2 px-4">
                        <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-500 font-bold border border-red-500/20">Expired</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Expiring Soon */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-amber-500">
            <Calendar className="h-5 w-5" />
            <h3 className="text-sm font-bold text-foreground">Expiring Soon (7 days) ({alerts.expiringSoon.length})</h3>
          </div>

          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
            {alerts.expiringSoon.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-xs">No memberships expiring within 7 days.</div>
            ) : (
              alerts.expiringSoon.map((m) => (
                <div
                  key={m.id}
                  onClick={() => onViewMember(m.id)}
                  className="p-3 bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/15 rounded-xl cursor-pointer transition-all flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full overflow-hidden border border-border bg-secondary/50 flex items-center justify-center flex-shrink-0">
                      {m.photo ? (
                        <img
                          src={m.photo}
                          className="h-full w-full object-cover cursor-zoom-in"
                          alt="Expiring member profile"
                          onClick={(e) => { e.stopPropagation(); onViewImage?.(m.photo!); }}
                        />
                      ) : (
                        <span className="text-[9px] font-black text-muted-foreground">
                          {m.name.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="space-y-0.5">
                      <span className="font-bold text-foreground block">{m.name}</span>
                      <span className="text-muted-foreground flex items-center gap-1 font-semibold">
                        <Phone className="h-3 w-3" />
                        {m.phone || 'No phone'}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-amber-500 font-bold block">{formatDate(m.expiry_date)}</span>
                    <span className="text-[10px] text-muted-foreground font-semibold">Expiring soon</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pending Fee Payments */}
        <div className="xl:col-span-3 bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-amber-500">
            <CreditCard className="h-5 w-5" />
            <h3 className="text-sm font-bold text-foreground">Pending Fee Invoices ({alerts.pendingPayments.length})</h3>
          </div>

          <div className="overflow-x-auto">
            {alerts.pendingPayments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-xs">No pending or overdue payment fees.</div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-secondary/40 border-b border-border text-muted-foreground font-bold uppercase tracking-wider">
                    <th className="py-2.5 px-4">Member Name</th>
                    <th className="py-2.5 px-4">Phone</th>
                    <th className="py-2.5 px-4">Plan</th>
                    <th className="py-2.5 px-4">Amount</th>
                    <th className="py-2.5 px-4">Due Date</th>
                    <th className="py-2.5 px-4">Invoice Status</th>
                    <th className="py-2.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-medium">
                  {alerts.pendingPayments.slice(0, 5).map((p) => (
                    <tr key={p.id} className="hover:bg-secondary/10 transition-colors">
                      <td className="py-2 px-4">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full overflow-hidden border border-border bg-secondary/50 flex items-center justify-center flex-shrink-0">
                            {p.member_photo ? (
                              <img
                                src={p.member_photo}
                                className="h-full w-full object-cover cursor-zoom-in"
                                alt="Pending payment member profile"
                                onClick={(e) => { e.stopPropagation(); onViewImage?.(p.member_photo!); }}
                              />
                            ) : (
                              <span className="text-[8px] font-black text-muted-foreground">
                                {p.member_name ? p.member_name.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase() : ''}
                              </span>
                            )}
                          </div>
                          <button onClick={() => onViewMember(p.member_id)} className="font-bold text-foreground hover:underline text-left cursor-pointer">
                            {p.member_name}
                          </button>
                        </div>
                      </td>
                      <td className="py-2 px-4 text-muted-foreground">{p.phone || '—'}</td>
                      <td className="py-2 px-4 text-foreground">{p.plan_duration || '—'}</td>
                      <td className="py-2 px-4 text-foreground font-extrabold">
                        <span className="text-primary font-black mr-0.5">₹</span>
                        {p.amount.toLocaleString('en-IN')}
                      </td>
                      <td className="py-2 px-4 text-muted-foreground font-bold">{formatDate(p.due_date)}</td>
                      <td className="py-2 px-4">
                        <span className={`px-2 py-0.5 rounded font-bold border ${
                          p.payment_status === 'Overdue'
                            ? 'bg-red-500/10 text-red-500 border-red-500/20'
                            : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                        }`}>
                          {p.payment_status}
                        </span>
                      </td>
                      <td className="py-2 px-4 text-right">
                        <button
                          onClick={() => handlePay(p.id)}
                          disabled={payingId === p.id}
                          className="bg-primary text-primary-foreground text-[10px] font-bold px-2.5 py-1 rounded hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                          {payingId === p.id ? 'Saving...' : 'Mark Paid'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
