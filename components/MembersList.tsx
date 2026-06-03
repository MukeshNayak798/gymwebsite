'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { Member } from '@/lib/api';
import { Search, Eye, Edit2, Trash2, RotateCw, ChevronLeft, ChevronRight, UserPlus, Filter } from 'lucide-react';

interface MembersListProps {
  onViewDetails: (id: number) => void;
  onEdit: (member: Member) => void;
  onRenew: (member: Member) => void;
  onAddNewClick: () => void;
  refreshTrigger: number;
  onDeleted: () => void;
  onViewImage?: (url: string) => void;
}

export const MembersList: React.FC<MembersListProps> = ({
  onViewDetails,
  onEdit,
  onRenew,
  onAddNewClick,
  refreshTrigger,
  onDeleted,
  onViewImage,
}) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const limit = 8;

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const res = await api.getMembers(search, statusFilter, page, limit);
      setMembers(res.members);
      setTotalPages(res.pagination.totalPages);
      setTotalCount(res.pagination.total);
    } catch (err) {
      console.error('Error fetching members:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter, page, refreshTrigger]);

  const handleDelete = async (id: number, name: string) => {
    if (confirm(`Are you sure you want to permanently delete member ${name}?`)) {
      try {
        await api.deleteMember(id);
        onDeleted();
        fetchMembers();
      } catch (err: unknown) {
        alert((err as Error).message || 'Failed to delete member.');
      }
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const getStatusBadge = (status: Member['status']) => {
    switch (status) {
      case 'Active':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-500/10 text-green-500 border border-green-500/20">Active</span>;
      case 'Expiring Soon':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">Expiring Soon</span>;
      case 'Expired':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500/10 text-red-500 border border-red-500/20">Expired</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Active Member Directory</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Manage and track Fit For Life Gym members</p>
        </div>
        <button
          onClick={onAddNewClick}
          className="bg-primary text-primary-foreground font-bold text-sm px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 hover:opacity-95 shadow-md shadow-primary/25 transition-all self-start sm:self-auto"
        >
          <UserPlus className="h-4 w-4" />
          Add New Member
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="relative sm:col-span-2">
          <span className="absolute inset-y-0 left-3.5 flex items-center text-muted-foreground">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            placeholder="Search members by name or phone..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full bg-card border border-border rounded-xl py-2.5 pl-11 pr-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all shadow-sm"
          />
        </div>

        <div className="relative">
          <span className="absolute inset-y-0 left-3.5 flex items-center text-muted-foreground pointer-events-none">
            <Filter className="h-4 w-4" />
          </span>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="w-full bg-card border border-border rounded-xl py-2.5 pl-10 pr-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all shadow-sm appearance-none"
          >
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Expiring Soon">Expiring Soon</option>
            <option value="Expired">Expired</option>
          </select>
          <span className="absolute inset-y-0 right-3.5 flex items-center text-muted-foreground pointer-events-none">▼</span>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-20 text-center">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-sm text-muted-foreground mt-4">Loading active roster...</p>
            </div>
          ) : members.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">No gym members found matching your search.</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-secondary/40 border-b border-border text-xs font-bold tracking-wider text-muted-foreground uppercase">
                  <th className="py-4 px-6">Member ID</th>
                  <th className="py-4 px-6">Name</th>
                  <th className="py-4 px-6">Phone</th>
                  <th className="py-4 px-6">Plan Duration</th>
                  <th className="py-4 px-6">Join Date</th>
                  <th className="py-4 px-6">Expiry Date</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {members.map((member) => (
                  <tr key={member.id} className="hover:bg-secondary/10 transition-colors group">
                    <td className="py-3.5 px-6 font-semibold text-muted-foreground">#FLG-{member.id}</td>
                    <td className="py-3.5 px-6">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full overflow-hidden border border-border bg-secondary/50 flex items-center justify-center flex-shrink-0">
                          {member.photo ? (
                            <img
                              src={member.photo}
                              className="h-full w-full object-cover cursor-zoom-in"
                              alt="Member Profile"
                              onClick={(e) => { e.stopPropagation(); onViewImage?.(member.photo!); }}
                            />
                          ) : (
                            <span className="text-[10px] font-black text-muted-foreground">
                              {member.name.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <button onClick={() => onViewDetails(member.id)} className="font-bold text-foreground hover:text-primary transition-colors text-left cursor-pointer">
                          {member.name}
                        </button>
                      </div>
                    </td>
                    <td className="py-3.5 px-6 text-muted-foreground">{member.phone || '—'}</td>
                    <td className="py-3.5 px-6 font-medium text-foreground">{member.plan_duration}</td>
                    <td className="py-3.5 px-6 text-muted-foreground">{formatDate(member.join_date)}</td>
                    <td className="py-3.5 px-6 text-muted-foreground font-semibold">{formatDate(member.expiry_date)}</td>
                    <td className="py-3.5 px-6">{getStatusBadge(member.status)}</td>
                    <td className="py-3.5 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => onViewDetails(member.id)} title="View Details" className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors border border-border">
                          <Eye className="h-4 w-4" />
                        </button>
                        <button onClick={() => onEdit(member)} title="Edit Profile" className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors border border-border">
                          <Edit2 className="h-4 w-4" />
                        </button>
                        {(member.status === 'Expired' || member.status === 'Expiring Soon') && (
                          <button onClick={() => onRenew(member)} title="Renew Membership" className="p-1.5 rounded-lg text-primary hover:bg-primary/10 border border-primary/20 transition-colors">
                            <RotateCw className="h-4 w-4" />
                          </button>
                        )}
                        <button onClick={() => handleDelete(member.id, member.name)} title="Delete Member" className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 border border-red-500/15 transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {totalPages > 1 && !loading && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-secondary/10">
            <div className="text-xs text-muted-foreground">
              Showing <span className="font-semibold">{(page - 1) * limit + 1}</span> to{' '}
              <span className="font-semibold">{Math.min(page * limit, totalCount)}</span> of{' '}
              <span className="font-semibold">{totalCount}</span> entries
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(p - 1, 1))} disabled={page === 1} className="p-1.5 rounded-lg border border-border text-muted-foreground hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-1.5">
                {Array.from({ length: totalPages }).map((_, idx) => {
                  const pNum = idx + 1;
                  return (
                    <button
                      key={pNum}
                      onClick={() => setPage(pNum)}
                      className={`h-8 w-8 text-xs font-bold rounded-lg transition-colors border ${
                        page === pNum
                          ? 'bg-primary border-primary text-primary-foreground'
                          : 'border-border text-muted-foreground hover:bg-secondary'
                      }`}
                    >
                      {pNum}
                    </button>
                  );
                })}
              </div>
              <button onClick={() => setPage(p => Math.min(p + 1, totalPages))} disabled={page === totalPages} className="p-1.5 rounded-lg border border-border text-muted-foreground hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
