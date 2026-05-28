import { DBRecord } from "./types";

/**
 * Default Seed Data for the LocalStorage simulator database and for Google Sheet seeding.
 */
export const SEED_RECORDS: DBRecord[] = [
  // ==================== USERS ====================
  {
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
  },
  {
    data_type: "USER",
    record_id: "USR_1",
    username: "se1",
    password: "password123",
    name: "Ahmad Hendra (Sales SE)",
    role: "SE",
    supervisor_username: "spv1",
    region: "DKI Jakarta",
    branch: "Jakarta Selatan",
    created_at: "2026-05-10T00:00:00Z",
    updated_at: "2026-05-10T00:00:00Z"
  },
  {
    data_type: "USER",
    record_id: "USR_2",
    username: "se2",
    password: "password123",
    name: "Budi Santoso (Sales SE)",
    role: "SE",
    supervisor_username: "spv1",
    region: "DKI Jakarta",
    branch: "Jakarta Selatan",
    created_at: "2026-05-10T00:00:00Z",
    updated_at: "2026-05-10T00:00:00Z"
  },
  {
    data_type: "USER",
    record_id: "USR_3",
    username: "spv1",
    password: "password123",
    name: "Siti Rahma (Supervisor SPV)",
    role: "SPV",
    supervisor_username: "asm1",
    region: "DKI Jakarta",
    branch: "Jakarta Selatan",
    created_at: "2026-05-10T00:00:00Z",
    updated_at: "2026-05-10T00:00:00Z"
  },
  {
    data_type: "USER",
    record_id: "USR_4",
    username: "asm1",
    password: "password123",
    name: "Rudi Hartono (Area Sales Manager ASM)",
    role: "ASM",
    supervisor_username: "ddm1",
    region: "DKI Jakarta",
    branch: "Jakarta Selatan",
    created_at: "2026-05-10T00:00:00Z",
    updated_at: "2026-05-10T00:00:00Z"
  },
  {
    data_type: "USER",
    record_id: "USR_5",
    username: "ddm1",
    password: "password123",
    name: "Dewi Lestari (Distributor Development Manager DDM)",
    role: "DDM",
    supervisor_username: "",
    region: "National",
    branch: "Head Office",
    created_at: "2026-05-10T00:00:00Z",
    updated_at: "2026-05-10T00:00:00Z"
  },

  // ==================== OUTLETS ====================
  {
    data_type: "OUTLET",
    record_id: "OUT_001",
    store_id: "ST001",
    store_name: "Indomaret Kemang Raya",
    address: "Jl. Kemang Raya No. 12A, Mampang Prapatan, Jakarta Selatan",
    region: "DKI Jakarta",
    branch: "Jakarta Selatan"
  },
  {
    data_type: "OUTLET",
    record_id: "OUT_002",
    store_id: "ST002",
    store_name: "Alfamart Tebet Dalam",
    address: "Jl. Tebet Barat Dalam Raya No. 44, Tebet, Jakarta Selatan",
    region: "DKI Jakarta",
    branch: "Jakarta Selatan"
  },
  {
    data_type: "OUTLET",
    record_id: "OUT_003",
    store_id: "ST003",
    store_name: "Superindo Fatmawati",
    address: "Jl. RS. Fatmawati Raya No. 15, Cilandak, Jakarta Selatan",
    region: "DKI Jakarta",
    branch: "Jakarta Selatan"
  },
  {
    data_type: "OUTLET",
    record_id: "OUT_004",
    store_id: "ST004",
    store_name: "K9 Mart Pejaten Village",
    address: "Pejaten Village LG Fl, Jl. Warung Jati Barat No. 39, Jakarta Selatan",
    region: "DKI Jakarta",
    branch: "Jakarta Selatan"
  },
  {
    data_type: "OUTLET",
    record_id: "OUT_005",
    store_id: "ST005",
    store_name: "Century Plaza Senayan",
    address: "Plaza Senayan Lantai 3, Jl. Asia Afrika No. 8, Tanah Abang",
    region: "DKI Jakarta",
    branch: "Jakarta Selatan"
  },
  {
    data_type: "OUTLET",
    record_id: "OUT_006",
    store_id: "ST006",
    store_name: "Hero Supermarket Pondok Indah",
    address: "Pondok Indah Mall 1 Ground Floor, Kebayoran Lama, Jakarta Selatan",
    region: "DKI Jakarta",
    branch: "Jakarta Selatan"
  },

  // ==================== SCHEDULES (Assigned Targets for Current Date Setup) ====================
  // Note: YYYY-MM-DD matches current year 2026 dynamically or seed dates in May 2026.
  {
    data_type: "SCHEDULE",
    record_id: "SCH_001",
    username: "se1",
    store_id: "ST001",
    store_name: "Indomaret Kemang Raya",
    visit_date: "2026-05-28"
  },
  {
    data_type: "SCHEDULE",
    record_id: "SCH_002",
    username: "se1",
    store_id: "ST002",
    store_name: "Alfamart Tebet Dalam",
    visit_date: "2026-05-28"
  },
  {
    data_type: "SCHEDULE",
    record_id: "SCH_003",
    username: "se1",
    store_id: "ST003",
    store_name: "Superindo Fatmawati",
    visit_date: "2026-05-28"
  },
  {
    data_type: "SCHEDULE",
    record_id: "SCH_004",
    username: "se1",
    store_id: "ST004",
    store_name: "K9 Mart Pejaten Village",
    visit_date: "2026-05-28"
  },
  {
    data_type: "SCHEDULE",
    record_id: "SCH_005",
    username: "se2",
    store_id: "ST003",
    store_name: "Superindo Fatmawati",
    visit_date: "2026-05-28"
  },
  {
    data_type: "SCHEDULE",
    record_id: "SCH_006",
    username: "se2",
    store_id: "ST005",
    store_name: "Century Plaza Senayan",
    visit_date: "2026-05-28"
  },
  {
    data_type: "SCHEDULE",
    record_id: "SCH_007",
    username: "se2",
    store_id: "ST006",
    store_name: "Hero Supermarket Pondok Indah",
    visit_date: "2026-05-28"
  },

  // ==================== HISTORICAL VISITS IN VARIOUS PHASES ====================
  {
    data_type: "VISIT",
    record_id: "VST_001",
    username: "se1",
    store_id: "ST001",
    store_name: "Indomaret Kemang Raya",
    address: "Jl. Kemang Raya No. 12A, Mampang Prapatan, Jakarta Selatan",
    visit_date: "2026-05-27",
    checkin_time: "09:15:30",
    photo_url: "https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=400&auto=format&fit=crop&q=60",
    omzet: 1250000,
    notes: "Ordered standard replenishment of Skintific sunscreen (10 boxes). Stocks low.",
    effective_call: "YES",
    approval_status: "DDM_APPROVED",
    rejection_notes: "",
    revision_count: 0,
    spv_approval: "APPROVED_BY_Siti SPV_AT_2026-05-27T03:00:00Z",
    asm_approval: "APPROVED_BY_Rudi ASM_AT_2026-05-27T04:30:00Z",
    ddm_approval: "APPROVED_BY_Dewi DDM_AT_2026-05-27T06:05:00Z",
    created_at: "2026-05-27T02:20:00Z",
    updated_at: "2026-05-27T06:05:00Z"
  },
  {
    data_type: "VISIT",
    record_id: "VST_002",
    username: "se1",
    store_id: "ST002",
    store_name: "Alfamart Tebet Dalam",
    address: "Jl. Tebet Barat Dalam Raya No. 44, Tebet, Jakarta Selatan",
    visit_date: "2026-05-27",
    checkin_time: "11:40:12",
    photo_url: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&auto=format&fit=crop&q=60",
    omzet: 0,
    notes: "Visited. Store manager rejected replenishment because inventory is still sufficient.",
    effective_call: "NO",
    approval_status: "ASM_APPROVED",
    rejection_notes: "",
    revision_count: 0,
    spv_approval: "APPROVED_BY_Siti SPV_AT_2026-05-27T05:00:00Z",
    asm_approval: "APPROVED_BY_Rudi ASM_AT_2026-05-27T07:15:00Z",
    ddm_approval: "PENDING",
    created_at: "2026-05-27T04:45:00Z",
    updated_at: "2026-05-27T07:15:00Z"
  },
  {
    data_type: "VISIT",
    record_id: "VST_003",
    username: "se2",
    store_id: "ST003",
    store_name: "Superindo Fatmawati",
    address: "Jl. RS. Fatmawati Raya No. 15, Cilandak, Jakarta Selatan",
    visit_date: "2026-05-27",
    checkin_time: "10:05:40",
    photo_url: "https://images.unsplash.com/photo-1534723328310-e82dad3ee43f?w=400&auto=format&fit=crop&q=60",
    omzet: 4200000,
    notes: "Bulk order for end-of-month promotion. Store requests delivery by next Monday.",
    effective_call: "YES",
    approval_status: "SUBMITTED",
    rejection_notes: "",
    revision_count: 0,
    spv_approval: "PENDING",
    asm_approval: "PENDING",
    ddm_approval: "PENDING",
    created_at: "2026-05-27T03:10:00Z",
    updated_at: "2026-05-27T03:10:00Z"
  },
  {
    data_type: "VISIT",
    record_id: "VST_004",
    username: "se1",
    store_id: "ST003",
    store_name: "Superindo Fatmawati",
    address: "Jl. RS. Fatmawati Raya No. 15, Cilandak, Jakarta Selatan",
    visit_date: "2026-05-26",
    checkin_time: "14:22:15",
    photo_url: "https://images.unsplash.com/photo-1516594798947-e65505dbb29d?w=400&auto=format&fit=crop&q=60",
    omzet: 180000,
    notes: "Low transaction value, only ordered 1 tester sample.",
    effective_call: "YES",
    approval_status: "REJECTED",
    rejection_notes: "Please confirm with the store manager about the order amount. An order of only 180k for this large tier outlet is unusual. Kindly clarify and edit.",
    revision_count: 0,
    spv_approval: "REJECTED_BY_Siti SPV_AT_2026-05-26T16:00:00Z",
    asm_approval: "PENDING",
    ddm_approval: "PENDING",
    created_at: "2026-05-26T07:25:00Z",
    updated_at: "2026-05-26T09:00:00Z"
  }
];
