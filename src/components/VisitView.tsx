import React, { useState, useEffect } from "react";
import { 
  getSchedules, 
  submitVisit, 
  getVisitHistory 
} from "../api";
import { Schedule, User, Visit } from "../types";
import { 
  Building2, 
  Calendar, 
  Camera, 
  Check, 
  MapPin, 
  FileText, 
  AlertCircle,
  Clock,
  Sparkles,
  UploadCloud,
  CheckCircle2,
  X,
  FileImage
} from "lucide-react";

interface VisitViewProps {
  currentUser: User;
  setActivePage?: (page: any) => void;
}

export default function VisitView({ currentUser, setActivePage }: VisitViewProps) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [submittedVisits, setSubmittedVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSchedule, setActiveSchedule] = useState<Schedule | null>(null);

  // Form states
  const [photoUrl, setPhotoUrl] = useState("");
  const [omzet, setOmzet] = useState<number | "">("");
  const [notes, setNotes] = useState("");
  
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const loadSchedulesAndVisits = async (silent: boolean = false) => {
    if (!silent) setLoading(true);
    setErrorMsg(null);
    try {
      const targetSchedules = await getSchedules(currentUser.username);
      const pastVisits = await getVisitHistory({ username: currentUser.username, role: "SE" });
      setSchedules(targetSchedules);
      setSubmittedVisits(pastVisits);
    } catch (err: any) {
      console.error(err);
      if (!silent) setErrorMsg("Failed loading daily targets: " + (err.message || err));
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadSchedulesAndVisits();

    // Auto-sync polling every 15 seconds
    const interval = setInterval(() => {
      loadSchedulesAndVisits(true);
    }, 15000);

    return () => clearInterval(interval);
  }, [currentUser]);

  // Handle Photo File Upload / base64
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setPhotoUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setPhotoUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOpenCheckin = (schedule: Schedule) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    
    // Check if store already completed today
    const wasVisited = submittedVisits.some(
      v => v.store_id === schedule.store_id && v.visit_date === schedule.visit_date && v.approval_status !== "REJECTED"
    );

    if (wasVisited) {
      setErrorMsg(`Warning: You have already checked-in and completed a visit report for "${schedule.store_name}" today.`);
      return;
    }

    setActiveSchedule(schedule);
    // Reset Form values
    setPhotoUrl("");
    setOmzet("");
    setNotes("");
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!activeSchedule) return;

    // Strict validation
    if (!photoUrl) {
      setErrorMsg("VALIDATION ERROR: Visit Photo Upload is strictly mandatory to submit.");
      return;
    }
    if (omzet === "" || isNaN(Number(omzet)) || Number(omzet) < 0) {
      setErrorMsg("VALIDATION ERROR: Transaction Value / Omzet is mandatory. If no transactions happened, input 0.");
      return;
    }

    setSubmitting(true);
    
    const todayStr = activeSchedule.visit_date; // YYYY-MM-DD
    const nowStr = new Date().toLocaleTimeString("id-ID", { hour12: false }); // HH:MM:SS

    try {
      await submitVisit({
        username: currentUser.username,
        store_id: activeSchedule.store_id,
        store_name: activeSchedule.store_name,
        address: "Referenced store schema",
        visit_date: todayStr,
        checkin_time: nowStr,
        photo_url: photoUrl,
        omzet: Number(omzet),
        notes: notes.trim()
      });

      setSuccessMsg(`SUCCESS: Visit Report to "${activeSchedule.store_name}" submitted to approval queue!`);
      setActiveSchedule(null);
      // Reload targets
      await loadSchedulesAndVisits();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed submitting report to database.");
    } finally {
      setSubmitting(false);
    }
  };

  // Helper to check store status relative to today's schedule
  const getScheduleStatus = (storeId: string) => {
    const found = submittedVisits.find(v => v.store_id === storeId);
    if (!found) return "PENDING";
    return found.approval_status;
  };

  const formatIDR = (num: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(num);
  };

  const computedEffectiveCall = omzet !== "" && Number(omzet) > 0 ? "YES" : "NO";

  return (
    <div className="space-y-8 max-w-5xl mx-auto w-full min-w-0">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-sky-100 shadow-sm w-full min-w-0">
        <div className="min-w-0">
          <h2 className="text-lg font-black text-sky-955 truncate">Execute Field Schedules</h2>
          <p className="text-xs text-sky-600 font-medium leading-relaxed mt-0.5">
            Review listed targeted retail stores assigned to you. Stand within the store vicinity and record details.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-bold bg-sky-50/80 text-sky-800 px-3.5 py-2 rounded-xl border border-sky-100 shrink-0">
          <Calendar className="w-3.5 h-3.5 text-sky-600 shrink-0" />
          <span className="truncate">Operational Date: {new Date().toLocaleDateString("en-US", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-xl text-rose-900 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="font-extrabold text-xs uppercase tracking-wider">Execution Warning</p>
            <p className="leading-relaxed mt-0.5 break-words font-medium">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Rejection Alert Banner */}
      {!loading && submittedVisits.some(v => v.approval_status === "REJECTED") && (
        <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 animate-fadeIn shadow-xs">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 bg-rose-100 rounded-xl flex items-center justify-center text-rose-650 shrink-0">
              <AlertCircle className="w-5 h-5 animate-pulse" />
            </div>
            <div className="text-left">
              <h4 className="font-extrabold text-xs text-rose-950 font-sans tracking-tight">Pemberitahuan Laporan Kunjungan Ditolak</h4>
              <p className="text-[11px] text-rose-700 font-medium leading-relaxed mt-0.5">
                Ada <strong>{submittedVisits.filter(v => v.approval_status === "REJECTED").length} laporan kunjungan toko</strong> yang ditolak oleh supervisor. Anda dapat memperbaiki dan mengajukannya kembali lewat Menu Revisi.
              </p>
            </div>
          </div>
          {setActivePage && (
            <button
              type="button"
              onClick={() => setActivePage("revision")}
              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[11px] rounded-xl transition-all cursor-pointer shadow-sm shrink-0 uppercase tracking-wide inline-flex items-center gap-1"
            >
              Revisi Sekarang &rarr;
            </button>
          )}
        </div>
      )}

      {successMsg && (
        <div className="bg-teal-50 border-l-4 border-teal-500 p-4 rounded-xl text-teal-900 text-xs flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
          <p className="font-bold leading-relaxed break-words min-w-0">{successMsg}</p>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center py-20 w-full">
          <div className="animate-spin h-8 w-8 border-4 border-sky-605 border-t-transparent rounded-full font-bold"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full min-w-0">
          {/* Daily Schedule List */}
          <div className="md:col-span-1 space-y-4 min-w-0 w-full">
            <h3 className="text-xs font-extrabold text-sky-500 uppercase tracking-widest flex items-center gap-1.5 px-1">
              <Building2 className="w-4 h-4" /> Assigned Store Routes ({schedules.length})
            </h3>

            {schedules.length === 0 ? (
              <div className="bg-white p-8 text-center rounded-2xl border border-sky-100 text-sky-500/70 text-xs min-w-0">
                No store visit targets created for you today.
              </div>
            ) : (
              <div className="space-y-3 min-w-0 w-full">
                {schedules.map((sched) => {
                  const status = getScheduleStatus(sched.store_id);
                  const isSubmitted = status !== "PENDING" && status !== "REJECTED";

                  return (
                    <div
                      key={sched.record_id}
                      onClick={() => !isSubmitted && handleOpenCheckin(sched)}
                      className={`p-4 rounded-2xl border border-sky-100/80 transition-all cursor-pointer bg-white text-left min-w-0 w-full ${activeSchedule?.record_id === sched.record_id ? "ring-2 ring-sky-500/70 border-transparent shadow shadow-sky-505/10" : "hover:border-sky-200"} ${isSubmitted ? "opacity-65 cursor-not-allowed bg-sky-50/10" : ""}`}
                    >
                      <div className="flex items-start justify-between gap-2 min-w-0">
                        <div className="space-y-1 min-w-0 flex-1">
                          <h4 className="font-bold text-sm text-sky-950 break-words leading-snug">{sched.store_name}</h4>
                          <span className="text-[10px] font-bold text-sky-450 tracking-wider font-mono block">ID: {sched.store_id}</span>
                        </div>
                        
                        {isSubmitted ? (
                          <span className="bg-emerald-50 text-emerald-700 text-[9px] p-1 px-2.5 font-black rounded-full flex items-center gap-0.5 shrink-0 uppercase tracking-wider">
                            <Check className="w-3 h-3 text-emerald-600 shrink-0" /> {status}
                          </span>
                        ) : (
                          <span className="bg-sky-50 text-sky-700 border border-sky-100/50 text-[9px] p-1 px-2 font-black rounded-full shrink-0 uppercase tracking-wider">
                            Open
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Active Checkin Form Terminal */}
          <div className="md:col-span-2 min-w-0 w-full">
            {activeSchedule ? (
              <form onSubmit={handleSubmitReport} className="bg-white rounded-2xl border border-sky-100 shadow-sm p-6 space-y-6 min-w-0 w-full overflow-hidden">
                <div className="flex items-center justify-between border-b border-sky-100/50 pb-4 min-w-0 gap-2">
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <span className="text-[9px] bg-sky-100 text-sky-800 font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-widest block w-max">Active Check-in</span>
                    <h3 className="text-md font-bold text-sky-955 break-words mt-1 leading-snug">{activeSchedule.store_name}</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveSchedule(null)}
                    className="p-1.5 hover:bg-sky-50 rounded-full text-sky-400 transition-all shrink-0 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 min-w-0">
                  {/* Photo upload container */}
                  <div className="space-y-3 min-w-0 w-full">
                    <label className="block text-xs font-bold text-sky-800 uppercase tracking-wider">
                      Store Shelf Photo (Wajib Upload)
                    </label>

                    {photoUrl ? (
                      <div className="relative rounded-2xl overflow-hidden border border-sky-100 h-52 group min-w-0 w-full">
                        <img 
                          src={photoUrl} 
                          alt="Captured store shelf" 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => setPhotoUrl("")}
                            className="bg-white text-rose-605 p-2 rounded-xl font-bold text-xs shadow hover:bg-white flex items-center gap-1 transition-all"
                          >
                            <X className="w-4 h-4 cursor-pointer" /> Change Image
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onDragEnter={handleDrag}
                        onDragOver={handleDrag}
                        onDragLeave={handleDrag}
                        onDrop={handleDrop}
                        className={`h-52 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-4 text-center transition-all min-w-0 w-full ${dragActive ? "border-sky-500 bg-sky-50/20" : "border-sky-200 hover:border-sky-350 bg-sky-50/10"}`}
                      >
                        <UploadCloud className="w-8 h-8 text-sky-400 mb-2 shrink-0" />
                        <p className="text-xs font-bold text-sky-800">Drag &amp; drop shop front photo</p>
                        <p className="text-[10px] text-sky-550 mt-1 font-medium">or click below to choose file</p>
                        
                        <label className="mt-3 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow-sm shadow-sky-500/10 transition-colors shrink-0">
                          <span className="flex items-center gap-1"><Camera className="w-3.5 h-3.5 shrink-0" /> Upload File</span>
                          <input
                             type="file"
                             accept="image/*"
                             onChange={handleFileChange}
                             className="hidden"
                          />
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Operational parameters form fields */}
                  <div className="space-y-4 min-w-0 w-full text-xs font-bold text-sky-805">
                    {/* Check-in Timestamp metadata */}
                    <div className="bg-sky-50/40 p-3 rounded-xl flex items-center justify-between text-xs font-bold text-sky-800 border border-sky-100/30">
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-sky-650 shrink-0" /> Check-in Time:</span>
                      <span className="font-extrabold text-sky-955 font-mono">
                        {new Date().toLocaleTimeString("id-ID", { hour12: false })}
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-sky-800 uppercase tracking-wider mb-1">
                        Total Transaction / Omzet (IDR)
                      </label>
                      <div className="relative rounded-lg shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-sky-500 text-xs font-bold">Rp</span>
                        </div>
                        <input
                          type="number"
                          required
                          value={omzet}
                          onChange={(e) => setOmzet(e.target.value === "" ? "" : Number(e.target.value))}
                          placeholder="e.g. 500000 (enter 0 if no trans.)"
                          className="block w-full pl-8 pr-3 py-2.5 border border-sky-205 rounded-xl focus:ring-2 focus:ring-sky-550 focus:outline-none text-sm text-sky-955 bg-sky-50/5 font-medium"
                        />
                      </div>
                    </div>

                    {/* Effective Call Dynamic preview indicator */}
                    <div className="bg-sky-50/40 p-4 rounded-xl border border-sky-100/85 space-y-1">
                      <div className="text-[10px] font-bold text-sky-500 uppercase tracking-widest">Effective Call Metric:</div>
                      <div className="flex items-center justify-between text-sky-800 font-medium">
                        <span className="text-xs">Automatic calculation:</span>
                        {computedEffectiveCall === "YES" ? (
                          <span className="bg-emerald-100 text-emerald-800 font-bold text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                            YES (OMZET &gt; 0)
                          </span>
                        ) : (
                          <span className="bg-sky-100 text-sky-800 font-bold text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                            NO (OMZET 0)
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-sky-800 uppercase tracking-wider mb-1">
                        Visit Notes / Findings (Promotions, Stocks)
                      </label>
                      <textarea
                        rows={3}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Detail shelf conditions, stock replenishment needs, store manager feedback..."
                        className="block w-full px-3 py-2 border border-sky-200 rounded-xl focus:ring-2 focus:ring-sky-550 focus:outline-none text-xs text-sky-950 bg-sky-50/5 font-semibold placeholder-sky-305"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-sky-105/85 pt-4 flex justify-end gap-2 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setActiveSchedule(null)}
                    className="px-4 py-2 border border-sky-150 rounded-xl text-sky-755 hover:bg-sky-50 transition-colors cursor-pointer"
                  >
                    Discard Changes
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl shadow-md shadow-sky-500/10 transition-all flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                  >
                    {submitting ? "Publishing Visit..." : "Submit Visit to SPV Review"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="bg-sky-50/20 rounded-2xl border-2 border-dashed border-sky-100 h-96 flex flex-col items-center justify-center p-6 text-center text-sky-400">
                <Building2 className="w-12 h-12 mb-3 text-sky-300 shrink-0" />
                <h4 className="font-extrabold text-sky-905 text-sm">No Store Checked-In</h4>
                <p className="text-xs text-sky-600 max-w-sm mt-1">
                  Select a targeted retail outlet from the assigned daily store route menu on the left to activate camera checks and record omzet.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
