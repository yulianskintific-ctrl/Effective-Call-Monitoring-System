import { DBRecord, User, Visit, Schedule, DashboardMetrics, UserRole, ApprovalStatus, Outlet } from "./types";
import { SEED_RECORDS } from "./mockData";

// LocalStorage Keys
const DB_KEY = "EC_MONITOR_DB_RECORDS";
const API_URL_KEY = "EC_MONITOR_API_URL";

/**
 * Initialize database with seed records if empty
 */
export function getLocalRecords(): DBRecord[] {
  const local = localStorage.getItem(DB_KEY);
  let records: DBRecord[] = [];
  if (!local) {
    records = [...SEED_RECORDS];
  } else {
    try {
      records = JSON.parse(local);
    } catch (e) {
      records = [...SEED_RECORDS];
    }
  }

  // Ensure Admin is always in the records list to prevent access issues
  const hasAdmin = records.some(r => r.data_type === "USER" && r.username?.trim().toLowerCase() === "admin");
  if (!hasAdmin) {
    records.unshift({
      data_type: "USER",
      record_id: "USR_ADMIN",
      username: "admin",
      password: "password123",
      name: "System Administrator",
      role: "ADMIN",
      supervisor_username: "",
      region: "National",
      branch: "HQ",
      created_at: "2026-05-10T00:00:00Z",
      updated_at: "2026-05-10T00:00:00Z"
    });
    localStorage.setItem(DB_KEY, JSON.stringify(records));
  }
  return records;
}

/**
 * Save records to local DB
 */
export function saveLocalRecords(records: DBRecord[]) {
  localStorage.setItem(DB_KEY, JSON.stringify(records));
}

/**
 * Normalize username to handle variations like se01 vs se1
 */
export function normalizeUname(uname: string | undefined): string {
  if (!uname) return "";
  return uname.trim().toLowerCase().replace(/^([a-zA-Z]+)0+([0-9]+)$/, "$1$2");
}

export function isSameUname(u1: string | undefined, u2: string | undefined): boolean {
  return normalizeUname(u1) === normalizeUname(u2);
}

let cachedCloudMode: boolean | null = null;

/**
 * Fetch and check if the backend server connects to Google Sheets via secure environment variables.
 */
export async function checkCloudConnection(): Promise<boolean> {
  if (cachedCloudMode !== null) {
    return cachedCloudMode;
  }
  try {
    const res = await fetch("/api/connection-status");
    const json = await res.json();
    cachedCloudMode = !!json.connected;
    return cachedCloudMode;
  } catch (e) {
    console.error("Failed to fetch backend connection status, falling back to local.", e);
    cachedCloudMode = false;
    return false;
  }
}

export function isCloudMode(): boolean {
  return cachedCloudMode ?? false;
}

/**
 * Dummy config management for backward compatibility
 */
export function getAppsScriptUrl(): string {
  return isCloudMode() ? "active" : "";
}

export function saveAppsScriptUrl(url: string) {
  // No-op, configuration is handled exclusively in the backend environment.
}

/**
 * General dynamic fetch handler proxying calls through the full-stack server
 */
async function callAppsScript(action: string, data: any = {}, quiet: boolean = false): Promise<any> {
  try {
    const response = await fetch("/api/apps-script", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ action, data })
    });

    if (!response.ok) {
      const jsonErr = await response.json().catch(() => ({}));
      throw new Error(jsonErr.error || `HTTP error! Status: ${response.status}`);
    }

    const json = await response.json();
    if (!json.success) {
      throw new Error(json.error || "Execution failed on Google Script backend.");
    }
    return json.data;
  } catch (error: any) {
    if (!quiet) {
      console.error("Apps Script API call error via proxy:", error);
    }
    throw new Error(`Cloud API Error: ${error.message || error}`);
  }
}

/**
 * 1. User Login
 */
export async function loginUser(username: string, password: string): Promise<User> {
  const isCloud = await checkCloudConnection();
  
  if (isCloud) {
    try {
      // Call Google Apps Script backend
      const result = await callAppsScript("login", { username, password });
      if (result.authenticated && result.user) {
        return {
          ...result.user,
          role: result.user.role as UserRole
        };
      }
      throw new Error("Invalid remote credentials");
    } catch (err: any) {
      // Robust fallback for the System Administrator account
      const usernameLower = username.trim().toLowerCase();
      if (usernameLower === "admin" && password === "password123") {
        console.warn("ADMIN Cloud login failed or not yet seeded in Spreadsheet. Running local fallback & auto-registering admin...");
        
        // Ensure admin occupies the local state
        const records = getLocalRecords();
        try {
          // Attempt to append this admin user to the remote Google Sheet via seed so online login will work next time
          await callAppsScript("seed", { records }).catch(() => {});
        } catch (syncErr) {
          console.error("Auto remote registration of admin failed:", syncErr);
        }

        return {
          username: "admin",
          name: "System Administrator",
          role: "ADMIN" as UserRole,
          supervisor_username: "",
          region: "National",
          branch: "HQ"
        };
      }
      throw err;
    }
  } else {
    // Simulate locally
    const records = getLocalRecords();
    const matched = records.find(
      r =>
        r.data_type === "USER" &&
        isSameUname(r.username, username) &&
        r.password === password
    );

    if (matched) {
      return {
        username: matched.username!,
        name: matched.name!,
        role: matched.role as UserRole,
        supervisor_username: matched.supervisor_username,
        region: matched.region,
        branch: matched.branch
      };
    }
    throw new Error("Invalid username index or password.");
  }
}

/**
 * 2. Get Targets/Schedules for a Sales Executive
 */
export async function getSchedules(username: string): Promise<Schedule[]> {
  const isCloud = await checkCloudConnection();

  if (isCloud) {
    const allRecords: DBRecord[] = await callAppsScript("getAll");
    return allRecords
      .filter(r => r.data_type === "SCHEDULE" && isSameUname(r.username, username))
      .map(r => ({
        record_id: r.record_id,
        username: r.username!,
        store_id: r.store_id!,
        store_name: r.store_name!,
        visit_date: r.visit_date!
      }));
  } else {
    const records = getLocalRecords();
    return records
      .filter(r => r.data_type === "SCHEDULE" && isSameUname(r.username, username))
      .map(r => ({
        record_id: r.record_id,
        username: r.username!,
        store_id: r.store_id!,
        store_name: r.store_name!,
        visit_date: r.visit_date!
      }));
  }
}

/**
 * 3. Submit Field Visit (Sales Executive)
 */
export async function submitVisit(visitData: {
  username: string;
  store_id: string;
  store_name: string;
  address: string;
  visit_date: string;
  checkin_time: string;
  photo_url: string;
  omzet: number;
  notes: string;
}): Promise<boolean> {
  const isCloud = await checkCloudConnection();

  if (isCloud) {
    await callAppsScript("submitVisit", visitData);
    return true;
  } else {
    const records = getLocalRecords();
    
    // Check duplication: 1 store per day per salesperson
    const dup = records.find(
      r =>
        r.data_type === "VISIT" &&
        r.store_id === visitData.store_id &&
        r.visit_date === visitData.visit_date &&
        r.approval_status !== "REJECTED"
    );
    if (dup) {
      throw new Error("This store has already been checked-in / visited today!");
    }

    const isEffective = visitData.omzet > 0 ? "YES" : "NO";
    const nowStr = new Date().toISOString();
    
    const newVisit: DBRecord = {
      data_type: "VISIT",
      record_id: "VST_" + Math.random().toString(36).substr(2, 9).toUpperCase(),
      username: visitData.username,
      store_id: visitData.store_id,
      store_name: visitData.store_name,
      address: visitData.address,
      visit_date: visitData.visit_date,
      checkin_time: visitData.checkin_time,
      photo_url: visitData.photo_url,
      omzet: Number(visitData.omzet),
      notes: visitData.notes,
      effective_call: isEffective,
      approval_status: "SUBMITTED",
      rejection_notes: "",
      revision_count: 0,
      spv_approval: "PENDING",
      asm_approval: "PENDING",
      ddm_approval: "PENDING",
      created_at: nowStr,
      updated_at: nowStr
    };

    records.push(newVisit);
    saveLocalRecords(records);
    return true;
  }
}

/**
 * 4. Get Visit History
 */
export async function getVisitHistory(filters: {
  username?: string;
  role?: UserRole;
  approval_status?: string;
}): Promise<Visit[]> {
  let rawVisits: DBRecord[] = [];
  const isCloud = await checkCloudConnection();

  if (isCloud) {
    const allRecords: DBRecord[] = await callAppsScript("getAll");
    rawVisits = allRecords.filter(r => r.data_type === "VISIT");
  } else {
    rawVisits = getLocalRecords().filter(r => r.data_type === "VISIT");
  }

  // Filter based on hierarchy if requested
  const allRecords: DBRecord[] = isCloud ? await callAppsScript("getAll") : getLocalRecords();
  const users = allRecords.filter(r => r.data_type === "USER");

  let filtered = rawVisits;

  if (filters.username && filters.role) {
    const uname = filters.username.toLowerCase();
    
    if (filters.role === "SE") {
      // SE only sees their own submit history
      filtered = filtered.filter(v => isSameUname(v.username, uname));
    } else if (filters.role === "SPV") {
      // SPV sees history of SEs supervised by them
      const supervisedSEs = users
        .filter(u => isSameUname(u.supervisor_username, uname))
        .map(u => normalizeUname(u.username));
      filtered = filtered.filter(v => supervisedSEs.includes(normalizeUname(v.username)));
    } else if (filters.role === "ASM") {
      // ASM sees history of employees supervised by SPVs under them, i.e., nested
      const supervisedSPVs = users
        .filter(u => isSameUname(u.supervisor_username, uname))
        .map(u => normalizeUname(u.username));
      
      const supervisedSEs = users
        .filter(u => u.supervisor_username && supervisedSPVs.includes(normalizeUname(u.supervisor_username)))
        .map(u => normalizeUname(u.username));

      filtered = filtered.filter(v => 
        supervisedSEs.includes(normalizeUname(v.username)) || 
        supervisedSPVs.includes(normalizeUname(v.username))
      );
    }
    // DDM sees all history
  }

  if (filters.approval_status && filters.approval_status !== "ALL") {
    filtered = filtered.filter(v => v.approval_status === filters.approval_status);
  }

  return filtered.map(r => ({
    record_id: r.record_id,
    username: r.username!,
    store_id: r.store_id!,
    store_name: r.store_name!,
    address: r.address || "",
    visit_date: r.visit_date!,
    checkin_time: r.checkin_time || "00:00:00",
    photo_url: r.photo_url || "",
    omzet: r.omzet || 0,
    notes: r.notes || "",
    effective_call: (r.effective_call || "NO") as any,
    approval_status: (r.approval_status || "SUBMITTED") as any,
    rejection_notes: r.rejection_notes || "",
    revision_count: r.revision_count || 0,
    spv_approval: r.spv_approval || "PENDING",
    asm_approval: r.asm_approval || "PENDING",
    ddm_approval: r.ddm_approval || "PENDING",
    created_at: r.created_at || "",
    updated_at: r.updated_at || ""
  }));
}

/**
 * 5. Approve Visit Action
 */
export async function approveVisit(
  recordId: string,
  reviewerName: string,
  role: UserRole
): Promise<boolean> {
  const isCloud = await checkCloudConnection();

  if (isCloud) {
    await callAppsScript("approveVisit", {
      record_id: recordId,
      reviewer_name: reviewerName,
      role: role
    });
    return true;
  } else {
    const records = getLocalRecords();
    const idx = records.findIndex(r => r.data_type === "VISIT" && r.record_id === recordId);
    if (idx === -1) {
      throw new Error("Visit record not found");
    }

    const nowStr = new Date().toISOString();
    const row = records[idx];

    let nextStatus = row.approval_status;
    if (role === "SPV") {
      row.spv_approval = `APPROVED_BY_${reviewerName}_AT_${nowStr}`;
      nextStatus = "SPV_APPROVED";
    } else if (role === "ASM") {
      row.asm_approval = `APPROVED_BY_${reviewerName}_AT_${nowStr}`;
      nextStatus = "ASM_APPROVED";
    } else if (role === "DDM") {
      row.ddm_approval = `APPROVED_BY_${reviewerName}_AT_${nowStr}`;
      nextStatus = "DDM_APPROVED";
    }

    row.approval_status = nextStatus;
    row.updated_at = nowStr;

    records[idx] = row;
    saveLocalRecords(records);
    return true;
  }
}

/**
 * 6. Reject Visit Action
 */
export async function rejectVisit(
  recordId: string,
  reviewerName: string,
  role: UserRole,
  rejectionNotes: string
): Promise<boolean> {
  const isCloud = await checkCloudConnection();

  if (isCloud) {
    await callAppsScript("rejectVisit", {
      record_id: recordId,
      reviewer_name: reviewerName,
      role: role,
      rejection_notes: rejectionNotes
    });
    return true;
  } else {
    const records = getLocalRecords();
    const idx = records.findIndex(r => r.data_type === "VISIT" && r.record_id === recordId);
    if (idx === -1) {
      throw new Error("Visit record not found");
    }

    const nowStr = new Date().toISOString();
    const row = records[idx];

    if (role === "SPV") {
      row.spv_approval = `REJECTED_BY_${reviewerName}_AT_${nowStr}`;
    } else if (role === "ASM") {
      row.asm_approval = `REJECTED_BY_${reviewerName}_AT_${nowStr}`;
    } else if (role === "DDM") {
      row.ddm_approval = `REJECTED_BY_${reviewerName}_AT_${nowStr}`;
    }

    row.approval_status = "REJECTED";
    row.rejection_notes = rejectionNotes;
    row.updated_at = nowStr;

    records[idx] = row;
    saveLocalRecords(records);
    return true;
  }
}

/**
 * 7. Resubmit Visit Action after corrections (SE)
 */
export async function resubmitVisit(
  recordId: string,
  omzet: number,
  notes: string,
  photoUrl?: string
): Promise<boolean> {
  const isCloud = await checkCloudConnection();

  if (isCloud) {
    await callAppsScript("resubmitVisit", {
      record_id: recordId,
      omzet,
      notes,
      photo_url: photoUrl
    });
    return true;
  } else {
    const records = getLocalRecords();
    const idx = records.findIndex(r => r.data_type === "VISIT" && r.record_id === recordId);
    if (idx === -1) {
      throw new Error("Visit record not found");
    }

    const nowStr = new Date().toISOString();
    const row = records[idx];

    const isEffective = omzet > 0 ? "YES" : "NO";
    const currentRevCount = Number(row.revision_count) || 0;

    row.omzet = Number(omzet);
    if (photoUrl) {
      row.photo_url = photoUrl;
    }
    row.notes = notes;
    row.effective_call = isEffective;
    row.approval_status = "RESUBMITTED";
    row.rejection_notes = "";
    row.revision_count = currentRevCount + 1;
    row.spv_approval = "PENDING";
    row.asm_approval = "PENDING";
    row.ddm_approval = "PENDING";
    row.updated_at = nowStr;

    records[idx] = row;
    saveLocalRecords(records);
    return true;
  }
}

/**
 * 8. Seed Remote Spreadsheet database
 */
export async function seedRemoteSpreadsheet(): Promise<boolean> {
  const records = getLocalRecords();
  return await callAppsScript("seed", { records });
}

export interface SpreadsheetDiagnostics {
  spreadsheetName: string;
  sheets: string[];
  masterDataExists: boolean;
  headers: string[];
  totalRows: number;
  dataTypeCounts: {
    USER: number;
    SCHEDULE: number;
    VISIT: number;
    OTHER: number;
  };
  users: {
    username: string;
    name: string;
    role: string;
  }[];
}

/**
 * 8.5 Diagnose Google Spreadsheet Structure
 * Calls the "diagnose" action, but gracefully falls back to client-side parsing
 * from "getAll" if the deployed Apps Script doesn't support the custom "diagnose" action.
 */
export async function diagnoseSpreadsheet(): Promise<SpreadsheetDiagnostics> {
  try {
    const result = await callAppsScript("diagnose", {}, true);
    if (result && result.users) {
      return result;
    }
    throw new Error("Invalid format returned from diagnose action.");
  } catch (err: any) {
    console.warn("Spreadsheet 'diagnose' action is unsupported. Falling back to parsing 'getAll' data client-side...");
    try {
      const allRecords: DBRecord[] = await callAppsScript("getAll", {}, true);
      
      const users = allRecords
        .filter(r => r.data_type === "USER")
        .map(r => ({
          username: r.username || "",
          name: r.name || "",
          role: r.role || ""
        }));

      const userCount = allRecords.filter(r => r.data_type === "USER").length;
      const scheduleCount = allRecords.filter(r => r.data_type === "SCHEDULE").length;
      const visitCount = allRecords.filter(r => r.data_type === "VISIT").length;
      const totalRows = allRecords.length;
      
      return {
        spreadsheetName: "Effective Call Database",
        sheets: ["MASTER_DATA"],
        masterDataExists: true,
        headers: ["data_type", "record_id", "username", "password", "name", "role", "supervisor_username", "region", "branch"],
        totalRows,
        dataTypeCounts: {
          USER: userCount,
          SCHEDULE: scheduleCount,
          VISIT: visitCount,
          OTHER: totalRows - (userCount + scheduleCount + visitCount)
        },
        users
      };
    } catch (fallbackErr: any) {
      console.error("Client-side diagnostics fallback failed:", fallbackErr);
      // Return empty/clean structure to prevent any UI crashes
      return {
        spreadsheetName: "Google Sheets Connection",
        sheets: ["MASTER_DATA"],
        masterDataExists: true,
        headers: [],
        totalRows: 0,
        dataTypeCounts: { USER: 0, SCHEDULE: 0, VISIT: 0, OTHER: 0 },
        users: []
      };
    }
  }
}

/**
 * 9. Get Dashboard Metrics (Dynamically structured per logged-in user & role)
 */
export async function getDashboard(username: string, role: UserRole): Promise<DashboardMetrics> {
  let visits: Visit[] = [];
  try {
    visits = await getVisitHistory({ username, role });
  } catch (err) {
    console.warn("Failed fetching dashboard visits directly from sources.", err);
    // fall back local
    const rawLocal = getLocalRecords().filter(r => r.data_type === "VISIT");
    visits = rawLocal.map(r => ({ ...r } as any));
  }

  const totalVisits = visits.length;
  const effectiveVisits = visits.filter(v => v.effective_call === "YES");
  const totalEffectiveCalls = effectiveVisits.length;
  const strikeRate = totalVisits > 0 ? Math.round((totalEffectiveCalls / totalVisits) * 100) : 0;
  const totalOmzet = visits.reduce((acc, v) => acc + (Number(v.omzet) || 0), 0);
  
  // Pending approvals depend on the log-in role
  let pendingApprovals = 0;
  if (role === "SPV") {
    // Needs to approve visits that are SUBMITTED or RESUBMITTED
    pendingApprovals = visits.filter(v => v.approval_status === "SUBMITTED" || v.approval_status === "RESUBMITTED").length;
  } else if (role === "ASM") {
    // Needs to approve visits SPV has approved
    pendingApprovals = visits.filter(v => v.approval_status === "SPV_APPROVED").length;
  } else if (role === "DDM") {
    // Needs to approve visits ASM has approved
    pendingApprovals = visits.filter(v => v.approval_status === "ASM_APPROVED").length;
  } else {
    // For SE, see visits pending any supervisor action
    pendingApprovals = visits.filter(v => 
      v.approval_status === "SUBMITTED" || 
      v.approval_status === "RESUBMITTED" || 
      v.approval_status === "SPV_APPROVED" || 
      v.approval_status === "ASM_APPROVED"
    ).length;
  }

  const rejectedVisits = visits.filter(v => v.approval_status === "REJECTED").length;

  return {
    totalVisits,
    totalEffectiveCalls,
    strikeRate,
    totalOmzet,
    pendingApprovals,
    rejectedVisits
  };
}

/**
 * 10. Admin User Management functions
 */
export async function getUsersList(): Promise<User[]> {
  const isCloud = await checkCloudConnection();
  let allRecords: DBRecord[] = [];
  if (isCloud) {
    allRecords = await callAppsScript("getAll", {}, true).catch(() => getLocalRecords());
  } else {
    allRecords = getLocalRecords();
  }
  return allRecords
    .filter(r => r.data_type === "USER")
    .map(r => ({
      username: r.username || "",
      password: r.password || "",
      name: r.name || "",
      role: r.role as UserRole,
      supervisor_username: r.supervisor_username || "",
      region: r.region || "",
      branch: r.branch || ""
    }));
}

export async function saveUser(user: User, isNew: boolean): Promise<boolean> {
  const isCloud = await checkCloudConnection();
  let records = getLocalRecords();
  
  if (isCloud) {
    try {
      records = await callAppsScript("getAll", {}, true);
    } catch (e) {
      console.warn("Could not fetch current cloud records for user saving, using local.", e);
    }
  }

  const unameNormalized = user.username.trim().toLowerCase();
  let targetRecord: DBRecord | null = null;
  
  // Find duplicate if inserting a new user
  if (isNew) {
    const exists = records.some(r => r.data_type === "USER" && r.username?.trim().toLowerCase() === unameNormalized);
    if (exists) {
      throw new Error("Username already exists!");
    }
    
    const newRecord: DBRecord = {
      data_type: "USER",
      record_id: "USR_" + Math.random().toString(36).substr(2, 9).toUpperCase(),
      username: user.username,
      password: user.password || "password123",
      name: user.name,
      role: user.role,
      supervisor_username: user.supervisor_username || "",
      region: user.region || "",
      branch: user.branch || "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    records.push(newRecord);
    targetRecord = newRecord;
  } else {
    // Editing existing
    const idx = records.findIndex(r => r.data_type === "USER" && r.username?.trim().toLowerCase() === unameNormalized);
    if (idx === -1) {
      throw new Error("User to update not found!");
    }
    records[idx] = {
      ...records[idx],
      name: user.name,
      password: user.password || records[idx].password || "password123",
      role: user.role,
      supervisor_username: user.supervisor_username || "",
      region: user.region || "",
      branch: user.branch || "",
      updated_at: new Date().toISOString()
    };
    targetRecord = records[idx];
  }

  // Save changes locally
  saveLocalRecords(records);

  if (isCloud && targetRecord) {
    try {
      await callAppsScript("saveRecord", targetRecord, true);
    } catch (err) {
      console.warn("Apps Script 'saveRecord' failed, falling back to legacy seed full transfer...", err);
      // Fallback
      await callAppsScript("seed", { records });
    }
  }

  return true;
}

export async function deleteUser(username: string): Promise<boolean> {
  const isCloud = await checkCloudConnection();
  let records = getLocalRecords();
  
  if (isCloud) {
    try {
      records = await callAppsScript("getAll", {}, true);
    } catch (e) {
      console.warn("Could not fetch current cloud records for user deletion, using local.", e);
    }
  }

  const unameNormalized = username.trim().toLowerCase();
  
  if (unameNormalized === "admin") {
    throw new Error("Cannot delete supreme admin account!");
  }

  const filtered = records.filter(r => !(r.data_type === "USER" && r.username?.trim().toLowerCase() === unameNormalized));
  
  if (filtered.length === records.length) {
    throw new Error("User to delete not found.");
  }

  records = filtered;
  saveLocalRecords(records);

  if (isCloud) {
    try {
      await callAppsScript("deleteRecord", { data_type: "USER", username: unameNormalized }, true);
    } catch (err) {
      console.warn("Apps Script 'deleteRecord' failed, falling back to legacy seed full transfer...", err);
      await callAppsScript("seed", { records });
    }
  }

  return true;
}

/**
 * 11. DDM Schedule and Outlet Management functions
 */
export async function getOutletsList(): Promise<Outlet[]> {
  const isCloud = await checkCloudConnection();
  let allRecords: DBRecord[] = [];
  if (isCloud) {
    allRecords = await callAppsScript("getAll", {}, true).catch(() => getLocalRecords());
  } else {
    allRecords = getLocalRecords();
  }
  return allRecords
    .filter(r => r.data_type === "OUTLET")
    .map(r => ({
      store_id: r.store_id || "",
      store_name: r.store_name || "",
      address: r.address || "",
      region: r.region,
      branch: r.branch
    }));
}

export async function getAllSchedules(): Promise<Schedule[]> {
  const isCloud = await checkCloudConnection();
  let allRecords: DBRecord[] = [];
  if (isCloud) {
    allRecords = await callAppsScript("getAll", {}, true).catch(() => getLocalRecords());
  } else {
    allRecords = getLocalRecords();
  }
  return allRecords
    .filter(r => r.data_type === "SCHEDULE")
    .map(r => ({
      record_id: r.record_id || "",
      username: r.username || "",
      store_id: r.store_id || "",
      store_name: r.store_name || "",
      visit_date: r.visit_date || "",
      data_type: r.data_type
    }));
}

export async function saveSchedule(scheduleInput: {
  record_id?: string;
  username: string;
  store_id: string;
  store_name: string;
  visit_date: string;
}): Promise<boolean> {
  const isCloud = await checkCloudConnection();
  let records = getLocalRecords();

  if (isCloud) {
    try {
      records = await callAppsScript("getAll", {}, true);
    } catch (e) {
      console.warn("Could not fetch current cloud records for schedule saving, using local.", e);
    }
  }

  const isNew = !scheduleInput.record_id;
  let targetRecord: DBRecord | null = null;
  
  if (isNew) {
    // Check duplication: a salesperson can only visit a store once on a specified date
    const dup = records.some(
      r =>
        r.data_type === "SCHEDULE" &&
        r.username?.trim().toLowerCase() === scheduleInput.username.trim().toLowerCase() &&
        r.store_id === scheduleInput.store_id &&
        r.visit_date === scheduleInput.visit_date
    );
    if (dup) {
      throw new Error(`Salesperson tersebut sudah memiliki jadwal kunjungan ke toko ini pada tanggal ${scheduleInput.visit_date}!`);
    }

    const newRecord: DBRecord = {
      data_type: "SCHEDULE",
      record_id: "SCH_" + Math.random().toString(36).substr(2, 9).toUpperCase(),
      username: scheduleInput.username.trim().toLowerCase(),
      store_id: scheduleInput.store_id,
      store_name: scheduleInput.store_name,
      visit_date: scheduleInput.visit_date,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    records.push(newRecord);
    targetRecord = newRecord;
  } else {
    // Edit existing schedule
    const idx = records.findIndex(r => r.data_type === "SCHEDULE" && r.record_id === scheduleInput.record_id);
    if (idx === -1) {
      throw new Error("Jadwal kunjungan tidak ditemukan!");
    }
    records[idx] = {
      ...records[idx],
      username: scheduleInput.username.trim().toLowerCase(),
      store_id: scheduleInput.store_id,
      store_name: scheduleInput.store_name,
      visit_date: scheduleInput.visit_date,
      updated_at: new Date().toISOString()
    };
    targetRecord = records[idx];
  }

  // Save changes locally
  saveLocalRecords(records);

  if (isCloud && targetRecord) {
    try {
      await callAppsScript("saveRecord", targetRecord, true);
    } catch (err) {
      console.warn("Apps Script 'saveRecord' failed, falling back to legacy seed...", err);
      // Sync immediately as fallback
      await callAppsScript("seed", { records });
    }
  }

  return true;
}

export async function deleteSchedule(recordId: string): Promise<boolean> {
  const isCloud = await checkCloudConnection();
  let records = getLocalRecords();
  
  if (isCloud) {
    try {
      records = await callAppsScript("getAll", {}, true);
    } catch (e) {
      console.warn("Could not fetch current cloud records for schedule deletion, using local.", e);
    }
  }

  const filtered = records.filter(r => !(r.data_type === "SCHEDULE" && r.record_id === recordId));
  
  if (filtered.length === records.length) {
    throw new Error("Jadwal kunjungan untuk dihapus tidak ditemukan.");
  }

  records = filtered;
  saveLocalRecords(records);

  if (isCloud) {
    try {
      await callAppsScript("deleteRecord", { data_type: "SCHEDULE", record_id: recordId }, true);
    } catch (err) {
      console.warn("Apps Script 'deleteRecord' failed, falling back to legacy seed...", err);
      await callAppsScript("seed", { records });
    }
  }

  return true;
}

