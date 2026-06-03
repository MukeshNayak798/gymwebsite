'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { Member, Payment, Renewal } from '@/lib/api';
import { X, Calendar, MapPin, User, Shield, Info, Activity, Check, Trash2, Edit2, RotateCw } from 'lucide-react';

interface MemberDetailsModalProps {
  memberId: number;
  onClose: () => void;
  onEdit: (member: Member) => void;
  onDelete: (id: number) => void;
  onRenew: (member: Member) => void;
  onUpdated: () => void;
  onViewImage?: (url: string) => void;
}

export const MemberDetailsModal: React.FC<MemberDetailsModalProps> = ({
  memberId,
  onClose,
  onEdit,
  onDelete,
  onRenew,
  onUpdated,
  onViewImage,
}) => {
  const [data, setData] = useState<{
    member: Member;
    payments: Payment[];
    renewals: Renewal[];
    attendance: Array<{ id: number; member_id: number; attendance_date: string; status: 'Present' | 'Absent' }>;
    attendancePercentage: number;
  } | null>(null);

  const [activeTab, setActiveTab] = useState<'profile' | 'payments' | 'attendance' | 'renewals'>('profile');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payingId, setPayingId] = useState<number | null>(null);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const res = await api.getMemberDetail(memberId);
      setData(res);
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to fetch member details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberId]);

  const handlePay = async (paymentId: number) => {
    setPayingId(paymentId);
    try {
      await api.payPayment(paymentId);
      await fetchDetails();
      onUpdated();
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to process payment');
    } finally {
      setPayingId(null);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-card border border-border p-6 rounded-2xl max-w-sm w-full text-center">
          <Info className="h-10 w-10 text-destructive mx-auto mb-2" />
          <h3 className="text-lg font-bold text-foreground">Error</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">{error || 'Something went wrong.'}</p>
          <button onClick={onClose} className="w-full bg-secondary py-2 text-foreground font-semibold rounded-xl">Close</button>
        </div>
      </div>
    );
  }

  const { member, payments, renewals, attendance, attendancePercentage } = data;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const getStatusBadge = (status: Member['status']) => {
    switch (status) {
      case 'Active': return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-500/10 text-green-500 border border-green-500/20">Active</span>;
      case 'Expiring Soon': return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">Expiring Soon</span>;
      case 'Expired': return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500/10 text-red-500 border border-red-500/20">Expired</span>;
      default: return null;
    }
  };

  const getPaymentStatusBadge = (status: Payment['payment_status']) => {
    switch (status) {
      case 'Paid': return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-500/10 text-green-500">Paid</span>;
      case 'Pending': return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-500">Pending</span>;
      case 'Overdue': return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-500/10 text-red-500">Overdue</span>;
      default: return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="h-full w-full max-w-2xl bg-card border-l border-border shadow-2xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="p-6 border-b border-border flex items-center justify-between bg-secondary/30">
          <div className="flex items-center gap-4">
            {member.photo ? (
              <img
                src={member.photo}
                className="h-12 w-12 rounded-full object-cover border border-primary/20 cursor-zoom-in"
                alt={`${member.name} profile`}
                onClick={() => onViewImage?.(member.photo!)}
              />
            ) : (
              <div className="h-12 w-12 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-lg">
                {member.name.split(' ').map(n => n[0]).join('')}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-foreground leading-none">{member.name}</h2>
                {getStatusBadge(member.status)}
              </div>
              <p className="text-sm text-muted-foreground mt-1">ID: #FLG-{member.id}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => { onClose(); onEdit(member); }} title="Edit Profile" className="p-2 text-muted-foreground hover:bg-secondary hover:text-foreground rounded-lg transition-colors border border-border">
              <Edit2 className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                if (confirm(`Are you sure you want to delete ${member.name}?`)) {
                  onDelete(member.id);
                  onClose();
                }
              }}
              title="Delete Member"
              className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors border border-red-500/20"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <button onClick={onClose} className="p-2 text-muted-foreground hover:bg-secondary hover:text-foreground rounded-lg transition-colors border border-border">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border bg-secondary/10 px-4">
          {(['profile', 'payments', 'attendance', 'renewals'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-semibold border-b-2 transition-all relative ${
                activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab === 'profile' ? 'Profile Details' : tab === 'payments' ? 'Payments' : tab === 'attendance' ? 'Attendance' : 'Renewal Log'}
              {tab === 'payments' && payments.some(p => p.payment_status !== 'Paid') && (
                <span className="absolute top-2 right-1.5 h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
              )}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase mb-3">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-secondary/30 border border-border rounded-xl flex items-center gap-3">
                    <User className="h-5 w-5 text-primary" />
                    <div>
                      <div className="text-xs text-muted-foreground">Age / Gender</div>
                      <div className="text-sm font-semibold text-foreground">{member.age} years • {member.gender}</div>
                    </div>
                  </div>
                  <div className="p-4 bg-secondary/30 border border-border rounded-xl flex items-center gap-3">
                    <Shield className="h-5 w-5 text-primary" />
                    <div>
                      <div className="text-xs text-muted-foreground">Phone Number</div>
                      <div className="text-sm font-semibold text-foreground">{member.phone || 'No phone provided'}</div>
                    </div>
                  </div>
                  <div className="p-4 bg-secondary/30 border border-border rounded-xl flex items-center gap-3 md:col-span-2">
                    <MapPin className="h-5 w-5 text-primary flex-shrink-0" />
                    <div>
                      <div className="text-xs text-muted-foreground">Home Address</div>
                      <div className="text-sm font-semibold text-foreground">{member.address || 'No address provided'}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase mb-3">Physical Stats & Metrics</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-secondary/30 border border-border rounded-xl text-center">
                    <div className="text-xs text-muted-foreground mb-1">HEIGHT</div>
                    <div className="text-2xl font-black text-foreground">{member.height ? `${member.height} cm` : '—'}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{member.height ? `${(member.height / 30.48).toFixed(1)} feet` : ''}</div>
                  </div>
                  <div className="p-4 bg-secondary/30 border border-border rounded-xl text-center">
                    <div className="text-xs text-muted-foreground mb-1">WEIGHT</div>
                    <div className="text-2xl font-black text-foreground">{member.weight ? `${member.weight} kg` : '—'}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{member.weight ? `${(member.weight * 2.20462).toFixed(1)} lbs` : ''}</div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase mb-3">Membership Details</h3>
                <div className="p-5 bg-gradient-to-br from-card to-secondary/30 border border-border rounded-2xl relative overflow-hidden">
                  <div className="absolute right-0 bottom-0 opacity-10 font-bold text-7xl translate-x-5 translate-y-5 select-none text-primary">FIT</div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {[
                      { label: 'PLAN CATEGORY', value: member.plan_type || 'Plan 1' },
                      { label: 'PLAN DURATION', value: member.plan_duration },
                      { label: 'JOIN DATE', value: formatDate(member.join_date) },
                      { label: 'EXPIRY DATE', value: formatDate(member.expiry_date) },
                      { label: 'ATTENDANCE', value: `${attendancePercentage}%`, className: 'text-primary' },
                    ].map(({ label, value, className }) => (
                      <div key={label}>
                        <div className="text-xs text-muted-foreground font-semibold">{label}</div>
                        <div className={`text-sm font-bold mt-1 ${className || 'text-foreground'}`}>{value}</div>
                      </div>
                    ))}
                  </div>

                  {member.status === 'Expired' && (
                    <div className="mt-5 border-t border-border pt-4 flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Membership has expired. Renew to activate again.</span>
                      <button
                        onClick={() => onRenew(member)}
                        className="bg-primary text-primary-foreground font-bold text-xs py-2 px-4 rounded-xl flex items-center gap-1.5 hover:opacity-95 shadow-md shadow-primary/20 transition-all"
                      >
                        <RotateCw className="h-3.5 w-3.5" />
                        Renew Now
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">Payment Invoice Records</h3>
                <span className="text-xs text-muted-foreground font-medium">Total Invoices: {payments.length}</span>
              </div>

              {payments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded-2xl">No payment invoices found for this member.</div>
              ) : (
                <div className="space-y-3">
                  {payments.map(p => (
                    <div key={p.id} className="p-4 bg-secondary/20 border border-border rounded-xl flex justify-between items-center">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-base font-bold text-foreground flex items-center">
                            <span className="text-primary mr-0.5">₹</span>
                            {p.amount.toLocaleString('en-IN')}
                          </span>
                          {getPaymentStatusBadge(p.payment_status)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Due Date: {formatDate(p.due_date)}
                          {p.payment_date && ` • Paid: ${formatDate(p.payment_date)}`}
                        </div>
                      </div>

                      {p.payment_status !== 'Paid' && (
                        <button
                          onClick={() => handlePay(p.id)}
                          disabled={payingId === p.id}
                          className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                          <Check className="h-3.5 w-3.5 font-bold" />
                          {payingId === p.id ? 'Saving...' : 'Mark Paid'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'attendance' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-secondary/30 border border-border rounded-xl text-center">
                  <div className="text-xs text-muted-foreground">Attendance Percentage</div>
                  <div className="text-3xl font-black text-primary mt-1">{attendancePercentage}%</div>
                </div>
                <div className="p-4 bg-secondary/30 border border-border rounded-xl text-center">
                  <div className="text-xs text-muted-foreground">Days Marked / Present</div>
                  <div className="text-3xl font-black text-foreground mt-1">
                    {attendance.length} <span className="text-sm font-semibold text-muted-foreground">days</span> • {attendance.filter(a => a.status === 'Present').length} <span className="text-sm font-semibold text-muted-foreground">present</span>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">Attendance History</h3>
                </div>
                {attendance.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded-2xl">No attendance records logged.</div>
                ) : (
                  <div className="border border-border rounded-xl overflow-hidden divide-y divide-border">
                    {attendance.map(a => (
                      <div key={a.id} className="px-4 py-2.5 flex justify-between items-center text-sm">
                        <span className="font-semibold text-foreground flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {formatDate(a.attendance_date)}
                        </span>
                        {a.status === 'Present' ? (
                          <div className="h-6 w-6 rounded-full bg-green-500 text-white flex items-center justify-center border border-green-500">
                            <Check className="h-3.5 w-3.5 stroke-[3]" />
                          </div>
                        ) : (
                          <div className="h-6 w-6 rounded-full bg-red-500 text-white flex items-center justify-center border border-red-500">
                            <X className="h-3.5 w-3.5 stroke-[3]" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'renewals' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">Renewal History Log</h3>

              {renewals.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded-2xl">No renewal records logged for this member.</div>
              ) : (
                <div className="space-y-3">
                  {renewals.map(r => (
                    <div key={r.id} className="p-4 bg-secondary/20 border border-border rounded-xl">
                      <div className="flex justify-between items-center text-sm font-bold text-foreground">
                        <span className="flex items-center gap-2">
                          <Activity className="h-4 w-4 text-primary" />
                          Renewed on {formatDate(r.renewed_on)}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-2 text-xs text-muted-foreground border-t border-border/50 pt-2">
                        <div>
                          <span>Old Expiry:</span>
                          <span className="font-semibold text-foreground ml-1">{formatDate(r.old_expiry_date)}</span>
                        </div>
                        <div>
                          <span>New Expiry:</span>
                          <span className="font-semibold text-foreground ml-1">{formatDate(r.new_expiry_date)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
