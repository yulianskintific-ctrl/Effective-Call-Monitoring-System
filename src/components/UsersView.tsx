import React, { useState, useEffect } from "react";
import { 
  getUsersList, 
  saveUser, 
  deleteUser, 
  checkCloudConnection,
  seedRemoteSpreadsheet,
  diagnoseSpreadsheet,
  SpreadsheetDiagnostics
} from "../api";
import { User, UserRole } from "../types";
import { 
  Users, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Shield, 
  MapPin, 
  User as UserIcon, 
  Lock, 
  X, 
  Save, 
  AlertTriangle, 
  CheckCircle,
  HelpCircle,
  ChevronDown,
  Building,
  RefreshCw,
  Globe,
  Layers,
  Activity,
  XCircle
} from "lucide-react";

interface UsersViewProps {
  currentUser: User;
}

export default function UsersView({ currentUser }: UsersViewProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [cloudConnected, setCloudConnected] = useState(false);

  // Success & Error Alerts
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formValues, setFormValues] = useState({
    username: "",
    password: "",
    name: "",
    role: "SE" as UserRole,
    supervisor_username: "",
    region: "",
    branch: ""
  });

  // Deletion Confirmation Target
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // Google Spreadsheet Controls & Diagnostics State
  const [usingRealAppsScript, setUsingRealAppsScript] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState<string | null>(null);
  const [diagLoading, setDiagLoading] = useState(false);
  const [diagData, setDiagData] = useState<SpreadsheetDiagnostics | null>(null);
  const [diagError, setDiagError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers(true);
    
    // Auto-sync polling every 15 seconds
    const interval = setInterval(() => {
      fetchUsers(true);
    }, 15000);

    checkCloudConnection().then(async (connected) => {
      setCloudConnected(connected);
      setUsingRealAppsScript(connected);
      if (connected) {
        setDiagLoading(true);
        try {
          const data = await diagnoseSpreadsheet();
          setDiagData(data);
        } catch (err: any) {
          console.debug("Note: Auto-diagnostics returned offline/local fallback state:", err);
        } finally {
          setDiagLoading(false);
        }
      }
    });

    return () => clearInterval(interval);
  }, []);

  const handleSeedRemote = async () => {
    setSeeding(true);
    setErrorMsg(null);
    setSeedSuccess(null);
    try {
      await seedRemoteSpreadsheet();
      setSeedSuccess("Berhasil melakukan inisialisasi / seeding data default ke Google Sheet Anda! Akun demo dan struktur dasar master data siap digunakan.");
      // Refresh user list after seed to show the newly seeded accounts
      fetchUsers();
      // Also re-run diagnostics
      handleRunDiagnostics();
    } catch (err: any) {
      setErrorMsg("Gagal melakukan seeding: " + (err?.message || err));
    } finally {
      setSeeding(false);
    }
  };

  const handleRunDiagnostics = async () => {
    setDiagLoading(true);
    setDiagError(null);
    setDiagData(null);
    try {
      const data = await diagnoseSpreadsheet();
      setDiagData(data);
    } catch (err: any) {
      console.error(err);
      setDiagError(err?.message || "Gagal menghubungi API Diagnostik Google Apps Script.");
    } finally {
      setDiagLoading(false);
    }
  };

  const fetchUsers = async (silent: boolean = false) => {
    try {
      if (!silent) setLoading(true);
      setErrorMsg(null);
      const data = await getUsersList();
      setUsers(data);
    } catch (err: any) {
      console.error(err);
      if (!silent) setErrorMsg("Gagal mengambil data akun: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 5000);
  };

  const handleOpenAddForm = () => {
    setIsEditing(false);
    setFormValues({
      username: "",
      password: "password123",
      name: "",
      role: "SE",
      supervisor_username: "",
      region: "",
      branch: ""
    });
    setErrorMsg(null);
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (u: User) => {
    setIsEditing(true);
    setFormValues({
      username: u.username,
      password: u.password || "",
      name: u.name,
      role: u.role,
      supervisor_username: u.supervisor_username || "",
      region: u.region || "",
      branch: u.branch || ""
    });
    setErrorMsg(null);
    setIsFormOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormValues(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formValues.username || !formValues.name || !formValues.role) {
      setErrorMsg("Harap lengkapi semua field wajib (Username, Nama, Role)");
      return;
    }

    try {
      setActionLoading(true);
      setErrorMsg(null);
      
      const userToSave: User = {
        username: formValues.username.trim().toLowerCase(),
        password: formValues.password,
        name: formValues.name.trim(),
        role: formValues.role,
        supervisor_username: formValues.supervisor_username.trim() || undefined,
        region: formValues.region.trim() || undefined,
        branch: formValues.branch.trim() || undefined
      };

      await saveUser(userToSave, !isEditing);
      
      showSuccess(isEditing ? `Akun "${formValues.username}" berhasil diperbarui!` : `Akun baru "${formValues.username}" berhasil ditambahkan!`);
      setIsFormOpen(false);
      fetchUsers();
    } catch (err: any) {
      setErrorMsg("Gagal menyimpan akun: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async (username: string) => {
    try {
      setActionLoading(true);
      setErrorMsg(null);
      await deleteUser(username);
      showSuccess(`Akun "${username}" berhasil dihapus!`);
      setDeleteTarget(null);
      fetchUsers();
    } catch (err: any) {
      setErrorMsg("Gagal menghapus akun: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Filter & Search logic
  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.region || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.branch || "").toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = roleFilter === "ALL" || u.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  // Supervisor Suggestions based on roles
  // SE should report to SPV
  // SPV should report to ASM
  // ASM should report to DDM
  const getSupervisorsForRole = (role: UserRole) => {
    if (role === "SE") return users.filter(u => u.role === "SPV");
    if (role === "SPV") return users.filter(u => u.role === "ASM");
    if (role === "ASM") return users.filter(u => u.role === "DDM");
    return [];
  };

  const availableSupervisors = getSupervisorsForRole(formValues.role);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-sky-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 bg-sky-100 rounded-xl flex items-center justify-center text-sky-600 shadow-sm">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-sky-950 font-sans tracking-tight">Manajemen Akun Pengguna</h1>
            <p className="text-xs text-sky-500 font-medium">Tambah, edit, atau hapus kredensial sales & supervisor</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchUsers}
            className="p-2.5 bg-sky-50 text-sky-700 hover:bg-sky-100 rounded-xl transition-all cursor-pointer font-bold border border-sky-100/60"
            title="SINKRONKAN / REFRESH"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-sky-550" : ""}`} />
          </button>
          
          <button
            onClick={handleOpenAddForm}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold text-xs tracking-wide transition-all shadow-md shadow-sky-600/10 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Akun Baru</span>
          </button>
        </div>
      </div>

      {/* Success Alarm Alert */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-100 text-emerald-850 px-4 py-3.5 rounded-xl text-xs font-bold font-sans flex items-center gap-2.5 animate-fadeIn shadow-sm">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Error Alarm Alert */}
      {errorMsg && (
        <div className="bg-rose-50 border border-rose-100 text-rose-850 px-4 py-3.5 rounded-xl text-xs font-bold font-sans flex items-center gap-2.5 animate-fadeIn shadow-sm">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          <span className="flex-1">{errorMsg}</span>
        </div>
      )}

      {/* Primary search & Filters bar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-white p-5 rounded-2xl border border-sky-100 shadow-sm">
        <div className="md:col-span-7 relative">
          <Search className="w-4 h-4 text-sky-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Cari berdasarkan nama, username, wilayah, atau cabang..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs bg-sky-50/50 hover:bg-sky-50 focus:bg-white border border-sky-100 focus:border-sky-500 rounded-xl outline-none transition-all font-medium text-sky-950 placeholder-sky-400"
          />
        </div>

        <div className="md:col-span-3">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full px-3.5 py-2 text-xs bg-sky-50/50 hover:bg-sky-50 focus:bg-white border border-sky-100 focus:border-sky-500 rounded-xl outline-none transition-all font-bold text-sky-850 cursor-pointer"
          >
            <option value="ALL">Semua Jabatan (Role)</option>
            <option value="ADMIN">ADMIN - Administrator</option>
            <option value="DDM">DDM - Distributor Development Manager</option>
            <option value="ASM">ASM - Area Sales Manager</option>
            <option value="SPV">SPV - Supervisor</option>
            <option value="SE">SE - Sales Executive</option>
          </select>
        </div>

        <div className="md:col-span-2 flex items-center justify-end">
          <span className="text-[10px] font-extrabold text-sky-500 tracking-wider">
            {filteredUsers.length} AKUN DITEMUKAN
          </span>
        </div>
      </div>

      {/* Delete Confirmation Overlay Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-sky-950/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-sky-100 animate-scaleUp">
            <div className="flex items-center gap-3 text-rose-600 mb-4">
              <div className="h-10 w-10 rounded-xl bg-rose-50 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-rose-600 animate-pulse" />
              </div>
              <h3 className="text-base font-extrabold font-sans">Konfirmasi Hapus Akun</h3>
            </div>
            
            <p className="text-xs text-sky-900 leading-relaxed mb-6">
              Apakah Anda benar-benar ingin menghapus pengguna dengan username <strong className="text-sky-950">"{deleteTarget}"</strong>? 
              Tindakan ini permanen dan akan menghapus kredensial login mereka secara langsung dari pangkalan data.
            </p>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 bg-sky-50 text-sky-800 hover:bg-sky-100 text-xs font-extrabold rounded-xl transition-all cursor-pointer"
                disabled={actionLoading}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleDeleteUser(deleteTarget)}
                className="px-4 py-2 bg-rose-600 text-white hover:bg-rose-700 text-xs font-extrabold rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-md shadow-rose-650/10"
                disabled={actionLoading}
              >
                {actionLoading ? "Menghapus..." : "Ya, Hapus Akun"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Drawer Form for Add / Edit User */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-sky-950/40 z-50 flex justify-end p-0 md:p-4 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md h-full md:h-auto md:rounded-2xl shadow-2xl flex flex-col overflow-hidden border-l md:border border-sky-100 animate-slideLeft">
            
            {/* Form Header */}
            <div className="p-6 border-b border-sky-100 flex items-center justify-between bg-sky-50/50">
              <div className="flex items-center gap-2.5">
                <div className="h-10 w-10 bg-sky-100 rounded-xl flex items-center justify-center text-sky-700">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-sky-950 font-sans tracking-tight">
                    {isEditing ? "Ubah Profil Akun" : "Daftarkan Akun Baru"}
                  </h3>
                  <p className="text-[10px] text-sky-500 font-bold uppercase tracking-wide">
                    {isEditing ? `username: ${formValues.username}` : "isi formulir di bawah"}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 hover:bg-sky-100 rounded-lg text-sky-400 hover:text-sky-700 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Content */}
            <form onSubmit={handleFormSubmit} className="flex-1 p-6 overflow-y-auto space-y-4">
              
              {/* Username field (disabled in edit mode) */}
              <div>
                <label className="block text-[10px] font-extrabold text-sky-550 uppercase tracking-widest mb-1.5">
                  Username *
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-sky-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    name="username"
                    value={formValues.username}
                    onChange={handleInputChange}
                    placeholder="Contoh: se01 atau spv_jakarta"
                    disabled={isEditing}
                    className="w-full pl-9 pr-4 py-2 text-xs bg-sky-50/50 disabled:bg-sky-100/70 disabled:text-sky-450 focus:bg-white border border-sky-100 focus:border-sky-500 rounded-xl outline-none transition-all font-bold text-sky-950 placeholder-sky-400"
                    required
                  />
                </div>
                {!isEditing && (
                  <p className="text-[9px] text-sky-400 mt-1 font-bold">Note: Username bersifat unik, tidak sensitif huruf besar/kecil.</p>
                )}
              </div>

              {/* Password field */}
              <div>
                <label className="block text-[10px] font-extrabold text-sky-550 uppercase tracking-widest mb-1.5">
                  Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-sky-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    name="password"
                    value={formValues.password}
                    onChange={handleInputChange}
                    placeholder="Minimal 6 karakter"
                    className="w-full pl-9 pr-4 py-2 text-xs bg-sky-50/50 focus:bg-white border border-sky-100 focus:border-sky-500 rounded-xl outline-none transition-all font-mono font-bold text-sky-950 placeholder-sky-400"
                    required
                  />
                </div>
              </div>

              {/* Real Name */}
              <div>
                <label className="block text-[10px] font-extrabold text-sky-550 uppercase tracking-widest mb-1.5">
                  Nama Lengkap *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formValues.name}
                  onChange={handleInputChange}
                  placeholder="Contoh: Budi Santoso (Sales SE)"
                  className="w-full px-3.5 py-2 text-xs bg-sky-50/50 focus:bg-white border border-sky-100 focus:border-sky-500 rounded-xl outline-none transition-all font-semibold text-sky-950 placeholder-sky-400"
                  required
                />
              </div>

              {/* Role Select */}
              <div>
                <label className="block text-[10px] font-extrabold text-sky-555 uppercase tracking-widest mb-1.5">
                  Jabatan / Role *
                </label>
                <select
                  name="role"
                  value={formValues.role}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 text-xs bg-sky-50/50 focus:bg-white border border-sky-100 focus:border-sky-500 rounded-xl outline-none transition-all font-extrabold text-sky-900 cursor-pointer"
                  required
                >
                  <option value="SE">SE - Sales Executive</option>
                  <option value="SPV">SPV - Supervisor</option>
                  <option value="ASM">ASM - Area Sales Manager</option>
                  <option value="DDM">DDM - Distributor Development Manager</option>
                  <option value="ADMIN">ADMIN - Administrator</option>
                </select>
              </div>

              {/* Supervisor selection */}
              {formValues.role !== "ADMIN" && formValues.role !== "DDM" && (
                <div>
                  <label className="block text-[10px] font-extrabold text-sky-550 uppercase tracking-widest mb-1.5">
                    Supervisor / Atasan Langsung
                  </label>
                  <select
                    name="supervisor_username"
                    value={formValues.supervisor_username}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 text-xs bg-sky-50/50 focus:bg-white border border-sky-100 focus:border-sky-500 rounded-xl outline-none transition-all font-extrabold text-sky-900 cursor-pointer"
                  >
                    <option value="">-- Hubungkan dengan Atasan --</option>
                    {availableSupervisors.map(u => (
                      <option key={u.username} value={u.username}>
                        {u.name} ({u.username})
                      </option>
                    ))}
                  </select>
                  <p className="text-[9px] text-sky-400 mt-1 font-semibold leading-snug">
                    {formValues.role === "SE" && "SE wajib melapor ke Supervisor (SPV)"}
                    {formValues.role === "SPV" && "SPV wajib melapor ke Area Manager (ASM)"}
                    {formValues.role === "ASM" && "ASM wajib melapor ke Deputy Manager (DDM)"}
                  </p>
                </div>
              )}

              {/* Region field */}
              <div>
                <label className="block text-[10px] font-extrabold text-sky-550 uppercase tracking-widest mb-1.5">
                  Wilayah / Region (Opsional)
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-sky-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    name="region"
                    value={formValues.region}
                    onChange={handleInputChange}
                    placeholder="Contoh: DKI Jakarta"
                    className="w-full pl-9 pr-4 py-2 text-xs bg-sky-50/50 focus:bg-white border border-sky-100 focus:border-sky-500 rounded-xl outline-none transition-all font-semibold text-sky-950 placeholder-sky-400"
                  />
                </div>
              </div>

              {/* Branch field */}
              <div>
                <label className="block text-[10px] font-extrabold text-sky-550 uppercase tracking-widest mb-1.5">
                  Cabang / Branch (Opsional)
                </label>
                <div className="relative">
                  <Building className="w-4 h-4 text-sky-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    name="branch"
                    value={formValues.branch}
                    onChange={handleInputChange}
                    placeholder="Contoh: Jakarta Selatan"
                    className="w-full pl-9 pr-4 py-2 text-xs bg-sky-50/50 focus:bg-white border border-sky-100 focus:border-sky-500 rounded-xl outline-none transition-all font-semibold text-sky-950 placeholder-sky-400"
                  />
                </div>
              </div>



            </form>

            {/* Form Footer Actions */}
            <div className="p-4 bg-sky-50/50 border-t border-sky-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-4 py-2 bg-white hover:bg-sky-50 text-sky-800 text-xs font-bold rounded-xl border border-sky-100 transition-all cursor-pointer"
                disabled={actionLoading}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleFormSubmit}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-sky-600/10 flex items-center gap-1.5 cursor-pointer"
                disabled={actionLoading}
              >
                <Save className="w-4 h-4" />
                <span>{actionLoading ? "Menyimpan..." : "Simpan Akun"}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Users Grid Card / List Dashboard */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-sky-100 shadow-sm p-12 text-center flex flex-col items-center justify-center">
          <div className="h-10 w-10 border-4 border-sky-200 border-t-sky-600 rounded-full animate-spin mb-3"></div>
          <span className="text-xs font-extrabold text-sky-600">Sedang memuat daftar pengguna, mohon tunggu...</span>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-sky-100 shadow-sm p-12 text-center flex flex-col items-center justify-center">
          <Users className="w-12 h-12 text-sky-300 mb-3" />
          <h3 className="text-sm font-extrabold text-sky-950 font-sans">Tidak ada akun yang sesuai kriteria</h3>
          <p className="text-xs text-sky-400 mt-1 max-w-sm mx-auto">
            Silakan coba ubah kata kunci pencarian atau ubah filter jabatan Anda.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredUsers.map((u) => {
            const isSelf = u.username.toLowerCase() === currentUser.username.toLowerCase();
            const isAdminAcc = u.role === "ADMIN";
            
            return (
              <div 
                key={u.username} 
                className={`bg-white rounded-2xl border ${isSelf ? "border-sky-500 shadow-sky-100" : "border-sky-100"} shadow-sm p-5 hover:shadow-md transition-all relative flex flex-col justify-between`}
              >
                {/* Upper Details */}
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3.5">
                    {/* Role Indicator Badge */}
                    <span className={`text-[9px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                      u.role === "ADMIN" ? "bg-purple-100 text-purple-700" :
                      u.role === "DDM" ? "bg-indigo-100 text-indigo-700" :
                      u.role === "ASM" ? "bg-blue-100 text-blue-700" :
                      u.role === "SPV" ? "bg-amber-100 text-amber-700" :
                      "bg-sky-100 text-sky-700"
                    }`}>
                      {u.role}
                    </span>

                    {isSelf && (
                      <span className="text-[8px] bg-emerald-150 text-emerald-700 border border-emerald-200/50 font-extrabold px-1.5 py-0.5 rounded-lg">
                        SAYA
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-extrabold text-sky-950 font-sans leading-snug line-clamp-1">{u.name}</h3>
                  
                  <div className="mt-3 space-y-2 text-xs font-semibold text-sky-700">
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <span className="text-sky-400 font-extrabold font-mono text-[9px] w-14 block select-none">USERNAME:</span>
                      <span className="text-sky-900 font-bold font-mono bg-sky-50 px-1.5 py-0.5 rounded text-[11px] font-medium">{u.username}</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px]">
                      <span className="text-sky-400 font-extrabold font-mono text-[9px] w-14 block select-none">PASSWORD:</span>
                      <span className="text-sky-600 font-medium font-mono truncate">{u.password || "*********"}</span>
                    </div>

                    <div className="flex items-start gap-1.5 text-[11px] leading-relaxed">
                      <span className="text-sky-400 font-extrabold font-mono text-[9px] w-14 block select-none">ATASAN:</span>
                      <span className="text-sky-900 leading-snug font-medium truncate flex-1">
                        {u.supervisor_username ? `@${u.supervisor_username}` : "-"}
                      </span>
                    </div>

                    {(u.region || u.branch) && (
                      <div className="pt-2 border-t border-sky-50/80 flex items-center justify-between text-[10px] text-sky-500 font-bold">
                        <span className="flex items-center gap-1 truncate max-w-[50%]">
                          <MapPin className="w-3 h-3 text-sky-400 shrink-0" />
                          <span className="truncate">{u.region || "-"}</span>
                        </span>
                        <span className="flex items-center gap-1 truncate max-w-[50%]">
                          <Building className="w-3 h-3 text-sky-400 shrink-0" />
                          <span className="truncate">{u.branch || "-"}</span>
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Actions Row */}
                <div className="mt-5 pt-3 border-t border-sky-50/80 flex items-center justify-end gap-1">
                  <button
                    onClick={() => handleOpenEditForm(u)}
                    className="p-2 text-sky-600 hover:text-sky-900 hover:bg-sky-50 rounded-lg transition-all cursor-pointer font-bold inline-flex items-center gap-1 text-[10px]"
                    title="UBAH PROFIL / PASSWORD"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Ubah</span>
                  </button>

                  {!isSelf && u.username !== "admin" && (
                    <button
                      onClick={() => setDeleteTarget(u.username)}
                      className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-all cursor-pointer font-bold inline-flex items-center gap-1 text-[10px]"
                      title="HAPUS AKUN"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus</span>
                    </button>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Google Spreadsheet Integration & Developer Diagnostics Section */}
      <div className="bg-white rounded-2xl border border-sky-100 shadow-sm p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-sky-50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 shadow-inner">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-sky-950 font-sans tracking-tight">Integrasi Google Spreadsheet & Diagnostik Cloud</h2>
              <p className="text-[11px] text-sky-500 font-bold uppercase tracking-wider">Khusus Administrator • Sinkronisasi Data Riil & Seeder</p>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5 bg-sky-50 text-sky-900 px-3.5 py-1.5 rounded-full text-[11px] font-bold border border-sky-100 shadow-xs">
            {usingRealAppsScript ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Koneksi Google Sheets Aktif (Real Cloud)</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span>Mode Simulasi Lokal (Offline)</span>
              </>
            )}
          </div>
        </div>

        {/* Action Controls Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Seeding Block */}
          <div className="bg-sky-5/10 p-5 rounded-2xl border border-sky-100/50 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex gap-2.5 items-start text-xs font-semibold text-sky-955">
                <Layers className="w-5 h-5 text-indigo-600 shrink-0" />
                <div>
                  <h3 className="font-extrabold text-sky-900 text-xs">Pangkalan Data Google Sheet Baru / Kosong?</h3>
                  <p className="text-[11px] text-sky-500 font-medium leading-relaxed mt-1">
                    Jika Anda baru pertama kali menghubungkan Spreadsheet atau tidak sengaja menghapus datanya, gunakan tombol di bawah untuk menginisialisasi tabel MASTER_DATA dan menyematkan header kolom beserta akun demo awal.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3.5 pt-2">
              <button
                type="button"
                onClick={handleSeedRemote}
                disabled={seeding}
                className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs tracking-wide rounded-xl transition-all shadow-md shadow-indigo-600/15 cursor-pointer disabled:opacity-50"
              >
                {seeding ? "Menginisialisasi / Seeding Cloud..." : "Inisialisasi / Seed Google Sheet"}
              </button>

              {seedSuccess && (
                <div className="text-[11px] font-semibold text-emerald-850 bg-emerald-50 p-3 border border-emerald-100 rounded-xl leading-relaxed flex items-start gap-2">
                  <span className="text-emerald-500">✔</span>
                  <span>{seedSuccess}</span>
                </div>
              )}
            </div>
          </div>

          {/* Diagnostic Stats Block */}
          <div className="bg-sky-5/10 p-5 rounded-2xl border border-sky-100/50 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="flex gap-2.5 items-start text-xs font-semibold text-sky-955">
                <Activity className="w-5 h-5 text-sky-600 shrink-0" />
                <div>
                  <h3 className="font-extrabold text-sky-900 text-xs">Diagnostik Struktur & Analisis Lembar Kerja</h3>
                  <p className="text-[11px] text-sky-500 font-medium leading-relaxed mt-1">
                    Analisis konfigurasi spreadsheet internal Anda untuk memastikan baris data_type USER, SCHEDULE, dan laporan kunjungan VISIT sesuai dengan validasi skema database.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleRunDiagnostics}
                disabled={diagLoading}
                className="w-full sm:w-auto px-5 py-2.5 bg-white hover:bg-sky-50 border border-sky-200 text-sky-800 hover:text-sky-950 font-extrabold text-xs tracking-wide rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
              >
                {diagLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                    <span>Menganalisis...</span>
                  </>
                ) : (
                  <span>Jalankan Diagnostik</span>
                )}
              </button>
            </div>
          </div>

        </div>

        {/* Diagnostics Results Rendering */}
        {diagError && (
          <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 space-y-2">
            <div className="flex gap-2 items-start text-xs font-extrabold text-rose-955">
              <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>Analisis Diagnostik Cloud Menemukan Hambatan</div>
            </div>
            <p className="text-[11px] text-rose-700 leading-relaxed font-semibold pl-7">
              Detail: {diagError}
            </p>
            {diagError.includes("action: diagnose") && (
              <div className="bg-white border border-rose-100 p-4 rounded-xl text-[11px] text-rose-900 leading-relaxed pl-4 space-y-2 mx-7">
                <p className="font-black text-rose-950">💡 Solusi Pembaruan Kode Apps Script:</p>
                <p>Kode Google Apps Script di Spreadsheet Anda sedang menggunakan versi lama.</p>
                <p className="font-black text-sky-800">Cara memperbarui:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Buka Google Spreadsheet Anda, arahkan ke <span className="font-bold">Extensions → Apps Script</span>.</li>
                  <li>Ganti seluruh isi kode dengan kode terbaru dari file <span className="font-mono font-bold">apps_script.gs</span> di proyek ini.</li>
                  <li>Tekan <span className="font-bold">Save (Ctrl+S / Cmd+S)</span>.</li>
                  <li>Klik <span className="font-bold">Deploy → New Deployment</span>.</li>
                  <li>Pilih jenis <span className="font-bold">Web app</span>, set <span className="font-bold">Who has access</span> ke <span className="font-bold">Anyone</span>, lalu klik Deploy.</li>
                </ol>
              </div>
            )}
          </div>
        )}

        {diagData && (
          <div className="bg-sky-50/10 border border-sky-100 rounded-2xl p-5 space-y-5 shadow-inner">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-4 border-b border-sky-100/60">
              <div>
                <dt className="text-[10px] text-sky-500 font-extrabold uppercase tracking-wide">Nama Spreadsheet</dt>
                <dd className="text-sm font-black text-sky-950 mt-0.5 truncate">{diagData.spreadsheetName || "(Tanpa Nama)"}</dd>
              </div>

              <div>
                <dt className="text-[10px] text-sky-500 font-extrabold uppercase tracking-wide">Daftar Tab Sheet Terdeteksi</dt>
                <dd className="flex flex-wrap gap-1 mt-1">
                  {diagData.sheets.map(name => (
                    <span
                      key={name}
                      className={`px-2.5 py-0.5 rounded-lg font-bold text-[10px] tracking-wide ${
                        name === "MASTER_DATA"
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          : "bg-sky-100 text-sky-800 border border-sky-200"
                      }`}
                    >
                      {name}
                    </span>
                  ))}
                </dd>
                {!diagData.masterDataExists && (
                  <p className="mt-1.5 flex gap-1 items-center text-[10px] font-bold text-rose-650">
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Lapor: Tab &apos;MASTER_DATA&apos; penting tidak terdeteksi!</span>
                  </p>
                )}
              </div>

              <div>
                <dt className="text-[10px] text-sky-500 font-extrabold uppercase tracking-wide">Status Validitas Skema</dt>
                <dd className="mt-1.5">
                  {diagData.masterDataExists && diagData.dataTypeCounts.USER > 0 ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-full font-bold text-[10px] border border-emerald-100">
                      ✔ Format Spreadsheet Valid & Siap
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-50 text-amber-700 rounded-full font-bold text-[10px] border border-amber-100">
                      ⚠ Perlu Penyesuaian / Seeding
                    </span>
                  )}
                </dd>
              </div>
            </div>

            {/* Counts breakdown */}
            <div>
              <h3 className="text-[10px] text-sky-500 font-extrabold uppercase tracking-wider mb-2.5">Jumlah Baris & Data Terbaca per Kategori</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white p-3 border border-sky-100/80 rounded-xl relative overflow-hidden">
                  <div className="font-black text-sky-950 text-base">{diagData.dataTypeCounts.USER}</div>
                  <div className="text-[9px] text-sky-450 font-extrabold uppercase tracking-wider mt-0.5">Akun User (USER)</div>
                </div>
                <div className="bg-white p-3 border border-sky-100/80 rounded-xl relative overflow-hidden">
                  <div className="font-black text-sky-950 text-base">{diagData.dataTypeCounts.SCHEDULE}</div>
                  <div className="text-[9px] text-sky-450 font-extrabold uppercase tracking-wider mt-0.5">Jadwal Visit</div>
                </div>
                <div className="bg-white p-3 border border-sky-100/80 rounded-xl relative overflow-hidden">
                  <div className="font-black text-sky-950 text-base">{diagData.dataTypeCounts.VISIT}</div>
                  <div className="text-[9px] text-sky-450 font-extrabold uppercase tracking-wider mt-0.5">Histori Laporan</div>
                </div>
                <div className="bg-white p-3 border border-sky-100/80 rounded-xl relative overflow-hidden">
                  <div className="font-black text-sky-950 text-base">{diagData.dataTypeCounts.OTHER}</div>
                  <div className="text-[9px] text-sky-450 font-extrabold uppercase tracking-wider mt-0.5">Baris Lainnya</div>
                </div>
              </div>
            </div>

            {/* Accounts list (User Valid di Google Sheet) */}
            <div>
              <h3 className="text-[10px] text-sky-500 font-extrabold uppercase tracking-wider mb-2">Daftar Akun Terdaftar di Spreadsheet</h3>
              {diagData.dataTypeCounts.USER === 0 ? (
                <div className="bg-amber-50/50 p-4 border border-amber-100 rounded-xl text-xs text-amber-900 leading-normal pl-4 font-semibold">
                  <p className="font-bold">⚠️ Data Akun Kosong</p>
                  <p className="text-[11px] font-normal mt-0.5 text-amber-800">
                    Tidak terdeteksi adanya akun master data di Spreadsheet Anda. Silakan isi baris master_data di lembar kerja Anda atau klik tombol seeder di atas.
                  </p>
                </div>
              ) : (
                <div className="max-h-56 overflow-y-auto border border-sky-100 bg-white rounded-xl divide-y divide-sky-50">
                  {diagData.users.map((user, i) => (
                    <div key={i} className="p-3 flex justify-between items-center hover:bg-sky-50/30 transition-colors">
                      <div className="min-w-0">
                        <div className="font-extrabold text-sky-950 text-xs font-mono select-all">@{user.username}</div>
                        <div className="text-[10px] text-sky-500 font-semibold mt-0.5">{user.name || "(No Name)"}</div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-lg font-extrabold text-[9px] tracking-wider uppercase ${
                        user.role === "ADMIN" ? "bg-purple-55 text-purple-700" :
                        user.role === "DDM" ? "bg-indigo-55 text-indigo-700" :
                        user.role === "ASM" ? "bg-blue-55 text-blue-700" :
                        user.role === "SPV" ? "bg-amber-55 text-amber-700" :
                        "bg-sky-55 text-sky-700"
                      }`}>
                        {user.role}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
