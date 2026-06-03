'use client';

import React, { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import type { Member } from '@/lib/api';
import { X, User, Phone, MapPin, Calendar, Scale, ArrowUpRight, Camera, Check } from 'lucide-react';

interface MemberFormProps {
  member?: Member | null;
  onClose: () => void;
  onSaved: () => void;
}

export const MemberForm: React.FC<MemberFormProps> = ({ member, onClose, onSaved }) => {
  const isEditing = !!member;

  const [name, setName] = useState('');
  const [age, setAge] = useState<number | ''>('');
  const [gender, setGender] = useState('Male');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [height, setHeight] = useState<number | ''>('');
  const [weight, setWeight] = useState<number | ''>('');
  const [joinDate, setJoinDate] = useState(new Date().toISOString().split('T')[0]);
  const [planDuration, setPlanDuration] = useState('1 Month');
  const [planType, setPlanType] = useState(member?.plan_type || '');
  const [payNow, setPayNow] = useState(true);
  const [expiryDate, setExpiryDate] = useState('');
  const [amount, setAmount] = useState(50);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [photo, setPhoto] = useState('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    setCameraError('');
    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 320, facingMode: 'user' } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      console.error(err);
      setCameraError('Unable to access camera. Please check permissions.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 320;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, 320, 320);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setPhoto(dataUrl);
        stopCamera();
      }
    }
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
    };
  }, []);

  useEffect(() => {
    if (member) {
      setName(member.name);
      setAge(member.age || '');
      setGender(member.gender || 'Male');
      setPhone(member.phone || '');
      setAddress(member.address || '');
      setHeight(member.height || '');
      setWeight(member.weight || '');
      setJoinDate(member.join_date);
      setPlanDuration(member.plan_duration);
      setPlanType(member.plan_type || 'Plan 1');
      setExpiryDate(member.expiry_date);
      setPhoto(member.photo || '');
    }
  }, [member]);

  const getPlanAmount = (type: string, duration: string) => {
    if (type === 'Plan 2') {
      switch (duration) { case '1 Month': return 1499; case '3 Months': return 3000; case '6 Months': return 5999; case '12 Months': return 7999; default: return 1499; }
    } else {
      switch (duration) { case '1 Month': return 1999; case '3 Months': return 4500; case '6 Months': return 6999; case '12 Months': return 9999; default: return 1999; }
    }
  };

  const getPlanRegularAmount = (type: string, duration: string) => {
    if (type === 'Plan 2') {
      switch (duration) { case '1 Month': return 2000; case '3 Months': return 3500; case '6 Months': return 7000; case '12 Months': return 12000; default: return 2000; }
    } else {
      switch (duration) { case '1 Month': return 3000; case '3 Months': return 7000; case '6 Months': return 9000; case '12 Months': return 15000; default: return 3000; }
    }
  };

  useEffect(() => {
    if (!joinDate) return;
    if (isEditing && member && member.join_date === joinDate && member.plan_duration === planDuration && member.plan_type === planType) {
      setExpiryDate(member.expiry_date);
      setAmount(getPlanAmount(planType, planDuration));
      return;
    }

    const parts = joinDate.split('-');
    if (parts.length !== 3) return;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const date = new Date(Date.UTC(year, month, day));
    let months = 1;
    if (planDuration === '3 Months') months = 3;
    else if (planDuration === '6 Months') months = 6;
    else if (planDuration === '12 Months') months = 12;
    date.setUTCMonth(date.getUTCMonth() + months);
    const yyyy = date.getUTCFullYear();
    const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(date.getUTCDate()).padStart(2, '0');
    setExpiryDate(`${yyyy}-${mm}-${dd}`);
    setAmount(getPlanAmount(planType, planDuration));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joinDate, planDuration, planType, isEditing, member]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    const payload = {
      name,
      age: age === '' ? 0 : Number(age),
      gender,
      phone,
      address,
      height: height === '' ? 0 : Number(height),
      weight: weight === '' ? 0 : Number(weight),
      join_date: joinDate,
      plan_type: planType,
      plan_duration: planDuration,
      photo: photo || undefined,
      ...(isEditing ? { expiry_date: expiryDate } : { pay_now: payNow }),
    };

    try {
      if (isEditing && member) {
        await api.updateMember(member.id, payload);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await api.createMember(payload as any);
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to save member details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <form onSubmit={handleSubmit} className="relative w-full max-w-lg bg-card rounded-2xl shadow-2xl border border-border animate-scale-in max-h-[90vh] flex flex-col overflow-hidden">

        <div className="flex items-center justify-between p-6 pb-4 border-b border-border flex-shrink-0">
          <h3 className="text-lg font-bold text-foreground">{isEditing ? 'Modify Member Profile' : 'Register New Member'}</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl">{error}</div>
          )}

          {/* Photo Section */}
          <div className="flex flex-col items-center justify-center p-4 bg-secondary/20 rounded-2xl border border-border">
            <h4 className="text-xs font-bold tracking-wider text-muted-foreground uppercase mb-3">Member Photo Profile</h4>
            <div className="relative h-32 w-32 rounded-full overflow-hidden border-2 border-primary bg-black/10 flex items-center justify-center shadow-inner">
              {photo ? (
                <img src={photo} className="h-full w-full object-cover" alt="Member profile preview" />
              ) : isCameraActive ? (
                <video ref={videoRef} autoPlay playsInline className="h-full w-full object-cover scale-x-[-1]" />
              ) : (
                <User className="h-14 w-14 text-muted-foreground" />
              )}
            </div>
            {cameraError && <p className="text-xs text-destructive mt-2 text-center font-medium">{cameraError}</p>}
            <div className="flex items-center gap-2 mt-4 flex-wrap justify-center">
              {photo ? (
                <button type="button" onClick={startCamera} className="bg-secondary text-foreground border border-border hover:bg-secondary-foreground/10 px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer">
                  <Camera className="h-3.5 w-3.5" />Retake Photo
                </button>
              ) : isCameraActive ? (
                <>
                  <button type="button" onClick={capturePhoto} className="bg-primary text-primary-foreground hover:opacity-90 px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-opacity shadow-sm shadow-primary/20 cursor-pointer">Capture Photo</button>
                  <button type="button" onClick={stopCamera} className="bg-secondary text-foreground border border-border hover:bg-secondary-foreground/10 px-4 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer">Cancel</button>
                </>
              ) : (
                <button type="button" onClick={startCamera} className="bg-primary text-primary-foreground hover:opacity-90 px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-opacity shadow-sm shadow-primary/20 cursor-pointer">
                  <Camera className="h-3.5 w-3.5" />Add Photo
                </button>
              )}
            </div>
          </div>

          {/* Personal Info */}
          <div>
            <h4 className="text-xs font-bold tracking-wider text-muted-foreground uppercase mb-3">1. Personal Information</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">FULL NAME *</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-3 flex items-center text-muted-foreground"><User className="h-4 w-4" /></span>
                  <input type="text" required placeholder="Alex Rivera" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-secondary border border-border rounded-xl py-2 pl-10 pr-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">AGE</label>
                  <input type="number" placeholder="28" min="1" max="120" value={age} onChange={(e) => setAge(e.target.value === '' ? '' : Number(e.target.value))} className="w-full bg-secondary border border-border rounded-xl py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">GENDER</label>
                  <select value={gender} onChange={(e) => setGender(e.target.value)} className="w-full bg-secondary border border-border rounded-xl py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all">
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">PHONE NUMBER</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-3 flex items-center text-muted-foreground"><Phone className="h-4 w-4" /></span>
                  <input type="tel" placeholder="+1 (555) 123-4567" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-secondary border border-border rounded-xl py-2 pl-10 pr-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">ADDRESS</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-3 pt-2 items-start flex text-muted-foreground"><MapPin className="h-4 w-4" /></span>
                  <textarea placeholder="742 Evergreen Terrace, Springfield" value={address} onChange={(e) => setAddress(e.target.value)} rows={2} className="w-full bg-secondary border border-border rounded-xl py-2 pl-10 pr-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all resize-none" />
                </div>
              </div>
            </div>
          </div>

          {/* Physical Metrics */}
          <div>
            <h4 className="text-xs font-bold tracking-wider text-muted-foreground uppercase mb-3">2. Physical Information</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">HEIGHT (CM)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-3 flex items-center text-muted-foreground"><ArrowUpRight className="h-4 w-4" /></span>
                  <input type="number" placeholder="180" min="50" max="250" value={height} onChange={(e) => setHeight(e.target.value === '' ? '' : Number(e.target.value))} className="w-full bg-secondary border border-border rounded-xl py-2 pl-10 pr-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">WEIGHT (KG)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-3 flex items-center text-muted-foreground"><Scale className="h-4 w-4" /></span>
                  <input type="number" placeholder="75" min="10" max="300" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value === '' ? '' : Number(e.target.value))} className="w-full bg-secondary border border-border rounded-xl py-2 pl-10 pr-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all" />
                </div>
              </div>
            </div>
          </div>

          {/* Membership Details */}
          <div>
            <h4 className="text-xs font-bold tracking-wider text-muted-foreground uppercase mb-3">3. Membership Details</h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              {[
                { key: 'Plan 1', label: 'Premium Gym Package', desc: 'Access to cardio floor, strength equipment, group fitness classes, steam room, and lockers.', price: '₹1,999' },
                { key: 'Plan 2', label: 'Standard Gym Package', desc: 'Access to core gym weights, standard fitness floor equipment, and lockers. Steam and cardio excluded.', price: '₹1,499' },
              ].map((plan) => (
                <button
                  key={plan.key}
                  type="button"
                  onClick={() => { setPlanType(plan.key); setPlanDuration('1 Month'); }}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden ${
                    planType === plan.key
                      ? 'border-primary bg-primary/10 text-foreground ring-2 ring-primary/20 shadow-md shadow-primary/10'
                      : 'border-border bg-secondary/20 text-muted-foreground hover:bg-secondary/40'
                  }`}
                >
                  {planType === plan.key && (
                    <span className="absolute top-2 right-2 h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">✓</span>
                  )}
                  <div>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase ${planType === plan.key ? 'bg-primary/25 text-foreground' : 'bg-secondary text-muted-foreground'}`}>
                      {plan.key} • {plan.key === 'Plan 1' ? 'Premium' : 'Standard'}
                    </span>
                    <h5 className="font-black text-sm mt-2 text-foreground">{plan.label}</h5>
                    <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">{plan.desc}</p>
                  </div>
                  <div className="mt-4 font-bold text-xs text-foreground">
                    Starts at <span className="text-sm font-black text-primary">{plan.price}</span> / mo
                  </div>
                </button>
              ))}
            </div>

            {planType === '' ? (
              <div className="p-6 border border-dashed border-border rounded-xl text-center text-sm text-muted-foreground bg-secondary/10">
                Please select a membership package above to view the detailed fee structure and duration options.
              </div>
            ) : (
              <div className="space-y-4 animate-fade-in">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-2">SELECT MEMBERSHIP DURATION & FEE STRUCTURE</label>
                  <div className="grid grid-cols-2 gap-3">
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
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden ${
                            isSelected ? 'border-primary bg-primary/10 text-foreground ring-2 ring-primary/15' : 'border-border bg-secondary/10 hover:bg-secondary text-muted-foreground'
                          }`}
                        >
                          <div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-bold text-foreground">{duration}</span>
                              {isSelected && <Check className="h-3.5 w-3.5 text-primary stroke-[3]" />}
                            </div>
                            <div className="mt-2 text-base font-black text-foreground">₹{offer.toLocaleString('en-IN')}</div>
                            <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                              <span>Regular:</span><span className="line-through">₹{regular.toLocaleString('en-IN')}</span>
                            </div>
                          </div>
                          <div className="mt-3 text-[9px] font-black uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded-md self-start">
                            Save ₹{savings.toLocaleString('en-IN')}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">JOIN DATE</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-3 flex items-center text-muted-foreground"><Calendar className="h-4 w-4" /></span>
                    <input type="date" required value={joinDate} onChange={(e) => setJoinDate(e.target.value)} className="w-full bg-secondary border border-border rounded-xl py-2.5 pl-10 pr-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all" />
                  </div>
                </div>

                <div className="p-4 bg-primary/5 rounded-xl border border-primary/20 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground font-semibold">Start Date:</span>
                    <span className="font-semibold text-foreground">{formatDate(joinDate)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground font-semibold">Calculated Expiry Date:</span>
                    <span className="font-semibold text-primary">{formatDate(expiryDate)}</span>
                  </div>
                  <div className="flex justify-between text-sm items-center border-t border-primary/10 pt-2">
                    <span className="text-muted-foreground font-semibold">Regular Price:</span>
                    <span className="text-xs font-bold text-muted-foreground line-through">₹{getPlanRegularAmount(planType, planDuration).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-sm items-center">
                    <span className="text-muted-foreground font-bold text-primary">Price Amount Due (Offer):</span>
                    <span className="text-lg font-black text-foreground">₹{amount.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {!isEditing && (
            <div className="flex items-center gap-2 py-1">
              <input type="checkbox" id="payNowReg" checked={payNow} onChange={(e) => setPayNow(e.target.checked)} className="h-4 w-4 rounded border-border text-primary focus:ring-primary/40" />
              <label htmlFor="payNowReg" className="text-sm text-foreground font-medium cursor-pointer select-none">
                Mark initial registration payment as Paid immediately
              </label>
            </div>
          )}
        </div>

        <div className="flex flex-col w-full border-t border-border bg-secondary/15 p-6 flex-shrink-0 gap-2">
          {planType === '' && (
            <p className="text-[10px] text-destructive font-black tracking-wider text-center uppercase">Please select a gym package above to register</p>
          )}
          <div className="flex items-center gap-3 w-full">
            <button type="button" onClick={onClose} className="flex-1 bg-secondary text-foreground hover:bg-secondary-foreground/10 rounded-xl py-2.5 font-semibold text-sm transition-colors border border-border cursor-pointer">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting || planType === ''} className="flex-1 bg-primary text-primary-foreground hover:opacity-90 rounded-xl py-2.5 font-bold text-sm transition-all shadow-md shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
              {isSubmitting ? 'Saving...' : isEditing ? 'Update Profile' : 'Register Member'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
