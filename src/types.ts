/**
 * Data structures and types for the Effective Call Monitoring System.
 */

export type UserRole = "SE" | "SPV" | "ASM" | "DDM" | "ADMIN";

export type DataType = "USER" | "OUTLET" | "SCHEDULE" | "VISIT";

export type ApprovalStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "SPV_APPROVED"
  | "ASM_APPROVED"
  | "DDM_APPROVED"
  | "REJECTED"
  | "REVISION_REQUIRED"
  | "RESUBMITTED";

export type EffectiveCallType = "YES" | "NO";

export interface DBRecord {
  data_type: DataType;
  record_id: string;
  username?: string;
  password?: string;
  name?: string;
  role?: string;
  supervisor_username?: string;
  region?: string;
  branch?: string;
  store_id?: string;
  store_name?: string;
  address?: string;
  visit_date?: string;
  checkin_time?: string;
  photo_url?: string;
  omzet?: number;
  notes?: string;
  effective_call?: string;
  approval_status?: string;
  rejection_notes?: string;
  revision_count?: number;
  spv_approval?: string;
  asm_approval?: string;
  ddm_approval?: string;
  created_at?: string;
  updated_at?: string;
  rowIndex?: number;
}

export interface User {
  username: string;
  password?: string;
  name: string;
  role: UserRole;
  supervisor_username?: string;
  region?: string;
  branch?: string;
}

export interface Outlet {
  store_id: string;
  store_name: string;
  address: string;
  region?: string;
  branch?: string;
}

export interface Schedule {
  record_id: string;
  username: string; // Assigned SE
  store_id: string;
  store_name: string;
  visit_date: string; // YYYY-MM-DD
  data_type?: string;
}

export interface Visit {
  record_id: string;
  username: string; // Submitting SE
  store_id: string;
  store_name: string;
  address: string;
  visit_date: string;
  checkin_time: string;
  photo_url: string; // base64 string or url
  omzet: number;
  notes: string;
  effective_call: EffectiveCallType;
  approval_status: ApprovalStatus;
  rejection_notes: string;
  revision_count: number;
  spv_approval: string; // PENDING, or APPROVED_BY_...
  asm_approval: string;
  ddm_approval: string;
  created_at: string;
  updated_at: string;
}

export interface DashboardMetrics {
  totalVisits: number;
  totalEffectiveCalls: number;
  strikeRate: number; // Percentage of effective calls overall
  totalOmzet: number;
  pendingApprovals: number;
  rejectedVisits: number;
}
