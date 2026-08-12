export type UserRole = "USER" | "ADMIN";
export type UserStatus = "ACTIVE" | "DELETED" | "REVOKE";
export type PaymentStatus = "PAID" | "UNPAID";

export interface UserRow {
  id?: number;
  uuid: string;
  full_name: string;
  mobile_number: string;
  password?: string;
  role: UserRole | string;
  address: string;
  status: UserStatus | string;
  connection_id?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface UserPublicRow {
  uuid: string;
  full_name: string;
  mobile_number: string;
  role: UserRole | string;
  address: string;
  status: UserStatus | string;
  connection_id?: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface WaterConsumptionRow {
  id?: number;
  uuid: string;
  user_uuid: string;
  month: string;
  year: number;
  consumption_liters: number;
  previous_meter_reading?: number | null;
  current_meter_reading?: number | null;
  meter_photo_path?: string | null;
  rate_per_liter: number;
  amount: number;
  payment_status: PaymentStatus | string;
  created_at?: Date;
  updated_at?: Date;
  full_name?: string;
  mobile_number?: string;
  connection_id?: string;
}

export interface PaymentRow {
  id?: number;
  uuid: string;
  user_uuid: string;
  consumption_uuid: string;
  amount: number;
  payment_method: string;
  transaction_id: string;
  upi_id?: string | null;
  paid_at?: Date;
  created_at?: Date;
  month?: string;
  year?: number;
  full_name?: string;
  mobile_number?: string;
  connection_id?: string;
}

export interface NotificationRow {
  id?: number;
  uuid: string;
  user_id: string;
  notification_details: string;
  related_to: string;
  is_read: number | boolean;
  created_at?: Date;
  updated_at?: Date;
  full_name?: string;
  mobile_number?: string;
  connection_id?: string;
}

export interface PasswordResetOtpRow {
  id?: number;
  mobile_number: string;
  user_uuid: string;
  otp: string;
  attempt_count: number;
  max_attempts: number;
  is_verified: number | boolean;
  reset_key: string | null;
  expires_at: Date;
  created_at?: Date;
  updated_at?: Date;
}

export interface AuditLogRow {
  id?: number;
  uuid: string;
  user_uuid: string;
  user_role: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: string | Record<string, unknown> | null;
  ip_address: string | null;
  created_at?: Date;
}

export interface UserFilterOptions {
  q?: string;
  role?: string;
  status?: string;
}

export interface AuditLogFilterOptions {
  from?: string;
  to?: string;
  action?: string;
  user_uuid?: string;
  page?: number | string;
  limit?: number | string;
}

export interface AuditLogListResult {
  logs: AuditLogRow[];
  total: number;
  page: number;
  limit: number;
}

export interface WaterConsumptionCreateOptions {
  previous_meter_reading?: number | string | null;
  current_meter_reading?: number | string | null;
  meter_photo_path?: string | null;
}

export interface WaterConsumptionUpdateOptions {
  previous_meter_reading?: number | string | null;
  current_meter_reading?: number | string | null;
  meter_photo_path?: string | null;
}

export interface JwtUserPayload {
  uuid: string;
  role: UserRole | string;
  fullName?: string;
  mobileNumber?: string;
  iat?: number;
  exp?: number;
}
