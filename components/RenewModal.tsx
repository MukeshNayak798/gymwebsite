'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { Member } from '@/lib/api';
import { X, Calendar, Activity, Check } from 'lucide-react';

interface RenewModalProps {
  member: Member;
  onClose: () => void;
  onRenewed: () => void;
}

export const RenewModal: React.FC<RenewModalProps> = ({ member, onClose, onRenewed }) => {
  const [planDuration, setPlanDuration] = useState('');
  const [planType, setPlanType] = useState('');
  const [payNow, setPayNow] = useState(true);
  const [renewalDate, setRenewalDate] = useState(new Date().toISOString().split('T')[0]);
  const [expiryDate, setExpiryDate] = useState('');
  const [amount, setAmount] = useState(1999);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const getPlanAmount = (type: string, duration: string) => {
    if (type === 'Plan 2') {
      switch (duration) {
        case '1 Month': return 1499;
        case '3 Months': return 3000;
        case '6 Months': return 5999;
        case '12 Months': return 7999;
        default: return 1499;
      }
    } else {
      switch (duration) {
        case '1 Month': return 1999;
        case '3 Months': return 4500;
        case '6 Months': return 6999;
        case '12 Months': return 9999;
        default: return 1999;
      }
    }
  };

  const getPlanRegularAmount = (type: string, duration: string) => {
    if (type === 'Plan 2') {
      switch (duration) {
        case '1 Month': return 2000;
        case '3 Months': return 3500;
        case '6 Months': return 7000;
        case '12 Months': return 12000;
        default: return 2000;
      }
    } else {
      switch (duration) {
        case '1 Month': return 3000;
        case '3 Months': return 7000;
        case '6 Months': return 9000;
        case '12 Months': return 15000;
        default: return 3000;
      }
    }
  };

  useEffect(() => {
    if (!renewalDate || !planType || !planDuration) return;

    const oldParts = member.expiry_date.split('-');
    const oldExpiry = new Date(Date.UTC(parseInt(oldParts[0], 10), parseInt(oldParts[1], 10) - 1, parseInt(oldParts[2], 10)));

    const renParts = renewalDate.split('-');
    const renewal = new Date(Date.UTC(parseInt(renParts[0], 10), parseInt(renParts[1], 10) - 1, parseInt(renParts[2], 10)));

    const baseDate = oldExpiry > renewal && member.status !== 'Expired' ? oldExpiry : renewal;

    let months = 1;
    if (planDuration === '3 Months') months = 3;
    else if (planDuration === '6 Months') months = 6;
    else if (planDuration === '12 Months') months = 12;

    const newExpiry = new Date(baseDate.getTime());
    newExpiry.setUTCMonth(newExpiry.getUTCMonth() + months);

    const yyyy = newExpiry.getUTCFullYear();
    const mm = String(newExpiry.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(newExpiry.getUTCDate()).padStart(2, '0');
    setExpiryDate(`${yyyy}-${mm}-${dd}`);
    setAmount(getPlanAmount(planType, planDuration));
  }, [planDuration, renewalDate, planType, member]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      await api.renewMember(member.id, {
        plan_type: planType,
        plan_duration: planDuration,
        pay_now: payNow,
        renewed_on: renewalDate,
      });
      onRenewed();
      onClose();
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to renew membership. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden rounded-2xl bg-card shadow-2xl border border-border animate-scale-in"
      >
        <div className="flex items-center justify-between p-6 pb-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-bold text-foreground">Renew Membership</h3>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">

          <div className="p-3 bg-secondary/50 rounded-xl border border-border flex items-center gap-3">
            <div className="h-10 w-10 rounded-full overflow-hidden border border-border bg-secondary flex items-center justify-center flex-shrink-0">
              {member.photo ? (
                <img src={member.photo} className="h-full w-full object-cover" alt="" />
              ) : (
                <span className="text-xs font-black text-muted-foreground">
                  {member.name.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-muted-foreground font-bold tracking-wider">Renewing For</div>
              <div className="font-bold text-foreground truncate">{member.name}</div>
              <div className="text-xs text-muted-foreground mt-0.5 flex justify-between font-semibold">
                <span>Current Plan: {member.plan_duration}</span>
                <span>Current Expiry: {formatDate(member.expiry_date)}</span>
              </div>
            </div>
          </div>

          {error && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl">{error}</div>
          )}

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1">RENEWAL START DATE</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-3 flex items-center text-muted-foreground">
                <Calendar className="h-4 w-4" />
              </span>
              <input
                type="date"
                required
                value={renewalDate}
                onChange={(e) => setRenewalDate(e.target.value)}
                className="w-full bg-secondary border border-border rounded-xl py-2.5 pl-10 pr-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">SELECT PLAN TYPE</label>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {['Plan 1', 'Plan 2'].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => { setPlanType(p); setPlanDuration(''); }}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                    planType === p
                      ? 'border-primary bg-primary/10 text-foreground ring-2 ring-primary/20 shadow-md shadow-primary/10 font-bold'
                      : 'border-border bg-secondary/20 text-muted-foreground hover:bg-secondary'
                  }`}
                >
                  {planType === p && (
                    <span className="absolute top-1 right-1 h-3.5 w-3.5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[9px] font-bold">✓</span>
                  )}
                  <span className="text-[9px] font-black tracking-wider uppercase text-muted-foreground">{p}</span>
                  <span className="text-xs font-black mt-1 text-foreground">{p === 'Plan 1' ? 'Premium Plan' : 'Standard Plan'}</span>
                  <span className="text-[9px] text-muted-foreground mt-0.5">{p === 'Plan 1' ? 'From ₹1,999' : 'From ₹1,499'}</span>
                </button>
              ))}
            </div>
          </div>

          {planType !== '' && (
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-2">SELECT MEMBERSHIP DURATION & FEE STRUCTURE</label>
              <div className="grid grid-cols-2 gap-2.5">
                {['1 Month', '3 Months', '6 Months', '12 Months'].map(duration => {
                  const regular = getPlanRegularAmount(planType, duration);
                  const offer = getPlanAmount(planType, duration);
                  const savings = regular - offer;
                  const isSelected = planDuration === duration;

                  return (
                    <button
                      key={duration}
                      type="button"
                      onClick={() => setPlanDuration(duration)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden ${
                        isSelected
                          ? 'border-primary bg-primary/10 text-foreground ring-2 ring-primary/15 font-bold'
                          : 'border-border bg-secondary/10 hover:bg-secondary text-muted-foreground'
                      }`}
                    >
                      <div className="flex justify-between items-center w-full">
                        <span className="text-[11px] font-bold text-foreground">{duration}</span>
                        {isSelected && <Check className="h-3 w-3 text-primary stroke-[3]" />}
                      </div>
                      <div className="mt-1 text-sm font-black text-foreground">₹{offer.toLocaleString('en-IN')}</div>
                      <div className="text-[9px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                        <span>Regular:</span>
                        <span className="line-through">₹{regular.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="mt-2 text-[8px] font-black uppercase tracking-wider text-primary bg-primary/10 px-1 py-0.5 rounded self-start">
                        Save ₹{savings.toLocaleString('en-IN')}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {planType !== '' && planDuration !== '' && (
            <>
              <div className="p-4 bg-primary/5 rounded-xl border border-primary/20 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">New Expiry Date:</span>
                  <span className="font-semibold text-foreground">{formatDate(expiryDate)}</span>
                </div>
                <div className="flex justify-between text-sm items-center border-t border-primary/10 pt-2">
                  <span className="text-muted-foreground">Regular Price:</span>
                  <span className="text-xs font-semibold text-muted-foreground line-through">₹{getPlanRegularAmount(planType, planDuration).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-sm items-center">
                  <span className="text-muted-foreground font-bold text-primary">Plan Cost (Offer):</span>
                  <span className="text-lg font-black text-foreground">₹{amount.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 py-1">
                <input
                  type="checkbox"
                  id="payNow"
                  checked={payNow}
                  onChange={(e) => setPayNow(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary/40"
                />
                <label htmlFor="payNow" className="text-sm text-foreground font-medium cursor-pointer select-none">
                  Mark fee as Paid immediately
                </label>
              </div>
            </>
          )}
        </div>

        <div className="flex flex-col gap-2 p-6 border-t border-border bg-secondary/15 flex-shrink-0">
          {(planType === '' || planDuration === '') && (
            <p className="text-[10px] text-destructive font-black tracking-wider text-center uppercase">
              Please select a plan type and duration to proceed
            </p>
          )}
          <div className="flex items-center gap-3">
            <button type="button" onClick={onClose} className="flex-1 bg-secondary text-foreground hover:bg-secondary-foreground/10 rounded-xl py-2.5 font-semibold text-sm transition-colors border border-border cursor-pointer">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || planType === '' || planDuration === ''}
              className="flex-1 bg-primary text-primary-foreground hover:opacity-90 rounded-xl py-2.5 font-bold text-sm transition-all shadow-md shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? 'Proceeding...' : 'Proceed'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
