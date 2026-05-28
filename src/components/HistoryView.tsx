import React, { useState, useEffect } from "react";
import { getVisitHistory } from "../api";
import { User, Visit, ApprovalStatus } from "../types";
import { 
  History, 
  Search, 
  Filter, 
  Eye, 
  X, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  FileText,
  Coins,
  Download,
  Calendar,
  Layers,
  Sparkles,
  RefreshCw,
  FolderOpen
} from "lucide-react";

interface HistoryViewProps {
  currentUser: User;
}

const ALL_STATUSES: { value: string; label: string; color: string }[] = [
  { value: "ALL", label: "All Statuses", color: "bg-slate-100 text-slate-700" },
  { value: "SUBMITTED", label: "Submitted (SPV Pending)", color: "bg-blue-100 text-blue-800" },
  { value: "SPV_APPROVED", label: "SPV Approved (ASM Pending)", color: "bg-indigo-100 text-indigo-800" },
  { value: "ASM_APPROVED", label: "ASM Approved (DDM Pending)", color: "bg-violet-100 text-violet-800" },
  { value: "DDM_APPROVED", label: "DDM Approved (Complete)", color: "bg-emerald-100 text-emerald-800" },
  { value: "REJECTED", label: "Rejected (Flagged Revision)", color: "bg-rose-100 text-rose-800" },
  { value: "RESUBMITTED", label: "Resubmitted (SPV Pending)", color: "bg-amber-100 text-amber-800" }
];

export default function HistoryView({ currentUser }: HistoryViewProps) {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);

  const loadHistory = async (silent: boolean = false) => {
    if (!silent) setLoading(true);
    try {
      const records = await getVisitHistory({ 
        username: currentUser.username, 
        role: currentUser.role 
      });
      setVisits(records);
    } catch (err) {
      console.error("Error loading history:", err);
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadHistory();

    // Auto-sync polling every 15 seconds
    const interval = setInterval(() => {
      loadHistory(true);
    }, 15000);

    return () => clearInterval(interval);
  }, [currentUser]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadHistory(false);
  };

  const getStatusBadge = (status: ApprovalStatus) => {
    switch (status) {
      case "DDM_APPROVED":
        return <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">Fully Approved</span>;
      case "REJECTED":
        return <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">Rejected</span>;
      case "SUBMITTED":
        return <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">SPV Review</span>;
      case "SPV_APPROVED":
        return <span className="bg-indigo-100 text-indigo-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">ASM Review</span>;
      case "ASM_APPROVED":
        return <span className="bg-violet-100 text-violet-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">DDM Review</span>;
      case "RESUBMITTED":
        return <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">Resubmitted</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">{status}</span>;
    }
  };

  const formatIDR = (num: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(num);
  };

  // Filter lists
  const filteredVisits = visits.filter(v => {
    const matchesSearch = 
      v.store_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.store_id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = selectedStatus === "ALL" || v.approval_status === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 text-left w-full min-w-0">
      {/* Upper bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-sky-100 shadow-sm w-full min-w-0">
        <div className="min-w-0">
          <h2 className="text-lg font-black text-sky-955 truncate">Historical Visit Archives</h2>
          <p className="text-xs text-sky-600 font-medium leading-relaxed mt-0.5">
            Browse overall completed shop check-ins, audited sales metrics, and authorization feedback records.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="px-3.5 py-2 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-100 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-sky-600 ${refreshing ? "animate-spin" : ""}`} />
          <span>{refreshing ? "Refreshing..." : "Sync Logs"}</span>
        </button>
      </div>

      {/* Primary search parameters & status buttons */}
      <div className="bg-white rounded-2xl border border-sky-100 p-6 shadow-sm space-y-5 w-full min-w-0">
        {/* Search Input Row */}
        <div className="w-full">
          <label className="block text-xs font-extrabold text-sky-850 uppercase tracking-wider mb-2">
            Search Visits
          </label>
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-sky-400 shrink-0" />
            <input
              type="text"
              placeholder="Search store name, ID code, salesperson username..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-sky-100 rounded-xl focus:ring-2 focus:ring-sky-500 focus:outline-none text-xs text-sky-950 font-semibold bg-sky-50/10 placeholder-sky-400 transition-all"
            />
          </div>
        </div>

        {/* Status Filters Row */}
        <div className="w-full pt-4 border-t border-sky-100/50">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-1.5 text-xs font-extrabold text-sky-850 uppercase tracking-wider">
              <Filter className="w-3.5 h-3.5 text-sky-600 shrink-0" />
              <span>Filter Status</span>
            </div>
            
            <div className="flex flex-wrap gap-2 w-full">
              {ALL_STATUSES.map((st) => {
                const isSelected = selectedStatus === st.value;
                return (
                  <button
                    key={st.value}
                    onClick={() => setSelectedStatus(st.value)}
                    className={`text-[11px] px-3.5 py-2 font-bold rounded-xl border transition-all cursor-pointer whitespace-nowrap leading-none ${
                      isSelected 
                        ? "bg-sky-600 border-sky-600 text-white shadow-md shadow-sky-600/10" 
                        : "bg-sky-50/50 border-sky-100 text-sky-850 hover:bg-sky-50 hover:border-sky-200"
                    }`}
                  >
                    {st.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20 w-full">
          <div className="animate-spin h-8 w-8 border-4 border-sky-605 border-t-transparent rounded-full font-bold"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full min-w-0">
          {/* Main Table/Grid List */}
          <div className="lg:col-span-2 space-y-3 min-w-0 w-full">
            {filteredVisits.length === 0 ? (
              <div className="bg-white p-12 text-center rounded-2xl border border-sky-150 text-sky-500/75 space-y-3 min-w-0">
                <FolderOpen className="w-12 h-12 text-sky-305 mx-auto shrink-0" />
                <div className="min-w-0">
                  <h4 className="font-extrabold text-sky-905 text-sm">No Archives Found</h4>
                  <p className="text-xs text-sky-600 max-w-sm mx-auto mt-1 leading-relaxed">
                    No completed checkout reports found matching your parameters in this territory.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3 min-w-0 w-full">
                {filteredVisits.map((item) => (
                  <div
                    key={item.record_id}
                    onClick={() => setSelectedVisit(item)}
                    className={`p-4 bg-white rounded-2xl border border-sky-100 hover:border-sky-300 shadow-sm transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left min-w-0 w-full overflow-hidden ${selectedVisit?.record_id === item.record_id ? "ring-2 ring-sky-500/80 border-transparent" : ""}`}
                  >
                    <div className="flex items-start gap-3.5 min-w-0 flex-1">
                      <div className="h-14 w-14 rounded-xl overflow-hidden border border-sky-105 shrink-0 bg-sky-50/10">
                        <img 
                          src={item.photo_url} 
                          alt="" 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5 w-full min-w-0">
                          <h4 className="font-extrabold text-sm text-sky-955 break-words max-w-full leading-tight">{item.store_name}</h4>
                          <span className="text-[10px] font-bold text-sky-500 leading-none">({item.store_id})</span>
                        </div>
                        <p className="text-xs text-sky-605 font-medium truncate">
                          By: <strong className="text-sky-800">{item.username}</strong> on {item.visit_date} &bull; {item.checkin_time}
                        </p>

                        <div className="flex items-center gap-3 pt-1 text-xs">
                          <span className="text-[11px] font-black text-sky-850 flex items-center gap-0.5 shrink-0">
                            <Coins className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> {formatIDR(item.omzet)}
                          </span>
                          <span className="text-sky-200 shrink-0">&bull;</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${item.effective_call === "YES" ? "bg-emerald-50 text-emerald-700" : "bg-sky-50 border border-sky-100/55 text-sky-750"}`}>
                            Effective: {item.effective_call}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                      {getStatusBadge(item.approval_status)}
                      <Eye className="w-4 h-4 text-sky-400 hover:text-sky-600 transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Details Column Drawer */}
          <div className="lg:col-span-1 min-w-0 w-full">
            {selectedVisit ? (
              <div className="bg-white rounded-2xl border border-sky-100/85 p-5 shadow-sm space-y-5 text-left sticky top-6 min-w-0 w-full overflow-hidden">
                <div className="flex justify-between items-start min-w-0 gap-2">
                  <div className="min-w-0 flex-1">
                    <span className="text-[9px] bg-sky-100 font-extrabold px-2.5 py-0.5 rounded text-sky-800 uppercase tracking-widest block w-max leading-none">Detail Archives</span>
                    <h3 className="text-md font-bold text-sky-955 mt-2.5 break-words leading-tight">{selectedVisit.store_name}</h3>
                    <p className="text-[10px] text-sky-500 font-semibold font-mono mt-1">ID: {selectedVisit.record_id}</p>
                  </div>
                  <button
                    onClick={() => setSelectedVisit(null)}
                    className="p-1.5 hover:bg-sky-55/65 rounded-full text-sky-400 transition-all shrink-0 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="rounded-xl overflow-hidden border border-sky-100 h-44 bg-sky-50/10 shrink-0">
                  <img 
                    src={selectedVisit.photo_url} 
                    alt="Shelf visual captured" 
                    className="w-full h-full object-cover" 
                    referrerPolicy="no-referrer"
                  />
                </div>

                <div className="space-y-3.5 border-t border-b border-sky-100/70 py-4 text-xs font-semibold text-sky-655 w-full min-w-0">
                  <div className="flex justify-between gap-2 pb-1">
                    <span className="shrink-0">Field Representative:</span>
                    <strong className="text-sky-950 truncate">{selectedVisit.username}</strong>
                  </div>
                  <div className="flex justify-between gap-2 pb-1">
                    <span className="shrink-0">Visit Timestamp:</span>
                    <span className="text-sky-850 font-mono text-right">{selectedVisit.visit_date} - {selectedVisit.checkin_time}</span>
                  </div>
                  <div className="flex justify-between gap-2 pb-1">
                    <span className="shrink-0 font-bold">Reported Transaction Value:</span>
                    <strong className="text-sky-955 text-sm font-black">{formatIDR(selectedVisit.omzet)}</strong>
                  </div>
                  <div className="flex justify-between gap-2 pb-1">
                    <span className="shrink-0">Effective Call Status:</span>
                    <span className={`font-black text-[10px] px-2.5 py-0.5 rounded-full shrink-0 ${selectedVisit.effective_call === "YES" ? "bg-emerald-100 text-emerald-800" : "bg-sky-50 border border-sky-100/50 text-sky-800"}`}>
                      {selectedVisit.effective_call}
                    </span>
                  </div>

                  {selectedVisit.notes && (
                    <div className="space-y-1 bg-sky-50/40 p-3 rounded-xl border border-sky-100/30 text-[11px] leading-relaxed min-w-0 break-words">
                      <span className="font-bold text-sky-800 block">Visit Notes &amp; Findings:</span>
                      <p className="text-sky-905 italic font-medium">"{selectedVisit.notes}"</p>
                    </div>
                  )}

                  {selectedVisit.rejection_notes && (
                    <div className="space-y-1 bg-rose-50 border border-rose-100/80 p-3 rounded-xl text-[11px] leading-relaxed text-rose-950 min-w-0 break-words">
                      <span className="font-bold text-rose-800 block">Supervisor Rejection Comments:</span>
                      <p className="italic font-semibold">"{selectedVisit.rejection_notes}"</p>
                    </div>
                  )}

                  {/* Previous Approvals Chain if hierarchy */}
                  <div className="space-y-2 pt-3 border-t border-sky-100/40 w-full">
                    <span className="font-bold text-sky-500 text-[10px] uppercase tracking-wider block">Approval Validation Chain:</span>
                    <div className="space-y-1.5 text-[10px] font-bold text-sky-600">
                      <div className="flex items-center justify-between">
                        <span>1. SPV Review:</span>
                        <span className={`font-black ${selectedVisit.spv_approval === "PENDING" ? "text-amber-500" : (selectedVisit.spv_approval.includes("REJECTED") ? "text-rose-600" : "text-emerald-600")}`}>{selectedVisit.spv_approval}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>2. ASM Review:</span>
                        <span className={`font-black ${selectedVisit.asm_approval === "PENDING" ? "text-amber-500" : (selectedVisit.asm_approval.includes("REJECTED") ? "text-rose-600" : "text-emerald-600")}`}>{selectedVisit.asm_approval}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>3. DDM Review:</span>
                        <span className={`font-black ${selectedVisit.ddm_approval === "PENDING" ? "text-amber-500" : (selectedVisit.ddm_approval.includes("REJECTED") ? "text-rose-600" : "text-emerald-600")}`}>{selectedVisit.ddm_approval}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-center pt-2 w-full">
                  <button
                    onClick={() => setSelectedVisit(null)}
                    className="w-full py-2 bg-sky-50 hover:bg-sky-100 border border-sky-100/40 font-bold rounded-xl text-sky-850 hover:text-sky-955 tracking-wide transition-colors text-xs cursor-pointer"
                  >
                    Close Review Panel
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-sky-50/20 border border-sky-100 rounded-2xl h-96 p-6 flex flex-col justify-center items-center text-center text-sky-400 sticky top-6">
                <History className="w-12 h-12 mb-3 text-sky-305 shrink-0" />
                <h4 className="font-bold text-sky-905 text-sm">Auditing Terminal</h4>
                <p className="text-xs text-sky-600 max-w-xs mt-1 leading-relaxed">
                  Click on any historical shop visitation log item on the left panel to trigger complete visual timelines, notes, and approval certifications.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
