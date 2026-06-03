'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { AttendanceRecord, AttendanceSummaryMember, DailyAttendanceStat } from '@/lib/api';
import { Calendar, Save, CheckCircle, Award, ListChecks, CalendarRange, Clock, Search } from 'lucide-react';

interface AttendanceTrackerProps {
  onViewImage?: (url: string) => void;
}

export const AttendanceTracker: React.FC<AttendanceTrackerProps> = ({ onViewImage }) => {
  const [activeTab, setActiveTab] = useState<'mark' | 'history'>('mark');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [summaryMembers, setSummaryMembers] = useState<AttendanceSummaryMember[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyAttendanceStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [rosterSearch, setRosterSearch] = useState('');
  const [historySearch, setHistorySearch] = useState('');

  const fetchAttendanceSheet = async () => {
    try {
      setLoading(true);
      const res = await api.getAttendance(date);
      setRecords(res);
    } catch (err) {
      console.error('Error fetching attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendanceHistory = async () => {
    try {
      setLoading(true);
      const res = await api.getAttendanceSummary();
      const sorted = res.members.sort((a, b) => b.percentage - a.percentage);
      setSummaryMembers(sorted);
      setDailyStats(res.dailyStats);
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'mark') {
      fetchAttendanceSheet();
    } else {
      fetchAttendanceHistory();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, activeTab]);

  const handleToggle = (memberId: number, status: 'Present' | 'Absent') => {
    setRecords(prev =>
      prev.map(r => (r.member_id === memberId ? { ...r, attendance: r.attendance === status ? null : status } : r))
    );
  };

  const handleMarkAllPresent = () => {
    setRecords(prev => prev.map(r => ({ ...r, attendance: 'Present' as const })));
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccessMsg('');
    try {
      const payload = records.map(r => ({ member_id: r.member_id, status: r.attendance }));
      await api.saveAttendance(date, payload);
      setSuccessMsg('Attendance sheet saved successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchAttendanceSheet();
    } catch {
      alert('Failed to save attendance records.');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const dateObj = new Date(dateStr);
    return dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const filteredRecords = records.filter(r => r.name.toLowerCase().includes(rosterSearch.toLowerCase()));
  const filteredSummaryMembers = summaryMembers.filter(m => m.name.toLowerCase().includes(historySearch.toLowerCase()));

  return (
    <div className="space-y-6">

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Attendance Tracker</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Log daily attendance or view percentage records</p>
        </div>

        <div className="inline-flex rounded-xl bg-secondary/60 p-1 border border-border self-start">
          <button
            onClick={() => setActiveTab('mark')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'mark' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <ListChecks className="h-4 w-4" />
            Mark Roster
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'history' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <CalendarRange className="h-4 w-4" />
            History Log
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 bg-green-500/10 border border-green-500/20 text-green-500 text-sm font-semibold rounded-xl flex items-center gap-2 animate-fade-in">
          <CheckCircle className="h-5 w-5" />
          {successMsg}
        </div>
      )}

      {activeTab === 'mark' && (
        <div className="space-y-4 animate-fade-in">
          <div className="bg-card border border-border p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex-shrink-0">ATTENDANCE DATE</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-3 flex items-center text-muted-foreground pointer-events-none">
                  <Calendar className="h-4 w-4" />
                </span>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="bg-secondary border border-border rounded-xl py-2 pl-9 pr-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all font-semibold"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleMarkAllPresent}
                disabled={records.length === 0}
                className="bg-secondary text-foreground hover:bg-secondary-foreground/10 border border-border font-bold text-xs px-4 py-2 rounded-xl transition-all disabled:opacity-50 cursor-pointer"
              >
                Mark All Present
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || records.length === 0}
                className="bg-primary text-primary-foreground font-bold text-xs px-5 py-2.5 rounded-xl flex items-center gap-1.5 hover:opacity-95 shadow-md shadow-primary/20 transition-all disabled:opacity-50 cursor-pointer"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : 'Save Attendance'}
              </button>
            </div>
          </div>

          <div className="relative flex items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-3 flex items-center text-muted-foreground">
                <Search className="h-4 w-4" />
              </span>
              <input
                type="text"
                placeholder="Search candidates by name..."
                value={rosterSearch}
                onChange={(e) => setRosterSearch(e.target.value)}
                className="w-full bg-card border border-border rounded-xl py-2 pl-10 pr-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
              />
            </div>
            <button
              type="button"
              className="bg-secondary hover:bg-secondary-foreground/10 text-foreground border border-border px-5 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Search className="h-4 w-4 text-muted-foreground" />
              Search
            </button>
          </div>

          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            {loading ? (
              <div className="py-20 text-center">
                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-sm text-muted-foreground mt-4">Loading roster...</p>
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground text-sm">No active members found.</div>
            ) : (
              <div className="divide-y divide-border">
                {filteredRecords.map((r) => (
                  <div key={r.member_id} className="p-4 flex items-center justify-between hover:bg-secondary/10 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full overflow-hidden border border-border bg-secondary/50 flex items-center justify-center flex-shrink-0">
                        {r.photo ? (
                          <img src={r.photo} className="h-full w-full object-cover cursor-zoom-in" alt="Candidate Profile" onClick={() => onViewImage?.(r.photo!)} />
                        ) : (
                          <span className="text-xs font-black text-muted-foreground">
                            {r.name.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                        <span className="font-bold text-foreground block text-sm sm:text-base">{r.name}</span>
                        <span className="text-xs text-muted-foreground uppercase font-semibold">Status: {r.status}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggle(r.member_id, 'Present')}
                        className={`px-5 py-2 text-xs font-black rounded-xl border transition-all cursor-pointer ${
                          r.attendance === 'Present'
                            ? 'bg-green-500 border-green-500 text-white shadow-sm shadow-green-500/20'
                            : 'bg-transparent border-border text-muted-foreground hover:bg-secondary'
                        }`}
                      >
                        Present
                      </button>
                      <button
                        onClick={() => handleToggle(r.member_id, 'Absent')}
                        className={`px-5 py-2 text-xs font-black rounded-xl border transition-all cursor-pointer ${
                          r.attendance === 'Absent'
                            ? 'bg-red-500 border-red-500 text-white shadow-sm shadow-red-500/20'
                            : 'bg-transparent border-border text-muted-foreground hover:bg-secondary'
                        }`}
                      >
                        Absent
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">

          <div className="lg:col-span-1 space-y-4">
            <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-primary" />
              Daily Record Log
            </h3>

            <div className="bg-card border border-border rounded-2xl p-4 shadow-sm max-h-[500px] overflow-y-auto space-y-3">
              {dailyStats.length === 0 ? (
                <div className="text-center py-10 text-xs text-muted-foreground">No attendance history logged.</div>
              ) : (
                dailyStats.map((stat) => (
                  <div key={stat.attendance_date} className="p-3 bg-secondary/30 rounded-xl border border-border text-sm flex justify-between items-center">
                    <div>
                      <span className="font-bold text-foreground block">{formatDate(stat.attendance_date)}</span>
                      <span className="text-xs text-muted-foreground mt-0.5 block">Total marked: {stat.present_count + stat.absent_count}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="px-2 py-0.5 rounded-lg text-xs font-bold bg-green-500/10 text-green-500">{stat.present_count} Present</span>
                      <span className="px-2 py-0.5 rounded-lg text-xs font-bold bg-red-500/10 text-red-500">{stat.absent_count} Absent</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-xs font-bold tracking-wider text-muted-foreground uppercase flex items-center gap-1.5">
                <Award className="h-4 w-4 text-primary" />
                Attendance Percentage by Member
              </h3>
              <div className="relative max-w-[200px] flex-1">
                <span className="absolute inset-y-0 left-2.5 flex items-center text-muted-foreground">
                  <Search className="h-3.5 w-3.5" />
                </span>
                <input
                  type="text"
                  placeholder="Search member..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="w-full bg-card border border-border rounded-xl py-1.5 pl-8 pr-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary shadow-sm"
                />
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm divide-y divide-border space-y-4 max-h-[500px] overflow-y-auto">
              {filteredSummaryMembers.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-sm">No members found matching filter.</div>
              ) : (
                filteredSummaryMembers.map((m) => (
                  <div key={m.id} className="pt-3 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="h-9 w-9 rounded-full overflow-hidden border border-border bg-secondary/50 flex items-center justify-center flex-shrink-0">
                        {m.photo ? (
                          <img src={m.photo} className="h-full w-full object-cover cursor-zoom-in" alt="Candidate Profile" onClick={() => onViewImage?.(m.photo!)} />
                        ) : (
                          <span className="text-[10px] font-black text-muted-foreground">
                            {m.name.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="flex-1">
                        <span className="font-bold text-foreground block">{m.name}</span>
                        <span className="text-xs text-muted-foreground block mt-0.5">Attended {m.present_days} of {m.total_days} logged sessions</span>
                        <div className="w-full bg-secondary h-2.5 rounded-full mt-2 overflow-hidden border border-border/30">
                          <div
                            style={{ width: `${m.percentage}%` }}
                            className={`h-full rounded-full transition-all ${
                              m.percentage >= 80 ? 'bg-green-500' : m.percentage >= 50 ? 'bg-amber-500' : 'bg-red-500'
                            }`}
                          ></div>
                        </div>
                      </div>
                    </div>
                    <div className="sm:text-right flex-shrink-0 self-end sm:self-center">
                      <span className={`text-lg font-black ${
                        m.percentage >= 80 ? 'text-green-500' : m.percentage >= 50 ? 'text-amber-500' : 'text-red-500'
                      }`}>
                        {m.percentage}%
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
