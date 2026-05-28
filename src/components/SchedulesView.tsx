import React, { useState, useEffect } from "react";
import { 
  getAllSchedules, 
  getOutletsList, 
  getUsersList, 
  saveSchedule, 
  deleteSchedule, 
  checkCloudConnection,
  isSameUname
} from "../api";
import { User, Schedule, Outlet } from "../types";
import { 
  Calendar, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  CheckCircle, 
  AlertTriangle, 
  X, 
  Save, 
  MapPin, 
  User as UserIcon, 
  RefreshCw, 
  Building, 
  Filter, 
  ChevronRight,
  TrendingUp,
  Sliders,
  Store,
  Users
} from "lucide-react";

interface SchedulesViewProps {
  currentUser: User;
}

export default function SchedulesView({ currentUser }: SchedulesViewProps) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [cloudConnected, setCloudConnected] = useState(false);

  // Search & Filters State
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSeFilter, setSelectedSeFilter] = useState("ALL");
  const [selectedDateFilter, setSelectedDateFilter] = useState("2026-05-28");

  // Alerts Success/Error
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form Drawer Modal State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<string | undefined>(undefined);
  
  const [formValues, setFormValues] = useState({
    username: "",
    store_id: "",
    visit_date: ""
  });

  // Action Dialog Targets
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Fetch all basic datasets on mount
  useEffect(() => {
    fetchInitialData(true);
    checkCloudConnection().then(setCloudConnected);

    // Auto-sync every 15 seconds
    const interval = setInterval(() => {
      fetchInitialData(true);
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const fetchInitialData = async (silent: boolean = false) => {
    try {
      if (!silent) setLoading(true);
      setErrorMsg(null);
      
      const [schedulesData, outletsData, usersData] = await Promise.all([
        getAllSchedules(),
        getOutletsList(),
        getUsersList()
      ]);
      
      setSchedules(schedulesData);
      setOutlets(outletsData);
      setUsers(usersData);
    } catch (err: any) {
      console.error("Failed fetching initial scheduler data:", err);
      if (!silent) setErrorMsg("Gagal mengambil data penjadwalan: " + err.message);
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
    setEditingRecordId(undefined);
    setFormValues({
      username: "",
      store_id: "",
      visit_date: new Date().toISOString().split("T")[0] // default to current date
    });
    setErrorMsg(null);
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (sched: Schedule) => {
    setIsEditing(true);
    setEditingRecordId(sched.record_id);
    setFormValues({
      username: sched.username,
      store_id: sched.store_id,
      visit_date: sched.visit_date
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
    if (!formValues.username || !formValues.store_id || !formValues.visit_date) {
      setErrorMsg("Harap lengkapi semua bidang isian (Salesperson, Toko, Tanggal Kunjungan)");
      return;
    }

    const matchedStore = outlets.find(o => o.store_id === formValues.store_id);
    if (!matchedStore) {
      setErrorMsg("Toko terpilih tidak valid.");
      return;
    }

    try {
      setActionLoading(true);
      setErrorMsg(null);

      await saveSchedule({
        record_id: editingRecordId,
        username: formValues.username,
        store_id: formValues.store_id,
        store_name: matchedStore.store_name,
        visit_date: formValues.visit_date
      });

      showSuccess(
        isEditing 
          ? `Jadwal kunjungan ke "${matchedStore.store_name}" berhasil diperbarui!` 
          : `Tugas jadwal kunjungan baru ke "${matchedStore.store_name}" berhasil dibuat!`
      );
      
      setIsFormOpen(false);
      fetchInitialData();
    } catch (err: any) {
      setErrorMsg("Gagal menyimpan jadwal kunjungan: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteConfirm = async (recordId: string) => {
    try {
      setActionLoading(true);
      setErrorMsg(null);
      await deleteSchedule(recordId);
      showSuccess("Jadwal kunjungan berhasil dihapus / dibatalkan!");
      setDeleteTargetId(null);
      fetchInitialData();
    } catch (err: any) {
      setErrorMsg("Gagal membatalkan jadwal kunjungan: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Salespersons list for filtering & form select (usually role "SE")
  const salespersons = users.filter(u => u.role === "SE");

  // Auxiliary helper to normalize and compare dates (e.g., ISO dates vs YYYY-MM-DD input)
  const formatCompareDate = (dateVal: string): string => {
    if (!dateVal) return "";
    let trimmed = dateVal.trim();
    
    // 1. If it's already exactly YYYY-MM-DD, return it as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }
    
    // 2. If it contains ISO or timezone markers, parse it relative to the local user's calendar date
    if (trimmed.includes("T") || trimmed.includes("Z") || trimmed.includes("GMT") || trimmed.includes("+")) {
      try {
        const d = new Date(trimmed);
        if (!isNaN(d.getTime())) {
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, "0");
          const dd = String(d.getDate()).padStart(2, "0");
          return `${yyyy}-${mm}-${dd}`;
        }
      } catch (err) {
        // Fall back to split if parsing fails
      }
    }
    
    // 3. Fallback splitter
    let datePart = trimmed.split("T")[0].split(" ")[0];
    
    // Check if it's formatted as DD/MM/YYYY
    if (datePart.includes("/")) {
      const parts = datePart.split("/");
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          // YYYY/MM/DD
          return `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
        } else if (parts[2].length === 4) {
          // DD/MM/YYYY
          return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
        }
      }
    }
    
    // YYYY-MM-DD or DD-MM-YYYY fallback
    if (datePart.includes("-")) {
      const parts = datePart.split("-");
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          return `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
        } else if (parts[2].length === 4) {
          // DD-MM-YYYY
          return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
        }
      }
    }
    return datePart;
  };

  // Filtering Logic
  const filteredSchedules = schedules.filter(sch => {
    // Only show records whose data_type is "SCHEDULE"
    const isScheduleRecord = sch.data_type === "SCHEDULE";
    if (!isScheduleRecord) return false;

    const matchesSearch = 
      sch.store_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      sch.store_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sch.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (users.find(u => isSameUname(u.username, sch.username))?.name || "").toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSe = selectedSeFilter === "ALL" || isSameUname(sch.username, selectedSeFilter);
    const matchesDate = !selectedDateFilter || formatCompareDate(sch.visit_date) === formatCompareDate(selectedDateFilter);

    return matchesSearch && matchesSe && matchesDate;
  });

  return (
    <div className="space-y-6">
      
      {/* Page header banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-sky-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 shadow-sm">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-sky-950 font-sans tracking-tight">Perencanaan Jadwal Kunjungan (DDM Only)</h1>
            <p className="text-xs text-sky-500 font-medium">Beri target, kelola rute, atau buat jadwal sales eksekutif berkala</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchInitialData}
            className="p-2.5 bg-sky-50 text-indigo-700 hover:bg-sky-100 rounded-xl transition-all cursor-pointer font-bold border border-sky-100/60"
            title="SINKRONKAN ULANG"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-indigo-600" : ""}`} />
          </button>
          
          <button
            onClick={handleOpenAddForm}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs tracking-wide transition-all shadow-md shadow-indigo-650/10 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tentukan Jadwal Baru</span>
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

      {/* Visual Calendar & Schedule Dashboard replaced with sleek Jadwal Kunjungan */}
      <div className="bg-white p-6 rounded-2xl border border-sky-100 shadow-sm space-y-6">

        {/* Filters Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* 1. Keyword Search */}
          <div className="space-y-1.5 text-left">
            <label className="block text-[10px] font-extrabold text-sky-500 uppercase tracking-widest">
              🔎 Cari Kunjungan
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-sky-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari toko, ID, atau nama SE..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-sky-50/50 hover:bg-sky-50 focus:bg-white border border-sky-100 focus:border-indigo-500 rounded-xl outline-none transition-all font-bold text-xs text-sky-950 placeholder-sky-400"
              />
            </div>
          </div>

          {/* 2. Date Selector (visit_date) */}
          <div className="space-y-1.5 text-left">
            <div className="flex items-center justify-between">
              <label className="block text-[10px] font-extrabold text-sky-500 uppercase tracking-widest">
                📅 Tanggal Kunjungan (visit_date)
              </label>
              {selectedDateFilter && (
                <button
                  type="button"
                  onClick={() => setSelectedDateFilter("")}
                  className="text-[9px] font-extrabold text-indigo-650 hover:text-indigo-800 uppercase tracking-wide cursor-pointer hover:underline"
                >
                  Lihat Semua Tanggal
                </button>
              )}
            </div>
            <input
              type="date"
              value={selectedDateFilter}
              onChange={(e) => setSelectedDateFilter(e.target.value)}
              className="w-full px-3.5 py-2 bg-sky-50/50 hover:bg-sky-50 focus:bg-white border border-sky-100 focus:border-indigo-500 rounded-xl outline-none transition-all font-bold text-xs text-sky-950 cursor-pointer"
            />
          </div>

          {/* 3. Salesperson Filter SE */}
          <div className="space-y-1.5 text-left">
            <label className="block text-[10px] font-extrabold text-sky-500 uppercase tracking-widest">
              👤 Filter Sales Executive (SE)
            </label>
            <select
              value={selectedSeFilter}
              onChange={(e) => setSelectedSeFilter(e.target.value)}
              className="w-full px-3 py-2.5 bg-sky-55/50 hover:bg-sky-50 focus:bg-white border border-sky-100 focus:border-indigo-500 rounded-xl outline-none transition-all font-bold text-xs text-sky-900 cursor-pointer"
            >
              <option value="ALL">Semua Sales Executive (ALL)</option>
              {salespersons.map(se => {
                const countForSe = schedules.filter(s => 
                  isSameUname(s.username, se.username) && 
                  (!selectedDateFilter || formatCompareDate(s.visit_date) === formatCompareDate(selectedDateFilter))
                ).length;
                return (
                  <option key={se.username} value={se.username}>
                    {se.name} (@{se.username}) — {countForSe} Jadwal
                  </option>
                );
              })}
            </select>
          </div>

        </div>

      </div>

      {/* Delete Confirmation Overlay Modal */}
      {deleteTargetId && (
        <div className="fixed inset-0 bg-sky-950/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-sky-100 animate-scaleUp">
            <div className="flex items-center gap-3 text-rose-600 mb-4">
              <div className="h-10 w-10 rounded-xl bg-rose-50 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-rose-600 animate-pulse" />
              </div>
              <h3 className="text-base font-extrabold font-sans">Batalkan Kunjungan Jadwal</h3>
            </div>
            
            <p className="text-xs text-sky-905 leading-relaxed mb-6">
              Apakah Anda yakin ingin membatalkan target jadwal kunjungan ini? 
              Tindakan ini akan menghapusnya secara langsung dari rute harian Sales Executive yang bersangkutan.
            </p>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTargetId(null)}
                className="px-4 py-2 bg-sky-50 text-sky-850 hover:bg-sky-100 text-xs font-extrabold rounded-xl transition-all cursor-pointer"
                disabled={actionLoading}
              >
                Kembali
              </button>
              <button
                type="button"
                onClick={() => handleDeleteConfirm(deleteTargetId)}
                className="px-4 py-2 bg-rose-600 text-white hover:bg-rose-700 text-xs font-extrabold rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-md shadow-rose-650/10"
                disabled={actionLoading}
              >
                {actionLoading ? "Mencabut..." : "Ya, Cabut Jadwal"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form Drawer Modal for assigning schedule */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-sky-950/40 z-50 flex justify-end p-0 md:p-4 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md h-full md:h-auto md:rounded-2xl shadow-2xl flex flex-col overflow-hidden border-l md:border border-sky-100 animate-slideLeft">
            
            {/* Header */}
            <div className="p-6 border-b border-sky-100 flex items-center justify-between bg-sky-50/50">
              <div className="flex items-center gap-2.5">
                <div className="h-10 w-10 bg-indigo-100 text-indigo-700 rounded-xl flex items-center justify-center font-bold">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-sky-950 font-sans tracking-tight">
                    {isEditing ? "Perbarui Jadwal Kunjungan" : "Tentukan Jadwal Kunjungan"}
                  </h3>
                  <p className="text-[10px] text-sky-500 font-bold uppercase tracking-wide">
                    {isEditing ? `Modifikasi Jadwal ID: ${editingRecordId}` : "Beri tugas sales executive baru"}
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

            {/* Form */}
            <form onSubmit={handleFormSubmit} className="flex-1 p-6 overflow-y-auto space-y-5">
              
              {/* Select Salesperson */}
              <div>
                <label className="block text-[10px] font-extrabold text-sky-550 uppercase tracking-widest mb-1.5">
                  Salesperson Pelaksana *
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-sky-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <select
                    name="username"
                    value={formValues.username}
                    onChange={handleInputChange}
                    className="w-full pl-9 pr-3 py-2.5 text-xs bg-sky-50/50 focus:bg-white border border-sky-100 focus:border-indigo-500 rounded-xl outline-none transition-all font-bold text-sky-900 cursor-pointer"
                    required
                  >
                    <option value="">-- Pilih Sales Executive (SE) --</option>
                    {salespersons.map(s => (
                      <option key={s.username} value={s.username}>
                        {s.name} (@{s.username})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Select Target Outlet/Store */}
              <div>
                <label className="block text-[10px] font-extrabold text-sky-550 uppercase tracking-widest mb-1.5">
                  Toko / Outlet Tujuan *
                </label>
                <div className="relative">
                  <Building className="w-4 h-4 text-sky-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <select
                    name="store_id"
                    value={formValues.store_id}
                    onChange={handleInputChange}
                    className="w-full pl-9 pr-3 py-2.5 text-xs bg-sky-50/50 focus:bg-white border border-sky-100 focus:border-indigo-500 rounded-xl outline-none transition-all font-bold text-sky-900 cursor-pointer"
                    required
                  >
                    <option value="">-- Pilih Toko dari Database --</option>
                    {outlets.map(o => (
                      <option key={o.store_id} value={o.store_id}>
                        {o.store_name} ({o.store_id})
                      </option>
                    ))}
                  </select>
                </div>
                {formValues.store_id && (
                  <div className="mt-2.5 p-3 bg-sky-50/50 border border-sky-100 rounded-xl flex items-start gap-2.5 text-[10px] text-sky-650 leading-relaxed font-semibold">
                    <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                    <span>
                      Alamat: {outlets.find(o => o.store_id === formValues.store_id)?.address || "-"}
                    </span>
                  </div>
                )}
              </div>

              {/* Select Tarjet Date */}
              <div>
                <label className="block text-[10px] font-extrabold text-sky-550 uppercase tracking-widest mb-1.5">
                  Tanggal Direncanakan *
                </label>
                <input
                  type="date"
                  name="visit_date"
                  value={formValues.visit_date}
                  onChange={handleInputChange}
                  className="w-full px-3.5 py-2.5 text-xs bg-sky-50/50 focus:bg-white border border-sky-100 focus:border-indigo-500 rounded-xl outline-none transition-all font-bold text-sky-950 cursor-pointer"
                  required
                />
              </div>

              {/* Real-time Cloud Sync Notification */}
              {cloudConnected && (
                <div className="p-3 bg-indigo-50 border border-indigo-100/50 rounded-xl flex items-start gap-2 text-[10px] font-bold text-indigo-700 leading-normal">
                  <RefreshCw className="w-3.5 h-3.5 mt-0.5 animate-spin text-indigo-500 shrink-0" />
                  <span>Jadwal ini akan langsung dikirim & ditambahkan ke live Google Spreadsheet database.</span>
                </div>
              )}

            </form>

            {/* Actions Footer */}
            <div className="p-4 bg-sky-50/50 border-t border-sky-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-4 py-2 bg-white hover:bg-sky-50 text-sky-850 text-xs font-bold rounded-xl border border-sky-100 transition-all cursor-pointer"
                disabled={actionLoading}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleFormSubmit}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-indigo-600/10 flex items-center gap-1.5 cursor-pointer"
                disabled={actionLoading}
              >
                <Save className="w-4 h-4" />
                <span>{actionLoading ? "Menyimpan..." : "Simpan Jadwal"}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Main Schedules Data Container */}
      {filteredSchedules.length === 0 ? (
        <div className="bg-white rounded-2xl border border-sky-100 shadow-sm p-12 text-center flex flex-col items-center justify-center">
          <Calendar className="w-12 h-12 text-sky-200 mb-3" />
          <h3 className="text-sm font-extrabold text-sky-950 font-sans">Tidak Ada Jadwal Kunjungan</h3>
          <p className="text-xs text-sky-400 mt-1 max-w-sm mx-auto">
            Tidak ditemukan rencana kunjungan yang memenuhi kriteria pencarian atau filter Anda saat ini.
          </p>
          <button
            onClick={handleOpenAddForm}
            className="mt-4 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold text-xs rounded-xl cursor-pointer"
          >
            Buat Jadwal Pertama
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-sky-100 shadow-sm overflow-hidden">
          
          {/* Table desktop layout view */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-sky-50/50 border-b border-sky-100/80 text-[10px] uppercase tracking-wider font-extrabold text-sky-500">
                  <th className="px-6 py-4 font-black">Sales Executive</th>
                  <th className="px-6 py-4 font-black">Toko Tujuan</th>
                  <th className="px-6 py-4 font-black">Alamat</th>
                  <th className="px-6 py-4 text-right font-black">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sky-50 font-sans text-xs font-medium text-sky-905">
                {filteredSchedules.map((sch) => {
                  const executorName = users.find(u => u.username.toLowerCase() === sch.username.toLowerCase())?.name || sch.username;
                  const targetOutlet = outlets.find(o => o.store_id === sch.store_id);

                  return (
                    <tr key={sch.record_id} className="hover:bg-sky-50/40 transition-colors group">
                      
                      {/* SE username & name */}
                      <td className="px-6 py-4 font-sans font-semibold">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-lg bg-sky-50 flex items-center justify-center text-sky-600 font-bold shrink-0">
                            {executorName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-extrabold text-sky-950 block">{executorName}</span>
                            <span className="text-[10px] text-sky-450 font-mono font-bold select-all">@{sch.username}</span>
                          </div>
                        </div>
                      </td>

                      {/* Store name & ID */}
                      <td className="px-6 py-4 max-w-[200px]">
                        <div>
                          <span className="font-extrabold text-sky-900 block group-hover:text-indigo-900 transition-colors">{sch.store_name}</span>
                          <span className="text-[10px] text-sky-400 font-bold font-mono uppercase">ID: {sch.store_id}</span>
                        </div>
                      </td>

                      {/* Address */}
                      <td className="px-6 py-4 text-sky-500 font-medium max-w-[280px] truncate" title={targetOutlet?.address || "-"}>
                        {targetOutlet?.address || "-"}
                      </td>

                      {/* Action buttons */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleOpenEditForm(sch)}
                            className="p-1.5 text-sky-500 hover:text-sky-900 bg-sky-50 hover:bg-sky-100 rounded-lg transition-all cursor-pointer"
                            title="UBAH JADWAL"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteTargetId(sch.record_id)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-all cursor-pointer"
                            title="HAPUS/BATALKAN JADWAL"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

        </div>
      )}

    </div>
  );
}
