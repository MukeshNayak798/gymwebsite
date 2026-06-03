// API client helper for Fit For Life Gym

const BASE_URL = '/api';

export interface Member {
  id: number;
  name: string;
  age: number;
  gender: string;
  phone: string;
  address: string;
  height: number;
  weight: number;
  join_date: string;
  plan_duration: string;
  expiry_date: string;
  status: 'Active' | 'Expiring Soon' | 'Expired';
  photo?: string;
  plan_type?: string;
}

export interface Payment {
  id: number;
  payment_id?: number;
  member_id: number;
  member_name?: string;
  amount: number;
  payment_date: string | null;
  due_date: string;
  payment_status: 'Paid' | 'Pending' | 'Overdue';
  phone?: string;
  plan_duration?: string;
  member_photo?: string;
}

export interface Renewal {
  id: number;
  member_id: number;
  old_expiry_date: string;
  new_expiry_date: string;
  renewed_on: string;
}

export interface AttendanceRecord {
  member_id: number;
  name: string;
  status: string;
  photo?: string;
  attendance: 'Present' | 'Absent' | null;
}

export interface AttendanceSummaryMember {
  id: number;
  name: string;
  total_days: number;
  present_days: number;
  percentage: number;
  photo?: string;
}

export interface DailyAttendanceStat {
  attendance_date: string;
  present_count: number;
  absent_count: number;
}

export interface DashboardStats {
  stats: {
    total: number;
    active: number;
    expired: number;
    pendingPayments: number;
  };
  alerts: {
    expired: Array<{ id: number; name: string; phone: string; expiry_date: string; status: string; photo?: string }>;
    expiringSoon: Array<{ id: number; name: string; phone: string; expiry_date: string; status: string; photo?: string }>;
    pendingPayments: Payment[];
  };
  charts: {
    attendance: Array<{ attendance_date: string; present_count: number }>;
    revenue: Array<{ month: string; total_revenue: number }>;
  };
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export const api = {
  // Dashboard
  getDashboardStats: () => request<DashboardStats>('/dashboard/stats'),

  // Members
  getMembers: (q = '', status = '', page = 1, limit = 10) => {
    const params = new URLSearchParams({ q, status, page: String(page), limit: String(limit) });
    return request<{
      members: Member[];
      pagination: { total: number; page: number; limit: number; totalPages: number };
    }>(`/members?${params}`);
  },

  getMemberDetail: (id: number) =>
    request<{
      member: Member;
      payments: Payment[];
      renewals: Renewal[];
      attendance: Array<{ id: number; member_id: number; attendance_date: string; status: 'Present' | 'Absent' }>;
      attendancePercentage: number;
    }>(`/members/${id}`),

  createMember: (memberData: {
    name: string;
    age: number;
    gender: string;
    phone: string;
    address: string;
    height: number;
    weight: number;
    join_date: string;
    plan_duration: string;
    plan_type: string;
    pay_now: boolean;
    photo?: string;
  }) =>
    request<{ id: number; name: string; expiry_date: string; status: string }>('/members', {
      method: 'POST',
      body: JSON.stringify(memberData),
    }),

  updateMember: (id: number, memberData: Partial<Member>) =>
    request<{ message: string }>(`/members/${id}`, {
      method: 'PUT',
      body: JSON.stringify(memberData),
    }),

  deleteMember: (id: number) =>
    request<{ message: string }>(`/members/${id}`, {
      method: 'DELETE',
    }),

  renewMember: (
    id: number,
    renewData: { plan_duration: string; plan_type: string; pay_now: boolean; renewed_on: string }
  ) =>
    request<{ message: string; new_expiry_date: string; status: string }>(`/members/${id}/renew`, {
      method: 'POST',
      body: JSON.stringify(renewData),
    }),

  // Attendance
  getAttendance: (date: string) => request<AttendanceRecord[]>(`/attendance?date=${date}`),

  saveAttendance: (date: string, records: Array<{ member_id: number; status: 'Present' | 'Absent' | null }>) =>
    request<{ message: string }>('/attendance', {
      method: 'POST',
      body: JSON.stringify({ date, records }),
    }),

  getAttendanceSummary: () =>
    request<{ members: AttendanceSummaryMember[]; dailyStats: DailyAttendanceStat[] }>('/attendance/summary'),

  // Payments
  getPayments: (q = '', status = '') => {
    const params = new URLSearchParams();
    if (q) params.append('q', q);
    if (status) params.append('status', status);
    return request<Payment[]>(`/payments?${params}`);
  },

  payPayment: (id: number) =>
    request<{ message: string }>(`/payments/${id}/pay`, {
      method: 'PUT',
    }),
};
