// src/services/apiService.ts
import { RegisterFormValues } from '@/types/user';
import axiosInstance from '@/utils/axiosInstance';
import handleError from '@/utils/errorHandling';
import axios, { AxiosError } from 'axios';
export const API_URL = import.meta.env.VITE_API_URL;

export interface User {
  id: number;
  name: string;
  email: string;
  mobileNumber: string;
}

export interface UserDetails {
  uuid: string;
  name: string;
  mobile: string;
  address: string;
  connectionId: string;
  registeredOn: string;
  status: string;
}

export interface LoginCredentials {
  mobileNumber: string;
  password: string;
}

export interface ConsumptionRecord {
  uuid: string;
  user_uuid: string;
  month: string;
  year: number;
  consumption_liters: number;
  rate_per_liter: number;
  amount: number;
  status: 'PAID' | 'UNPAID';
  created_at: string;
  updated_at?: string;
  full_name?: string;
}

export interface PaymentRecord {
  uuid: string;
  user_uuid: string;
  consumption_uuid: string | null;
  amount: number;
  payment_method: string;
  transaction_id: string | null;
  upi_id: string | null;
  paid_at: string;
  created_at?: string;
  month?: string;
  year?: number;
  full_name?: string;
}

export interface QRData {
  upi_url: string;
  upi_id: string;
  payee_name: string;
  amount: number;
  currency: string;
  note: string;
  bill_info: {
    month: string;
    year: number;
    consumption_liters: number;
  } | null;
}

export interface NotificationDetails {
  amount: number;
  payment_method: string;
  upi_id: string | null;
  message: string | null;
  consumption_uuid: string | null;
  consumption_uuids: string[];
  created_by?: string;
}

export interface NotificationRecord {
  id: number;
  uuid: string;
  user_id: string;
  notification_details: string;
  related_to: string;
  is_read: number;
  created_at: string;
  updated_at: string;
  details?: NotificationDetails | null;
  full_name?: string;
  mobile_number?: string;
  connection_id?: string;
  is_paid?: boolean;
}

// User APIs. Optional q = search; optional page, limit = pagination (returns { users, total, page, limit }). Without page/limit returns User[].
export const getAllUsers = async (opts?: { q?: string; page?: number; limit?: number }): Promise<User[] | { users: User[]; total: number; page: number; limit: number }> => {
  try {
    const params: Record<string, string | number> = {};
    if (opts?.q?.trim()) params.q = opts.q.trim();
    if (opts?.page != null) params.page = opts.page;
    if (opts?.limit != null) params.limit = opts.limit;
    const response = await axiosInstance.get('/users', { params });
    const data = response.data;
    if (data?.total != null && Array.isArray(data.users)) return data;
    return Array.isArray(data) ? data : [];
  } catch (error) {
    handleError(error);
    return [];
  }
};

export const getUserById = async (id: number | string): Promise<User> => {
  try {
    const response = await axiosInstance.get<User>(`/users/${id}`);
    return response.data;
  } catch (error) {
    handleError(error);
  }
};

export const getUserByUUID = async (uuid: string): Promise<any> => {
  try {
    const response = await axiosInstance.get<any>(`/user/${uuid}`);
    return response.data;
  } catch (error) {
    handleError(error, "Failed to fetch user data");
    throw error;
  }
};

export const registerUser = async (data: RegisterFormValues): Promise<any> => {
  try {
    const response = await axiosInstance.post('/register', data);
    return response.data;
  } catch (error) {
    handleError(error, 'Registration failed');
  }
};

export const deleteUserByUuid = async (uuid: string): Promise<any> => {
  try {
    const response = await axiosInstance.delete(`/users/${uuid}`);
    return response.data;
  } catch (error) {
    handleError(error, "Delete user failed");
    throw error;
  }
};

export const createAdminUser = async (data: {
  fullName: string;
  mobileNumber: string;
  password: string;
  address: string;
  role: string;
}): Promise<any> => {
  try {
    const response = await axiosInstance.post('/admin/create-user', data);
    return response.data;
  } catch (error) {
    handleError(error, 'User creation failed');
    throw error;
  }
};

// Profile APIs
export const getProfile = async (): Promise<any> => {
  try {
    const response = await axiosInstance.get('/profile');
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to fetch profile');
    throw error;
  }
};

export const updateProfile = async (data: {
  fullName?: string;
  address?: string;
  currentPassword?: string;
  newPassword?: string;
}): Promise<any> => {
  try {
    const response = await axiosInstance.put('/profile/update', data);
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to update profile');
    throw error;
  }
};

// Consumption APIs. Optional { page, limit } for pagination, or { q } for search.
// With page/limit returns { history, total, page, limit }; otherwise returns history array.
export const getConsumptionHistory = async (params?: { page?: number; limit?: number; q?: string }): Promise<ConsumptionRecord[] | { history: ConsumptionRecord[]; total: number; page: number; limit: number }> => {
  try {
    const response = await axiosInstance.get('/consumption/history', { params: params || {} });
    const data = response.data;
    if (params?.page != null && params?.limit != null && data.total != null) return data;
    return data.history || [];
  } catch (error) {
    handleError(error, 'Failed to fetch consumption history');
    if (params?.q != null) return [];
    if (params?.page != null && params?.limit != null) return { history: [], total: 0, page: 1, limit: 10 };
    return [];
  }
};

export const getDueAmount = async (): Promise<number> => {
  try {
    const response = await axiosInstance.get('/consumption/due');
    return response.data.due_amount || 0;
  } catch (error) {
    handleError(error, 'Failed to fetch due amount');
    return 0;
  }
};

export const getUnpaidBills = async (): Promise<ConsumptionRecord[]> => {
  try {
    const response = await axiosInstance.get('/consumption/unpaid');
    return response.data.bills || [];
  } catch (error) {
    handleError(error, 'Failed to fetch unpaid bills');
    return [];
  }
};

// Admin Consumption APIs
export const addConsumption = async (data: {
  user_uuid: string;
  month: string;
  year: number;
  consumption_liters: number;
  rate_per_liter?: number;
}): Promise<any> => {
  try {
    const response = await axiosInstance.post('/admin/consumption', data);
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to add consumption record');
    throw error;
  }
};

export const getConsumptionByUser = async (user_uuid: string): Promise<ConsumptionRecord[]> => {
  try {
    const response = await axiosInstance.get(`/admin/consumption/${user_uuid}`);
    return response.data.history || [];
  } catch (error) {
    handleError(error, 'Failed to fetch consumption history');
    return [];
  }
};

/** Admin: get all consumption records. Optional q = search; optional page, limit = pagination (returns { records, total, page, limit }). */
export const getAllConsumptionAdmin = async (opts?: { q?: string; page?: number; limit?: number }): Promise<ConsumptionRecord[] | { records: ConsumptionRecord[]; total: number; page: number; limit: number }> => {
  try {
    const params: Record<string, string | number> = {};
    if (opts?.q?.trim()) params.q = opts.q.trim();
    if (opts?.page != null) params.page = opts.page;
    if (opts?.limit != null) params.limit = opts.limit;
    const response = await axiosInstance.get('/admin/consumption/all', { params });
    const data = response.data;
    if (data?.total != null && Array.isArray(data.records)) return data;
    return data?.records || [];
  } catch (error) {
    handleError(error, 'Failed to fetch all consumption');
    return [];
  }
};

// Payment APIs. Optional { page, limit } for pagination, or { q } for search.
// With page/limit returns { history, total, page, limit }; otherwise returns history array.
export const getPaymentHistory = async (params?: { page?: number; limit?: number; q?: string }): Promise<PaymentRecord[] | { history: PaymentRecord[]; total: number; page: number; limit: number }> => {
  try {
    const response = await axiosInstance.get('/payment/history', { params: params || {} });
    const data = response.data;
    if (params?.page != null && params?.limit != null && data.total != null) return data;
    return data.history || [];
  } catch (error) {
    handleError(error, 'Failed to fetch payment history');
    if (params?.q != null) return [];
    if (params?.page != null && params?.limit != null) return { history: [], total: 0, page: 1, limit: 10 };
    return [];
  }
};

/** Admin: get payment history for a specific user */
export const getPaymentHistoryByUser = async (user_uuid: string): Promise<PaymentRecord[]> => {
  try {
    const response = await axiosInstance.get(`/admin/payments/${user_uuid}`);
    return response.data.history || [];
  } catch (error) {
    handleError(error, 'Failed to fetch payment history for user');
    return [];
  }
};

/** Admin: get all payments. Optional q = search; optional page, limit = pagination (returns { payments, total, page, limit }). */
export const getAllPaymentsAdmin = async (opts?: { q?: string; page?: number; limit?: number }): Promise<PaymentRecord[] | { payments: PaymentRecord[]; total: number; page: number; limit: number }> => {
  try {
    const params: Record<string, string | number> = {};
    if (opts?.q?.trim()) params.q = opts.q.trim();
    if (opts?.page != null) params.page = opts.page;
    if (opts?.limit != null) params.limit = opts.limit;
    const response = await axiosInstance.get('/admin/payments', { params });
    const data = response.data;
    if (data?.total != null && Array.isArray(data.payments)) return data;
    return data?.payments || [];
  } catch (error) {
    handleError(error, 'Failed to fetch all payments');
    return [];
  }
};

export const recordPayment = async (data: {
  consumption_uuid?: string;
  consumption_uuids?: string[];
  amount: number;
  payment_method: string;
  transaction_id?: string;
  upi_id?: string;
}): Promise<any> => {
  try {
    const response = await axiosInstance.post('/payment/record', data);
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to record payment');
    throw error;
  }
};

export const notifyPaymentCompleted = async (data: {
  consumption_uuid?: string;
  consumption_uuids?: string[];
  amount: number;
  payment_method: string;
  upi_id?: string;
  message: string;
}): Promise<any> => {
  try {
    const response = await axiosInstance.post('/payment/notify-completed', data);
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to submit payment notification');
    throw error;
  }
};

export const getMyNotifications = async (): Promise<NotificationRecord[]> => {
  try {
    const response = await axiosInstance.get('/notifications');
    return response.data.notifications || [];
  } catch (error) {
    handleError(error, 'Failed to fetch notifications');
    return [];
  }
};

export const getAdminNotifications = async (): Promise<NotificationRecord[]> => {
  try {
    const response = await axiosInstance.get('/admin/notifications');
    return response.data.notifications || [];
  } catch (error) {
    handleError(error, 'Failed to fetch admin notifications');
    return [];
  }
};

export const getAdminPaymentNotificationsByUser = async (user_uuid: string): Promise<NotificationRecord[]> => {
  try {
    const response = await axiosInstance.get(`/admin/notifications/user/${encodeURIComponent(user_uuid)}`);
    return response.data.notifications || [];
  } catch (error) {
    handleError(error, 'Failed to fetch admin payment notifications for user');
    return [];
  }
};

export const getAdminUnreadPaymentNotificationCountByUser = async (user_uuid: string): Promise<number> => {
  try {
    const response = await axiosInstance.get(`/admin/notifications/user/${encodeURIComponent(user_uuid)}/unread-count`);
    return response.data.total || 0;
  } catch (error) {
    handleError(error, 'Failed to fetch unread payment notification count for user');
    return 0;
  }
};

export const getAdminUnreadNotificationCount = async (): Promise<number> => {
  try {
    const response = await axiosInstance.get('/admin/notifications/unread-count');
    return response.data.total || 0;
  } catch (error) {
    handleError(error, 'Failed to fetch unread notifications');
    return 0;
  }
};

export const markAdminAllPaymentNotificationsRead = async (): Promise<any> => {
  try {
    const response = await axiosInstance.put('/admin/notifications/mark-all-read');
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to mark notifications as read');
    throw error;
  }
};

export const markAdminPaymentNotificationsReadByUser = async (user_uuid: string): Promise<any> => {
  try {
    const response = await axiosInstance.put(`/admin/notifications/user/${encodeURIComponent(user_uuid)}/mark-all-read`);
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to mark user notifications as read');
    throw error;
  }
};

export const markAdminNotificationRead = async (uuid: string): Promise<any> => {
  const response = await axiosInstance.put(`/admin/notifications/${encodeURIComponent(uuid)}/read`);
  return response.data;
};

export const approveAdminPaymentNotification = async (uuid: string): Promise<any> => {
  const response = await axiosInstance.post(`/admin/notifications/${encodeURIComponent(uuid)}/approve-payment`);
  return response.data;
};

export const generatePaymentQR = async (consumptionUuid: string): Promise<QRData> => {
  try {
    const response = await axiosInstance.get(`/payment/qr/${encodeURIComponent(consumptionUuid)}`);
    const data = response.data?.qr_data ?? response.data;
    if (!data?.upi_url || !data?.amount) {
      throw new Error(data?.message || 'Invalid QR response from server');
    }
    return data;
  } catch (error) {
    handleError(error, 'Failed to generate payment QR');
    throw error;
  }
};

export const getTotalPaid = async (): Promise<number> => {
  try {
    const response = await axiosInstance.get('/payment/total');
    return response.data.total_paid || 0;
  } catch (error) {
    handleError(error, 'Failed to fetch total paid');
    return 0;
  }
};

// Settings APIs
export const getRatePerLiter = async (): Promise<number> => {
  try {
    const response = await axiosInstance.get('/settings/rate');
    return response.data.rate_per_liter || 20;
  } catch (error) {
    handleError(error, 'Failed to fetch rate');
    return 20;
  }
};

export const updateRatePerLiter = async (rate: number): Promise<any> => {
  try {
    const response = await axiosInstance.put('/admin/settings/rate', { rate });
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to update rate');
    throw error;
  }
};

export const getUpiSettings = async (): Promise<{ upi_id: string | null; payee_name: string }> => {
  try {
    const response = await axiosInstance.get('/admin/settings/upi');
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to fetch UPI settings');
    throw error;
  }
};

export const updateUpiSettings = async (data: { upi_id: string; payee_name?: string }): Promise<any> => {
  try {
    const response = await axiosInstance.put('/admin/settings/upi', data);
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to update UPI settings');
    throw error;
  }
};

export type BrandingSettings = {
  organization_name: string;
  support_email: string | null;
  support_phone: string | null;
  currency_display: string;
  unit_label: string;
  bill_due_day?: number;
};

export const getBrandingSettings = async (): Promise<BrandingSettings> => {
  try {
    const response = await axiosInstance.get('/settings/branding');
    return response.data as BrandingSettings;
  } catch (error) {
    handleError(error, 'Failed to fetch branding settings');
    return {
      organization_name: 'Water Supply',
      support_email: null,
      support_phone: null,
      currency_display: 'INR',
      unit_label: 'Liters',
    };
  }
};

export const updateBrandingSettings = async (data: Partial<BrandingSettings>): Promise<any> => {
  try {
    const response = await axiosInstance.put('/admin/settings/branding', data);
    return response.data;
  } catch (error) {
    handleError(error, 'Failed to update branding settings');
    throw error;
  }
};

// ----- Admin Reports -----
export const getRevenueReport = async (): Promise<{ report: Array<{ period: string; billed: number; collected: number; outstanding: number }> }> => {
  const response = await axiosInstance.get('/admin/reports/revenue');
  return response.data;
};
export const getConsumptionReport = async (): Promise<{ report: Array<{ period: string; total_liters: number; total_amount: number; connections: number }> }> => {
  const response = await axiosInstance.get('/admin/reports/consumption');
  return response.data;
};
export const getOutstandingReport = async (): Promise<{ report: Array<{ user_uuid: string; full_name: string; mobile_number: string; connection_id: string; due_amount: number; unpaid_count: number }> }> => {
  const response = await axiosInstance.get('/admin/reports/outstanding');
  return response.data;
};
export const getAuditLog = async (params?: { from?: string; to?: string; action?: string; user_uuid?: string; page?: number; limit?: number }): Promise<{ logs: any[]; total: number; page: number; limit: number }> => {
  const response = await axiosInstance.get('/admin/reports/audit', { params: params || {} });
  return response.data;
};

// ----- Admin Backup -----
export const exportBackup = async (): Promise<Blob> => {
  const response = await axiosInstance.get('/admin/backup/export', { responseType: 'blob' });
  return response.data;
};
export const restoreBackup = async (file: File): Promise<{ message: string; results: any }> => {
  const text = await file.text();
  const data = JSON.parse(text);
  const response = await axiosInstance.post('/admin/backup/restore', data);
  return response.data;
};

// ----- Admin Analytics -----
export const getConsumptionTrends = async (): Promise<{ trends: Array<{ period: string; liters: number; amount: number; connections: number }> }> => {
  const response = await axiosInstance.get('/admin/analytics/consumption-trends');
  return response.data;
};
export const getPaymentMethodStats = async (): Promise<{ byMethod: Array<{ method: string; count: number; total: number }> }> => {
  const response = await axiosInstance.get('/admin/analytics/payment-methods');
  return response.data;
};
export const getCollectionEfficiency = async (): Promise<{ byMonth: Array<{ period: string; billed: number; collected: number; efficiency: number }> }> => {
  const response = await axiosInstance.get('/admin/analytics/collection-efficiency');
  return response.data;
};

// ----- Admin Bulk -----
export const bulkImportConsumption = async (file: File): Promise<{ message: string; results: { total: number; success: number; failed: number; errors: any[] } }> => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await axiosInstance.post('/admin/bulk-consumption', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};
export const bulkUpdateStatus = async (uuids: string[], status: 'ACTIVE' | 'REVOKE' | 'DELETED'): Promise<{ message: string; updated: number }> => {
  const response = await axiosInstance.post('/admin/bulk-status', { uuids, status });
  return response.data;
};

// ----- User Dashboard & Bill -----
export type UserSummary = {
  due_amount: number;
  unpaid_count: number;
  last_payment: { amount: number; paid_at: string; month?: string; year?: number } | null;
  last_reading: { month: string; year: number; consumption_liters: number; created_at: string } | null;
  connection_id: string;
  full_name: string;
};
export const getUserSummary = async (): Promise<UserSummary> => {
  const response = await axiosInstance.get('/user/summary');
  return response.data;
};
export type BillData = {
  consumption_uuid: string;
  connection_id: string;
  full_name: string;
  address: string;
  mobile_number: string;
  month: string;
  year: number;
  consumption_liters: number;
  rate_per_liter: number;
  amount: number;
  payment_status: string;
  organization_name: string;
  bill_due_day: number;
};
export const getBillData = async (consumptionUuid: string): Promise<BillData> => {
  const response = await axiosInstance.get(`/user/bill/${encodeURIComponent(consumptionUuid)}`);
  return response.data;
};

