'use client';

import { useState, useEffect, useRef } from 'react';
import { Dashboard } from '@/components/Dashboard';
import { MembersList } from '@/components/MembersList';
import { MemberForm } from '@/components/MemberForm';
import { AttendanceTracker } from '@/components/AttendanceTracker';
import { PaymentsList } from '@/components/PaymentsList';
import { RenewModal } from '@/components/RenewModal';
import { MemberDetailsModal } from '@/components/MemberDetailsModal';
import { api } from '@/lib/api';
import type { Member } from '@/lib/api';

import {
  Dumbbell,
  LayoutDashboard,
  Users,
  CalendarCheck,
  CreditCard,
  Sun,
  Moon,
  Bell,
  Menu,
  X,
  RefreshCw,
  Camera,
  User
} from 'lucide-react';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'members' | 'attendance' | 'payments'>('dashboard');
  const [darkMode, setDarkMode] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [refreshCounter, setRefreshCounter] = useState(0);

  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);
  const [editMember, setEditMember] = useState<Member | null>(null);
  const [renewMember, setRenewMember] = useState<Member | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showQuickRenewSelector, setShowQuickRenewSelector] = useState(false);
  const [quickRenewSearch, setQuickRenewSearch] = useState('');
  const [quickRenewCandidates, setQuickRenewCandidates] = useState<Member[]>([]);

  const [notifications, setNotifications] = useState<string[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const [adminName, setAdminName] = useState('Admin Profile');
  const [adminPhoto, setAdminPhoto] = useState('');
  const [showAdminEditModal, setShowAdminEditModal] = useState(false);
  const [tempAdminName, setTempAdminName] = useState('Admin Profile');
  const [tempAdminPhoto, setTempAdminPhoto] = useState('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  // Load auth & admin state from storage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsLoggedIn(sessionStorage.getItem('isLoggedIn') === 'true');
      setAdminName(localStorage.getItem('adminName') || 'Admin Profile');
      setAdminPhoto(localStorage.getItem('adminPhoto') || '');
    }
  }, []);

  const startCamera = async () => {
    setCameraError('');
    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 320, facingMode: 'user' } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      console.error(err);
      setCameraError('Unable to access camera.');
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
      const canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 320;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, 320, 320);
        setTempAdminPhoto(canvas.toDataURL('image/jpeg'));
        stopCamera();
      }
    }
  };

  useEffect(() => {
    return () => { if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop()); };
  }, []);

  const closeAdminModal = () => { stopCamera(); setShowAdminEditModal(false); };
  const getAdminInitials = (name: string) => name.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'AD';
  const triggerRefresh = () => setRefreshCounter(prev => prev + 1);

  // Click outside for notifications
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Theme sync
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) { root.classList.add('dark'); root.classList.remove('light'); }
    else { root.classList.add('light'); root.classList.remove('dark'); }
  }, [darkMode]);

  // Quick renew list
  useEffect(() => {
    if (!showQuickRenewSelector) return;
    const load = async () => {
      try {
        const res = await api.getMembers(quickRenewSearch, '', 1, 10);
        setQuickRenewCandidates(res.members);
      } catch (err) { console.error(err); }
    };
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [quickRenewSearch, showQuickRenewSelector, refreshCounter]);

  // Notifications
  useEffect(() => {
    if (!isLoggedIn) return;
    const fetchAlerts = async () => {
      try {
        const data = await api.getDashboardStats();
        const alertList: string[] = [];
        data.alerts.expired.forEach(m => alertList.push(`Membership expired for ${m.name}`));
        data.alerts.expiringSoon.forEach(m => alertList.push(`Membership expiring soon for ${m.name} (${m.expiry_date})`));
        data.alerts.pendingPayments.filter(p => p.payment_status === 'Overdue').forEach(p => {
          alertList.push(`Payment overdue for ${p.member_name} (₹${p.amount.toLocaleString('en-IN')})`);
        });
        setNotifications(alertList);
      } catch (err) { console.error(err); }
    };
    fetchAlerts();
  }, [refreshCounter, isLoggedIn]);

  const getHeaderDate = () => new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' });

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    if (loginUsername.trim() === 'fitforlifegym' && loginPassword === '8106913285') {
      sessionStorage.setItem('isLoggedIn', 'true');
      setIsLoggedIn(true);
    } else {
      setLoginError('Invalid username or password.');
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-tr from-[#0b0f19] via-[#090b11] to-[#1e293b] text-foreground flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-card/65 backdrop-blur-md border border-border rounded-2xl p-8 shadow-2xl space-y-6 animate-scale-in">
          <div className="text-center space-y-2">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-primary shadow-lg shadow-primary/15 mb-2">
              <Dumbbell className="h-8 w-8 stroke-[2.5]" />
            </div>
            <h2 className="text-2xl font-black tracking-tight text-foreground uppercase">Fit For Life Gym</h2>
            <p className="text-xs text-muted-foreground font-bold tracking-wider">OWNER ACCESS SECURE PORTAL</p>
          </div>

          {loginError && (
            <div className="p-3 text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl text-center font-bold">{loginError}</div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">Username</label>
              <input
                type="text" required value={loginUsername} onChange={(e) => setLoginUsername(e.target.value)} placeholder="fitforlifegym"
                className="w-full bg-secondary/50 border border-border rounded-xl py-2.5 px-3.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all font-semibold"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'} required value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="••••••••••"
                  className="w-full bg-secondary/50 border border-border rounded-xl py-2.5 px-3.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all font-semibold pr-10"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-3.5 flex items-center text-muted-foreground hover:text-foreground text-xs font-bold cursor-pointer">
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
            <button type="submit" className="w-full bg-primary text-primary-foreground font-black py-3 rounded-xl hover:opacity-95 shadow-lg shadow-primary/25 transition-all mt-6 text-sm cursor-pointer uppercase tracking-wider">
              Sign In to Dashboard
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans transition-colors duration-300">

      {/* Top Navbar */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card/85 backdrop-blur-md px-6 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary lg:hidden transition-colors">
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <Dumbbell className="h-6 w-6 text-primary stroke-[2.5]" />
            <h1 className="text-base sm:text-lg font-black tracking-tighter text-foreground my-0 uppercase">Fit For Life Gym</h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="hidden md:flex items-center gap-1.5 text-xs font-bold text-muted-foreground bg-secondary/60 px-3 py-1.5 rounded-xl border border-border">
            <span className="h-2 w-2 rounded-full bg-primary"></span>
            {getHeaderDate()}
          </span>

          {/* Notifications */}
          <div className="relative" ref={notificationsRef}>
            <button onClick={() => setShowNotifications(!showNotifications)} className="relative p-2 rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors border border-border">
              <Bell className="h-4 w-4" />
              {notifications.length > 0 && <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-card border border-border p-4 shadow-xl z-50 animate-scale-in">
                <div className="flex items-center justify-between border-b border-border pb-2 mb-2">
                  <span className="text-xs font-bold text-foreground">Alert notifications</span>
                  <span className="text-[10px] bg-red-500/10 text-red-500 font-bold px-2 py-0.5 rounded-lg">{notifications.length} alerts</span>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {notifications.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">No critical alerts logged.</p>
                  ) : (
                    notifications.map((n, i) => (
                      <div key={i} className="text-xs p-2 bg-secondary/40 border-l-2 border-primary rounded text-muted-foreground font-medium">{n}</div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors border border-border">
            {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {/* Admin Profile */}
          <button
            onClick={() => { setTempAdminName(adminName); setTempAdminPhoto(adminPhoto); setShowAdminEditModal(true); }}
            className="flex items-center gap-2 pl-2 border-l border-border/80 hover:opacity-85 transition-opacity text-left cursor-pointer focus:outline-none"
          >
            <div className="h-8 w-8 rounded-xl overflow-hidden border border-primary/20 bg-primary text-primary-foreground font-black text-xs flex items-center justify-center shadow-md shadow-primary/10 flex-shrink-0">
              {adminPhoto ? (
                <img src={adminPhoto} className="h-full w-full object-cover" alt="Owner Profile"
                  onClick={(e) => { e.stopPropagation(); setLightboxImage(adminPhoto); }} />
              ) : (
                getAdminInitials(adminName)
              )}
            </div>
            <div className="hidden sm:block text-left leading-none">
              <div className="text-xs font-black text-foreground">{adminName}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">Gym Owner</div>
            </div>
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">

        {/* Sidebar */}
        <aside className={`fixed inset-y-0 left-0 z-40 w-64 transform border-r border-border bg-card transition-transform duration-300 lg:static lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex h-full flex-col justify-between p-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between lg:hidden border-b border-border pb-4 mb-4">
                <span className="font-bold text-foreground">Menu Navigation</span>
                <button onClick={() => setSidebarOpen(false)} className="rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-1.5">
                {[
                  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
                  { key: 'members', label: 'Members Directory', icon: Users },
                  { key: 'attendance', label: 'Attendance Sheet', icon: CalendarCheck },
                  { key: 'payments', label: 'Payments Ledger', icon: CreditCard },
                ].map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => { setActiveTab(key as typeof activeTab); setSidebarOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                      activeTab === key
                        ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/15'
                        : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="p-4 bg-secondary/40 border border-border/80 rounded-2xl space-y-2">
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">FIT FOR LIFE CLUB</div>
                <p className="text-[10px] text-muted-foreground leading-normal font-medium">Admin Panel v1.0 • Running SQLite db instance.</p>
              </div>
              <button
                onClick={() => { sessionStorage.removeItem('isLoggedIn'); setIsLoggedIn(false); }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20 hover:border-red-500 transition-all cursor-pointer"
              >
                Log Out Securely
              </button>
            </div>
          </div>
        </aside>

        {sidebarOpen && (
          <div onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"></div>
        )}

        <main className="flex-1 overflow-y-auto p-6 md:p-8 max-w-7xl mx-auto w-full">
          {activeTab === 'dashboard' && (
            <Dashboard
              onAddNewMember={() => setShowAddForm(true)}
              onMarkAttendance={() => setActiveTab('attendance')}
              onRenewClick={() => setShowQuickRenewSelector(true)}
              onViewMember={(id) => setSelectedMemberId(id)}
              refreshTrigger={refreshCounter}
              onRefresh={triggerRefresh}
              onViewImage={setLightboxImage}
            />
          )}
          {activeTab === 'members' && (
            <MembersList
              onViewDetails={(id) => setSelectedMemberId(id)}
              onEdit={(member) => setEditMember(member)}
              onRenew={(member) => setRenewMember(member)}
              onAddNewClick={() => setShowAddForm(true)}
              refreshTrigger={refreshCounter}
              onDeleted={triggerRefresh}
              onViewImage={setLightboxImage}
            />
          )}
          {activeTab === 'attendance' && <AttendanceTracker onViewImage={setLightboxImage} />}
          {activeTab === 'payments' && (
            <PaymentsList refreshTrigger={refreshCounter} onPaymentProcessed={triggerRefresh} />
          )}
        </main>
      </div>

      {/* Modals */}
      {selectedMemberId !== null && (
        <MemberDetailsModal
          memberId={selectedMemberId}
          onClose={() => setSelectedMemberId(null)}
          onEdit={(member) => setEditMember(member)}
          onViewImage={setLightboxImage}
          onDelete={async (id) => {
            try { await api.deleteMember(id); triggerRefresh(); setSelectedMemberId(null); }
            catch (err: unknown) { alert((err as Error).message || 'Failed to delete member.'); }
          }}
          onRenew={(member) => setRenewMember(member)}
          onUpdated={triggerRefresh}
        />
      )}

      {editMember !== null && (
        <MemberForm
          member={editMember}
          onClose={() => setEditMember(null)}
          onSaved={() => {
            triggerRefresh();
            if (selectedMemberId === editMember.id) {
              const prevId = selectedMemberId;
              setSelectedMemberId(null);
              setTimeout(() => setSelectedMemberId(prevId), 10);
            }
            setEditMember(null);
          }}
        />
      )}

      {showAddForm && (
        <MemberForm onClose={() => setShowAddForm(false)} onSaved={() => { triggerRefresh(); setShowAddForm(false); }} />
      )}

      {renewMember !== null && (
        <RenewModal
          member={renewMember}
          onClose={() => setRenewMember(null)}
          onRenewed={() => {
            triggerRefresh();
            if (selectedMemberId === renewMember.id) {
              const prevId = selectedMemberId;
              setSelectedMemberId(null);
              setTimeout(() => setSelectedMemberId(prevId), 10);
            }
            setRenewMember(null);
          }}
        />
      )}

      {/* Quick Renew Selector */}
      {showQuickRenewSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md bg-card border border-border p-6 rounded-2xl shadow-2xl space-y-4 animate-scale-in">
            <div className="flex justify-between items-center pb-2 border-b border-border">
              <h3 className="text-base font-bold text-foreground flex items-center gap-1.5">
                <RefreshCw className="h-4 w-4 text-primary" />
                Select Member to Renew
              </h3>
              <button onClick={() => { setShowQuickRenewSelector(false); setQuickRenewSearch(''); }} className="text-muted-foreground hover:text-foreground p-1">
                <X className="h-4 w-4" />
              </button>
            </div>

            <input
              type="text" placeholder="Search member by name..." value={quickRenewSearch} onChange={(e) => setQuickRenewSearch(e.target.value)}
              className="w-full bg-secondary border border-border rounded-xl py-2 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary shadow-sm"
            />

            <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
              {quickRenewCandidates.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No matching members found.</p>
              ) : (
                quickRenewCandidates.map(c => (
                  <button key={c.id} onClick={() => { setRenewMember(c); setShowQuickRenewSelector(false); setQuickRenewSearch(''); }}
                    className="w-full text-left p-3 rounded-xl bg-secondary/40 hover:bg-secondary border border-border hover:border-primary/20 transition-all flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-foreground block">{c.name}</span>
                      <span className="text-muted-foreground text-[10px] font-semibold">Plan: {c.plan_duration}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      c.status === 'Expired' ? 'bg-red-500/10 text-red-500' : c.status === 'Expiring Soon' ? 'bg-amber-500/10 text-amber-500' : 'bg-green-500/10 text-green-500'
                    }`}>{c.status}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Admin Edit Modal */}
      {showAdminEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-card border border-border p-6 rounded-2xl shadow-2xl space-y-4 animate-scale-in max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex justify-between items-center pb-2 border-b border-border flex-shrink-0">
              <h3 className="text-base font-bold text-foreground">Edit Admin Profile</h3>
              <button onClick={closeAdminModal} className="text-muted-foreground hover:text-foreground p-1"><X className="h-4 w-4" /></button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              <div className="flex flex-col items-center justify-center p-3 bg-secondary/20 rounded-2xl border border-border">
                <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase mb-2">Admin Profile Photo</span>
                <div className="relative h-24 w-24 rounded-full overflow-hidden border-2 border-primary bg-black/10 flex items-center justify-center shadow-inner flex-shrink-0">
                  {tempAdminPhoto ? (
                    <img src={tempAdminPhoto} className="h-full w-full object-cover cursor-zoom-in" alt="Admin Preview" onClick={() => setLightboxImage(tempAdminPhoto)} />
                  ) : isCameraActive ? (
                    <video ref={videoRef} autoPlay playsInline className="h-full w-full object-cover scale-x-[-1]" />
                  ) : (
                    <User className="h-10 w-10 text-muted-foreground" />
                  )}
                </div>

                {cameraError && <p className="text-xs text-destructive mt-1 text-center font-medium">{cameraError}</p>}

                <div className="flex items-center gap-1.5 mt-3 flex-wrap justify-center">
                  {tempAdminPhoto ? (
                    <>
                      <button type="button" onClick={startCamera} className="bg-secondary text-foreground border border-border hover:bg-secondary-foreground/10 px-3 py-1 rounded-xl text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer">
                        <Camera className="h-3 w-3" />Retake
                      </button>
                      <button type="button" onClick={() => setTempAdminPhoto('')} className="bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 px-3 py-1 rounded-xl text-[10px] font-bold transition-colors cursor-pointer">
                        Remove
                      </button>
                    </>
                  ) : isCameraActive ? (
                    <>
                      <button type="button" onClick={capturePhoto} className="bg-primary text-primary-foreground hover:opacity-90 px-3 py-1 rounded-xl text-[10px] font-bold transition-opacity shadow-sm cursor-pointer">Capture</button>
                      <button type="button" onClick={stopCamera} className="bg-secondary text-foreground border border-border hover:bg-secondary-foreground/10 px-3 py-1 rounded-xl text-[10px] font-bold transition-colors cursor-pointer">Cancel</button>
                    </>
                  ) : (
                    <button type="button" onClick={startCamera} className="bg-primary text-primary-foreground hover:opacity-90 px-3 py-1 rounded-xl text-[10px] font-bold flex items-center gap-1 transition-opacity shadow-sm cursor-pointer">
                      <Camera className="h-3 w-3" />Add Photo
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-muted-foreground">ADMIN OWNER NAME</label>
                <input
                  type="text" required value={tempAdminName} onChange={(e) => setTempAdminName(e.target.value)} placeholder="e.g. Mukesh Nayak"
                  className="w-full bg-secondary border border-border rounded-xl py-2.5 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary shadow-sm font-semibold"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2 border-t border-border flex-shrink-0">
              <button type="button" onClick={closeAdminModal} className="flex-1 bg-secondary text-foreground hover:bg-secondary-foreground/10 border border-border py-2 text-xs font-bold rounded-xl transition-colors">Cancel</button>
              <button
                type="button"
                onClick={() => {
                  if (tempAdminName.trim()) {
                    setAdminName(tempAdminName.trim());
                    setAdminPhoto(tempAdminPhoto);
                    localStorage.setItem('adminName', tempAdminName.trim());
                    localStorage.setItem('adminPhoto', tempAdminPhoto);
                    closeAdminModal();
                  }
                }}
                className="flex-1 bg-primary text-primary-foreground font-bold text-xs py-2 rounded-xl hover:opacity-95 shadow-md shadow-primary/20 transition-all"
              >
                Save Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxImage !== null && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 cursor-zoom-out" onClick={() => setLightboxImage(null)}>
          <button type="button" onClick={() => setLightboxImage(null)} className="absolute top-4 right-4 text-white hover:text-gray-300 p-2 rounded-xl bg-black/50 border border-white/20 transition-colors cursor-pointer">
            <X className="h-6 w-6" />
          </button>
          <img src={lightboxImage} className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl border border-white/10" alt="Enlarged profile preview" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
